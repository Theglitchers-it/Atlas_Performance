/**
 * Alert Service
 * Smart Training Alerts - 6 tipi di alert per il trainer
 *
 * 1. low_readiness - Readiness basso per 3+ giorni
 * 2. volume_plateau - Volume stagnante per 3+ settimane
 * 3. recovery_low - Recovery insufficiente (alta soreness + poco sonno)
 * 4. overtraining_risk - Rischio overtraining (alta frequenza + basso readiness + alta soreness)
 * 5. fatigue_accumulation - Accumulo fatica progressivo nel mesociclo
 * 6. deload_suggested - Suggerimento deload basato su settimane consecutive ad alto volume
 */

const { query } = require('../config/database');

class AlertService {

    /**
     * Esegui tutti i check per un cliente
     */
    async runAllChecks(clientId, tenantId) {
        const alerts = [];

        const [a1, a2, a3, a4, a5, a6] = await Promise.allSettled([
            this.checkLowReadiness(clientId, tenantId),
            this.checkVolumePlateau(clientId, tenantId),
            this.checkRecoveryLow(clientId, tenantId),
            this.checkOvertrainingRisk(clientId, tenantId),
            this.checkFatigueAccumulation(clientId, tenantId),
            this.checkDeloadSuggested(clientId, tenantId)
        ]);

        for (const result of [a1, a2, a3, a4, a5, a6]) {
            if (result.status === 'fulfilled' && result.value) {
                alerts.push(result.value);
            }
        }

        return alerts;
    }

    /**
     * 1. LOW READINESS - Readiness score < 50 per 3 giorni consecutivi
     */
    async checkLowReadiness(clientId, tenantId) {
        const recent = await query(`
            SELECT readiness_score, checkin_date FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY checkin_date DESC LIMIT 3
        `, [clientId, tenantId]);

        if (recent.length < 3) return null;

        const avgRecent = recent.reduce((sum, r) => sum + (r.readiness_score || 0), 0) / recent.length;

        if (avgRecent < 50) {
            return this.createAlert(tenantId, clientId, {
                alertType: 'low_readiness',
                severity: 'medium',
                title: 'Readiness basso persistente',
                message: `Readiness medio degli ultimi 3 giorni: ${avgRecent.toFixed(1)}. Considera un adattamento del carico.`,
                data: { avgReadiness: avgRecent, days: 3 }
            });
        }

        return null;
    }

    /**
     * 2. VOLUME PLATEAU - Volume per gruppo muscolare stagnante per 3+ settimane
     */
    async checkVolumePlateau(clientId, tenantId) {
        const plateaus = await query(`
            SELECT
                mg.id as muscle_group_id, mg.name, mg.name_it,
                GROUP_CONCAT(wva.total_volume ORDER BY wva.week_start) as volume_trend,
                COUNT(*) as weeks_count
            FROM weekly_volume_analytics wva
            JOIN muscle_groups mg ON wva.muscle_group_id = mg.id
            WHERE wva.client_id = ? AND wva.tenant_id = ?
              AND wva.week_start >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
            GROUP BY mg.id
            HAVING weeks_count >= 3
        `, [clientId, tenantId]);

        for (const row of plateaus) {
            if (!row.volume_trend) continue;
            const volumes = row.volume_trend.split(',').map(Number);
            if (volumes.length < 3) continue;

            const last3 = volumes.slice(-3);
            const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
            const maxDeviation = Math.max(...last3.map(v => Math.abs(v - avg) / (avg || 1)));

            if (maxDeviation < 0.05 && avg > 0) {
                return this.createAlert(tenantId, clientId, {
                    alertType: 'volume_plateau',
                    severity: 'low',
                    title: `Plateau volume: ${row.name_it || row.name}`,
                    message: `Il volume per ${row.name_it || row.name} e stagnante da 3 settimane (media: ${Math.round(avg)} kg). Considera una progressione.`,
                    data: { muscleGroupId: row.muscle_group_id, avgVolume: Math.round(avg), weeks: 3 }
                });
            }
        }

        return null;
    }

    /**
     * 3. RECOVERY LOW - Alta soreness + bassa qualita sonno
     */
    async checkRecoveryLow(clientId, tenantId) {
        const recent = await query(`
            SELECT soreness_level, sleep_quality, sleep_hours, checkin_date
            FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY checkin_date DESC LIMIT 3
        `, [clientId, tenantId]);

        if (recent.length < 2) return null;

        const avgSoreness = recent.reduce((sum, r) => sum + (r.soreness_level || 5), 0) / recent.length;
        const avgSleepQuality = recent.reduce((sum, r) => sum + (r.sleep_quality || 5), 0) / recent.length;
        const avgSleepHours = recent.reduce((sum, r) => sum + (r.sleep_hours || 7), 0) / recent.length;

        // Alta soreness (>7) + basso sonno (<5 qualita o <6h)
        if (avgSoreness >= 7 && (avgSleepQuality < 5 || avgSleepHours < 6)) {
            return this.createAlert(tenantId, clientId, {
                alertType: 'recovery_low',
                severity: 'medium',
                title: 'Recovery insufficiente',
                message: `Soreness elevata (${avgSoreness.toFixed(1)}/10) con qualita sonno bassa (${avgSleepQuality.toFixed(1)}/10, ${avgSleepHours.toFixed(1)}h). Il recupero e compromesso.`,
                data: { avgSoreness, avgSleepQuality, avgSleepHours }
            });
        }

        return null;
    }

    /**
     * 4. OVERTRAINING RISK - Alta frequenza + basso readiness + alta soreness per 5+ giorni
     */
    async checkOvertrainingRisk(clientId, tenantId) {
        // Check sessioni ultime 7 giorni
        const sessionCount = await query(`
            SELECT COUNT(*) as cnt FROM workout_sessions
            WHERE client_id = ? AND tenant_id = ? AND status = 'completed'
              AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [clientId, tenantId]);

        const sessionsLastWeek = sessionCount[0]?.cnt || 0;

        // Check readiness e soreness ultimi 5 giorni
        const checkins = await query(`
            SELECT readiness_score, soreness_level FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY checkin_date DESC LIMIT 5
        `, [clientId, tenantId]);

        if (checkins.length < 3 || sessionsLastWeek < 4) return null;

        const avgReadiness = checkins.reduce((sum, r) => sum + (r.readiness_score || 50), 0) / checkins.length;
        const avgSoreness = checkins.reduce((sum, r) => sum + (r.soreness_level || 5), 0) / checkins.length;

        // 4+ sessioni + readiness < 45 + soreness > 7
        if (avgReadiness < 45 && avgSoreness > 7) {
            return this.createAlert(tenantId, clientId, {
                alertType: 'overtraining_risk',
                severity: 'high',
                title: 'Rischio overtraining',
                message: `${sessionsLastWeek} sessioni in 7 giorni con readiness basso (${avgReadiness.toFixed(1)}) e soreness alta (${avgSoreness.toFixed(1)}). Rischio sovrallenamento elevato.`,
                data: { sessionsLastWeek, avgReadiness, avgSoreness }
            });
        }

        return null;
    }

    /**
     * 5. FATIGUE ACCUMULATION - Trend readiness in calo per 5+ giorni
     */
    async checkFatigueAccumulation(clientId, tenantId) {
        const checkins = await query(`
            SELECT readiness_score, checkin_date FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY checkin_date DESC LIMIT 7
        `, [clientId, tenantId]);

        if (checkins.length < 5) return null;

        // Inverti per ordine cronologico
        const scores = checkins.reverse().map(c => c.readiness_score || 50);

        // Conta quanti giorni consecutivi il readiness sta calando
        let decliningDays = 0;
        for (let i = 1; i < scores.length; i++) {
            if (scores[i] < scores[i - 1]) {
                decliningDays++;
            } else {
                decliningDays = 0;
            }
        }

        if (decliningDays >= 4) {
            const drop = scores[0] - scores[scores.length - 1];
            return this.createAlert(tenantId, clientId, {
                alertType: 'fatigue_accumulation',
                severity: 'medium',
                title: 'Accumulo fatica progressivo',
                message: `Readiness in calo costante da ${decliningDays + 1} giorni (da ${scores[0].toFixed(1)} a ${scores[scores.length - 1].toFixed(1)}). Valuta una riduzione del carico.`,
                data: { decliningDays: decliningDays + 1, readinessDrop: drop }
            });
        }

        return null;
    }

    /**
     * 6. DELOAD SUGGESTED - 4+ settimane consecutive ad alto volume senza deload
     */
    async checkDeloadSuggested(clientId, tenantId) {
        const weeks = await query(`
            SELECT wva.week_start,
                   SUM(wva.total_sets) as weekly_sets,
                   AVG(wva.avg_rpe) as weekly_avg_rpe
            FROM weekly_volume_analytics wva
            WHERE wva.client_id = ? AND wva.tenant_id = ?
              AND wva.week_start >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)
            GROUP BY wva.week_start
            ORDER BY wva.week_start DESC
        `, [clientId, tenantId]);

        if (weeks.length < 4) return null;

        // Conta settimane consecutive con RPE medio > 7.5 e sets >= 15
        let highIntensityWeeks = 0;
        for (const week of weeks) {
            if ((week.weekly_avg_rpe || 0) >= 7.5 && (week.weekly_sets || 0) >= 15) {
                highIntensityWeeks++;
            } else {
                break;
            }
        }

        if (highIntensityWeeks >= 4) {
            return this.createAlert(tenantId, clientId, {
                alertType: 'deload_suggested',
                severity: 'low',
                title: 'Deload consigliato',
                message: `${highIntensityWeeks} settimane consecutive ad alta intensita (RPE > 7.5). Una settimana di deload e consigliata per ottimizzare il recupero.`,
                data: { highIntensityWeeks, avgRpe: weeks[0]?.weekly_avg_rpe }
            });
        }

        return null;
    }

    // === HELPERS ===

    /**
     * Crea alert evitando duplicati recenti (24h)
     */
    async createAlert(tenantId, clientId, alertData) {
        const { alertType, severity, title, message, data } = alertData;

        // Evita duplicati nelle ultime 24h
        const existing = await query(`
            SELECT id FROM training_alerts
            WHERE tenant_id = ? AND client_id = ? AND alert_type = ?
              AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
              AND is_resolved = 0
        `, [tenantId, clientId, alertType]);

        if (existing.length > 0) return null;

        await query(`
            INSERT INTO training_alerts
            (tenant_id, client_id, alert_type, severity, title, message, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, clientId, alertType, severity, title, message, JSON.stringify(data)]);

        return { alertType, severity, title, message, data };
    }

    /**
     * Ottieni alert attivi per un tenant
     */
    async getAlerts(tenantId, options = {}) {
        const { clientId, severity, dismissed = false, limit = 50 } = options;

        let sql = `
            SELECT ta.*, c.first_name, c.last_name
            FROM training_alerts ta
            JOIN clients c ON ta.client_id = c.id AND c.tenant_id = ta.tenant_id
            WHERE ta.tenant_id = ? AND ta.is_resolved = ?
        `;
        const params = [tenantId, dismissed ? 1 : 0];

        if (clientId) {
            sql += ' AND ta.client_id = ?';
            params.push(clientId);
        }
        if (severity) {
            sql += ' AND ta.severity = ?';
            params.push(severity);
        }

        sql += ' ORDER BY FIELD(ta.severity, "high", "medium", "low"), ta.created_at DESC LIMIT ?';
        params.push(limit);

        const alerts = await query(sql, params);
        return alerts.map(a => ({
            ...a,
            data: a.data ? JSON.parse(a.data) : null
        }));
    }

    /**
     * Dismissa un alert
     */
    async dismissAlert(alertId, tenantId) {
        const result = await query(
            'UPDATE training_alerts SET is_resolved = 1 WHERE id = ? AND tenant_id = ?',
            [alertId, tenantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Dismissa tutti gli alert di un cliente
     */
    async dismissAllForClient(clientId, tenantId) {
        await query(
            'UPDATE training_alerts SET is_resolved = 1 WHERE client_id = ? AND tenant_id = ? AND is_resolved = 0',
            [clientId, tenantId]
        );
        return { success: true };
    }
}

module.exports = new AlertService();
