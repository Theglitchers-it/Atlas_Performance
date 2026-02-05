/**
 * Measurement Service
 * Gestione misurazioni corporee
 */

const { query } = require('../config/database');

class MeasurementService {
    /**
     * Ottieni misurazioni base per cliente
     */
    async getBodyMeasurements(clientId, tenantId, options = {}) {
        const { startDate, endDate, limit = 30 } = options;

        let sql = `
            SELECT * FROM body_measurements
            WHERE client_id = ? AND tenant_id = ?
        `;
        const params = [clientId, tenantId];

        if (startDate) {
            sql += ' AND measurement_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND measurement_date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY measurement_date DESC LIMIT ?';
        params.push(limit);

        return await query(sql, params);
    }

    /**
     * Aggiungi misurazione base
     */
    async addBodyMeasurement(clientId, tenantId, measurementData) {
        const { measurementDate, weightKg, bodyFatPercentage, muscleMassKg, notes } = measurementData;

        const [result] = await query(`
            INSERT INTO body_measurements
            (tenant_id, client_id, measurement_date, weight_kg, body_fat_percentage, muscle_mass_kg, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, clientId, measurementDate, weightKg || null, bodyFatPercentage || null, muscleMassKg || null, notes || null]);

        // Update client current weight
        if (weightKg) {
            await query('UPDATE clients SET current_weight_kg = ? WHERE id = ?', [weightKg, clientId]);
        }

        return { id: result.insertId };
    }

    /**
     * Ottieni circonferenze
     */
    async getCircumferences(clientId, tenantId, options = {}) {
        const { limit = 30 } = options;

        return await query(`
            SELECT * FROM circumference_measurements
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY measurement_date DESC LIMIT ?
        `, [clientId, tenantId, limit]);
    }

    /**
     * Aggiungi circonferenze
     */
    async addCircumferences(clientId, tenantId, data) {
        const {
            measurementDate, waistCm, hipsCm, bicepsCm, bicepsFlexedCm,
            shouldersCm, chestCm, thighUpperCm, thighLowerCm, glutesCm, notes
        } = data;

        // Calculate waist-hip ratio
        let waistHipRatio = null;
        if (waistCm && hipsCm) {
            waistHipRatio = Math.round((waistCm / hipsCm) * 100) / 100;
        }

        const [result] = await query(`
            INSERT INTO circumference_measurements
            (tenant_id, client_id, measurement_date, waist_cm, hips_cm, biceps_cm,
             biceps_flexed_cm, shoulders_cm, chest_cm, thigh_upper_cm, thigh_lower_cm,
             glutes_cm, waist_hip_ratio, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId, clientId, measurementDate, waistCm || null, hipsCm || null,
            bicepsCm || null, bicepsFlexedCm || null, shouldersCm || null,
            chestCm || null, thighUpperCm || null, thighLowerCm || null,
            glutesCm || null, waistHipRatio, notes || null
        ]);

        return { id: result.insertId };
    }

    /**
     * Ottieni plicometria
     */
    async getSkinfolds(clientId, tenantId, options = {}) {
        const { limit = 30 } = options;

        return await query(`
            SELECT * FROM skinfold_measurements
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY measurement_date DESC LIMIT ?
        `, [clientId, tenantId, limit]);
    }

    /**
     * Aggiungi plicometria
     */
    async addSkinfolds(clientId, tenantId, data) {
        const {
            measurementDate, chestMm, subscapularMm, suprailiacMm, abdominalMm,
            quadricepsMm, bicepsMm, tricepsMm, cheekMm, calfMm, calculationMethod, notes
        } = data;

        // Calculate sum and body fat
        const sumTotal = (chestMm || 0) + (subscapularMm || 0) + (suprailiacMm || 0) +
                         (abdominalMm || 0) + (quadricepsMm || 0) + (bicepsMm || 0) +
                         (tricepsMm || 0) + (cheekMm || 0) + (calfMm || 0);

        // Simple body fat estimate (Jackson-Pollock 3-site simplified)
        // This is a simplified calculation - real implementation would use proper formulas
        const bodyFatPercentage = Math.round((sumTotal * 0.1) * 10) / 10;

        const [result] = await query(`
            INSERT INTO skinfold_measurements
            (tenant_id, client_id, measurement_date, chest_mm, subscapular_mm, suprailiac_mm,
             abdominal_mm, quadriceps_mm, biceps_mm, triceps_mm, cheek_mm, calf_mm,
             sum_total_mm, body_fat_percentage, calculation_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId, clientId, measurementDate, chestMm || null, subscapularMm || null,
            suprailiacMm || null, abdominalMm || null, quadricepsMm || null,
            bicepsMm || null, tricepsMm || null, cheekMm || null, calfMm || null,
            sumTotal || null, bodyFatPercentage || null,
            calculationMethod || 'jackson_pollock_3', notes || null
        ]);

        return { id: result.insertId };
    }

    /**
     * Ottieni BIA
     */
    async getBiaMeasurements(clientId, tenantId, options = {}) {
        const { limit = 30 } = options;

        return await query(`
            SELECT * FROM bia_measurements
            WHERE client_id = ? AND tenant_id = ?
            ORDER BY measurement_date DESC LIMIT ?
        `, [clientId, tenantId, limit]);
    }

    /**
     * Aggiungi BIA
     */
    async addBiaMeasurement(clientId, tenantId, data) {
        const {
            measurementDate, leanMassKg, leanMassPct, fatMassKg, fatMassPct,
            totalBodyWaterL, totalBodyWaterPct, muscleMassKg, basalMetabolicRate,
            visceralFatLevel, boneMassKg, deviceModel, notes
        } = data;

        const [result] = await query(`
            INSERT INTO bia_measurements
            (tenant_id, client_id, measurement_date, lean_mass_kg, lean_mass_pct,
             fat_mass_kg, fat_mass_pct, total_body_water_l, total_body_water_pct,
             muscle_mass_kg, basal_metabolic_rate, visceral_fat_level, bone_mass_kg,
             device_model, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId, clientId, measurementDate, leanMassKg || null, leanMassPct || null,
            fatMassKg || null, fatMassPct || null, totalBodyWaterL || null,
            totalBodyWaterPct || null, muscleMassKg || null, basalMetabolicRate || null,
            visceralFatLevel || null, boneMassKg || null, deviceModel || null, notes || null
        ]);

        return { id: result.insertId };
    }

    /**
     * Ottieni tutti i progressi per un cliente
     */
    async getAllProgress(clientId, tenantId) {
        const [body, circumferences, skinfolds, bia] = await Promise.all([
            this.getBodyMeasurements(clientId, tenantId, { limit: 10 }),
            this.getCircumferences(clientId, tenantId, { limit: 10 }),
            this.getSkinfolds(clientId, tenantId, { limit: 10 }),
            this.getBiaMeasurements(clientId, tenantId, { limit: 10 })
        ]);

        return {
            bodyMeasurements: body,
            circumferences,
            skinfolds,
            biaMeasurements: bia
        };
    }

    /**
     * Calcola variazione peso
     */
    async getWeightChange(clientId, tenantId, days = 30) {
        const measurements = await query(`
            SELECT weight_kg, measurement_date FROM body_measurements
            WHERE client_id = ? AND tenant_id = ? AND weight_kg IS NOT NULL
            ORDER BY measurement_date DESC LIMIT 2
        `, [clientId, tenantId]);

        if (measurements.length < 2) {
            return { change: 0, percentage: 0 };
        }

        const current = measurements[0].weight_kg;
        const previous = measurements[1].weight_kg;
        const change = Math.round((current - previous) * 10) / 10;
        const percentage = Math.round((change / previous) * 1000) / 10;

        return { current, previous, change, percentage };
    }
}

module.exports = new MeasurementService();
