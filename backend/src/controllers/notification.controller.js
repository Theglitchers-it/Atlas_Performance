/**
 * Notification Controller
 */

const notificationService = require('../services/notification.service');

class NotificationController {
    async getNotifications(req, res, next) {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                unreadOnly: req.query.unreadOnly === 'true'
            };
            const result = await notificationService.getByUser(req.user.id, req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getUnreadCount(req, res, next) {
        try {
            const count = await notificationService.getUnreadCount(req.user.id, req.user.tenantId);
            res.json({ success: true, data: { count } });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req, res, next) {
        try {
            await notificationService.markAsRead(parseInt(req.params.id), req.user.id);
            res.json({ success: true, message: 'Notifica letta' });
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req, res, next) {
        try {
            const result = await notificationService.markAllAsRead(req.user.id, req.user.tenantId);
            res.json({ success: true, message: 'Tutte le notifiche segnate come lette', data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteNotification(req, res, next) {
        try {
            const deleted = await notificationService.delete(parseInt(req.params.id), req.user.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Notifica non trovata' });
            }
            res.json({ success: true, message: 'Notifica eliminata' });
        } catch (error) {
            next(error);
        }
    }

    async registerDeviceToken(req, res, next) {
        try {
            await notificationService.registerDeviceToken(req.user.id, req.user.tenantId, req.body);
            res.json({ success: true, message: 'Device registrato' });
        } catch (error) {
            next(error);
        }
    }

    async removeDeviceToken(req, res, next) {
        try {
            await notificationService.removeDeviceToken(req.user.id, req.body.token);
            res.json({ success: true, message: 'Device rimosso' });
        } catch (error) {
            next(error);
        }
    }

    async getPreferences(req, res, next) {
        try {
            const preferences = await notificationService.getPreferences(req.user.id, req.user.tenantId);
            res.json({ success: true, data: { preferences } });
        } catch (error) {
            next(error);
        }
    }

    async updatePreferences(req, res, next) {
        try {
            await notificationService.updatePreferences(req.user.id, req.user.tenantId, req.body);
            res.json({ success: true, message: 'Preferenze aggiornate' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
