/**
 * Analytics Controller
 * Gestione HTTP per statistiche e reportistica
 */

const analyticsService = require('../services/analytics.service');

class AnalyticsController {
    /**
     * GET /api/analytics/overview - Overview generale
     */
    async getOverview(req, res, next) {
        try {
            const data = await analyticsService.getOverview(req.user.tenantId);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/sessions-trend - Trend sessioni
     */
    async getSessionTrend(req, res, next) {
        try {
            const { groupBy } = req.query;
            const data = await analyticsService.getSessionTrend(req.user.tenantId, groupBy || 'week');
            res.json({ success: true, data: { trend: data } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/top-clients - Clienti piu attivi
     */
    async getTopClients(req, res, next) {
        try {
            const { limit } = req.query;
            const data = await analyticsService.getTopClients(req.user.tenantId, limit || 10);
            res.json({ success: true, data: { clients: data } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/top-clients-progress - Top clienti con progressi
     */
    async getTopClientsProgress(req, res, next) {
        try {
            const { limit } = req.query;
            const data = await analyticsService.getTopClientsProgress(req.user.tenantId, limit || 5);
            res.json({ success: true, data: { clients: data } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/appointments-distribution - Distribuzione appuntamenti
     */
    async getAppointmentDistribution(req, res, next) {
        try {
            const data = await analyticsService.getAppointmentDistribution(req.user.tenantId);
            res.json({ success: true, data: { distribution: data } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/readiness-trend - Trend readiness
     */
    async getReadinessTrend(req, res, next) {
        try {
            const data = await analyticsService.getReadinessTrend(req.user.tenantId);
            res.json({ success: true, data: { trend: data } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/program-completion - Completamento programmi
     */
    async getProgramCompletion(req, res, next) {
        try {
            const data = await analyticsService.getProgramCompletion(req.user.tenantId);
            res.json({ success: true, data: { completion: data } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/quick-stats - Stats rapide
     */
    async getQuickStats(req, res, next) {
        try {
            const data = await analyticsService.getQuickStats(req.user.tenantId);
            res.json({ success: true, data: { stats: data } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AnalyticsController();
