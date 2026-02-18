/**
 * Cron Job: checkAlerts
 * Esegue i 6 check di smart training alerts per tutti i clienti attivi
 * Da eseguire ogni 6 ore
 */

const { query } = require('../config/database');
const alertService = require('../services/alert.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CRON_ALERTS');

async function checkAllAlerts() {
    logger.info('checkAlerts: avvio controllo...');
    const startTime = Date.now();

    try {
        const tenants = await query('SELECT id FROM tenants WHERE status = ? OR status IS NULL', ['active']);

        let totalAlerts = 0;

        for (const tenant of tenants) {
            const clients = await query(`
                SELECT id FROM clients
                WHERE tenant_id = ? AND (status = 'active' OR status IS NULL)
            `, [tenant.id]);

            for (const client of clients) {
                try {
                    const alerts = await alertService.runAllChecks(client.id, tenant.id);
                    totalAlerts += alerts.length;
                } catch (err) {
                    logger.error(`checkAlerts errore client ${client.id}`, { error: err.message });
                }
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`checkAlerts: completato in ${elapsed}s`, { totalAlerts });
        return totalAlerts;
    } catch (error) {
        logger.error('checkAlerts errore', { error: error.message });
        return 0;
    }
}

module.exports = { checkAllAlerts };
