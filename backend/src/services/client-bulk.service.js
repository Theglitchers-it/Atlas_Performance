/**
 * Client Bulk Operations Service (Fase 8)
 * Operazioni di massa su gruppi di clienti, sempre scoped al tenant + audit log.
 * Hard limit 100 clienti per chiamata per evitare timeout.
 */

const { query, transaction } = require('../config/database');
const billingActiveService = require('./billing-active.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CLIENT_BULK');

const MAX_BULK_SIZE = 100;
const BULK_CONCURRENCY = 10;

async function runInChunks(items, worker, concurrency = BULK_CONCURRENCY) {
    let success = 0;
    let failed = 0;
    const errors = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        const results = await Promise.allSettled(chunk.map(worker));
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled') success++;
            else {
                failed++;
                errors.push({ clientId: chunk[idx], error: r.reason?.message || String(r.reason) });
            }
        });
    }
    return { success, failed, errors };
}

async function logStart({ tenantId, actorId, operationType, targetCount, payload = null }) {
    const result = await query(
        `INSERT INTO bulk_operation_log (tenant_id, actor_user_id, operation_type, target_count, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [tenantId, actorId, operationType, targetCount, payload ? JSON.stringify(payload) : null]
    );
    return result.insertId;
}

async function logEnd(logId, { successCount, failedCount, errorsSummary = null }) {
    await query(
        `UPDATE bulk_operation_log
         SET success_count = ?, failed_count = ?, errors_summary = ?, finished_at = NOW()
         WHERE id = ?`,
        [successCount, failedCount, errorsSummary ? JSON.stringify(errorsSummary) : null, logId]
    );
}

function validateClientIds(clientIds) {
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
        throw { status: 400, message: 'clientIds richiesto (array non vuoto)' };
    }
    if (clientIds.length > MAX_BULK_SIZE) {
        throw { status: 400, message: `Max ${MAX_BULK_SIZE} clienti per operazione bulk` };
    }
    return clientIds.map(id => parseInt(id, 10)).filter(Number.isFinite);
}

class ClientBulkService {

    /**
     * Genera link WhatsApp / mailto precompilati per N clienti.
     * Ritorna array di {clientId, channel, url}. Il client side aprirà i link.
     */
    async bulkNotify({ tenantId, actorId, clientIds, channel, message }) {
        const ids = validateClientIds(clientIds);
        if (!['whatsapp', 'email', 'sms'].includes(channel)) {
            throw { status: 400, message: 'channel non valido' };
        }
        const logId = await logStart({ tenantId, actorId, operationType: 'notify', targetCount: ids.length, payload: { channel } });

        const placeholders = ids.map(() => '?').join(',');
        const clients = await query(
            `SELECT id, first_name, last_name, email, phone FROM clients
             WHERE tenant_id = ? AND id IN (${placeholders})`,
            [tenantId, ...ids]
        );

        const links = clients.map(c => {
            const personalized = (message || '')
                .replace(/\{\{nome\}\}/g, c.first_name || '')
                .replace(/\{\{cognome\}\}/g, c.last_name || '');
            if (channel === 'whatsapp' && c.phone) {
                const intl = String(c.phone).replace(/[^\d]/g, '').replace(/^0+/, '');
                const num = intl.length >= 11 ? intl : '39' + intl;
                return { clientId: c.id, channel, url: `https://wa.me/${num}?text=${encodeURIComponent(personalized)}` };
            }
            if (channel === 'email' && c.email) {
                return { clientId: c.id, channel, url: `mailto:${c.email}?body=${encodeURIComponent(personalized)}` };
            }
            return { clientId: c.id, channel, url: null, skipped: true, reason: channel === 'whatsapp' ? 'no_phone' : 'no_email' };
        });

        const failed = links.filter(l => l.skipped).length;
        await logEnd(logId, { successCount: links.length - failed, failedCount: failed });
        return { links, success: links.length - failed, failed };
    }

    async bulkActivate({ tenantId, actorId, clientIds, reason }) {
        const ids = validateClientIds(clientIds);
        const logId = await logStart({ tenantId, actorId, operationType: 'activate', targetCount: ids.length, payload: { reason } });
        const { success, failed, errors } = await runInChunks(ids, (id) =>
            billingActiveService.activateClient({ tenantId, clientId: id, actorUserId: actorId, reason })
        );
        await logEnd(logId, { successCount: success, failedCount: failed, errorsSummary: errors.slice(0, 10) });
        return { success, failed, errors };
    }

    async bulkDeactivate({ tenantId, actorId, clientIds, reason }) {
        const ids = validateClientIds(clientIds);
        const logId = await logStart({ tenantId, actorId, operationType: 'deactivate', targetCount: ids.length, payload: { reason } });
        const { success, failed, errors } = await runInChunks(ids, (id) =>
            billingActiveService.deactivateClient({ tenantId, clientId: id, actorUserId: actorId, reason })
        );
        await logEnd(logId, { successCount: success, failedCount: failed, errorsSummary: errors.slice(0, 10) });
        return { success, failed, errors };
    }

    async bulkChangeStatus({ tenantId, actorId, clientIds, newStatus }) {
        const ids = validateClientIds(clientIds);
        if (!['active', 'inactive', 'paused', 'cancelled'].includes(newStatus)) {
            throw { status: 400, message: 'newStatus non valido' };
        }
        const logId = await logStart({ tenantId, actorId, operationType: 'change_status', targetCount: ids.length, payload: { newStatus } });
        const placeholders = ids.map(() => '?').join(',');
        const result = await query(
            `UPDATE clients SET status = ? WHERE tenant_id = ? AND id IN (${placeholders})`,
            [newStatus, tenantId, ...ids]
        );
        const success = result.affectedRows;
        await logEnd(logId, { successCount: success, failedCount: ids.length - success });
        return { success, failed: ids.length - success };
    }

    async bulkAssignProgram({ tenantId, actorId, clientIds, programId, startDate }) {
        const ids = validateClientIds(clientIds);
        const logId = await logStart({ tenantId, actorId, operationType: 'assign_program', targetCount: ids.length, payload: { programId, startDate } });
        const sDate = startDate || new Date().toISOString().slice(0, 10);
        // Single multi-row INSERT: ~10× più veloce di N INSERT round-trip
        const placeholders = ids.map(() => '(?, ?, ?, ?, \'active\')').join(',');
        const params = ids.flatMap(id => [tenantId, id, programId, sDate]);
        try {
            const result = await query(
                `INSERT INTO client_programs (tenant_id, client_id, program_id, start_date, status)
                 VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE status='active', start_date=VALUES(start_date)`,
                params
            );
            const success = result.affectedRows || ids.length;
            await logEnd(logId, { successCount: success, failedCount: 0 });
            return { success, failed: 0, errors: [] };
        } catch (err) {
            await logEnd(logId, { successCount: 0, failedCount: ids.length, errorsSummary: [{ error: err.message }] });
            throw err;
        }
    }
}

module.exports = new ClientBulkService();
module.exports.MAX_BULK_SIZE = MAX_BULK_SIZE;
