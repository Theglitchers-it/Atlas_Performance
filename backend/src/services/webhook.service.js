/**
 * Webhook Service
 * Gestione webhook per API pubblica
 * Invia notifiche HTTP a URL registrate quando si verificano eventi
 */

const crypto = require('crypto');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('WEBHOOK');

class WebhookService {
    /**
     * Eventi supportati
     */
    static EVENTS = [
        'client.created', 'client.updated', 'client.deleted',
        'payment.created', 'payment.completed', 'payment.failed',
        'appointment.created', 'appointment.updated', 'appointment.cancelled',
        'workout.completed', 'session.completed',
        'checkin.created',
        'achievement.unlocked'
    ];

    /**
     * Registra un nuovo webhook
     */
    async create(tenantId, data) {
        const { url, events } = data;

        // Genera secret per firma HMAC
        const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

        const result = await query(`
            INSERT INTO webhooks (tenant_id, url, events, secret)
            VALUES (?, ?, ?, ?)
        `, [tenantId, url, JSON.stringify(events), secret]);

        return {
            id: result.insertId,
            secret
        };
    }

    /**
     * Lista webhook per tenant
     */
    async list(tenantId) {
        return await query(
            'SELECT id, url, events, is_active, last_triggered_at, failure_count, created_at FROM webhooks WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );
    }

    /**
     * Aggiorna webhook
     */
    async update(webhookId, tenantId, data) {
        const { url, events, isActive } = data;
        await query(
            'UPDATE webhooks SET url = COALESCE(?, url), events = COALESCE(?, events), is_active = COALESCE(?, is_active) WHERE id = ? AND tenant_id = ?',
            [url || null, events ? JSON.stringify(events) : null, isActive !== undefined ? isActive : null, webhookId, tenantId]
        );
    }

    /**
     * Elimina webhook
     */
    async delete(webhookId, tenantId) {
        await query('DELETE FROM webhooks WHERE id = ? AND tenant_id = ?', [webhookId, tenantId]);
    }

    /**
     * Trigger un evento - invia a tutti i webhook registrati per quel tipo di evento
     */
    async trigger(tenantId, eventType, payload) {
        const webhooks = await query(
            'SELECT id, url, events, secret FROM webhooks WHERE tenant_id = ? AND is_active = TRUE',
            [tenantId]
        );

        for (const webhook of webhooks) {
            let events;
            try {
                events = typeof webhook.events === 'string' ? JSON.parse(webhook.events) : webhook.events;
            } catch {
                logger.error(`Invalid JSON in webhook ${webhook.id} events`);
                continue;
            }

            if (!events.includes(eventType)) continue;

            // Invia in background
            this._deliver(webhook, eventType, payload).catch(err =>
                logger.error(`Delivery error webhook ${webhook.id}`, { error: err.message })
            );
        }
    }

    /**
     * Consegna webhook (HTTP POST)
     */
    async _deliver(webhook, eventType, payload) {
        const body = JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload
        });

        // Genera firma HMAC
        const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(body)
            .digest('hex');

        let responseStatus = null;
        let responseBody = null;
        let success = false;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': `sha256=${signature}`,
                    'X-Webhook-Event': eventType,
                    'User-Agent': 'PT-SAAS-Webhook/1.0'
                },
                body,
                signal: controller.signal
            });

            clearTimeout(timeout);

            responseStatus = response.status;
            responseBody = await response.text().catch(() => '');
            success = response.ok;
        } catch (error) {
            responseBody = error.message;
        }

        // Log delivery
        await query(`
            INSERT INTO webhook_deliveries (webhook_id, event_type, payload, response_status, response_body, success)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [webhook.id, eventType, body, responseStatus, (responseBody || '').substring(0, 1000), success]);

        // Aggiorna webhook stats
        if (success) {
            await query(
                'UPDATE webhooks SET last_triggered_at = NOW(), failure_count = 0 WHERE id = ?',
                [webhook.id]
            );
        } else {
            await query(
                'UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = ?',
                [webhook.id]
            );

            // Disabilita dopo 10 fallimenti consecutivi
            await query(
                'UPDATE webhooks SET is_active = FALSE WHERE id = ? AND failure_count >= 10',
                [webhook.id]
            );
        }

        return { success, status: responseStatus };
    }

    /**
     * Ottieni log delivery per un webhook
     */
    async getDeliveries(webhookId, tenantId, limit = 20) {
        // Verifica che il webhook appartenga al tenant
        const [webhook] = await query('SELECT id FROM webhooks WHERE id = ? AND tenant_id = ?', [webhookId, tenantId]);
        if (!webhook) return [];

        return await query(
            'SELECT id, event_type, response_status, success, attempted_at FROM webhook_deliveries WHERE webhook_id = ? ORDER BY attempted_at DESC LIMIT ?',
            [webhookId, limit]
        );
    }
}

module.exports = new WebhookService();
