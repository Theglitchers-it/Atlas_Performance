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
     * @returns {Object} Risultati raggruppati per categoria
     */
    async globalSearch(tenantId, query, role) {
        const db = getPool();
        const searchTerm = `%${query.replace(/[%_]/g, '\\$&')}%`;

        // Esegui le ricerche in parallelo
        const [clients, exercises, workouts] = await Promise.all([
            this.searchClients(db, tenantId, searchTerm, role),
            this.searchExercises(db, tenantId, searchTerm),
            this.searchWorkouts(db, tenantId, searchTerm, role)
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
     * Cerca workout templates
     */
    async searchWorkouts(db, tenantId, searchTerm, role) {
        try {
            let query;
            let params;

            if (role === 'client') {
                // Client vede solo i propri workout assegnati
                query = `SELECT wt.id, wt.name
                         FROM workout_templates wt
                         WHERE wt.tenant_id = ?
                           AND wt.name LIKE ?
                         ORDER BY wt.name ASC
                         LIMIT 5`;
                params = [tenantId, searchTerm];
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
            logger.error('Errore ricerca workout', { error: err.message });
            return [];
        }
    }
}

module.exports = new SearchService();
