/**
 * Readiness Service
 * Gestione check-in giornaliero e readiness score
 */

const { query } = require('../config/database');

class ReadinessService {
    /**
     * Ottieni check-in per data
     */
    async getCheckin(clientId, tenantId, date) {
        const checkins = await query(`
            SELECT * FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ? AND checkin_date = ?
        `, [clientId, tenantId, date]);

        return checkins[0] || null;
    }

    /**
     * Ottieni storico check-in
     */
    async getHistory(clientId, tenantId, options = {}) {
        const { startDate, endDate, limit = 30 } = options;

        let sql = `
            SELECT * FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
        `;
        const params = [clientId, tenantId];

        if (startDate) {
            sql += ' AND checkin_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND checkin_date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY checkin_date DESC LIMIT ?';
        params.push(limit);

        return await query(sql, params);
    }

    /**
     * Crea/Aggiorna check-in giornaliero
     */
    async saveCheckin(clientId, tenantId, checkinData) {
        const {
            checkinDate, sleepQuality, sleepHours, energyLevel,
            stressLevel, muscleSoreness, motivation, mood, notes
        } = checkinData;

        // Calculate readiness score (weighted average)
        const readinessScore = this.calculateReadinessScore({
            sleepQuality, sleepHours, energyLevel,
            stressLevel, muscleSoreness, motivation
        });

        const date = checkinDate || new Date().toISOString().split('T')[0];

        // Check if exists
        const existing = await this.getCheckin(clientId, tenantId, date);

        if (existing) {
            // Update
            await query(`
                UPDATE daily_checkins SET
                    sleep_quality = ?, sleep_hours = ?, energy_level = ?,
                    stress_level = ?, soreness_level = ?, motivation_level = ?,
                    readiness_score = ?, mood = ?, notes = ?
                WHERE id = ?
            `, [
                sleepQuality, sleepHours, energyLevel,
                stressLevel, muscleSoreness, motivation,
                readinessScore, mood || null, notes || null, existing.id
            ]);
            return this.getCheckin(clientId, tenantId, date);
        } else {
            // Insert
            await query(`
                INSERT INTO daily_checkins
                (tenant_id, client_id, checkin_date, sleep_quality, sleep_hours,
                 energy_level, stress_level, soreness_level, motivation_level,
                 readiness_score, mood, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId, clientId, date, sleepQuality, sleepHours,
                energyLevel, stressLevel, muscleSoreness, motivation,
                readinessScore, mood || null, notes || null
            ]);
            return this.getCheckin(clientId, tenantId, date);
        }
    }

    /**
     * Calcola readiness score
     */
    calculateReadinessScore(data) {
        const { sleepQuality, sleepHours, energyLevel, stressLevel, muscleSoreness, motivation } = data;

        // Weights
        const weights = {
            sleep: 0.25,
            sleepHours: 0.15,
            energy: 0.2,
            stress: 0.15,
            soreness: 0.15,
            motivation: 0.1
        };

        // Normalize sleep hours to 1-5 scale (7-9 optimal = 5)
        let sleepHoursScore = 5;
        if (sleepHours < 4) sleepHoursScore = 1;
        else if (sleepHours < 5) sleepHoursScore = 2;
        else if (sleepHours < 6) sleepHoursScore = 3;
        else if (sleepHours < 7) sleepHoursScore = 4;
        else if (sleepHours <= 9) sleepHoursScore = 5;
        else if (sleepHours <= 10) sleepHoursScore = 4;
        else sleepHoursScore = 3;

        // Invert stress and soreness (lower is better, scale 1-5)
        const stressInverted = 6 - (stressLevel || 3);
        const sorenessInverted = 6 - (muscleSoreness || 3);

        const score = (
            (sleepQuality || 3) * weights.sleep +
            sleepHoursScore * weights.sleepHours +
            (energyLevel || 3) * weights.energy +
            stressInverted * weights.stress +
            sorenessInverted * weights.soreness +
            (motivation || 3) * weights.motivation
        ) / 5 * 100;

        return Math.round(score * 10) / 10;
    }

    /**
     * Ottieni readiness medio per periodo
     */
    async getAverageReadiness(clientId, tenantId, days = 7) {
        const result = await query(`
            SELECT AVG(readiness_score) as avg_readiness,
                   AVG(sleep_quality) as avg_sleep,
                   AVG(energy_level) as avg_energy,
                   AVG(stress_level) as avg_stress
            FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
              AND checkin_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        `, [clientId, tenantId, days]);

        return result[0] || {};
    }

    /**
     * Verifica se serve alert per readiness basso
     */
    async checkReadinessAlerts(clientId, tenantId) {
        // Get last 3 days
        const recent = await query(`
            SELECT readiness_score FROM daily_checkins
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY checkin_date DESC LIMIT 3
        `, [clientId, tenantId]);

        if (recent.length >= 3) {
            const avgRecent = recent.reduce((sum, r) => sum + r.readiness_score, 0) / recent.length;

            if (avgRecent < 50) {
                // Create alert
                await query(`
                    INSERT INTO training_alerts
                    (tenant_id, client_id, alert_type, severity, title, message, data)
                    VALUES (?, ?, 'low_readiness', 'warning', 'Readiness basso',
                            'Il cliente mostra un readiness score basso negli ultimi 3 giorni. Considera un deload.', ?)
                `, [tenantId, clientId, JSON.stringify({ avgReadiness: avgRecent })]);

                return true;
            }
        }

        return false;
    }
}

module.exports = new ReadinessService();
