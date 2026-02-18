/**
 * Web Push Service
 * Invio notifiche push browser tramite Web Push API (VAPID)
 */

const webpush = require('web-push');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('WEBPUSH');

class WebPushService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inizializza VAPID keys
     */
    init() {
        if (this.initialized) return;

        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ptsaas.it';

        if (!publicKey || !privateKey) {
            logger.warn('VAPID keys mancanti. Push notifications disabilitate.');
            logger.warn('Genera le chiavi con: npx web-push generate-vapid-keys');
            return;
        }

        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.initialized = true;
        logger.info('VAPID configurato');
    }

    /**
     * Invia push notification a un utente
     */
    async sendToUser(userId, payload) {
        this.init();
        if (!this.initialized) return { sent: 0, failed: 0 };

        const tokens = await query(
            'SELECT id, token, platform FROM push_device_tokens WHERE user_id = ? AND platform = ?',
            [userId, 'web']
        );

        if (tokens.length === 0) return { sent: 0, failed: 0 };

        const notificationPayload = JSON.stringify({
            title: payload.title || 'PT SAAS',
            body: payload.message || payload.body || '',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
                url: payload.actionUrl || '/',
                type: payload.type || 'info'
            }
        });

        let sent = 0;
        let failed = 0;

        for (const device of tokens) {
            try {
                const subscription = JSON.parse(device.token);
                await webpush.sendNotification(subscription, notificationPayload);
                sent++;
            } catch (error) {
                failed++;
                // Se il token non e' piu' valido (410 Gone o 404), rimuovilo
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await query('DELETE FROM push_device_tokens WHERE id = ?', [device.id]);
                    logger.info(`Token rimosso (${error.statusCode}) per device ${device.id}`);
                } else {
                    logger.error(`Errore invio push a device ${device.id}`, { error: error.message });
                }
            }
        }

        return { sent, failed };
    }

    /**
     * Invia push a tutti gli utenti di un tenant
     */
    async sendToTenant(tenantId, payload) {
        this.init();
        if (!this.initialized) return { sent: 0, failed: 0 };

        const tokens = await query(
            `SELECT pdt.id, pdt.token, pdt.user_id, pdt.platform
             FROM push_device_tokens pdt
             JOIN users u ON pdt.user_id = u.id
             WHERE u.tenant_id = ? AND pdt.platform = 'web'`,
            [tenantId]
        );

        const notificationPayload = JSON.stringify({
            title: payload.title || 'PT SAAS',
            body: payload.message || payload.body || '',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
                url: payload.actionUrl || '/',
                type: payload.type || 'info'
            }
        });

        let sent = 0;
        let failed = 0;

        for (const device of tokens) {
            try {
                const subscription = JSON.parse(device.token);
                await webpush.sendNotification(subscription, notificationPayload);
                sent++;
            } catch (error) {
                failed++;
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await query('DELETE FROM push_device_tokens WHERE id = ?', [device.id]);
                }
            }
        }

        return { sent, failed };
    }

    /**
     * Ottieni VAPID public key per il frontend
     */
    getPublicKey() {
        return process.env.VAPID_PUBLIC_KEY || null;
    }
}

module.exports = new WebPushService();
