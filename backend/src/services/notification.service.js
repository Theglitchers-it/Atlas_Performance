/**
 * Notification Service
 * Gestione notifiche in-app, push e email
 */

const { query } = require('../config/database');
const webpushService = require('./webpush.service');
const fcmService = require('./fcm.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('NOTIFICATION');

class NotificationService {
    constructor() {
        this.io = null;
    }

    /**
     * Imposta istanza Socket.io per push real-time
     */
    setIO(io) {
        this.io = io;
    }

    /**
     * Crea notifica
     */
    async create(data) {
        const {
            tenantId, userId, type, title, message,
            actionUrl, metadata, priority
        } = data;

        const result = await query(`
            INSERT INTO notifications
            (tenant_id, user_id, type, title, message, action_url, metadata, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId, userId, type || 'info', title, message,
            actionUrl || null, metadata ? JSON.stringify(metadata) : null,
            priority || 'normal'
        ]);

        // Push real-time via WebSocket
        if (this.io && userId) {
            this.io.to(`user_${userId}`).emit('notification', {
                id: result.insertId,
                type: type || 'info',
                title,
                message,
                actionUrl: actionUrl || null,
                priority: priority || 'normal',
                createdAt: new Date().toISOString()
            });
        }

        // Web Push notification (browser - in background, non blocca)
        if (userId) {
            webpushService.sendToUser(userId, {
                title,
                message,
                actionUrl: actionUrl || null,
                type: type || 'info'
            }).catch(err => logger.error('Web push error', { error: err.message }));

            // FCM Push notification (Android/iOS native - in background, non blocca)
            fcmService.sendToUser(userId, {
                title,
                message,
                actionUrl: actionUrl || null,
                type: type || 'info'
            }).catch(err => logger.error('FCM push error', { error: err.message }));
        }

        return { id: result.insertId };
    }

    /**
     * Crea notifica per tutti gli utenti di un tenant
     */
    async createBulk(tenantId, data) {
        const { type, title, message, actionUrl, userIds } = data;

        const values = userIds.map(uid => [tenantId, uid, type || 'info', title, message, actionUrl || null]);
        const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();

        await query(`
            INSERT INTO notifications (tenant_id, user_id, type, title, message, action_url)
            VALUES ${placeholders}
        `, flatValues);

        return { count: userIds.length };
    }

    /**
     * Ottieni notifiche per utente
     */
    async getByUser(userId, tenantId, options = {}) {
        const { page = 1, limit = 20, unreadOnly = false } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT * FROM notifications
            WHERE user_id = ? AND tenant_id = ?
        `;
        const params = [userId, tenantId];

        if (unreadOnly) {
            sql += ' AND is_read = FALSE';
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const notifications = await query(sql, params);

        // Count totale
        let countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND tenant_id = ?';
        const countParams = [userId, tenantId];
        if (unreadOnly) {
            countSql += ' AND is_read = FALSE';
        }
        const [countResult] = await query(countSql, countParams);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    /**
     * Conta notifiche non lette
     */
    async getUnreadCount(userId, tenantId) {
        const [result] = await query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND tenant_id = ? AND is_read = FALSE',
            [userId, tenantId]
        );
        return result.count;
    }

    /**
     * Segna come letta
     */
    async markAsRead(notificationId, userId) {
        await query(
            'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
    }

    /**
     * Segna tutte come lette
     */
    async markAllAsRead(userId, tenantId) {
        const result = await query(
            'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND tenant_id = ? AND is_read = FALSE',
            [userId, tenantId]
        );
        return { count: result.affectedRows };
    }

    /**
     * Elimina notifica
     */
    async delete(notificationId, userId) {
        const result = await query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Elimina notifiche vecchie (pulizia periodica)
     */
    async deleteOld(tenantId, daysOld = 90) {
        const result = await query(
            'DELETE FROM notifications WHERE tenant_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [tenantId, daysOld]
        );
        return { deleted: result.affectedRows };
    }

    // ============================================
    // PUSH NOTIFICATIONS
    // ============================================

    /**
     * Registra device token per push
     */
    async registerDeviceToken(userId, tenantId, data) {
        const { token, platform, deviceInfo } = data;

        // Upsert: se il token esiste già, aggiorna
        await query(`
            INSERT INTO push_device_tokens (tenant_id, user_id, token, platform, device_info)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE platform = VALUES(platform), device_info = VALUES(device_info), updated_at = NOW()
        `, [tenantId, userId, token, platform || 'web', deviceInfo ? JSON.stringify(deviceInfo) : null]);

        return { success: true };
    }

    /**
     * Rimuovi device token
     */
    async removeDeviceToken(userId, token) {
        await query('DELETE FROM push_device_tokens WHERE user_id = ? AND token = ?', [userId, token]);
    }

    /**
     * Ottieni token per un utente
     */
    async getDeviceTokens(userId) {
        return await query('SELECT token, platform FROM push_device_tokens WHERE user_id = ?', [userId]);
    }

    // ============================================
    // NOTIFICATION TEMPLATES
    // ============================================

    /**
     * Ottieni template notifica
     */
    async getTemplate(templateKey) {
        const rows = await query(
            'SELECT * FROM notification_templates WHERE template_key = ? AND is_active = TRUE LIMIT 1',
            [templateKey]
        );
        return rows[0] || null;
    }

    /**
     * Invia notifica da template
     */
    async sendFromTemplate(templateKey, userId, tenantId, variables = {}) {
        const template = await this.getTemplate(templateKey);
        if (!template) {
            logger.warn(`Template notifica non trovato: ${templateKey}`);
            return null;
        }

        // Replace variabili nel titolo e messaggio
        let title = template.title;
        let message = template.message;

        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            title = title.replace(new RegExp(placeholder, 'g'), value);
            message = message.replace(new RegExp(placeholder, 'g'), value);
        });

        return await this.create({
            tenantId,
            userId,
            type: template.type || 'info',
            title,
            message,
            actionUrl: template.action_url || null,
            priority: template.priority || 'normal'
        });
    }

    // ============================================
    // NOTIFICATION PREFERENZE
    // ============================================

    /**
     * Ottieni preferenze notifica utente
     */
    async getPreferences(userId, tenantId) {
        const rows = await query(
            'SELECT * FROM notification_preferences WHERE user_id = ? AND tenant_id = ?',
            [userId, tenantId]
        );
        return rows[0] || {
            email_enabled: true,
            push_enabled: true,
            in_app_enabled: true,
            workout_reminders: true,
            checkin_reminders: true,
            achievement_notifications: true,
            chat_notifications: true,
            marketing_emails: false
        };
    }

    /**
     * Aggiorna preferenze notifica
     */
    async updatePreferences(userId, tenantId, preferences) {
        const {
            emailEnabled, pushEnabled, inAppEnabled,
            workoutReminders, checkinReminders, achievementNotifications,
            chatNotifications, marketingEmails
        } = preferences;

        await query(`
            INSERT INTO notification_preferences
            (user_id, tenant_id, email_enabled, push_enabled, in_app_enabled,
             workout_reminders, checkin_reminders, achievement_notifications,
             chat_notifications, marketing_emails)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
             email_enabled = VALUES(email_enabled),
             push_enabled = VALUES(push_enabled),
             in_app_enabled = VALUES(in_app_enabled),
             workout_reminders = VALUES(workout_reminders),
             checkin_reminders = VALUES(checkin_reminders),
             achievement_notifications = VALUES(achievement_notifications),
             chat_notifications = VALUES(chat_notifications),
             marketing_emails = VALUES(marketing_emails)
        `, [
            userId, tenantId,
            emailEnabled !== false, pushEnabled !== false, inAppEnabled !== false,
            workoutReminders !== false, checkinReminders !== false,
            achievementNotifications !== false, chatNotifications !== false,
            marketingEmails === true
        ]);
    }
}

module.exports = new NotificationService();
