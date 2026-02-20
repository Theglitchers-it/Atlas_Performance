/**
 * Booking Service
 * Gestione appuntamenti e disponibilita trainer
 */

const { query } = require('../config/database');

class BookingService {
    /**
     * Ottieni appuntamenti per tenant con filtri
     */
    async getAppointments(tenantId, options = {}) {
        const { clientId, trainerId, status, startDate, endDate, limit = 50, page = 1 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT a.*,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   u.first_name as trainer_first_name, u.last_name as trainer_last_name
            FROM appointments a
            LEFT JOIN clients c ON a.client_id = c.id
            LEFT JOIN users u ON a.trainer_id = u.id
            WHERE a.tenant_id = ?
        `;
        const params = [tenantId];

        if (clientId) {
            sql += ' AND a.client_id = ?';
            params.push(clientId);
        }
        if (trainerId) {
            sql += ' AND a.trainer_id = ?';
            params.push(trainerId);
        }
        if (status) {
            sql += ' AND a.status = ?';
            params.push(status);
        }
        if (startDate) {
            sql += ' AND a.start_datetime >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND a.end_datetime <= ?';
            params.push(endDate);
        }

        // Count
        const countSql = sql.replace(/SELECT a\.\*,[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await query(countSql, params);
        const total = countResult.total;

        sql += ' ORDER BY a.start_datetime ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const appointments = await query(sql, params);

        return {
            appointments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottieni client_id dal user_id (per utenti con ruolo client)
     */
    async getClientIdByUserId(userId, tenantId) {
        const rows = await query(
            'SELECT id FROM clients WHERE user_id = ? AND tenant_id = ? LIMIT 1',
            [userId, tenantId]
        );
        return rows[0]?.id || null;
    }

    /**
     * Ottieni singolo appuntamento
     */
    async getAppointmentById(appointmentId, tenantId) {
        const sql = `
            SELECT a.*,
                   c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email,
                   u.first_name as trainer_first_name, u.last_name as trainer_last_name
            FROM appointments a
            LEFT JOIN clients c ON a.client_id = c.id
            LEFT JOIN users u ON a.trainer_id = u.id
            WHERE a.id = ? AND a.tenant_id = ?
        `;
        const rows = await query(sql, [appointmentId, tenantId]);
        return rows[0] || null;
    }

    /**
     * Crea appuntamento
     */
    async createAppointment(tenantId, data) {
        const sql = `
            INSERT INTO appointments (tenant_id, client_id, trainer_id, start_datetime, end_datetime,
                                      appointment_type, location, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `;
        const result = await query(sql, [
            tenantId,
            data.clientId,
            data.trainerId,
            data.startDatetime,
            data.endDatetime,
            data.appointmentType || 'training',
            data.location || null,
            data.notes || null
        ]);
        return result.insertId;
    }

    /**
     * Aggiorna appuntamento
     */
    async updateAppointment(appointmentId, tenantId, data) {
        const sql = `
            UPDATE appointments SET
                client_id = COALESCE(?, client_id),
                trainer_id = COALESCE(?, trainer_id),
                start_datetime = COALESCE(?, start_datetime),
                end_datetime = COALESCE(?, end_datetime),
                appointment_type = COALESCE(?, appointment_type),
                location = COALESCE(?, location),
                notes = COALESCE(?, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        `;
        await query(sql, [
            data.clientId || null,
            data.trainerId || null,
            data.startDatetime || null,
            data.endDatetime || null,
            data.appointmentType || null,
            data.location || null,
            data.notes || null,
            appointmentId,
            tenantId
        ]);
    }

    /**
     * Aggiorna stato appuntamento
     */
    async updateAppointmentStatus(appointmentId, tenantId, status) {
        const sql = `UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`;
        await query(sql, [status, appointmentId, tenantId]);
    }

    /**
     * Elimina appuntamento
     */
    async deleteAppointment(appointmentId, tenantId) {
        const sql = `DELETE FROM appointments WHERE id = ? AND tenant_id = ?`;
        await query(sql, [appointmentId, tenantId]);
    }

    /**
     * Ottieni disponibilita trainer
     */
    async getAvailability(tenantId, userId) {
        const sql = `
            SELECT * FROM availability_slots
            WHERE tenant_id = ? AND user_id = ? AND is_active = TRUE
            ORDER BY day_of_week, start_time
        `;
        return await query(sql, [tenantId, userId]);
    }

    /**
     * Imposta slot disponibilita
     */
    async setAvailability(tenantId, userId, slots) {
        // Rimuovi vecchi slot
        await query('DELETE FROM availability_slots WHERE tenant_id = ? AND user_id = ?', [tenantId, userId]);

        if (!slots || slots.length === 0) return;

        const sql = `
            INSERT INTO availability_slots (tenant_id, user_id, day_of_week, start_time, end_time, slot_duration_min)
            VALUES ?
        `;
        const values = slots.map(s => [
            tenantId, userId, s.dayOfWeek, s.startTime, s.endTime, s.slotDurationMin || 60
        ]);
        await query(sql, [values]);
    }

    /**
     * Ottieni slot disponibili per un trainer in una data specifica
     */
    async getAvailableSlots(tenantId, trainerId, date) {
        const dayOfWeek = new Date(date).getDay();

        // Ottieni pattern di disponibilita per quel giorno
        const slots = await query(
            `SELECT * FROM availability_slots WHERE tenant_id = ? AND user_id = ? AND day_of_week = ? AND is_active = TRUE`,
            [tenantId, trainerId, dayOfWeek]
        );

        // Ottieni appuntamenti gia prenotati per quella data
        const booked = await query(
            `SELECT start_datetime, end_datetime FROM appointments
             WHERE tenant_id = ? AND trainer_id = ? AND DATE(start_datetime) = ?
             AND status NOT IN ('cancelled')`,
            [tenantId, trainerId, date]
        );

        // Genera slot disponibili
        const available = [];
        for (const slot of slots) {
            let current = slot.start_time;
            const duration = slot.slot_duration_min || 60;

            while (current < slot.end_time) {
                const slotStart = `${date} ${current}`;
                const endMinutes = timeToMinutes(current) + duration;
                const slotEnd = minutesToTime(endMinutes);

                if (slotEnd > slot.end_time) break;

                const isBooked = booked.some(b => {
                    const bStart = b.start_datetime.toISOString().substring(11, 16);
                    const bEnd = b.end_datetime.toISOString().substring(11, 16);
                    return current < bEnd && slotEnd > bStart;
                });

                if (!isBooked) {
                    available.push({ startTime: current, endTime: slotEnd, duration });
                }

                current = slotEnd;
            }
        }

        return available;
    }

    /**
     * Appuntamenti di oggi per dashboard
     */
    async getTodayAppointments(tenantId, trainerId = null) {
        let sql = `
            SELECT a.*,
                   c.first_name as client_first_name, c.last_name as client_last_name
            FROM appointments a
            LEFT JOIN clients c ON a.client_id = c.id
            WHERE a.tenant_id = ? AND DATE(a.start_datetime) = CURDATE()
            AND a.status NOT IN ('cancelled')
        `;
        const params = [tenantId];

        if (trainerId) {
            sql += ' AND a.trainer_id = ?';
            params.push(trainerId);
        }

        sql += ' ORDER BY a.start_datetime ASC';
        return await query(sql, params);
    }
}

function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

module.exports = new BookingService();
