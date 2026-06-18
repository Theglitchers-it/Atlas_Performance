/**
 * Cron Job: recomputeTags
 * Ricalcola i tag automatici di fidelizzazione (nuovo/medio/top/vecchio/dormiente)
 * per tutti i clienti attivi di tutti i tenant.
 * Da eseguire ogni notte (evita che tag drifting con passare del tempo).
 */

const { query } = require('../config/database');
const clientTagsService = require('../services/clientTags.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CRON_TAGS');

async function recomputeAllTags() {
    logger.info('recomputeTags: avvio ricalcolo tag per tutti i tenant...');
    const startTime = Date.now();

    try {
        const tenants = await query(
            'SELECT id FROM tenants WHERE status = ? OR status IS NULL',
            ['active']
        );

        let totalAssignments = 0;
        let totalClients = 0;
        let tenantsProcessed = 0;

        for (const tenant of tenants) {
            try {
                const result = await clientTagsService.recomputeAutoTags(tenant.id);
                totalAssignments += result.assignments;
                totalClients += result.clients;
                tenantsProcessed++;
            } catch (err) {
                logger.error(`recomputeTags errore tenant ${tenant.id}`, { error: err.message });
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`recomputeTags: completato in ${elapsed}s`, {
            tenantsProcessed,
            totalClients,
            totalAssignments
        });
        return { tenantsProcessed, totalClients, totalAssignments };
    } catch (error) {
        logger.error('recomputeTags errore globale', { error: error.message });
        return null;
    }
}

module.exports = { recomputeAllTags };
