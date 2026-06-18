/**
 * Client Tags Service
 * Tag di segmentazione clienti (fidelizzazione): nuovo / medio / top / vecchio / dormiente
 * + tag manuali custom.
 */

const { query, transaction } = require('../config/database');

const AUTO_TAGS = ['nuovo', 'medio', 'top', 'vecchio', 'dormiente'];

class ClientTagsService {
    async getTagsForClient(clientId, tenantId) {
        const rows = await query(
            `SELECT tag, auto_assigned FROM client_tags WHERE tenant_id = ? AND client_id = ?`,
            [tenantId, clientId]
        );
        return rows;
    }

    async addTag(clientId, tenantId, tag, autoAssigned = false) {
        const result = await query(
            `INSERT IGNORE INTO client_tags (tenant_id, client_id, tag, auto_assigned) VALUES (?, ?, ?, ?)`,
            [tenantId, clientId, tag.toLowerCase().trim(), autoAssigned ? 1 : 0]
        );
        return result.affectedRows > 0;
    }

    async removeTag(clientId, tenantId, tag, onlyManual = true) {
        const manualClause = onlyManual ? 'AND auto_assigned = 0' : '';
        const result = await query(
            `DELETE FROM client_tags WHERE tenant_id = ? AND client_id = ? AND tag = ? ${manualClause}`,
            [tenantId, clientId, tag.toLowerCase().trim()]
        );
        return result.affectedRows > 0;
    }

    /**
     * Ricalcola i tag auto per TUTTI i clienti attivi del tenant.
     * Strategia: per ogni cliente, determina i tag auto corretti, poi DELETE old auto + INSERT new.
     */
    async recomputeAutoTags(tenantId) {
        const clients = await query(
            `SELECT c.id, c.status, c.created_at,
                    lt.lifetime_months, lt.first_sub_date, lt.days_since_last_end,
                    (SELECT COUNT(*) FROM client_subscriptions cs2
                     WHERE cs2.client_id = c.id AND cs2.tenant_id = ? AND cs2.status = 'active') AS has_active_sub
             FROM clients c
             LEFT JOIN (
                SELECT client_id,
                       ROUND(SUM(DATEDIFF(end_date, start_date) / 30.44), 1) AS lifetime_months,
                       MIN(start_date) AS first_sub_date,
                       DATEDIFF(CURDATE(), MAX(end_date)) AS days_since_last_end
                FROM client_subscriptions
                WHERE tenant_id = ?
                GROUP BY client_id
             ) lt ON c.id = lt.client_id
             WHERE c.tenant_id = ?`,
            [tenantId, tenantId, tenantId]
        );

        const newAssignments = [];
        for (const c of clients) {
            const tags = [];

            const months = Number(c.lifetime_months) || 0;
            const daysSinceSignup = Math.floor(
                (Date.now() - new Date(c.created_at).getTime()) / (24 * 60 * 60 * 1000)
            );

            // Nuovo: appena registrato E con poca storia (mutuamente esclusivo con medio/top)
            if (daysSinceSignup <= 30 && months < 3) tags.push('nuovo');

            if (months >= 12) tags.push('top');
            else if (months >= 3) tags.push('medio');

            if (c.first_sub_date) {
                const daysSinceFirst = Math.floor(
                    (Date.now() - new Date(c.first_sub_date).getTime()) / (24 * 60 * 60 * 1000)
                );
                if (daysSinceFirst >= 365) tags.push('vecchio');
            }

            const daysSinceLastEnd = Number(c.days_since_last_end);
            if (!c.has_active_sub && daysSinceLastEnd > 30) tags.push('dormiente');

            for (const tag of tags) {
                newAssignments.push([c.id, tag]);
            }
        }

        await transaction(async (conn) => {
            await conn.execute(
                `DELETE FROM client_tags WHERE tenant_id = ? AND auto_assigned = 1`,
                [tenantId]
            );

            const CHUNK_SIZE = 500;
            for (let i = 0; i < newAssignments.length; i += CHUNK_SIZE) {
                const chunk = newAssignments.slice(i, i + CHUNK_SIZE);
                const placeholders = chunk.map(() => '(?, ?, ?, 1)').join(', ');
                const flatParams = chunk.flatMap(([cid, tag]) => [tenantId, cid, tag]);
                await conn.execute(
                    `INSERT IGNORE INTO client_tags (tenant_id, client_id, tag, auto_assigned) VALUES ${placeholders}`,
                    flatParams
                );
            }
        });

        return { clients: clients.length, assignments: newAssignments.length };
    }
}

module.exports = new ClientTagsService();
module.exports.AUTO_TAGS = AUTO_TAGS;
