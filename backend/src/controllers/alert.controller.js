/**
 * Alert Controller
 * Gestione HTTP per smart training alerts
 */

const alertService = require('../services/alert.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('ALERTS');

class AlertController {
    /**
     * GET /api/alerts - Lista alert attivi per il trainer
     */
    async getAlerts(req, res, next) {
        try {
            const { clientId, severity, dismissed } = req.query;
            let data = [];
            try {
                data = await alertService.getAlerts(req.user.tenantId, {
                    clientId: clientId ? parseInt(clientId) : undefined,
                    severity,
                    dismissed: dismissed === 'true'
                });
            } catch (err) {
                // Se la tabella training_alerts non esiste, ritorna array vuoto
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    logger.warn('Tabella training_alerts non trovata. Ritorno array vuoto.');
                    data = [];
                } else {
                    throw err;
                }
            }
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/alerts/:clientId/check - Esegui check alert per un cliente
     */
    async runChecks(req, res, next) {
        try {
            const { clientId } = req.params;
            const alerts = await alertService.runAllChecks(clientId, req.user.tenantId);
            res.json({ success: true, data: { alerts, count: alerts.length } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/alerts/:alertId/dismiss - Dismissa un alert
     */
    async dismiss(req, res, next) {
        try {
            const { alertId } = req.params;
            const dismissed = await alertService.dismissAlert(alertId, req.user.tenantId);
            if (!dismissed) {
                return res.status(404).json({ success: false, message: 'Alert non trovato' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/alerts/client/:clientId/dismiss-all - Dismissa tutti per un cliente
     */
    async dismissAll(req, res, next) {
        try {
            const { clientId } = req.params;
            const data = await alertService.dismissAllForClient(clientId, req.user.tenantId);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AlertController();
