/**
 * Key Exercise Service
 * Esercizi "fondamentali" di un cliente + progressione performance (Epley 1RM).
 */

const { query } = require('../config/database');

class KeyExerciseService {
    async list(tenantId, clientId) {
        // Defense-in-depth: il JOIN su exercises filtra anche per tenant_id (globale o stesso tenant)
        // così righe pre-fix con exercise_id cross-tenant non leakano name/category di altri tenant.
        return await query(
            `SELECT cke.id, cke.exercise_id, cke.note, cke.created_at,
                    e.name AS exercise_name, e.category AS exercise_category
             FROM client_key_exercises cke
             JOIN exercises e ON cke.exercise_id = e.id AND (e.tenant_id IS NULL OR e.tenant_id = ?)
             WHERE cke.tenant_id = ? AND cke.client_id = ?
             ORDER BY cke.created_at DESC`,
            [tenantId, tenantId, clientId]
        );
    }

    async add(tenantId, clientId, exerciseId, note, createdBy) {
        // Tenant isolation: accetta solo esercizi globali (tenant_id IS NULL) o del proprio tenant.
        // Senza questo filtro un trainer del tenant A può aggiungere come key exercise un
        // esercizio privato del tenant B e leggerne name/category via list() (IDOR cross-tenant).
        const exRows = await query(
            `SELECT id FROM exercises WHERE id = ? AND (tenant_id IS NULL OR tenant_id = ?) LIMIT 1`,
            [exerciseId, tenantId]
        );
        if (!exRows[0]) {
            throw { status: 404, message: 'Esercizio non trovato' };
        }

        await query(
            `INSERT IGNORE INTO client_key_exercises
                (tenant_id, client_id, exercise_id, note, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [tenantId, clientId, exerciseId, note || null, createdBy]
        );
        const rows = await query(
            `SELECT cke.id, cke.exercise_id, cke.note, cke.created_at,
                    e.name AS exercise_name, e.category AS exercise_category
             FROM client_key_exercises cke
             JOIN exercises e ON cke.exercise_id = e.id
             WHERE cke.tenant_id = ? AND cke.client_id = ? AND cke.exercise_id = ?
             LIMIT 1`,
            [tenantId, clientId, exerciseId]
        );
        return rows[0] || null;
    }

    async remove(tenantId, clientId, exerciseId) {
        const result = await query(
            `DELETE FROM client_key_exercises
             WHERE tenant_id = ? AND client_id = ? AND exercise_id = ?`,
            [tenantId, clientId, exerciseId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Progressione top-set 1RM stimato (Epley) per un esercizio nel tempo.
     * Per ogni sessione completata del cliente in cui compare l'esercizio,
     * ritorna il set con il maggior estimated 1RM (esclude warmup, richiede weight non null).
     */
    async getProgression(tenantId, clientId, exerciseId, fromDate = null, toDate = null) {
        let dateFilter = '';
        const params = [tenantId, clientId, exerciseId];
        if (fromDate && toDate) {
            dateFilter = 'AND ws.completed_at >= ? AND ws.completed_at < DATE_ADD(?, INTERVAL 1 DAY)';
            params.push(fromDate, toDate);
        } else if (fromDate) {
            dateFilter = 'AND ws.completed_at >= ?';
            params.push(fromDate);
        }

        const rows = await query(
            `SELECT
                ws.id AS session_id,
                ws.completed_at AS date,
                esl.weight_used,
                esl.reps_completed,
                ROUND(esl.weight_used * (1 + esl.reps_completed / 30.0), 1) AS estimated_1rm
             FROM exercise_set_logs esl
             JOIN workout_session_exercises wse ON esl.session_exercise_id = wse.id
             JOIN workout_sessions ws ON wse.session_id = ws.id
             WHERE ws.tenant_id = ?
               AND ws.client_id = ?
               AND wse.exercise_id = ?
               AND ws.status = 'completed'
               AND esl.is_warmup = 0
               AND esl.weight_used IS NOT NULL
               AND esl.reps_completed IS NOT NULL
               AND esl.reps_completed > 0
               ${dateFilter}
             ORDER BY ws.completed_at ASC`,
            params
        );

        // Raggruppa per session_id, tieni il top set (max estimated_1rm)
        const bySession = new Map();
        for (const r of rows) {
            const key = r.session_id;
            const current = bySession.get(key);
            const eRm = Number(r.estimated_1rm);
            if (!current || eRm > current.estimated_1rm) {
                bySession.set(key, {
                    date: r.date,
                    estimated_1rm: eRm,
                    top_weight: Number(r.weight_used),
                    top_reps: Number(r.reps_completed)
                });
            }
        }

        return Array.from(bySession.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }
}

module.exports = new KeyExerciseService();
