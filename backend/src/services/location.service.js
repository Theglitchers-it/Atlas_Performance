/**
 * Location Service
 * Gestione sedi/location multi-sede per Personal Trainer
 */

const { query, transaction } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('LOCATION');

class LocationService {
    /**
     * Crea una nuova sede
     * @param {string} tenantId
     * @param {Object} data - Dati della sede
     * @returns {Object} sede creata
     */
    async create(tenantId, data) {
        try {
            const {
                name,
                address,
                city,
                postalCode,
                province,
                country = 'Italia',
                phone,
                email,
                isOnline = false,
                capacity,
                openingHours,
                amenities,
                notes
            } = data;

            // Validazione
            if (!name || name.trim().length === 0) {
                throw { status: 400, message: 'Il nome della sede è obbligatorio' };
            }

            // Verifica se esiste già una sede con lo stesso nome per questo tenant
            const existing = await query(
                'SELECT id FROM locations WHERE tenant_id = ? AND name = ? AND status = "active"',
                [tenantId, name.trim()]
            );

            if (existing.length > 0) {
                throw {
                    status: 409,
                    message: 'Esiste già una sede attiva con questo nome'
                };
            }

            // Inserisci nuova sede
            const result = await query(
                `INSERT INTO locations
                 (tenant_id, name, address, city, postal_code, province, country,
                  phone, email, is_online, capacity, opening_hours, amenities, notes, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
                [
                    tenantId,
                    name.trim(),
                    address || null,
                    city || null,
                    postalCode || null,
                    province || null,
                    country,
                    phone || null,
                    email || null,
                    isOnline ? 1 : 0,
                    capacity || null,
                    openingHours ? JSON.stringify(openingHours) : null,
                    amenities ? JSON.stringify(amenities) : null,
                    notes || null
                ]
            );

            const locationId = result.insertId;

            return await this.getById(locationId, tenantId);

        } catch (error) {
            logger.error('Errore creazione sede', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante la creazione della sede',
                details: error.message
            };
        }
    }

    /**
     * Ottieni tutte le sedi del tenant
     * @param {string} tenantId
     * @param {Object} options - Filtri e paginazione
     * @returns {Object} lista sedi con paginazione
     */
    async getAll(tenantId, options = {}) {
        try {
            const {
                status = 'active',
                city = null,
                isOnline = null,
                search = null,
                page = 1,
                limit = 50
            } = options;

            const offset = (page - 1) * limit;

            let sql = `
                SELECT l.*,
                       (SELECT COUNT(*) FROM clients c
                        WHERE c.training_location = l.id AND c.tenant_id = l.tenant_id AND c.status = 'active') as client_count,
                       (SELECT COUNT(*) FROM classes cls
                        WHERE cls.location_id = l.id AND cls.tenant_id = l.tenant_id AND cls.status = 'scheduled') as scheduled_classes
                FROM locations l
                WHERE l.tenant_id = ?
            `;
            const params = [tenantId];

            // Filtri
            if (status) {
                sql += ' AND l.status = ?';
                params.push(status);
            }

            if (city) {
                sql += ' AND l.city = ?';
                params.push(city);
            }

            if (isOnline !== null) {
                sql += ' AND l.is_online = ?';
                params.push(isOnline ? 1 : 0);
            }

            if (search) {
                sql += ' AND (l.name LIKE ? OR l.city LIKE ? OR l.address LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            // Count totale
            const countSql = sql.replace(/SELECT.*FROM/s, 'SELECT COUNT(*) as total FROM');
            const countResult = await query(countSql, params);
            const total = countResult[0]?.total || 0;

            // Aggiungi ordinamento e paginazione
            sql += ' ORDER BY l.name ASC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const locations = await query(sql, params);

            // Parsa i campi JSON
            const parsedLocations = locations.map(loc => this._parseLocationData(loc));

            return {
                locations: parsedLocations,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Errore recupero sedi', { error: error.message });

            throw {
                status: 500,
                message: 'Errore durante il recupero delle sedi',
                details: error.message
            };
        }
    }

    /**
     * Ottieni sede per ID
     * @param {number} locationId
     * @param {string} tenantId
     * @returns {Object} dettagli sede
     */
    async getById(locationId, tenantId) {
        try {
            const locations = await query(
                `SELECT l.*,
                        (SELECT COUNT(*) FROM clients c
                         WHERE c.training_location = l.id AND c.tenant_id = l.tenant_id AND c.status = 'active') as client_count,
                        (SELECT COUNT(*) FROM classes cls
                         WHERE cls.location_id = l.id AND cls.tenant_id = l.tenant_id AND cls.status = 'scheduled') as scheduled_classes
                 FROM locations l
                 WHERE l.id = ? AND l.tenant_id = ?`,
                [locationId, tenantId]
            );

            if (locations.length === 0) {
                throw { status: 404, message: 'Sede non trovata' };
            }

            return this._parseLocationData(locations[0]);

        } catch (error) {
            logger.error('Errore recupero sede', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante il recupero della sede',
                details: error.message
            };
        }
    }

    /**
     * Aggiorna una sede
     * @param {number} locationId
     * @param {string} tenantId
     * @param {Object} data - Dati da aggiornare
     * @returns {Object} sede aggiornata
     */
    async update(locationId, tenantId, data) {
        try {
            // Verifica esistenza
            await this.getById(locationId, tenantId);

            const {
                name,
                address,
                city,
                postalCode,
                province,
                country,
                phone,
                email,
                isOnline,
                capacity,
                openingHours,
                amenities,
                notes,
                status
            } = data;

            // Verifica unicità nome se viene modificato
            if (name) {
                const existing = await query(
                    `SELECT id FROM locations
                     WHERE tenant_id = ? AND name = ? AND id != ? AND status = 'active'`,
                    [tenantId, name.trim(), locationId]
                );

                if (existing.length > 0) {
                    throw {
                        status: 409,
                        message: 'Esiste già una sede attiva con questo nome'
                    };
                }
            }

            await query(
                `UPDATE locations SET
                    name = COALESCE(?, name),
                    address = COALESCE(?, address),
                    city = COALESCE(?, city),
                    postal_code = COALESCE(?, postal_code),
                    province = COALESCE(?, province),
                    country = COALESCE(?, country),
                    phone = COALESCE(?, phone),
                    email = COALESCE(?, email),
                    is_online = COALESCE(?, is_online),
                    capacity = COALESCE(?, capacity),
                    opening_hours = COALESCE(?, opening_hours),
                    amenities = COALESCE(?, amenities),
                    notes = COALESCE(?, notes),
                    status = COALESCE(?, status),
                    updated_at = NOW()
                 WHERE id = ? AND tenant_id = ?`,
                [
                    name ? name.trim() : null,
                    address,
                    city,
                    postalCode,
                    province,
                    country,
                    phone,
                    email,
                    isOnline !== undefined ? (isOnline ? 1 : 0) : null,
                    capacity,
                    openingHours ? JSON.stringify(openingHours) : null,
                    amenities ? JSON.stringify(amenities) : null,
                    notes,
                    status,
                    locationId,
                    tenantId
                ]
            );

            return await this.getById(locationId, tenantId);

        } catch (error) {
            logger.error('Errore aggiornamento sede', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante l\'aggiornamento della sede',
                details: error.message
            };
        }
    }

    /**
     * Elimina una sede (soft delete)
     * @param {number} locationId
     * @param {string} tenantId
     * @returns {Object} risultato
     */
    async delete(locationId, tenantId) {
        try {
            // Verifica esistenza
            await this.getById(locationId, tenantId);

            // Verifica se ci sono clienti o classi attive
            const [clientCount] = await query(
                `SELECT COUNT(*) as count FROM clients
                 WHERE training_location = ? AND tenant_id = ? AND status = 'active'`,
                [locationId, tenantId]
            );

            if (clientCount.count > 0) {
                throw {
                    status: 400,
                    message: `Impossibile eliminare la sede: ci sono ${clientCount.count} clienti attivi associati`
                };
            }

            const [classCount] = await query(
                `SELECT COUNT(*) as count FROM classes
                 WHERE location_id = ? AND tenant_id = ? AND status IN ('scheduled', 'in_progress')`,
                [locationId, tenantId]
            );

            if (classCount.count > 0) {
                throw {
                    status: 400,
                    message: `Impossibile eliminare la sede: ci sono ${classCount.count} classi programmate`
                };
            }

            // Soft delete
            await query(
                'UPDATE locations SET status = "inactive", updated_at = NOW() WHERE id = ? AND tenant_id = ?',
                [locationId, tenantId]
            );

            return { success: true, message: 'Sede eliminata con successo' };

        } catch (error) {
            logger.error('Errore eliminazione sede', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante l\'eliminazione della sede',
                details: error.message
            };
        }
    }

    /**
     * Ottieni clienti associati a una sede
     * @param {number} locationId
     * @param {string} tenantId
     * @param {Object} options - Filtri e paginazione
     * @returns {Object} lista clienti
     */
    async getClientsByLocation(locationId, tenantId, options = {}) {
        try {
            // Verifica esistenza sede
            await this.getById(locationId, tenantId);

            const { status = 'active', page = 1, limit = 50 } = options;
            const offset = (page - 1) * limit;

            let sql = `
                SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
                       c.status, c.fitness_level, c.primary_goal, c.created_at,
                       u.first_name as assigned_first_name,
                       u.last_name as assigned_last_name
                FROM clients c
                LEFT JOIN users u ON c.assigned_to = u.id
                WHERE c.training_location = ? AND c.tenant_id = ?
            `;
            const params = [locationId, tenantId];

            if (status) {
                sql += ' AND c.status = ?';
                params.push(status);
            }

            // Count totale
            const countSql = sql.replace(/SELECT.*FROM/s, 'SELECT COUNT(*) as total FROM');
            const countResult = await query(countSql, params);
            const total = countResult[0]?.total || 0;

            // Paginazione
            sql += ' ORDER BY c.last_name, c.first_name LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const clients = await query(sql, params);

            return {
                clients,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Errore recupero clienti per sede', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante il recupero dei clienti',
                details: error.message
            };
        }
    }

    /**
     * Ottieni statistiche per ogni sede
     * @param {string} tenantId
     * @returns {Array} statistiche per sede
     */
    async getStatsByLocation(tenantId) {
        try {
            const stats = await query(
                `SELECT
                    l.id,
                    l.name,
                    l.city,
                    l.is_online,
                    l.status,
                    COUNT(DISTINCT c.id) as total_clients,
                    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clients,
                    COUNT(DISTINCT cls.id) as total_classes,
                    COUNT(DISTINCT CASE WHEN cls.status = 'scheduled' THEN cls.id END) as scheduled_classes,
                    COUNT(DISTINCT ws.id) as total_sessions,
                    COUNT(DISTINCT CASE WHEN ws.status = 'completed' THEN ws.id END) as completed_sessions,
                    SUM(CASE WHEN ws.status = 'completed' THEN ws.duration_minutes ELSE 0 END) as total_training_minutes
                 FROM locations l
                 LEFT JOIN clients c ON c.training_location = l.id AND c.tenant_id = l.tenant_id
                 LEFT JOIN classes cls ON cls.location_id = l.id AND cls.tenant_id = l.tenant_id
                 LEFT JOIN workout_sessions ws ON ws.location_id = l.id AND ws.tenant_id = l.tenant_id
                 WHERE l.tenant_id = ? AND l.status = 'active'
                 GROUP BY l.id, l.name, l.city, l.is_online, l.status
                 ORDER BY active_clients DESC, l.name ASC`,
                [tenantId]
            );

            return stats.map(stat => ({
                locationId: stat.id,
                name: stat.name,
                city: stat.city,
                isOnline: stat.is_online === 1,
                status: stat.status,
                metrics: {
                    totalClients: stat.total_clients || 0,
                    activeClients: stat.active_clients || 0,
                    totalClasses: stat.total_classes || 0,
                    scheduledClasses: stat.scheduled_classes || 0,
                    totalSessions: stat.total_sessions || 0,
                    completedSessions: stat.completed_sessions || 0,
                    totalTrainingMinutes: stat.total_training_minutes || 0,
                    averageSessionDuration: stat.completed_sessions > 0
                        ? Math.round((stat.total_training_minutes || 0) / stat.completed_sessions)
                        : 0
                }
            }));

        } catch (error) {
            logger.error('Errore recupero statistiche sedi', { error: error.message });

            throw {
                status: 500,
                message: 'Errore durante il recupero delle statistiche',
                details: error.message
            };
        }
    }

    /**
     * Ottieni le città disponibili (per filtri)
     * @param {string} tenantId
     * @returns {Array} lista città
     */
    async getAvailableCities(tenantId) {
        try {
            const cities = await query(
                `SELECT DISTINCT city
                 FROM locations
                 WHERE tenant_id = ? AND city IS NOT NULL AND status = 'active'
                 ORDER BY city ASC`,
                [tenantId]
            );

            return cities.map(row => row.city);

        } catch (error) {
            logger.error('Errore recupero città', { error: error.message });

            throw {
                status: 500,
                message: 'Errore durante il recupero delle città',
                details: error.message
            };
        }
    }

    /**
     * Sposta clienti da una sede all'altra
     * @param {number} fromLocationId
     * @param {number} toLocationId
     * @param {string} tenantId
     * @param {Array} clientIds - Se vuoto, sposta tutti i clienti
     * @returns {Object} risultato
     */
    async moveClients(fromLocationId, toLocationId, tenantId, clientIds = []) {
        try {
            // Verifica esistenza entrambe le sedi
            await this.getById(fromLocationId, tenantId);
            await this.getById(toLocationId, tenantId);

            let result;

            if (clientIds.length > 0) {
                // Sposta solo clienti specificati
                const placeholders = clientIds.map(() => '?').join(',');

                result = await query(
                    `UPDATE clients
                     SET training_location = ?, updated_at = NOW()
                     WHERE id IN (${placeholders}) AND tenant_id = ? AND training_location = ?`,
                    [toLocationId, ...clientIds, tenantId, fromLocationId]
                );
            } else {
                // Sposta tutti i clienti
                result = await query(
                    `UPDATE clients
                     SET training_location = ?, updated_at = NOW()
                     WHERE tenant_id = ? AND training_location = ?`,
                    [toLocationId, tenantId, fromLocationId]
                );
            }

            return {
                success: true,
                movedCount: result.affectedRows,
                message: `${result.affectedRows} clienti spostati con successo`
            };

        } catch (error) {
            logger.error('Errore spostamento clienti', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante lo spostamento dei clienti',
                details: error.message
            };
        }
    }

    /**
     * Parsa i dati della sede (converte JSON)
     * @private
     */
    _parseLocationData(location) {
        return {
            ...location,
            isOnline: location.is_online === 1,
            openingHours: location.opening_hours
                ? this._safeJSONParse(location.opening_hours)
                : null,
            amenities: location.amenities
                ? this._safeJSONParse(location.amenities)
                : null,
            clientCount: location.client_count || 0,
            scheduledClasses: location.scheduled_classes || 0
        };
    }

    /**
     * Parse JSON sicuro
     * @private
     */
    _safeJSONParse(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            logger.error('Errore parsing JSON', { error: error.message });
            return null;
        }
    }
}

module.exports = new LocationService();
