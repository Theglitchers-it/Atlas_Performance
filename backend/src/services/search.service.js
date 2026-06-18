/**
 * Search Service
 * Ricerca globale multi-tabella
 */

const { getPool } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('SEARCH');

class SearchService {
    /**
     * Ricerca globale su clienti, esercizi e workout templates
     * @param {number} tenantId - ID tenant
     * @param {string} query - Stringa di ricerca
     * @param {string} role - Ruolo utente (tenant_owner, staff, client)
     * @param {number} userId - ID utente loggato (richiesto per role=client per filtrare client_programs)
     * @returns {Object} Risultati raggruppati per categoria
     */
    async globalSearch(tenantId, query, role, userId) {
        const db = getPool();
        const searchTerm = `%${query.replace(/[%_]/g, '\\$&')}%`;

        // Esegui le ricerche in parallelo
        const [clients, exercises, workouts] = await Promise.all([
            this.searchClients(db, tenantId, searchTerm, role),
            this.searchExercises(db, tenantId, searchTerm),
            this.searchWorkouts(db, tenantId, searchTerm, role, userId)
        ]);

        return { clients, exercises, workouts };
    }

    /**
     * Cerca clienti
     */
    async searchClients(db, tenantId, searchTerm, role) {
        // I clienti possono cercare solo se stessi o non cercare clienti affatto
        if (role === 'client') return [];

        try {
            const [rows] = await db.execute(
                `SELECT id, CONCAT(first_name, ' ', last_name) AS name, email
                 FROM clients
                 WHERE tenant_id = ?
                   AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR CONCAT(first_name, ' ', last_name) LIKE ?)
                 ORDER BY first_name ASC
                 LIMIT 5`,
                [tenantId, searchTerm, searchTerm, searchTerm, searchTerm]
            );
            return rows;
        } catch (err) {
            logger.error('Errore ricerca clienti', { error: err.message });
            return [];
        }
    }

    /**
     * Cerca esercizi
     */
    async searchExercises(db, tenantId, searchTerm) {
        try {
            const [rows] = await db.execute(
                `SELECT id, name
                 FROM exercises
                 WHERE (tenant_id = ? OR tenant_id IS NULL)
                   AND name LIKE ?
                 ORDER BY name ASC
                 LIMIT 5`,
                [tenantId, searchTerm]
            );
            return rows;
        } catch (err) {
            logger.error('Errore ricerca esercizi', { error: err.message });
            return [];
        }
    }

    /**
     * Cerca workout / schede.
     * - role=client: cerca i propri client_programs assegnati (active/draft/paused)
     * - altri ruoli: cerca workout_templates del tenant
     */
    async searchWorkouts(db, tenantId, searchTerm, role, userId) {
        try {
            let query;
            let params;

            if (role === 'client') {
                // Il cliente vede solo le proprie schede assegnate (client_programs)
                // Lookup client_id via clients.user_id per evitare di esporre id altrui
                query = `SELECT cp.id, cp.name
                         FROM client_programs cp
                         INNER JOIN clients c ON c.id = cp.client_id
                         WHERE cp.tenant_id = ?
                           AND c.tenant_id = ?
                           AND c.user_id = ?
                           AND cp.status IN ('active','draft','paused')
                           AND cp.name LIKE ?
                         ORDER BY
                           CASE cp.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
                           cp.start_date DESC
                         LIMIT 5`;
                params = [tenantId, tenantId, userId, searchTerm];
            } else {
                query = `SELECT id, name
                         FROM workout_templates
                         WHERE tenant_id = ?
                           AND name LIKE ?
                         ORDER BY name ASC
                         LIMIT 5`;
                params = [tenantId, searchTerm];
            }

            const [rows] = await db.execute(query, params);
            return rows;
        } catch (err) {
            logger.error('Errore ricerca workout', {
                error: err.message,
                code: err.code,
                sqlMessage: err.sqlMessage,
                role,
                userId
            });
            return [];
        }
    }
}

module.exports = new SearchService();
