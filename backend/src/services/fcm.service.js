/**
 * FCM Push Service
 * Invio notifiche push native (Android/iOS) tramite Firebase Cloud Messaging
 * Complementare a webpush.service.js che gestisce push browser (Web Push API)
 */

const { getMessaging } = require('../config/firebase');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('FCM');

class FCMService {
    /**
     * Invia push notification a un utente (dispositivi nativi Android/iOS)
     */
    async sendToUser(userId, payload) {
        const messaging = getMessaging();
        if (!messaging) return { sent: 0, failed: 0 };

        const tokens = await query(
            'SELECT id, token, platform FROM push_device_tokens WHERE user_id = ? AND platform IN (?, ?)',
            [userId, 'android', 'ios']
        );

        if (tokens.length === 0) return { sent: 0, failed: 0 };

        let sent = 0;
        let failed = 0;

        for (const device of tokens) {
            try {
                const message = {
                    token: device.token,
                    notification: {
                        title: payload.title || 'Atlas',
                        body: payload.message || payload.body || ''
                    },
                    data: {
                        url: payload.actionUrl || '/',
                        type: payload.type || 'info'
                    }
                };

                // Configurazione specifica per Android
                if (device.platform === 'android') {
                    message.android = {
                        priority: 'high',
                        notification: {
                            icon: 'ic_launcher',
                            color: '#ff4c00',
                            channelId: 'default',
                            sound: 'default'
                        }
                    };
                }

                // Configurazione specifica per iOS
                if (device.platform === 'ios') {
                    message.apns = {
                        headers: {
                            'apns-priority': '10'
                        },
                        payload: {
                            aps: {
                                badge: 1,
                                sound: 'default'
                            }
                        }
                    };
                }

                await messaging.send(message);
                sent++;
            } catch (error) {
                failed++;

                // Token non piu valido - rimuovilo dal database
                const invalidTokenErrors = [
                    'messaging/registration-token-not-registered',
                    'messaging/invalid-registration-token',
                    'messaging/mismatched-credential'
                ];

                if (invalidTokenErrors.includes(error.code)) {
                    await query('DELETE FROM push_device_tokens WHERE id = ?', [device.id]);
                    logger.info(`Token rimosso (${error.code}) per device ${device.id}`);
                } else {
                    logger.error(`Errore invio push a device ${device.id}`, { error: error.message });
                }
            }
        }

        return { sent, failed };
    }

    /**
     * Invia push a tutti gli utenti nativi di un tenant
     */
    async sendToTenant(tenantId, payload) {
        const messaging = getMessaging();
        if (!messaging) return { sent: 0, failed: 0 };

        const tokens = await query(
            `SELECT pdt.id, pdt.token, pdt.user_id, pdt.platform
             FROM push_device_tokens pdt
             JOIN users u ON pdt.user_id = u.id
             WHERE u.tenant_id = ? AND pdt.platform IN ('android', 'ios')`,
            [tenantId]
        );

        let sent = 0;
        let failed = 0;

        for (const device of tokens) {
            try {
                const message = {
                    token: device.token,
                    notification: {
                        title: payload.title || 'Atlas',
                        body: payload.message || payload.body || ''
                    },
                    data: {
                        url: payload.actionUrl || '/',
                        type: payload.type || 'info'
                    }
                };

                if (device.platform === 'android') {
                    message.android = {
                        priority: 'high',
                        notification: {
                            icon: 'ic_launcher',
                            color: '#ff4c00',
                            channelId: 'default',
                            sound: 'default'
                        }
                    };
                }

                if (device.platform === 'ios') {
                    message.apns = {
                        headers: { 'apns-priority': '10' },
                        payload: { aps: { badge: 1, sound: 'default' } }
                    };
                }

                await messaging.send(message);
                sent++;
            } catch (error) {
                failed++;
                const invalidTokenErrors = [
                    'messaging/registration-token-not-registered',
                    'messaging/invalid-registration-token'
                ];
                if (invalidTokenErrors.includes(error.code)) {
                    await query('DELETE FROM push_device_tokens WHERE id = ?', [device.id]);
                }
            }
        }

        return { sent, failed };
    }
}

module.exports = new FCMService();
