/**
 * Class Service
 * Gestione classi, sessioni e iscrizioni
 */

const { query } = require('../config/database');

class ClassService {

    // === CLASSI ===

    async getClasses(tenantId, options = {}) {
        const { page = 1, limit = 20, activeOnly = false, instructorId = null } = options;
        const offset = (page - 1) * limit;

        let where = 'WHERE c.tenant_id = ?';
        const params = [tenantId];

        if (activeOnly) {
            where += ' AND c.is_active = 1';
        }
        if (instructorId) {
            where += ' AND c.instructor_id = ?';
            params.push(instructorId);
        }

        const [countResult] = await query(
            `SELECT COUNT(*) as total FROM classes c ${where}`, params
        );
        const total = countResult?.total || 0;

        const classes = await query(`
            SELECT c.*,
                   u.first_name AS instructor_first_name,
                   u.last_name AS instructor_last_name,
                   (SELECT COUNT(*) FROM class_sessions cs WHERE cs.class_id = c.id AND cs.status = 'scheduled') AS upcoming_sessions
            FROM classes c
            LEFT JOIN users u ON c.instructor_id = u.id
            ${where}
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            classes,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async getClassById(tenantId, classId) {
        const [cls] = await query(`
            SELECT c.*,
                   u.first_name AS instructor_first_name,
                   u.last_name AS instructor_last_name
            FROM classes c
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE c.id = ? AND c.tenant_id = ?
        `, [classId, tenantId]);
        return cls || null;
    }

    async createClass(tenantId, data) {
        const { name, description, instructorId, maxParticipants, durationMin, location, recurringPattern } = data;
        const result = await query(`
            INSERT INTO classes (tenant_id, name, description, instructor_id, max_participants, duration_min, location, recurring_pattern)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, name, description || null, instructorId, maxParticipants || 10, durationMin || 60, location || null, recurringPattern ? JSON.stringify(recurringPattern) : null]);
        return this.getClassById(tenantId, result.insertId);
    }

    async updateClass(tenantId, classId, data) {
        const fields = [];
        const params = [];
        if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
        if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
        if (data.maxParticipants !== undefined) { fields.push('max_participants = ?'); params.push(data.maxParticipants); }
        if (data.durationMin !== undefined) { fields.push('duration_min = ?'); params.push(data.durationMin); }
        if (data.location !== undefined) { fields.push('location = ?'); params.push(data.location); }
        if (data.isActive !== undefined) { fields.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }
        if (data.recurringPattern !== undefined) { fields.push('recurring_pattern = ?'); params.push(JSON.stringify(data.recurringPattern)); }

        if (fields.length === 0) return this.getClassById(tenantId, classId);

        params.push(classId, tenantId);
        await query(`UPDATE classes SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
        return this.getClassById(tenantId, classId);
    }

    async deleteClass(tenantId, classId) {
        const result = await query('DELETE FROM classes WHERE id = ? AND tenant_id = ?', [classId, tenantId]);
        return result.affectedRows > 0;
    }

    // === SESSIONI ===

    async getSessions(tenantId, options = {}) {
        const { classId, status, from, to, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let where = 'WHERE c.tenant_id = ?';
        const params = [tenantId];

        if (classId) { where += ' AND cs.class_id = ?'; params.push(classId); }
        if (status) { where += ' AND cs.status = ?'; params.push(status); }
        if (from) { where += ' AND cs.start_datetime >= ?'; params.push(from); }
        if (to) { where += ' AND cs.start_datetime <= ?'; params.push(to); }

        const [countResult] = await query(
            `SELECT COUNT(*) as total FROM class_sessions cs JOIN classes c ON cs.class_id = c.id ${where}`, params
        );
        const total = countResult?.total || 0;

        const sessions = await query(`
            SELECT cs.*, c.name AS class_name, c.max_participants, c.duration_min, c.location,
                   u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
                   (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_session_id = cs.id AND ce.status = 'enrolled') AS enrolled_count,
                   (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_session_id = cs.id AND ce.status = 'waitlist') AS waitlist_count
            FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            LEFT JOIN users u ON c.instructor_id = u.id
            ${where}
            ORDER BY cs.start_datetime ASC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            sessions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    async getSessionById(tenantId, sessionId) {
        const [session] = await query(`
            SELECT cs.*, c.name AS class_name, c.max_participants, c.duration_min, c.location, c.description AS class_description,
                   u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
                   (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_session_id = cs.id AND ce.status = 'enrolled') AS enrolled_count,
                   (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_session_id = cs.id AND ce.status = 'waitlist') AS waitlist_count
            FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE cs.id = ? AND c.tenant_id = ?
        `, [sessionId, tenantId]);

        if (!session) return null;

        // Carica iscritti
        const enrollments = await query(`
            SELECT ce.*, cl.id AS client_id,
                   u.first_name, u.last_name
            FROM class_enrollments ce
            JOIN clients cl ON ce.client_id = cl.id
            JOIN users u ON cl.user_id = u.id
            WHERE ce.class_session_id = ?
            ORDER BY ce.status ASC, ce.enrolled_at ASC
        `, [sessionId]);

        session.enrollments = enrollments;
        return session;
    }

    async createSession(tenantId, data) {
        const { classId, startDatetime, endDatetime, notes } = data;
        // Verifica che la classe appartenga al tenant
        const cls = await this.getClassById(tenantId, classId);
        if (!cls) return null;

        const result = await query(`
            INSERT INTO class_sessions (class_id, start_datetime, end_datetime, notes)
            VALUES (?, ?, ?, ?)
        `, [classId, startDatetime, endDatetime, notes || null]);

        return this.getSessionById(tenantId, result.insertId);
    }

    async updateSessionStatus(tenantId, sessionId, status) {
        // Verifica tenant
        const session = await this.getSessionById(tenantId, sessionId);
        if (!session) return null;

        await query('UPDATE class_sessions SET status = ? WHERE id = ?', [status, sessionId]);
        return this.getSessionById(tenantId, sessionId);
    }

    async deleteSession(tenantId, sessionId) {
        const session = await this.getSessionById(tenantId, sessionId);
        if (!session) return false;
        const result = await query('DELETE FROM class_sessions WHERE id = ?', [sessionId]);
        return result.affectedRows > 0;
    }

    // === ISCRIZIONI ===

    async enrollClient(tenantId, sessionId, clientId) {
        const session = await this.getSessionById(tenantId, sessionId);
        if (!session) return { success: false, message: 'Sessione non trovata' };
        if (session.status !== 'scheduled') return { success: false, message: 'Sessione non disponibile per iscrizioni' };

        // Check se gia iscritto
        const [existing] = await query(
            'SELECT * FROM class_enrollments WHERE class_session_id = ? AND client_id = ?',
            [sessionId, clientId]
        );
        if (existing && existing.status !== 'cancelled') {
            return { success: false, message: 'Gia iscritto a questa sessione' };
        }

        const enrolledCount = session.enrolled_count || 0;
        const maxParticipants = session.max_participants || 10;

        if (enrolledCount >= maxParticipants) {
            // Lista d'attesa
            const waitlistCount = session.waitlist_count || 0;
            if (existing) {
                await query('UPDATE class_enrollments SET status = ?, waitlist_position = ? WHERE id = ?',
                    ['waitlist', waitlistCount + 1, existing.id]);
            } else {
                await query(`
                    INSERT INTO class_enrollments (class_session_id, client_id, status, waitlist_position)
                    VALUES (?, ?, 'waitlist', ?)
                `, [sessionId, clientId, waitlistCount + 1]);
            }
            return { success: true, status: 'waitlist', position: waitlistCount + 1 };
        }

        if (existing) {
            await query('UPDATE class_enrollments SET status = ?, waitlist_position = NULL WHERE id = ?',
                ['enrolled', existing.id]);
        } else {
            await query(`
                INSERT INTO class_enrollments (class_session_id, client_id, status)
                VALUES (?, ?, 'enrolled')
            `, [sessionId, clientId]);
        }
        return { success: true, status: 'enrolled' };
    }

    async cancelEnrollment(tenantId, sessionId, clientId) {
        const session = await this.getSessionById(tenantId, sessionId);
        if (!session) return { success: false, message: 'Sessione non trovata' };

        const [enrollment] = await query(
            'SELECT * FROM class_enrollments WHERE class_session_id = ? AND client_id = ?',
            [sessionId, clientId]
        );
        if (!enrollment || enrollment.status === 'cancelled') {
            return { success: false, message: 'Iscrizione non trovata' };
        }

        await query('UPDATE class_enrollments SET status = ? WHERE id = ?', ['cancelled', enrollment.id]);

        // Promuovi primo in lista d'attesa se il posto si libera
        if (enrollment.status === 'enrolled') {
            const [nextWaitlist] = await query(
                `SELECT * FROM class_enrollments WHERE class_session_id = ? AND status = 'waitlist' ORDER BY waitlist_position ASC LIMIT 1`,
                [sessionId]
            );
            if (nextWaitlist) {
                await query('UPDATE class_enrollments SET status = ?, waitlist_position = NULL WHERE id = ?',
                    ['enrolled', nextWaitlist.id]);
            }
        }

        return { success: true };
    }

    async checkInClient(tenantId, sessionId, clientId) {
        const session = await this.getSessionById(tenantId, sessionId);
        if (!session) return { success: false, message: 'Sessione non trovata' };

        const [enrollment] = await query(
            'SELECT * FROM class_enrollments WHERE class_session_id = ? AND client_id = ? AND status = ?',
            [sessionId, clientId, 'enrolled']
        );
        if (!enrollment) return { success: false, message: 'Iscrizione attiva non trovata' };

        await query('UPDATE class_enrollments SET status = ?, checked_in_at = NOW() WHERE id = ?',
            ['attended', enrollment.id]);
        return { success: true };
    }

    async markNoShow(tenantId, sessionId, clientId) {
        const session = await this.getSessionById(tenantId, sessionId);
        if (!session) return { success: false, message: 'Sessione non trovata' };

        const [enrollment] = await query(
            'SELECT * FROM class_enrollments WHERE class_session_id = ? AND client_id = ? AND status IN (?, ?)',
            [sessionId, clientId, 'enrolled', 'attended']
        );
        if (!enrollment) return { success: false, message: 'Iscrizione non trovata' };

        await query('UPDATE class_enrollments SET status = ? WHERE id = ?', ['no_show', enrollment.id]);
        return { success: true };
    }

    // === CLIENT SESSIONS ===

    async getClientSessions(tenantId, clientId, options = {}) {
        const { status, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let where = 'WHERE c.tenant_id = ? AND ce.client_id = ?';
        const params = [tenantId, clientId];

        if (status) { where += ' AND ce.status = ?'; params.push(status); }

        const [countResult] = await query(
            `SELECT COUNT(*) as total FROM class_enrollments ce
             JOIN class_sessions cs ON ce.class_session_id = cs.id
             JOIN classes c ON cs.class_id = c.id ${where}`, params
        );
        const total = countResult?.total || 0;

        const sessions = await query(`
            SELECT ce.status AS enrollment_status, ce.enrolled_at, ce.checked_in_at, ce.waitlist_position,
                   cs.id AS session_id, cs.start_datetime, cs.end_datetime, cs.status AS session_status,
                   c.name AS class_name, c.location, c.duration_min,
                   u.first_name AS instructor_first_name, u.last_name AS instructor_last_name
            FROM class_enrollments ce
            JOIN class_sessions cs ON ce.class_session_id = cs.id
            JOIN classes c ON cs.class_id = c.id
            LEFT JOIN users u ON c.instructor_id = u.id
            ${where}
            ORDER BY cs.start_datetime DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return {
            sessions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }
}

module.exports = new ClassService();
