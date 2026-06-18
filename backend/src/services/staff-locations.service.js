/**
 * Staff-Locations Service (Fase 3 multi-sede)
 * Gestisce il mapping N:M trainer ↔ palestra (con ruolo per location + schedule).
 */

const { query, transaction } = require('../config/database');

const ALLOWED_LOCATION_ROLES = ['owner', 'manager', 'trainer', 'nutritionist', 'front_desk'];

class StaffLocationsService {

    /**
     * Locations dove il trainer corrente è assegnato.
     */
    async getMyLocations(userId, tenantId) {
        return query(
            `SELECT sl.id AS assignment_id, sl.location_id, sl.role_at_location, sl.schedule,
                    sl.is_primary, sl.active_from, sl.active_to,
                    l.name, l.address, l.city, l.location_type, l.parent_location_id,
                    l.latitude, l.longitude, l.geofence_radius_meters
             FROM staff_locations sl
             INNER JOIN locations l ON l.id = sl.location_id
             WHERE sl.user_id = ? AND sl.tenant_id = ?
               AND (sl.active_to IS NULL OR sl.active_to >= CURRENT_DATE)
             ORDER BY sl.is_primary DESC, l.name`,
            [userId, tenantId]
        );
    }

    /**
     * Tutti gli staff assegnati a una location.
     */
    async getLocationStaff(locationId, tenantId) {
        return query(
            `SELECT sl.id AS assignment_id, sl.user_id, sl.role_at_location, sl.schedule,
                    sl.is_primary, u.first_name, u.last_name, u.email
             FROM staff_locations sl
             INNER JOIN users u ON u.id = sl.user_id
             WHERE sl.location_id = ? AND sl.tenant_id = ?
               AND (sl.active_to IS NULL OR sl.active_to >= CURRENT_DATE)
             ORDER BY sl.is_primary DESC, u.last_name`,
            [locationId, tenantId]
        );
    }

    /**
     * Assegna un trainer a una location (con ruolo).
     */
    async assignStaffToLocation({ tenantId, userId, locationId, roleAtLocation = 'trainer', schedule = null, isPrimary = false }) {
        if (!ALLOWED_LOCATION_ROLES.includes(roleAtLocation)) {
            throw { status: 400, message: 'role_at_location non valido' };
        }
        // Verifica entrambi siano del tenant
        const checks = await query(
            `SELECT (SELECT COUNT(*) FROM users WHERE id = ? AND tenant_id = ?) AS u,
                    (SELECT COUNT(*) FROM locations WHERE id = ? AND tenant_id = ?) AS l`,
            [userId, tenantId, locationId, tenantId]
        );
        if (checks[0].u === 0 || checks[0].l === 0) {
            throw { status: 404, message: 'Utente o location non nel tenant' };
        }

        try {
            await transaction(async (conn) => {
                if (isPrimary) {
                    await conn.execute(
                        'UPDATE staff_locations SET is_primary = FALSE WHERE user_id = ? AND tenant_id = ?',
                        [userId, tenantId]
                    );
                }
                await conn.execute(
                    `INSERT INTO staff_locations (tenant_id, user_id, location_id, role_at_location, schedule, is_primary)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [tenantId, userId, locationId, roleAtLocation, schedule ? JSON.stringify(schedule) : null, isPrimary]
                );
            });
            return { success: true };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw { status: 409, message: 'Trainer già assegnato a questa location' };
            }
            throw err;
        }
    }

    /**
     * Termina l'assegnazione (soft delete: active_to = oggi).
     */
    async removeStaffFromLocation({ tenantId, userId, locationId }) {
        const result = await query(
            `UPDATE staff_locations SET active_to = CURRENT_DATE
             WHERE tenant_id = ? AND user_id = ? AND location_id = ? AND (active_to IS NULL OR active_to > CURRENT_DATE)`,
            [tenantId, userId, locationId]
        );
        return { success: true, affected: result.affectedRows };
    }

    /**
     * Imposta una location come primaria per un trainer.
     */
    async setPrimaryLocation({ tenantId, userId, locationId }) {
        return transaction(async (conn) => {
            await conn.execute(
                'UPDATE staff_locations SET is_primary = FALSE WHERE user_id = ? AND tenant_id = ?',
                [userId, tenantId]
            );
            const [result] = await conn.execute(
                'UPDATE staff_locations SET is_primary = TRUE WHERE user_id = ? AND tenant_id = ? AND location_id = ?',
                [userId, tenantId, locationId]
            );
            if (result.affectedRows === 0) {
                throw { status: 404, message: 'Assegnazione non trovata' };
            }
            return { success: true };
        });
    }

    /**
     * Tree di location (parent + filiali).
     */
    async getLocationTree(tenantId) {
        return query(
            `WITH RECURSIVE loc_tree AS (
                SELECT id, parent_location_id, name, city, location_type, 0 AS depth
                FROM locations WHERE tenant_id = ? AND parent_location_id IS NULL
                UNION ALL
                SELECT l.id, l.parent_location_id, l.name, l.city, l.location_type, t.depth + 1
                FROM locations l
                INNER JOIN loc_tree t ON l.parent_location_id = t.id
                WHERE l.tenant_id = ?
            )
            SELECT * FROM loc_tree ORDER BY depth, name`,
            [tenantId, tenantId]
        );
    }
}

module.exports = new StaffLocationsService();
module.exports.ALLOWED_LOCATION_ROLES = ALLOWED_LOCATION_ROLES;
