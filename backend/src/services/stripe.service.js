/**
 * Stripe Service
 * Gestione pagamenti Stripe per acquisto corsi video e abbonamenti piattaforma
 */

const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('STRIPE');

class StripeService {
    constructor() {
        this.stripe = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            logger.warn('STRIPE_SECRET_KEY mancante. Pagamenti Stripe disabilitati.');
            return;
        }

        this.stripe = require('stripe')(secretKey);
        this.initialized = true;
        logger.info('Inizializzato');
    }

    /**
     * Crea una Checkout Session per acquisto corso/video
     */
    async createCheckoutSession({ tenantId, userId, itemType, itemId, successUrl, cancelUrl }) {
        this.init();
        if (!this.stripe) throw new Error('Stripe non configurato');

        // Ottieni dettagli item
        let item;
        if (itemType === 'course') {
            const rows = await query('SELECT id, title, price, currency FROM courses WHERE id = ? AND tenant_id = ?', [itemId, tenantId]);
            item = rows[0];
        } else if (itemType === 'video') {
            const rows = await query('SELECT id, title, price, currency FROM videos WHERE id = ? AND tenant_id = ?', [itemId, tenantId]);
            item = rows[0];
        }

        if (!item) throw new Error('Elemento non trovato');
        if (!item.price || item.price <= 0) throw new Error('Elemento gratuito, non necessario il pagamento');

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: (item.currency || 'eur').toLowerCase(),
                    product_data: {
                        name: item.title,
                        description: `Acquisto ${itemType === 'course' ? 'corso' : 'video'}: ${item.title}`
                    },
                    unit_amount: Math.round(item.price * 100)
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: successUrl || `${process.env.FRONTEND_URL}/videos/courses/${itemId}?payment=success`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/videos/courses/${itemId}?payment=cancelled`,
            metadata: {
                tenant_id: String(tenantId),
                user_id: String(userId),
                item_type: itemType,
                item_id: String(itemId)
            }
        });

        return {
            sessionId: session.id,
            url: session.url
        };
    }

    /**
     * Gestisci webhook Stripe
     */
    async handleWebhook(rawBody, signature) {
        this.init();
        if (!this.stripe) throw new Error('Stripe non configurato');

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET mancante');

        const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

        // Idempotency check: skip already-processed events
        const [existing] = await query(
            'SELECT id FROM stripe_events WHERE event_id = ? LIMIT 1',
            [event.id]
        );
        if (existing) {
            return { received: true, type: event.type, duplicate: true };
        }

        // Record event before processing to prevent duplicates
        await query(
            'INSERT INTO stripe_events (event_id, event_type, processed_at) VALUES (?, ?, NOW())',
            [event.id, event.type]
        );

        switch (event.type) {
            case 'checkout.session.completed':
                await this._handleCheckoutCompleted(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this._handlePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this._handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this._handleInvoicePaymentFailed(event.data.object);
                break;
        }

        return { received: true, type: event.type };
    }

    /**
     * Gestisci checkout completato
     */
    async _handleCheckoutCompleted(session) {
        const { tenant_id, user_id, item_type } = session.metadata;

        // Plan upgrade
        if (item_type === 'plan_upgrade') {
            const { plan, max_clients } = session.metadata;
            await query(
                'UPDATE tenants SET subscription_plan = ?, subscription_status = ?, max_clients = ? WHERE id = ?',
                [plan, 'active', parseInt(max_clients), tenant_id]
            );

            // Registra fattura piattaforma
            await query(`
                INSERT INTO platform_invoices (tenant_id, amount, currency, period_start, period_end, plan_name, stripe_invoice_id, status)
                VALUES (?, ?, 'EUR', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), ?, ?, 'paid')
            `, [
                tenant_id,
                (session.amount_total || 0) / 100,
                plan,
                session.subscription || session.id
            ]);

            logger.info(`Piano upgrade completato: tenant ${tenant_id} -> ${plan}`);
            return;
        }

        // Acquisto video/corso
        const { item_id } = session.metadata;

        await query(`
            INSERT INTO video_purchases (tenant_id, user_id, purchasable_type, purchasable_id, amount, currency, status, stripe_session_id)
            VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
        `, [
            tenant_id, user_id, item_type, item_id,
            session.amount_total / 100,
            session.currency.toUpperCase(),
            session.id
        ]);

        await query(`
            INSERT INTO payments (tenant_id, client_id, amount, currency, payment_method, transaction_id, status, payment_date, notes)
            VALUES (?, (SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1), ?, ?, 'stripe', ?, 'completed', NOW(), ?)
        `, [
            tenant_id, user_id, tenant_id,
            session.amount_total / 100,
            session.currency.toUpperCase(),
            session.payment_intent,
            `Acquisto ${item_type}: ${item_id}`
        ]);

        logger.info(`Checkout completato: ${item_type} ${item_id} per user ${user_id}`);
    }

    /**
     * Gestisci pagamento fallito
     */
    async _handlePaymentFailed(paymentIntent) {
        logger.error(`Pagamento fallito: ${paymentIntent.id}`, { error: paymentIntent.last_payment_error?.message });
    }

    /**
     * Gestisci cancellazione abbonamento
     */
    async _handleSubscriptionDeleted(subscription) {
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) {
            logger.error('subscription.deleted senza tenant_id nei metadata');
            return;
        }

        await query(
            'UPDATE tenants SET subscription_status = ?, subscription_plan = ? WHERE id = ?',
            ['cancelled', 'free', tenantId]
        );

        logger.info(`Abbonamento cancellato per tenant ${tenantId}`);
    }

    /**
     * Gestisci fattura non pagata
     */
    async _handleInvoicePaymentFailed(invoice) {
        const tenantId = invoice.subscription_details?.metadata?.tenant_id
            || invoice.lines?.data?.[0]?.metadata?.tenant_id;

        if (tenantId) {
            await query(
                'UPDATE tenants SET subscription_status = ? WHERE id = ?',
                ['past_due', tenantId]
            );
            logger.error(`Fattura non pagata per tenant ${tenantId}: ${invoice.id}`);
        } else {
            logger.error(`Fattura non pagata: ${invoice.id} (tenant non identificato)`);
        }
    }

    /**
     * Crea una Checkout Session per upgrade piano tenant
     */
    async createPlanCheckoutSession({ tenantId, userId, plan, billingCycle, successUrl, cancelUrl }) {
        this.init();
        if (!this.stripe) throw new Error('Stripe non configurato');

        const plans = {
            starter: { monthly: 1900, yearly: 19000, label: 'Starter', maxClients: 15 },
            professional: { monthly: 3900, yearly: 39000, label: 'Professional (Pro)', maxClients: 50 },
            enterprise: { monthly: 7900, yearly: 79000, label: 'Enterprise', maxClients: 999 }
        };

        const selectedPlan = plans[plan];
        if (!selectedPlan) throw new Error('Piano non valido');

        const amount = billingCycle === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly;
        const interval = billingCycle === 'yearly' ? 'year' : 'month';

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Piano ${selectedPlan.label}`,
                        description: `Abbonamento ${selectedPlan.label} - fino a ${selectedPlan.maxClients} clienti`
                    },
                    unit_amount: amount,
                    recurring: { interval }
                },
                quantity: 1
            }],
            mode: 'subscription',
            success_url: successUrl || `${process.env.FRONTEND_URL}/settings?upgrade=success&plan=${plan}`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/settings?upgrade=cancelled`,
            metadata: {
                tenant_id: String(tenantId),
                user_id: String(userId),
                item_type: 'plan_upgrade',
                plan,
                max_clients: String(selectedPlan.maxClients)
            }
        });

        return {
            sessionId: session.id,
            url: session.url
        };
    }

    /**
     * Crea rimborso
     */
    async createRefund(paymentIntentId, amount = null) {
        this.init();
        if (!this.stripe) throw new Error('Stripe non configurato');

        const refundData = { payment_intent: paymentIntentId };
        if (amount) {
            refundData.amount = Math.round(amount * 100);
        }

        const refund = await this.stripe.refunds.create(refundData);
        return {
            id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
        };
    }
}

module.exports = new StripeService();
