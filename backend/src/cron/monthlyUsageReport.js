/**
 * Cron Job: Monthly Usage Report (Fase 2 — pay per active)
 * Esegue il giorno 1 di ogni mese alle 02:00.
 * Per ogni tenant in billing_model='pay_per_active', invia il numero di clienti
 * billable a Stripe via subscriptionItems.createUsageRecord.
 */

const billingService = require('../services/billing-active.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CRON_USAGE_REPORT');

const CONCURRENCY = 10;
const RETRY_DELAYS_MS = [500, 2000, 8000];

const isRetryable = (err) =>
    err?.type === 'StripeRateLimitError' ||
    err?.type === 'StripeConnectionError' ||
    ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(err?.code);

async function reportWithRetry(tenantId) {
    let lastErr;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
            return await billingService.reportUsageToStripe(tenantId);
        } catch (err) {
            lastErr = err;
            if (!isRetryable(err) || attempt === RETRY_DELAYS_MS.length) throw err;
            await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
    }
    throw lastErr;
}

async function runMonthlyUsageReport() {
    logger.info('Monthly usage report: avvio');
    const startTime = Date.now();

    let success = 0;
    let skipped = 0;
    let failed = 0;

    const tenants = await billingService.listPayPerActiveTenants();
    logger.info(`Trovati ${tenants.length} tenant in pay_per_active`);

    // Parallel a chunk per non saturare Stripe (~100 req/s limit)
    for (let i = 0; i < tenants.length; i += CONCURRENCY) {
        const batch = tenants.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(t => reportWithRetry(t.tenant_id))
        );
        results.forEach((r, idx) => {
            const tenantId = batch[idx].tenant_id;
            if (r.status === 'fulfilled') {
                if (r.value.skipped) {
                    skipped++;
                    logger.warn(`Tenant ${tenantId} skipped: ${r.value.reason}`);
                } else {
                    success++;
                }
            } else {
                failed++;
                logger.error(`Errore report tenant ${tenantId}: ${r.reason?.message || r.reason}`);
            }
        });
    }

    const ms = Date.now() - startTime;
    logger.info(`Monthly usage report completato in ${ms}ms: ${success} ok, ${skipped} skipped, ${failed} fallite`);
    return { success, skipped, failed };
}

module.exports = { runMonthlyUsageReport };
