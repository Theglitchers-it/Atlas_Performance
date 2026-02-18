/**
 * Program Service
 * Gestione programmi di allenamento multi-settimana
 */

const { query } = require('../config/database');

class ProgramService {
    /**
     * Ottieni lista programmi per tenant
     */
    async getAll(tenantId, options = {}) {
        const { clientId, status, limit = 20, page = 1 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT cp.*,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   u.first_name as creator_first_name, u.last_name as creator_last_name,
                   m.name as mesocycle_name, m.focus as mesocycle_focus,
                   (SELECT COUNT(*) FROM program_workouts pw WHERE pw.program_id = cp.id) as workout_count
            FROM client_programs cp
            LEFT JOIN clients c ON cp.client_id = c.id
            LEFT JOIN users u ON cp.created_by = u.id
            LEFT JOIN mesocycles m ON cp.mesocycle_id = m.id
            WHERE cp.tenant_id = ?
        `;
        const params = [tenantId];

        if (clientId) {
            sql += ' AND cp.client_id = ?';
            params.push(clientId);
        }
        if (status) {
            sql += ' AND cp.status = ?';
            params.push(status);
        }

        // Count
        let countSql = 'SELECT COUNT(*) as total FROM client_programs cp WHERE cp.tenant_id = ?';
        const countParams = [tenantId];
        if (clientId) {
            countSql += ' AND cp.client_id = ?';
            countParams.push(clientId);
        }
        if (status) {
            countSql += ' AND cp.status = ?';
            countParams.push(status);
        }
        const countResult = await query(countSql, countParams);
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY cp.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const programs = await query(sql, params);

        return {
            programs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Ottieni programma per ID
     */
    async getById(programId, tenantId) {
        const programs = await query(`
            SELECT cp.*,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   u.first_name as creator_first_name, u.last_name as creator_last_name,
                   m.name as mesocycle_name, m.focus as mesocycle_focus, m.periodization_type
            FROM client_programs cp
            LEFT JOIN clients c ON cp.client_id = c.id
            LEFT JOIN users u ON cp.created_by = u.id
            LEFT JOIN mesocycles m ON cp.mesocycle_id = m.id
            WHERE cp.id = ? AND cp.tenant_id = ?
        `, [programId, tenantId]);

        if (!programs.length) return null;

        const program = programs[0];

        // Get program workouts
        program.workouts = await query(`
            SELECT pw.*, wt.name as template_name, wt.category, wt.difficulty,
                   wt.estimated_duration_min
            FROM program_workouts pw
            LEFT JOIN workout_templates wt ON pw.template_id = wt.id
            WHERE pw.program_id = ?
            ORDER BY pw.week_number ASC, pw.day_of_week ASC
        `, [programId]);

        return program;
    }

    /**
     * Crea nuovo programma
     */
    async create(tenantId, userId, data) {
        const {
            clientId, name, description, startDate, endDate,
            weeks, daysPerWeek, mesocycleId
        } = data;

        const result = await query(`
            INSERT INTO client_programs
            (tenant_id, client_id, name, description, start_date, end_date,
             weeks, days_per_week, mesocycle_id, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        `, [
            tenantId, clientId, name, description || null,
            startDate, endDate || null,
            weeks || 4, daysPerWeek || 3,
            mesocycleId || null, userId
        ]);

        return { id: result.insertId };
    }

    /**
     * Aggiorna programma
     */
    async update(programId, tenantId, data) {
        const { name, description, startDate, endDate, weeks, daysPerWeek, status } = data;

        await query(`
            UPDATE client_programs SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                weeks = COALESCE(?, weeks),
                days_per_week = COALESCE(?, days_per_week),
                status = COALESCE(?, status)
            WHERE id = ? AND tenant_id = ?
        `, [name, description, startDate, endDate, weeks, daysPerWeek, status, programId, tenantId]);

        return this.getById(programId, tenantId);
    }

    /**
     * Elimina programma
     */
    async delete(programId, tenantId) {
        const result = await query(
            'DELETE FROM client_programs WHERE id = ? AND tenant_id = ?',
            [programId, tenantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Aggiungi workout al programma
     */
    async addWorkout(programId, data) {
        const { templateId, weekNumber, dayOfWeek, scheduledDate, notes } = data;

        const result = await query(`
            INSERT INTO program_workouts (program_id, template_id, week_number, day_of_week, scheduled_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [programId, templateId, weekNumber, dayOfWeek, scheduledDate || null, notes || null]);

        return { id: result.insertId };
    }

    /**
     * Rimuovi workout dal programma
     */
    async removeWorkout(workoutId, programId) {
        const result = await query(
            'DELETE FROM program_workouts WHERE id = ? AND program_id = ?',
            [workoutId, programId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Aggiorna stato programma
     */
    async updateStatus(programId, tenantId, status) {
        await query(
            'UPDATE client_programs SET status = ? WHERE id = ? AND tenant_id = ?',
            [status, programId, tenantId]
        );
        return this.getById(programId, tenantId);
    }
}

module.exports = new ProgramService();
