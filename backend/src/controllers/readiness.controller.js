/**
 * Readiness Controller
 */

const readinessService = require('../services/readiness.service');

// Il clientId è validato e autorizzato a monte dal param handler requireClientAccess
// (vedi readiness.routes.js): qui si usa req.clientId, l'intero già verificato per
// ownership/tenant. Niente più parse locale (404 coerente al posto del vecchio 400).

class ReadinessController {
    async getToday(req, res, next) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const checkin = await readinessService.getCheckin(
                req.clientId,
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
                req.clientId,
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
                req.clientId,
                req.user.tenantId,
                req.body
            );

            // Check for alerts
            await readinessService.checkReadinessAlerts(
                req.clientId,
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
                req.clientId,
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
