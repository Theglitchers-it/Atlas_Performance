/**
 * Session Service
 * Gestione sessioni workout (eseguite)
 */

const { query, transaction } = require('../config/database');
const clientService = require('./client.service');

class SessionService {
    /**
     * Ottieni sessioni per cliente
     */
    async getByClient(clientId, tenantId, options = {}) {
        const { status, startDate, endDate, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT ws.*, wt.name as template_name, wt.category
            FROM workout_sessions ws
            LEFT JOIN workout_templates wt ON ws.template_id = wt.id
            WHERE ws.client_id = ? AND ws.tenant_id = ?
        `;
        const params = [clientId, tenantId];

        if (status) {
            sql += ' AND ws.status = ?';
            params.push(status);
        }

        if (startDate) {
            sql += ' AND ws.started_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND ws.started_at <= ?';
            params.push(endDate);
        }

        const countSql = sql.replace(/SELECT.*FROM/s, 'SELECT COUNT(*) as total FROM');
        const countResult = await query(countSql, params);
        const total = countResult[0]?.total || 0;

        sql += ' ORDER BY ws.started_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const sessions = await query(sql, params);

        return {
            sessions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Ottieni sessione per ID
     */
    async getById(id, tenantId) {
        const sessions = await query(`
            SELECT ws.*, wt.name as template_name,
                   c.first_name as client_first_name, c.last_name as client_last_name
            FROM workout_sessions ws
            LEFT JOIN workout_templates wt ON ws.template_id = wt.id
            LEFT JOIN clients c ON ws.client_id = c.id
            WHERE ws.id = ? AND ws.tenant_id = ?
        `, [id, tenantId]);

        if (sessions.length === 0) {
            throw { status: 404, message: 'Sessione non trovata' };
        }

        const session = sessions[0];

        // Load exercises
        const exercises = await query(`
            SELECT wse.*, e.name as exercise_name, e.video_url, e.image_url
            FROM workout_session_exercises wse
            JOIN exercises e ON wse.exercise_id = e.id
            WHERE wse.session_id = ?
            ORDER BY wse.order_index ASC
        `, [id]);

        // Load sets for each exercise
        for (const exercise of exercises) {
            const sets = await query(`
                SELECT * FROM exercise_set_logs
                WHERE session_exercise_id = ?
                ORDER BY set_number ASC
            `, [exercise.id]);
            exercise.sets = sets;
        }

        session.exercises = exercises;

        return session;
    }

    /**
     * Inizia nuova sessione
     */
    async start(tenantId, sessionData) {
        const { clientId, templateId, programWorkoutId } = sessionData;

        return await transaction(async (connection) => {
            // Create session
            const [result] = await connection.execute(`
                INSERT INTO workout_sessions (tenant_id, client_id, template_id, program_workout_id, started_at, status)
                VALUES (?, ?, ?, ?, NOW(), 'in_progress')
            `, [tenantId, clientId, templateId || null, programWorkoutId || null]);

            const sessionId = result.insertId;

            // Copy exercises from template if provided
            if (templateId) {
                const templateExercises = await query(`
                    SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY order_index
                `, [templateId]);

                for (const ex of templateExercises) {
                    await connection.execute(`
                        INSERT INTO workout_session_exercises
                        (session_id, exercise_id, order_index, prescribed_sets, prescribed_reps, prescribed_weight, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        sessionId, ex.exercise_id, ex.order_index, ex.sets,
                        ex.reps_min && ex.reps_max ? `${ex.reps_min}-${ex.reps_max}` : (ex.reps_min || ex.reps_max),
                        ex.weight_value, ex.notes
                    ]);
                }
            }

            return { sessionId };
        });
    }

    /**
     * Log set eseguito
     */
    async logSet(sessionId, tenantId, setData) {
        const { sessionExerciseId, setNumber, repsCompleted, weightUsed, rpe, isWarmup, isFailure, notes } = setData;

        // Verify session exists and belongs to tenant
        await this.getById(sessionId, tenantId);

        const [result] = await query(`
            INSERT INTO exercise_set_logs
            (session_exercise_id, set_number, reps_completed, weight_used, rpe, is_warmup, is_failure, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [sessionExerciseId, setNumber, repsCompleted, weightUsed || null, rpe || null, isWarmup || false, isFailure || false, notes || null]);

        return { setLogId: result.insertId };
    }

    /**
     * Completa sessione
     */
    async complete(sessionId, tenantId, completionData = {}) {
        const session = await this.getById(sessionId, tenantId);

        if (session.status === 'completed') {
            throw { status: 400, message: 'Sessione gia completata' };
        }

        const { overallFeeling, notes } = completionData;

        // Calculate duration
        const startTime = new Date(session.started_at);
        const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);

        // Calculate XP (base: 50 + 5 per exercise)
        const exerciseCount = session.exercises?.length || 0;
        let xpEarned = 50 + (exerciseCount * 5);

        // Bonus for feeling
        if (overallFeeling === 'great') xpEarned += 20;
        else if (overallFeeling === 'good') xpEarned += 10;

        await query(`
            UPDATE workout_sessions SET
                completed_at = NOW(),
                duration_minutes = ?,
                status = 'completed',
                overall_feeling = ?,
                notes = ?,
                xp_earned = ?
            WHERE id = ?
        `, [durationMinutes, overallFeeling || null, notes || null, xpEarned, sessionId]);

        // Award XP to client
        await clientService.addXP(session.client_id, tenantId, xpEarned, 'workout', 'Workout completato');

        // Update client streak
        await clientService.updateStreak(session.client_id, tenantId);

        return this.getById(sessionId, tenantId);
    }

    /**
     * Salta sessione
     */
    async skip(sessionId, tenantId, reason) {
        await this.getById(sessionId, tenantId);

        await query(`
            UPDATE workout_sessions SET
                status = 'skipped',
                notes = ?
            WHERE id = ?
        `, [reason || null, sessionId]);

        return { success: true };
    }

    /**
     * Statistiche sessioni
     */
    async getStats(clientId, tenantId, period = 'month') {
        let dateCondition = '';
        if (period === 'week') {
            dateCondition = 'AND ws.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        } else if (period === 'month') {
            dateCondition = 'AND ws.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        } else if (period === 'year') {
            dateCondition = 'AND ws.started_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
        }

        const stats = await query(`
            SELECT
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                SUM(duration_minutes) as total_minutes,
                AVG(duration_minutes) as avg_duration,
                SUM(xp_earned) as total_xp
            FROM workout_sessions ws
            WHERE ws.client_id = ? AND ws.tenant_id = ? ${dateCondition}
        `, [clientId, tenantId]);

        return stats[0] || {};
    }
}

module.exports = new SessionService();
