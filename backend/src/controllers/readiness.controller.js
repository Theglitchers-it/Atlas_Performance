/**
 * Readiness Controller
 */

const readinessService = require('../services/readiness.service');

class ReadinessController {
    async getToday(req, res, next) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const checkin = await readinessService.getCheckin(
                parseInt(req.params.clientId),
                req.user.tenantId,
                today
            );
            res.json({ success: true, data: { checkin } });
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req, res, next) {
        try {
            const options = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: parseInt(req.query.limit) || 30
            };
            const checkins = await readinessService.getHistory(
                parseInt(req.params.clientId),
                req.user.tenantId,
                options
            );
            res.json({ success: true, data: { checkins } });
        } catch (error) {
            next(error);
        }
    }

    async saveCheckin(req, res, next) {
        try {
            const checkin = await readinessService.saveCheckin(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );

            // Check for alerts
            await readinessService.checkReadinessAlerts(
                parseInt(req.params.clientId),
                req.user.tenantId
            );

            res.json({ success: true, message: 'Check-in salvato', data: { checkin } });
        } catch (error) {
            next(error);
        }
    }

    async getAverage(req, res, next) {
        try {
            const days = parseInt(req.query.days) || 7;
            const average = await readinessService.getAverageReadiness(
                parseInt(req.params.clientId),
                req.user.tenantId,
                days
            );
            res.json({ success: true, data: { average } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReadinessController();
