/**
 * Pay-per-Active-Client Billing Service (Fase 2)
 *
 * Modello: il tenant paga una quota mensile pari a:
 *   (clienti attivi - free_active_slots) * per_slot_price_cents
 *
 * Stripe metered billing:
 * - Ogni tenant in modalità pay_per_active deve avere un subscription_item_id
 *   creato su Stripe (Price con usage_type=metered, aggregate_usage=max).
 * - Mensilmente reportUsageToStripe invia usage_records con quantity=billable_count.
 *
 * I 5 free slot di default vengono regalati a tutti come strategia di lancio aggressiva.
 */

const { query, transaction } = require('../config/database');
const stripeService = require('./stripe.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('BILLING_ACTIVE');

const getStripe = () => {
    stripeService.init();
    if (!stripeService.stripe) {
        throw { status: 503, message: 'Stripe non configurato (STRIPE_SECRET_KEY mancante)' };
    }
    return stripeService.stripe;
};

class BillingActiveService {

    /**
     * Ritorna lo stato corrente di billing per il tenant.
     */
    async getCurrentUsage(tenantId) {
        const rows = await query(
            `SELECT tenant_id, business_name, billing_model, free_active_slots,
                    per_slot_price_cents, active_count, billable_count, projected_cents
             FROM v_tenant_active_clients_billable
             WHERE tenant_id = ?`,
            [tenantId]
        );
        if (rows.length === 0) {
            throw { status: 404, message: 'Tenant non trovato' };
        }
        const r = rows[0];
        return {
            tenantId: r.tenant_id,
            businessName: r.business_name,
            billingModel: r.billing_model,
            freeActiveSlots: r.free_active_slots,
            perSlotPriceCents: r.per_slot_price_cents,
            activeCount: r.active_count,
            billableCount: r.billable_count,
            projectedCents: r.projected_cents,
            projectedAmount: (r.projected_cents / 100).toFixed(2),
            currency: 'EUR'
        };
    }

    /**
     * Update settings tenant (free slots, prezzo, modello).
     * Solo gym_admin/tenant_owner.
     */
    async updateSettings(tenantId, { billingModel, freeActiveSlots, perSlotPriceCents, currency }) {
        const updates = [];
        const params = [];
        if (billingModel !== undefined) {
            if (!['fixed_tier', 'pay_per_active', 'hybrid'].includes(billingModel)) {
                throw { status: 400, message: 'billing_model non valido' };
            }
            updates.push('billing_model = ?'); params.push(billingModel);
        }
        if (freeActiveSlots !== undefined) {
            if (freeActiveSlots < 0) throw { status: 400, message: 'free_active_slots negativo' };
            updates.push('free_active_slots = ?'); params.push(freeActiveSlots);
        }
        if (perSlotPriceCents !== undefined) {
            if (perSlotPriceCents < 0) throw { status: 400, message: 'per_slot_price_cents negativo' };
            updates.push('per_slot_price_cents = ?'); params.push(perSlotPriceCents);
        }
        if (currency !== undefined) {
            updates.push('currency = ?'); params.push(currency.toUpperCase());
        }
        if (updates.length === 0) return { success: true, message: 'Nessuna modifica' };

        params.push(tenantId);
        await query(
            `UPDATE tenant_billing_settings SET ${updates.join(', ')} WHERE tenant_id = ?`,
            params
        );
        return { success: true };
    }

    /**
     * Attiva un cliente: imposta status='active', registra event.
     * Idempotente: se già attivo, ritorna ok ma non scrive event.
     */
    async activateClient({ tenantId, clientId, actorUserId, reason = null }) {
        return transaction(async (connection) => {
            const [rows] = await connection.execute(
                'SELECT id, status FROM clients WHERE id = ? AND tenant_id = ? FOR UPDATE',
                [clientId, tenantId]
            );
            if (rows.length === 0) {
                throw { status: 404, message: 'Cliente non trovato' };
            }
            const current = rows[0].status;
            if (current === 'active') {
                return { success: true, alreadyActive: true };
            }

            await connection.execute(
                'UPDATE clients SET status = "active" WHERE id = ?',
                [clientId]
            );

            const eventType = current === 'cancelled' ? 'reactivated' : 'activated';
            await connection.execute(
                `INSERT INTO client_activation_events (tenant_id, client_id, actor_user_id, event_type, reason)
                 VALUES (?, ?, ?, ?, ?)`,
                [tenantId, clientId, actorUserId, eventType, reason]
            );

            logger.info('Client attivato', { tenantId, clientId, actorUserId, eventType });
            return { success: true, eventType };
        });
    }

    /**
     * Disattiva un cliente: imposta status='inactive', registra event.
     */
    async deactivateClient({ tenantId, clientId, actorUserId, reason = null, autoTriggered = false }) {
        return transaction(async (connection) => {
            const [rows] = await connection.execute(
                'SELECT id, status FROM clients WHERE id = ? AND tenant_id = ? FOR UPDATE',
                [clientId, tenantId]
            );
            if (rows.length === 0) {
                throw { status: 404, message: 'Cliente non trovato' };
            }
            if (rows[0].status === 'inactive') {
                return { success: true, alreadyInactive: true };
            }

            await connection.execute(
                'UPDATE clients SET status = "inactive" WHERE id = ?',
                [clientId]
            );

            await connection.execute(
                `INSERT INTO client_activation_events (tenant_id, client_id, actor_user_id, event_type, reason)
                 VALUES (?, ?, ?, ?, ?)`,
                [tenantId, clientId, actorUserId, autoTriggered ? 'auto_deactivated' : 'deactivated', reason]
            );

            logger.info('Client disattivato', { tenantId, clientId, actorUserId, autoTriggered });
            return { success: true };
        });
    }

    /**
     * Storico eventi attivazione/disattivazione di un cliente.
     */
    async getClientActivationHistory(clientId, tenantId) {
        return query(
            `SELECT cae.id, cae.event_type, cae.reason, cae.occurred_at,
                    cae.actor_user_id, u.first_name, u.last_name
             FROM client_activation_events cae
             LEFT JOIN users u ON u.id = cae.actor_user_id
             WHERE cae.client_id = ? AND cae.tenant_id = ?
             ORDER BY cae.occurred_at DESC`,
            [clientId, tenantId]
        );
    }

    /**
     * Report mensile a Stripe: invia un usage record con la quantity billable.
     * Da chiamare via cron il giorno 1 di ogni mese.
     */
    async reportUsageToStripe(tenantId) {
        const usage = await this.getCurrentUsage(tenantId);
        if (usage.billingModel !== 'pay_per_active') {
            return { skipped: true, reason: 'tenant non in pay_per_active' };
        }

        const settings = await query(
            'SELECT stripe_subscription_item_id, last_reported_at FROM tenant_billing_settings WHERE tenant_id = ?',
            [tenantId]
        );
        const { stripe_subscription_item_id: itemId, last_reported_at: lastAt } = settings[0] || {};
        if (!itemId) {
            logger.warn('Tenant pay_per_active senza stripe_subscription_item_id', { tenantId });
            return { skipped: true, reason: 'subscription_item_id mancante' };
        }

        // Idempotenza applicativa: non ri-reportare nello stesso mese
        const now = new Date();
        const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        if (lastAt && new Date(lastAt).toISOString().slice(0, 7) === periodKey) {
            return { skipped: true, reason: 'già reportato in questo mese' };
        }

        const stripe = getStripe();
        const timestamp = Math.floor(now.getTime() / 1000);
        const record = await stripe.subscriptionItems.createUsageRecord(
            itemId,
            { quantity: usage.billableCount, action: 'set', timestamp },
            { idempotencyKey: `usage_${tenantId}_${periodKey}` }
        );

        await query(
            `UPDATE tenant_billing_settings
             SET last_reported_at = NOW(), last_reported_quantity = ?
             WHERE tenant_id = ?`,
            [usage.billableCount, tenantId]
        );

        logger.info('Usage reported to Stripe', { tenantId, quantity: usage.billableCount, stripeRecordId: record.id });
        return { success: true, quantity: usage.billableCount, stripeRecordId: record.id };
    }

    /**
     * Lista tutti i tenant in pay_per_active (per cron job).
     */
    async listPayPerActiveTenants() {
        return query(
            `SELECT tenant_id FROM tenant_billing_settings WHERE billing_model = 'pay_per_active'`
        );
    }
}

module.exports = new BillingActiveService();
