/**
 * Volume Analytics Service
 * Tracking volume per gruppo muscolare per mesociclo/settimana
 */

const { query } = require('../config/database');

class VolumeService {

    /**
     * Calcola e salva volume settimanale per un cliente
     * Aggregazione: sets * reps per gruppo muscolare dalla settimana indicata
     */
    async calculateWeeklyVolume(clientId, tenantId, weekStart) {
        // Calcola volume per gruppo muscolare dalla session data
        const volumeData = await query(`
            SELECT
                emg.muscle_group_id,
                COUNT(DISTINCT esl.id) as total_sets,
                SUM(esl.reps_completed) as total_reps,
                SUM(esl.reps_completed * COALESCE(esl.weight_used, 0)) as total_volume,
                AVG(esl.rpe) as avg_rpe,
                AVG(esl.weight_used) as avg_weight
            FROM workout_sessions ws
            JOIN workout_session_exercises wse ON ws.id = wse.session_id
            JOIN exercise_set_logs esl ON wse.id = esl.session_exercise_id
            JOIN exercise_muscle_groups emg ON wse.exercise_id = emg.exercise_id
            WHERE ws.client_id = ? AND ws.tenant_id = ?
              AND ws.status = 'completed'
              AND ws.started_at >= ? AND ws.started_at < DATE_ADD(?, INTERVAL 7 DAY)
              AND esl.is_warmup = 0
            GROUP BY emg.muscle_group_id
        `, [clientId, tenantId, weekStart, weekStart]);

        // Trova programma e mesociclo attivo
        const activeProgram = await query(`
            SELECT cp.id as program_id, cp.mesocycle_id,
                   FLOOR(DATEDIFF(?, cp.start_date) / 7) + 1 as week_number
            FROM client_programs cp
            WHERE cp.client_id = ? AND cp.tenant_id = ? AND cp.status = 'active'
              AND cp.start_date <= ?
            ORDER BY cp.start_date DESC LIMIT 1
        `, [weekStart, clientId, tenantId, weekStart]);

        const program = activeProgram[0] || {};

        // Upsert per ogni gruppo muscolare
        for (const row of volumeData) {
            await query(`
                INSERT INTO weekly_volume_analytics
                (tenant_id, client_id, program_id, mesocycle_id, week_number, week_start,
                 muscle_group_id, total_sets, total_reps, total_volume, avg_rpe, avg_weight)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_sets = VALUES(total_sets),
                    total_reps = VALUES(total_reps),
                    total_volume = VALUES(total_volume),
                    avg_rpe = VALUES(avg_rpe),
                    avg_weight = VALUES(avg_weight),
                    program_id = VALUES(program_id),
                    mesocycle_id = VALUES(mesocycle_id)
            `, [
                tenantId, clientId, program.program_id || null, program.mesocycle_id || null,
                program.week_number || 1, weekStart,
                row.muscle_group_id, row.total_sets, row.total_reps || 0,
                row.total_volume || 0, row.avg_rpe || null, row.avg_weight || null
            ]);
        }

        return volumeData;
    }

    /**
     * Ottieni volume analytics per cliente
     */
    async getVolumeByClient(clientId, tenantId, options = {}) {
        const { weeks = 12, muscleGroupId, mesocycleId } = options;

        let sql = `
            SELECT wva.*, mg.name as muscle_group_name, mg.name_it, mg.category
            FROM weekly_volume_analytics wva
            JOIN muscle_groups mg ON wva.muscle_group_id = mg.id
            WHERE wva.client_id = ? AND wva.tenant_id = ?
              AND wva.week_start >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        `;
        const params = [clientId, tenantId, weeks];

        if (muscleGroupId) {
            sql += ' AND wva.muscle_group_id = ?';
            params.push(muscleGroupId);
        }

        if (mesocycleId) {
            sql += ' AND wva.mesocycle_id = ?';
            params.push(mesocycleId);
        }

        sql += ' ORDER BY wva.week_start ASC, mg.category ASC, mg.name ASC';

        return await query(sql, params);
    }

    /**
     * Ottieni riassunto volume per mesociclo
     */
    async getMesocycleSummary(clientId, tenantId, programId) {
        const summary = await query(`
            SELECT
                mg.id as muscle_group_id,
                mg.name, mg.name_it, mg.category,
                SUM(wva.total_sets) as total_sets,
                SUM(wva.total_reps) as total_reps,
                SUM(wva.total_volume) as total_volume,
                AVG(wva.avg_rpe) as avg_rpe,
                COUNT(DISTINCT wva.week_start) as weeks_trained
            FROM weekly_volume_analytics wva
            JOIN muscle_groups mg ON wva.muscle_group_id = mg.id
            WHERE wva.client_id = ? AND wva.tenant_id = ? AND wva.program_id = ?
            GROUP BY mg.id, mg.name, mg.name_it, mg.category
            ORDER BY total_sets DESC
        `, [clientId, tenantId, programId]);

        return summary;
    }

    /**
     * Confronta volume tra mesocicli successivi
     */
    async compareMesocycles(clientId, tenantId) {
        const comparison = await query(`
            SELECT
                wva.mesocycle_id, m.name as mesocycle_name, m.focus,
                mg.id as muscle_group_id, mg.name as muscle_group_name, mg.name_it,
                AVG(wva.total_sets) as avg_weekly_sets,
                AVG(wva.total_volume) as avg_weekly_volume,
                AVG(wva.avg_rpe) as avg_rpe,
                wva.program_id
            FROM weekly_volume_analytics wva
            JOIN muscle_groups mg ON wva.muscle_group_id = mg.id
            LEFT JOIN mesocycles m ON wva.mesocycle_id = m.id
            WHERE wva.client_id = ? AND wva.tenant_id = ?
            GROUP BY wva.mesocycle_id, wva.program_id, mg.id
            ORDER BY wva.week_start ASC
        `, [clientId, tenantId]);

        return comparison;
    }

    /**
     * Rileva plateau di volume (stagnazione set/volume per 3+ settimane)
     */
    async detectVolumePlateau(clientId, tenantId) {
        const plateaus = await query(`
            SELECT
                mg.id as muscle_group_id, mg.name, mg.name_it,
                GROUP_CONCAT(wva.total_sets ORDER BY wva.week_start) as sets_trend,
                GROUP_CONCAT(wva.total_volume ORDER BY wva.week_start) as volume_trend,
                COUNT(*) as weeks_count
            FROM weekly_volume_analytics wva
            JOIN muscle_groups mg ON wva.muscle_group_id = mg.id
            WHERE wva.client_id = ? AND wva.tenant_id = ?
              AND wva.week_start >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
            GROUP BY mg.id
            HAVING weeks_count >= 3
        `, [clientId, tenantId]);

        const alerts = [];
        for (const row of plateaus) {
            const volumes = row.volume_trend.split(',').map(Number);
            if (volumes.length >= 3) {
                // Controlla se le ultime 3 settimane hanno variazione < 5%
                const last3 = volumes.slice(-3);
                const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
                const maxDeviation = Math.max(...last3.map(v => Math.abs(v - avg) / (avg || 1)));

                if (maxDeviation < 0.05 && avg > 0) {
                    alerts.push({
                        muscleGroupId: row.muscle_group_id,
                        muscleName: row.name_it,
                        type: 'volume_plateau',
                        avgVolume: Math.round(avg),
                        weeks: 3
                    });
                }
            }
        }

        return alerts;
    }

    // === MUSCLE PRIORITIES ===

    async getMusclePriorities(clientId, tenantId) {
        return await query(`
            SELECT cmp.*, mg.name, mg.name_it, mg.category
            FROM client_muscle_priorities cmp
            JOIN muscle_groups mg ON cmp.muscle_group_id = mg.id
            WHERE cmp.client_id = ? AND cmp.tenant_id = ?
            ORDER BY FIELD(cmp.priority, 'high', 'medium', 'low'), mg.category, mg.name
        `, [clientId, tenantId]);
    }

    async setMusclePriority(clientId, tenantId, muscleGroupId, priority, notes) {
        await query(`
            INSERT INTO client_muscle_priorities (tenant_id, client_id, muscle_group_id, priority, notes)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE priority = VALUES(priority), notes = VALUES(notes)
        `, [tenantId, clientId, muscleGroupId, priority, notes || null]);

        return { success: true };
    }

    async deleteMusclePriority(clientId, tenantId, muscleGroupId) {
        const result = await query(
            'DELETE FROM client_muscle_priorities WHERE client_id = ? AND tenant_id = ? AND muscle_group_id = ?',
            [clientId, tenantId, muscleGroupId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = new VolumeService();
