/**
 * GPS Check-in Service (Fase 4)
 *
 * Workflow:
 * 1. Client invia POST /api/checkins con {location_id, lat, lng, accuracy, appointment_id?}
 * 2. Server carica la location, calcola distanza Haversine
 * 3. Determina status:
 *    - valid: dentro geofence
 *    - out_of_range: oltre raggio (consentito se gps_strict=false)
 *    - suspected_spoof: accuracy GPS troppo bassa (>100m)
 * 4. Salva gym_checkin e, se appointmentId valido e collegato, aggiorna appointment
 *
 * Anti-abuse:
 * - gps_strict=true sulla location → rifiuta check-in oltre raggio*1.5
 * - accuracy >100m → marca come suspected_spoof
 * - Stesso user + location nello stesso minuto → idempotente
 */

const { query } = require('../config/database');
const { haversineDistance } = require('../utils/geo');
const { assertClientAccess, getOwnClientId, isTrusted } = require('../utils/clientAccess');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CHECKIN');

// Source senza verifica GPS: salta Haversine e forza status manual_override
const MANUAL_SOURCES = ['manual_qr', 'staff_override'];

class CheckinService {

    /**
     * Crea un nuovo check-in.
     * Se source ∈ MANUAL_SOURCES (manual_qr / staff_override), lat/lng sono opzionali:
     * vengono usate le coordinate della sede, distance_m=0, status='manual_override'.
     */
    async createCheckin({ tenantId, userId, user = null, clientId = null, locationId, deviceLat = null, deviceLng = null, deviceAccuracyM = null, appointmentId = null, source = 'mobile_native', notes = null }) {
        // SECURITY: validation ownership di clientId e appointmentId (multi-role safe via isTrusted)
        let resolvedClientId = null;
        if (user && !isTrusted(user)) {
            // Non-trusted (es. role=client): deriva clientId server-side, ignora body
            resolvedClientId = await getOwnClientId(userId, tenantId);
        } else if (clientId) {
            // Trusted (staff/admin/trainer): clientId del body deve appartenere al tenant
            await assertClientAccess(clientId, tenantId, user || { role: 'staff' });
            resolvedClientId = clientId;
        }

        let resolvedAppointmentId = null;
        if (appointmentId) {
            const apptCheck = await query(
                `SELECT id FROM appointments
                 WHERE id = ? AND tenant_id = ?
                   AND (client_id = ? OR trainer_id = ?)`,
                [appointmentId, tenantId, resolvedClientId, userId]
            );
            if (apptCheck.length === 0) {
                const err = new Error('Appuntamento non autorizzato per questo check-in');
                err.status = 403;
                throw err;
            }
            resolvedAppointmentId = appointmentId;
        }

        // 1. Carica location
        const locs = await query(
            `SELECT id, tenant_id, name, latitude, longitude, geofence_radius_meters, gps_strict
             FROM locations WHERE id = ? AND tenant_id = ?`,
            [locationId, tenantId]
        );
        if (locs.length === 0) {
            throw { status: 404, message: 'Location non trovata' };
        }
        const loc = locs[0];

        const isManual = MANUAL_SOURCES.includes(source);
        const hasDeviceCoords = deviceLat != null && deviceLng != null;
        const radius = loc.geofence_radius_meters || 100;

        let status;
        let distance;
        let storedDeviceLat;
        let storedDeviceLng;

        if (isManual || !hasDeviceCoords) {
            // Check-in manuale: salta Haversine. Usa coordinate sede come fallback
            // (device_lat/lng NOT NULL nel DB). distance_m=0, status='manual_override'.
            status = 'manual_override';
            distance = 0;
            storedDeviceLat = loc.latitude != null ? parseFloat(loc.latitude) : 0;
            storedDeviceLng = loc.longitude != null ? parseFloat(loc.longitude) : 0;
        } else {
            // Check-in GPS classico: location DEVE avere coordinate per Haversine.
            if (loc.latitude == null || loc.longitude == null) {
                throw { status: 400, message: 'Location senza coordinate GPS configurate' };
            }
            distance = haversineDistance(
                parseFloat(loc.latitude),
                parseFloat(loc.longitude),
                parseFloat(deviceLat),
                parseFloat(deviceLng)
            );
            status = 'valid';
            if (deviceAccuracyM != null && deviceAccuracyM > 100) {
                status = 'suspected_spoof';
            } else if (distance > radius * 1.5) {
                if (loc.gps_strict) {
                    throw {
                        status: 422,
                        message: `Sei fuori dal raggio della palestra (${Math.round(distance)}m di distanza, raggio ${radius}m)`
                    };
                }
                status = 'out_of_range';
            } else if (distance > radius) {
                status = 'out_of_range';
            }
            storedDeviceLat = deviceLat;
            storedDeviceLng = deviceLng;
        }

        // 4. Idempotenza: stesso user+location nei 60 secondi precedenti → ritorna esistente
        const recent = await query(
            `SELECT id FROM gym_checkins
             WHERE user_id = ? AND location_id = ?
               AND check_in_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
             ORDER BY check_in_at DESC LIMIT 1`,
            [userId, locationId]
        );
        if (recent.length > 0) {
            return { id: recent[0].id, status, distance: Math.round(distance), idempotent: true };
        }

        // 5. Insert (usa client/appointment id validati e coord risolte)
        const result = await query(
            `INSERT INTO gym_checkins
             (tenant_id, user_id, client_id, location_id, appointment_id,
              device_lat, device_lng, device_accuracy_m, distance_m, status, source, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, userId, resolvedClientId, locationId, resolvedAppointmentId,
                storedDeviceLat, storedDeviceLng, deviceAccuracyM, distance, status, source, notes]
        );

        // 6. Se appointment collegato e check-in valido entro 30 min → segna attended
        if (resolvedAppointmentId && status === 'valid') {
            try {
                await query(
                    `UPDATE appointments
                     SET status = 'completed'
                     WHERE id = ? AND tenant_id = ?
                       AND ABS(TIMESTAMPDIFF(MINUTE, start_datetime, NOW())) <= 30
                       AND status IN ('scheduled','confirmed')`,
                    [resolvedAppointmentId, tenantId]
                );
            } catch (e) {
                logger.warn('Auto-attended appointment failed', { appointmentId: resolvedAppointmentId, error: e.message });
            }
        }

        logger.info('GPS check-in created', { tenantId, userId, locationId, status, distance: Math.round(distance) });

        return {
            id: result.insertId,
            status,
            distance: Math.round(distance),
            geofenceRadius: radius,
            locationName: loc.name
        };
    }

    /**
     * Check-out (chiude un check-in aperto).
     */
    async checkout({ tenantId, userId, checkinId }) {
        const result = await query(
            `UPDATE gym_checkins SET check_out_at = NOW()
             WHERE id = ? AND user_id = ? AND tenant_id = ? AND check_out_at IS NULL`,
            [checkinId, userId, tenantId]
        );
        if (result.affectedRows === 0) {
            throw { status: 404, message: 'Check-in non trovato o già chiuso' };
        }
        return { success: true };
    }

    /**
     * Storico check-in dell'utente corrente.
     */
    async getMyCheckins(userId, tenantId, { limit = 20, offset = 0 } = {}) {
        return query(
            `SELECT gc.id, gc.check_in_at, gc.check_out_at, gc.status, gc.distance_m,
                    gc.location_id, l.name AS location_name, l.city
             FROM gym_checkins gc
             INNER JOIN locations l ON l.id = gc.location_id
             WHERE gc.user_id = ? AND gc.tenant_id = ?
             ORDER BY gc.check_in_at DESC
             LIMIT ? OFFSET ?`,
            [userId, tenantId, limit, offset]
        );
    }

    /**
     * Aggregati check-in per sede dell'utente corrente (ultimi 365 giorni).
     * Ritorna lista { location_id, location_name, city, count, last_checkin_at }.
     */
    async getMyCheckinStatsByLocation(userId, tenantId) {
        return query(
            `SELECT gc.location_id,
                    l.name AS location_name,
                    l.city,
                    COUNT(*) AS count,
                    MAX(gc.check_in_at) AS last_checkin_at
             FROM gym_checkins gc
             INNER JOIN locations l ON l.id = gc.location_id
             WHERE gc.user_id = ?
               AND gc.tenant_id = ?
               AND gc.check_in_at > DATE_SUB(NOW(), INTERVAL 365 DAY)
             GROUP BY gc.location_id, l.name, l.city
             ORDER BY count DESC`,
            [userId, tenantId]
        );
    }

    /**
     * Chi è in palestra ora (per gym_admin).
     */
    async getLocationLivePresence(locationId, tenantId) {
        return query(
            `SELECT gc.id, gc.check_in_at, gc.check_out_at, gc.status,
                    gc.user_id, u.first_name, u.last_name, u.email
             FROM gym_checkins gc
             INNER JOIN users u ON u.id = gc.user_id
             WHERE gc.location_id = ? AND gc.tenant_id = ?
               AND gc.check_in_at > DATE_SUB(NOW(), INTERVAL 4 HOUR)
               AND gc.check_out_at IS NULL
             ORDER BY gc.check_in_at DESC`,
            [locationId, tenantId]
        );
    }
}

module.exports = new CheckinService();
