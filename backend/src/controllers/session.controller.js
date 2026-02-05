/**
 * Session Controller
 */

const sessionService = require('../services/session.service');

class SessionController {
    async getByClient(req, res, next) {
        try {
            const options = {
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await sessionService.getByClient(
                parseInt(req.params.clientId),
                req.user.tenantId,
                options
            );
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const session = await sessionService.getById(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, data: { session } });
        } catch (error) {
            next(error);
        }
    }

    async start(req, res, next) {
        try {
            const result = await sessionService.start(req.user.tenantId, req.body);
            const session = await sessionService.getById(result.sessionId, req.user.tenantId);
            res.status(201).json({ success: true, message: 'Sessione iniziata', data: { session } });
        } catch (error) {
            next(error);
        }
    }

    async logSet(req, res, next) {
        try {
            const result = await sessionService.logSet(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async complete(req, res, next) {
        try {
            const session = await sessionService.complete(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, message: 'Sessione completata', data: { session } });
        } catch (error) {
            next(error);
        }
    }

    async skip(req, res, next) {
        try {
            await sessionService.skip(parseInt(req.params.id), req.user.tenantId, req.body.reason);
            res.json({ success: true, message: 'Sessione saltata' });
        } catch (error) {
            next(error);
        }
    }

    async getStats(req, res, next) {
        try {
            const stats = await sessionService.getStats(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.query.period || 'month'
            );
            res.json({ success: true, data: { stats } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SessionController();
