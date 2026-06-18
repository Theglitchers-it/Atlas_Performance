/**
 * Analytics Service
 * Aggregazione dati e statistiche per il tenant
 */

const { query } = require('../config/database');

class AnalyticsService {
    /**
     * Overview generale del tenant
     */
    async getOverview(tenantId) {
        // Statistiche indipendenti → caricate in parallelo (era 4 query sequenziali).
        const [[clientStats], [sessionStats], [appointmentStats], [programStats]] = await Promise.all([
            query(
                `SELECT
                COUNT(*) as total_clients,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_clients,
                SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_clients_30d
            FROM clients WHERE tenant_id = ?`, [tenantId]
            ),
            query(
                `SELECT
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN duration_minutes END), 0) as avg_duration,
                SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as sessions_this_week
            FROM workout_sessions WHERE tenant_id = ?`, [tenantId]
            ),
            query(
                `SELECT
                COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN DATE(start_datetime) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as appointments_this_week
            FROM appointments WHERE tenant_id = ?`, [tenantId]
            ),
            query(
                `SELECT
                COUNT(*) as total_programs,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_programs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_programs
            FROM client_programs WHERE tenant_id = ?`, [tenantId]
            ),
        ]);

        return {
            clients: clientStats,
            sessions: sessionStats,
            appointments: appointmentStats,
            programs: programStats
        };
    }

    /**
     * Trend sessioni per periodo (ultimi 12 periodi)
     */
    async getSessionTrend(tenantId, groupBy = 'week') {
        let dateFormat, interval;
        if (groupBy === 'day') {
            dateFormat = '%Y-%m-%d';
            interval = '30 DAY';
        } else if (groupBy === 'month') {
            dateFormat = '%Y-%m';
            interval = '12 MONTH';
        } else {
            dateFormat = '%x-W%v'; // ISO week
            interval = '12 WEEK';
        }

        const rows = await query(
            `SELECT
                DATE_FORMAT(created_at, ?) as period,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM workout_sessions
            WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
            GROUP BY period ORDER BY period ASC`,
            [dateFormat, tenantId]
        );

        return rows;
    }

    /**
     * Clienti piu attivi (per sessioni completate)
     */
    async getTopClients(tenantId, limit = 10) {
        const rows = await query(
            `SELECT
                c.id, c.first_name, c.last_name,
                COUNT(ws.id) as total_sessions,
                SUM(CASE WHEN ws.status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                COALESCE(SUM(ws.duration_minutes), 0) as total_minutes,
                c.xp_points, c.level
            FROM clients c
            LEFT JOIN workout_sessions ws ON ws.client_id = c.id AND ws.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            WHERE c.tenant_id = ?
            GROUP BY c.id
            ORDER BY completed_sessions DESC
            LIMIT ?`,
            [tenantId, parseInt(limit)]
        );
        return rows;
    }

    /**
     * Top clienti con progressi (peso, sessioni, check-in streak)
     */
    async getTopClientsProgress(tenantId, limit = 5) {
        const rows = await query(
            `SELECT
                c.id, c.first_name, c.last_name, c.status,
                (SELECT bm.weight_kg FROM body_measurements bm WHERE bm.client_id = c.id AND bm.tenant_id = c.tenant_id ORDER BY bm.measurement_date DESC LIMIT 1) as current_weight,
                (SELECT bm.weight_kg FROM body_measurements bm WHERE bm.client_id = c.id AND bm.tenant_id = c.tenant_id AND bm.measurement_date <= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ORDER BY bm.measurement_date DESC LIMIT 1) as prev_weight,
                (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.client_id = c.id AND dc.checkin_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as checkin_count,
                (SELECT COUNT(*) FROM workout_sessions ws WHERE ws.client_id = c.id AND ws.status = 'completed' AND ws.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as recent_completed
            FROM clients c
            WHERE c.tenant_id = ? AND c.status = 'active'
            ORDER BY recent_completed DESC
            LIMIT ?`,
            [tenantId, parseInt(limit)]
        );
        return rows;
    }

    /**
     * Distribuzione tipi appuntamento
     */
    async getAppointmentDistribution(tenantId) {
        const rows = await query(
            `SELECT appointment_type, COUNT(*) as count
            FROM appointments
            WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY appointment_type`,
            [tenantId]
        );
        return rows;
    }

    /**
     * Media readiness score ultimi 30 giorni
     */
    async getReadinessTrend(tenantId) {
        const rows = await query(
            `SELECT
                DATE(dc.checkin_date) as date,
                AVG(dc.readiness_score) as avg_score,
                COUNT(*) as checkins
            FROM daily_checkins dc
            JOIN clients c ON dc.client_id = c.id
            WHERE c.tenant_id = ? AND dc.checkin_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(dc.checkin_date)
            ORDER BY date ASC`,
            [tenantId]
        );
        return rows;
    }

    /**
     * Completamento programmi
     */
    async getProgramCompletion(tenantId) {
        const rows = await query(
            `SELECT status, COUNT(*) as count
            FROM client_programs
            WHERE tenant_id = ?
            GROUP BY status`,
            [tenantId]
        );
        return rows;
    }

    /**
     * Statistiche rapide per dashboard
     */
    async getQuickStats(tenantId) {
        const [stats] = await query(
            `SELECT
                (SELECT COUNT(*) FROM clients WHERE tenant_id = ? AND status = 'active') as active_clients,
                (SELECT COUNT(*) FROM workout_sessions WHERE tenant_id = ? AND DATE(created_at) = CURDATE()) as sessions_today,
                (SELECT COUNT(*) FROM appointments WHERE tenant_id = ? AND DATE(start_datetime) = CURDATE() AND status != 'cancelled') as appointments_today,
                (SELECT AVG(readiness_score) FROM daily_checkins dc JOIN clients c ON dc.client_id = c.id WHERE c.tenant_id = ? AND dc.checkin_date = CURDATE()) as avg_readiness_today`,
            [tenantId, tenantId, tenantId, tenantId]
        );
        return stats;
    }

    /**
     * Segmenti clienti per widget dashboard (nuovo/medio/top/vecchio/dormiente + custom).
     */
    async getClientSegments(tenantId) {
        const rows = await query(
            `SELECT tag, COUNT(DISTINCT client_id) AS count
             FROM client_tags
             WHERE tenant_id = ?
             GROUP BY tag`,
            [tenantId]
        );
        const segments = { nuovo: 0, medio: 0, top: 0, vecchio: 0, dormiente: 0 };
        let custom = 0;
        for (const r of rows) {
            if (segments.hasOwnProperty(r.tag)) segments[r.tag] = r.count;
            else custom += r.count;
        }
        return { ...segments, custom };
    }

    /**
     * Action Items per il cruscotto trainer:
     * - Nuovi clienti senza primo check (badge NUOVO)
     * - Abbonamenti in scadenza (badge RINNOVO)
     * - Check corporei scaduti (badge RINNOVO)
     *
     * Ritorna { items, counts } aggregati e ordinati per urgenza.
     */
    async getActionItems(tenantId, { renewalDays = 14, checkinDays = 30 } = {}) {
        const renewal = parseInt(renewalDays) || 14;
        const checkin = parseInt(checkinDays) || 30;

        // 1. Nuovi clienti senza prima misurazione corporea
        const newNoCheck = await query(
            `SELECT
                c.id AS client_id,
                c.first_name,
                c.last_name,
c.created_at,
                DATEDIFF(CURDATE(), DATE(c.created_at)) AS days_since_signup
            FROM clients c
            LEFT JOIN body_measurements bm ON bm.client_id = c.id AND bm.tenant_id = c.tenant_id
            WHERE c.tenant_id = ?
              AND c.status = 'active'
            GROUP BY c.id
            HAVING COUNT(bm.id) = 0
            ORDER BY c.created_at DESC`,
            [tenantId]
        );

        // 2. Abbonamenti attivi in scadenza entro N giorni
        const expiringSubs = await query(
            `SELECT
                cs.id AS subscription_id,
                cs.client_id,
                cs.plan_type,
                cs.end_date,
                c.first_name,
                c.last_name,
DATEDIFF(cs.end_date, CURDATE()) AS days_left
            FROM client_subscriptions cs
            JOIN clients c ON c.id = cs.client_id
            WHERE cs.tenant_id = ?
              AND cs.status = 'active'
              AND cs.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY cs.end_date ASC`,
            [tenantId, renewal]
        );

        // 3. Check corporei scaduti: ultima misurazione > N giorni fa
        //    Esclude clienti che non hanno mai fatto misurazioni (gia coperti da newNoCheck).
        const overdueCheckins = await query(
            `SELECT
                c.id AS client_id,
                c.first_name,
                c.last_name,
MAX(bm.measurement_date) AS last_checkin_date,
                DATEDIFF(CURDATE(), MAX(bm.measurement_date)) AS days_since_checkin
            FROM clients c
            JOIN body_measurements bm ON bm.client_id = c.id AND bm.tenant_id = c.tenant_id
            WHERE c.tenant_id = ?
              AND c.status = 'active'
            GROUP BY c.id
            HAVING DATEDIFF(CURDATE(), MAX(bm.measurement_date)) > ?
            ORDER BY last_checkin_date ASC`,
            [tenantId, checkin]
        );

        // Costruisci items unificati
        const items = [];

        for (const r of newNoCheck) {
            items.push({
                client_id: r.client_id,
                first_name: r.first_name,
                last_name: r.last_name,
badge: 'NUOVO',
                action_type: 'new_no_check',
                message: 'Da programmare primo check',
                urgency: Math.min(100, r.days_since_signup * 2),
                meta: { days_since_signup: r.days_since_signup }
            });
        }

        for (const r of expiringSubs) {
            const urgency = 100 - Math.max(0, Math.min(100, r.days_left * (100 / renewal)));
            items.push({
                client_id: r.client_id,
                first_name: r.first_name,
                last_name: r.last_name,
badge: 'RINNOVO',
                action_type: 'subscription_expiring',
                message: r.days_left <= 0
                    ? 'Abbonamento scaduto oggi'
                    : `Abbonamento scade tra ${r.days_left} giorn${r.days_left === 1 ? 'o' : 'i'}`,
                urgency,
                meta: {
                    subscription_id: r.subscription_id,
                    plan_type: r.plan_type,
                    end_date: r.end_date,
                    days_left: r.days_left
                }
            });
        }

        for (const r of overdueCheckins) {
            items.push({
                client_id: r.client_id,
                first_name: r.first_name,
                last_name: r.last_name,
badge: 'RINNOVO',
                action_type: 'checkin_overdue',
                message: `Check corporeo da aggiornare (${r.days_since_checkin} giorni fa)`,
                urgency: Math.min(100, 50 + r.days_since_checkin / 2),
                meta: {
                    last_checkin_date: r.last_checkin_date,
                    days_since_checkin: r.days_since_checkin
                }
            });
        }

        items.sort((a, b) => b.urgency - a.urgency);

        const counts = {
            total: items.length,
            new: items.filter(i => i.badge === 'NUOVO').length,
            renewal: items.filter(i => i.badge === 'RINNOVO').length,
            expiring_subscriptions: expiringSubs.length,
            checkin_overdue: overdueCheckins.length,
            new_no_check: newNoCheck.length
        };

        return { items, counts };
    }

    /**
     * Volume allenante (serie non-warmup) per gruppo muscolare in un periodo.
     * Serie pesate: muscolo primario = peso 1.0, secondari = activation_percentage/100.
     * Filtri accettati: { programId } (da client_programs.start_date..end_date),
     * { fromDate, toDate } espliciti, oppure { days } (default 28).
     */
    async getVolumeByMuscleGroup(tenantId, clientId, opts = {}) {
        let from, to, programName = null;

        if (opts.programId) {
            const rows = await query(
                `SELECT name, start_date, end_date
                 FROM client_programs
                 WHERE id = ? AND client_id = ? AND tenant_id = ?`,
                [opts.programId, clientId, tenantId]
            );
            if (!rows[0]) {
                throw { status: 404, message: 'Programma non trovato' };
            }
            from = rows[0].start_date;
            to = rows[0].end_date || new Date().toISOString().slice(0, 10);
            programName = rows[0].name;
        } else if (opts.fromDate && opts.toDate) {
            from = opts.fromDate;
            to = opts.toDate;
        } else {
            const days = Math.min(Math.max(parseInt(opts.days) || 28, 1), 365);
            const d = new Date();
            to = d.toISOString().slice(0, 10);
            d.setDate(d.getDate() - days);
            from = d.toISOString().slice(0, 10);
        }

        const rows = await query(
            `SELECT mg.id AS muscle_group_id,
                    COALESCE(mg.name_it, mg.name) AS muscle_group,
                    mg.category AS category,
                    SUM(CASE WHEN emg.is_primary = 1 THEN 1.0
                             ELSE COALESCE(emg.activation_percentage, 50) / 100.0 END) AS weighted_sets,
                    COUNT(*) AS raw_sets
             FROM exercise_set_logs esl
             JOIN workout_session_exercises wse ON esl.session_exercise_id = wse.id
             JOIN workout_sessions ws ON wse.session_id = ws.id
             JOIN exercise_muscle_groups emg ON wse.exercise_id = emg.exercise_id
             JOIN muscle_groups mg ON emg.muscle_group_id = mg.id
             WHERE ws.tenant_id = ?
               AND ws.client_id = ?
               AND ws.status = 'completed'
               AND esl.is_warmup = 0
               AND ws.completed_at >= ?
               AND ws.completed_at < DATE_ADD(?, INTERVAL 1 DAY)
             GROUP BY mg.id, mg.name_it, mg.name, mg.category
             ORDER BY weighted_sets DESC`,
            [tenantId, clientId, from, to]
        );

        const items = rows.map(r => ({
            muscle_group_id: r.muscle_group_id,
            muscle_group: r.muscle_group,
            category: r.category,
            weighted_sets: Math.round(Number(r.weighted_sets) * 10) / 10,
            raw_sets: Number(r.raw_sets)
        }));

        const totalSets = items.reduce((s, i) => s + i.raw_sets, 0);

        return {
            items,
            totals: {
                muscle_groups: items.length,
                raw_sets: totalSets,
                weighted_sets: Math.round(items.reduce((s, i) => s + i.weighted_sets, 0) * 10) / 10
            },
            period: { from, to, program_name: programName }
        };
    }

    /**
     * Snapshot integrato salute/prestazione cliente per l'incrocio
     * trainer↔nutrizionista: fase dieta + readiness media 7gg + gap calorico
     * (real vs target meal plan attivo) + status aggregato green/yellow/red.
     */
    async getClientHealthSnapshot(tenantId, clientId) {
        const clientRows = await query(
            `SELECT id, first_name, last_name, current_diet_phase, baseline_stress_level
             FROM clients WHERE id = ? AND tenant_id = ?`,
            [clientId, tenantId]
        );
        if (!clientRows[0]) return null;
        const client = clientRows[0];

        const [readinessRows, foodLogRows, planRows] = await Promise.all([
            query(
                `SELECT AVG(readiness_score) AS avg_readiness, COUNT(*) AS entries
                 FROM daily_checkins
                 WHERE client_id = ? AND tenant_id = ?
                   AND checkin_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
                [clientId, tenantId]
            ),
            query(
                `SELECT DATE(logged_at) AS day, SUM(calories) AS cal
                 FROM food_log_entries
                 WHERE client_id = ? AND tenant_id = ?
                   AND logged_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                 GROUP BY DATE(logged_at)`,
                [clientId, tenantId]
            ),
            query(
                `SELECT id, target_calories, target_protein_g, target_carbs_g, target_fat_g
                 FROM meal_plans
                 WHERE client_id = ? AND tenant_id = ? AND status = 'active'
                 ORDER BY created_at DESC LIMIT 1`,
                [clientId, tenantId]
            )
        ]);

        const avgReadiness = readinessRows[0]?.avg_readiness != null
            ? Math.round(Number(readinessRows[0].avg_readiness))
            : null;
        const readinessEntries = Number(readinessRows[0]?.entries || 0);

        const caloriesDays = foodLogRows.length;
        const avgCaloriesReal = caloriesDays > 0
            ? Math.round(foodLogRows.reduce((s, r) => s + Number(r.cal || 0), 0) / caloriesDays)
            : null;
        const targetCalories = planRows[0]?.target_calories != null
            ? Math.round(Number(planRows[0].target_calories))
            : null;

        let caloricGapPct = null;
        if (avgCaloriesReal != null && targetCalories) {
            caloricGapPct = Math.round(((avgCaloriesReal - targetCalories) / targetCalories) * 100);
        }

        let status = 'green';
        const warnings = [];

        if (avgReadiness != null && avgReadiness < 50) {
            status = 'red';
            warnings.push(`Readiness media ${avgReadiness}/100 sotto 50 negli ultimi 7gg`);
        } else if (avgReadiness != null && avgReadiness < 65) {
            if (status === 'green') status = 'yellow';
            warnings.push(`Readiness media ${avgReadiness}/100 moderata`);
        }

        if (caloricGapPct != null && Math.abs(caloricGapPct) >= 25) {
            status = 'red';
            const direction = caloricGapPct < 0 ? 'sotto' : 'sopra';
            warnings.push(`Apporto calorico ${Math.abs(caloricGapPct)}% ${direction} al target`);
        } else if (caloricGapPct != null && Math.abs(caloricGapPct) >= 15) {
            if (status === 'green') status = 'yellow';
            warnings.push(`Apporto calorico ${Math.abs(caloricGapPct)}% fuori target`);
        }

        if (client.current_diet_phase === 'cut' && avgReadiness != null && avgReadiness < 60) {
            status = 'red';
            warnings.push('Cliente in cut con readiness bassa: rischio overtraining');
        }

        return {
            client: {
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
                current_diet_phase: client.current_diet_phase,
                baseline_stress_level: client.baseline_stress_level
            },
            readiness: {
                avg_7d: avgReadiness,
                entries_7d: readinessEntries
            },
            nutrition: {
                avg_calories_7d: avgCaloriesReal,
                target_calories: targetCalories,
                caloric_gap_pct: caloricGapPct,
                logged_days_7d: caloriesDays,
                has_active_plan: !!planRows[0]
            },
            status,
            warnings
        };
    }
}

module.exports = new AnalyticsService();
