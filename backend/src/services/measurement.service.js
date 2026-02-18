/**
 * Measurement Service - Servizio Unificato
 * Gestione misurazioni corporee: antropometria, peso, circonferenze, plicometria, BIA
 */

const { query } = require("../config/database");
const { createServiceLogger } = require("../config/logger");
const logger = createServiceLogger("MEASUREMENT");

class MeasurementService {
  // ============================================
  // FORMULE JACKSON-POLLOCK & DURNIN-WOMERSLEY
  // ============================================

  static calculateBodyFatJP3Male(chestMm, abdominalMm, quadricepsMm, age) {
    const sum = chestMm + abdominalMm + quadricepsMm;
    const density =
      1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age;
    return parseFloat((495 / density - 450).toFixed(1));
  }

  static calculateBodyFatJP3Female(tricepsMm, suprailiacMm, quadricepsMm, age) {
    const sum = tricepsMm + suprailiacMm + quadricepsMm;
    const density =
      1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
    return parseFloat((495 / density - 450).toFixed(1));
  }

  static calculateBodyFatJP7Male(
    chestMm,
    abdominalMm,
    quadricepsMm,
    tricepsMm,
    subscapularMm,
    suprailiacMm,
    bicepsMm,
    age,
  ) {
    const sum =
      chestMm +
      abdominalMm +
      quadricepsMm +
      tricepsMm +
      subscapularMm +
      suprailiacMm +
      bicepsMm;
    const density =
      1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age;
    return parseFloat((495 / density - 450).toFixed(1));
  }

  static calculateBodyFatJP7Female(
    chestMm,
    abdominalMm,
    quadricepsMm,
    tricepsMm,
    subscapularMm,
    suprailiacMm,
    bicepsMm,
    age,
  ) {
    const sum =
      chestMm +
      abdominalMm +
      quadricepsMm +
      tricepsMm +
      subscapularMm +
      suprailiacMm +
      bicepsMm;
    const density =
      1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
    return parseFloat((495 / density - 450).toFixed(1));
  }

  static calculateBodyFatDW(
    bicepsMm,
    tricepsMm,
    subscapularMm,
    suprailiacMm,
    age,
    gender,
  ) {
    const logSum = Math.log10(
      bicepsMm + tricepsMm + subscapularMm + suprailiacMm,
    );
    let density;
    if (gender === "male") {
      if (age < 20) density = 1.162 - 0.063 * logSum;
      else if (age < 30) density = 1.1631 - 0.0632 * logSum;
      else if (age < 40) density = 1.1422 - 0.0544 * logSum;
      else if (age < 50) density = 1.162 - 0.07 * logSum;
      else density = 1.1715 - 0.0779 * logSum;
    } else {
      if (age < 20) density = 1.1549 - 0.0678 * logSum;
      else if (age < 30) density = 1.1599 - 0.0717 * logSum;
      else if (age < 40) density = 1.1423 - 0.0632 * logSum;
      else if (age < 50) density = 1.1333 - 0.0612 * logSum;
      else density = 1.1339 - 0.0645 * logSum;
    }
    return parseFloat((495 / density - 450).toFixed(1));
  }

  // ============================================
  // OVERVIEW & DASHBOARD
  // ============================================

  async getOverview(clientId, tenantId) {
    const [anthropometric, body, circumference, skinfold, bia] =
      await Promise.all([
        this.getLatestAnthropometric(clientId, tenantId),
        this.getLatestBody(clientId, tenantId),
        this.getLatestCircumference(clientId, tenantId),
        this.getLatestSkinfold(clientId, tenantId),
        this.getLatestBia(clientId, tenantId),
      ]);
    return { anthropometric, body, circumference, skinfold, bia };
  }

  async getWeightChange(clientId, tenantId) {
    const measurements = await query(
      `
            SELECT weight_kg, measurement_date FROM body_measurements
            WHERE client_id = ? AND tenant_id = ? AND weight_kg IS NOT NULL
            ORDER BY measurement_date DESC LIMIT 2
        `,
      [clientId, tenantId],
    );

    if (measurements.length < 2) {
      return {
        current: measurements[0]?.weight_kg || null,
        previous: null,
        change: 0,
        percentage: 0,
      };
    }

    const current = measurements[0].weight_kg;
    const previous = measurements[1].weight_kg;
    const change = Math.round((current - previous) * 10) / 10;
    const percentage = Math.round((change / previous) * 1000) / 10;
    return { current, previous, change, percentage };
  }

  async compareMeasurements(clientId, tenantId, date1, date2) {
    const [
      anthro1,
      anthro2,
      body1,
      body2,
      circ1,
      circ2,
      skin1,
      skin2,
      bia1,
      bia2,
    ] = await Promise.all([
      query(
        "SELECT * FROM anthropometric_data WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date1],
      ),
      query(
        "SELECT * FROM anthropometric_data WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date2],
      ),
      query(
        "SELECT * FROM body_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date1],
      ),
      query(
        "SELECT * FROM body_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date2],
      ),
      query(
        "SELECT * FROM circumference_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date1],
      ),
      query(
        "SELECT * FROM circumference_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date2],
      ),
      query(
        "SELECT * FROM skinfold_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date1],
      ),
      query(
        "SELECT * FROM skinfold_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date2],
      ),
      query(
        "SELECT * FROM bia_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date1],
      ),
      query(
        "SELECT * FROM bia_measurements WHERE client_id = ? AND tenant_id = ? AND measurement_date = ? LIMIT 1",
        [clientId, tenantId, date2],
      ),
    ]);

    return {
      date1,
      date2,
      anthropometric: { before: anthro1[0] || null, after: anthro2[0] || null },
      body: { before: body1[0] || null, after: body2[0] || null },
      circumference: { before: circ1[0] || null, after: circ2[0] || null },
      skinfold: { before: skin1[0] || null, after: skin2[0] || null },
      bia: { before: bia1[0] || null, after: bia2[0] || null },
    };
  }

  async getAvailableDates(clientId, tenantId) {
    return await query(
      `
            SELECT DISTINCT measurement_date, 'anthropometric' as type FROM anthropometric_data WHERE client_id = ? AND tenant_id = ?
            UNION
            SELECT DISTINCT measurement_date, 'body' as type FROM body_measurements WHERE client_id = ? AND tenant_id = ?
            UNION
            SELECT DISTINCT measurement_date, 'circumference' as type FROM circumference_measurements WHERE client_id = ? AND tenant_id = ?
            UNION
            SELECT DISTINCT measurement_date, 'skinfold' as type FROM skinfold_measurements WHERE client_id = ? AND tenant_id = ?
            UNION
            SELECT DISTINCT measurement_date, 'bia' as type FROM bia_measurements WHERE client_id = ? AND tenant_id = ?
            ORDER BY measurement_date DESC
        `,
      [
        clientId,
        tenantId,
        clientId,
        tenantId,
        clientId,
        tenantId,
        clientId,
        tenantId,
        clientId,
        tenantId,
      ],
    );
  }

  // ============================================
  // ANTROPOMETRIA
  // ============================================

  async getAnthropometricList(clientId, tenantId, options = {}) {
    const { limit = 50, startDate, endDate } = options;
    let sql =
      "SELECT * FROM anthropometric_data WHERE client_id = ? AND tenant_id = ?";
    const params = [clientId, tenantId];
    if (startDate) {
      sql += " AND measurement_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND measurement_date <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY measurement_date DESC LIMIT ?";
    params.push(limit);
    return await query(sql, params);
  }

  async getLatestAnthropometric(clientId, tenantId) {
    const rows = await query(
      "SELECT * FROM anthropometric_data WHERE client_id = ? AND tenant_id = ? ORDER BY measurement_date DESC LIMIT 1",
      [clientId, tenantId],
    );
    return rows[0] || null;
  }

  async createAnthropometric(clientId, tenantId, data) {
    const {
      measurementDate,
      heightCm,
      weightKg,
      ageYears,
      dailyStepsAvg,
      notes,
    } = data;
    const date = measurementDate || new Date().toISOString().split("T")[0];

    const result = await query(
      `
            INSERT INTO anthropometric_data
            (tenant_id, client_id, measurement_date, height_cm, weight_kg, age_years, daily_steps_avg, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        tenantId,
        clientId,
        date,
        heightCm || null,
        weightKg || null,
        ageYears || null,
        dailyStepsAvg || null,
        notes || null,
      ],
    );

    if (weightKg) {
      await query(
        "UPDATE clients SET current_weight_kg = ? WHERE id = ? AND tenant_id = ?",
        [weightKg, clientId, tenantId],
      );
    }

    return { id: result.insertId };
  }

  async updateAnthropometric(id, tenantId, data) {
    const {
      measurementDate,
      heightCm,
      weightKg,
      ageYears,
      dailyStepsAvg,
      notes,
    } = data;
    const result = await query(
      `
            UPDATE anthropometric_data SET
                measurement_date = COALESCE(?, measurement_date),
                height_cm = ?, weight_kg = ?, age_years = ?, daily_steps_avg = ?, notes = ?
            WHERE id = ? AND tenant_id = ?
        `,
      [
        measurementDate || null,
        heightCm || null,
        weightKg || null,
        ageYears || null,
        dailyStepsAvg || null,
        notes || null,
        id,
        tenantId,
      ],
    );

    if (!result.affectedRows) return null;
    return { id };
  }

  async deleteAnthropometric(id, tenantId) {
    const result = await query(
      "DELETE FROM anthropometric_data WHERE id = ? AND tenant_id = ?",
      [id, tenantId],
    );
    return result.affectedRows > 0;
  }

  // ============================================
  // PESO & COMPOSIZIONE CORPOREA (BODY)
  // ============================================

  async getBodyList(clientId, tenantId, options = {}) {
    const { limit = 50, startDate, endDate } = options;
    let sql =
      "SELECT * FROM body_measurements WHERE client_id = ? AND tenant_id = ?";
    const params = [clientId, tenantId];
    if (startDate) {
      sql += " AND measurement_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND measurement_date <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY measurement_date DESC LIMIT ?";
    params.push(limit);
    return await query(sql, params);
  }

  async getLatestBody(clientId, tenantId) {
    const rows = await query(
      "SELECT * FROM body_measurements WHERE client_id = ? AND tenant_id = ? ORDER BY measurement_date DESC LIMIT 1",
      [clientId, tenantId],
    );
    return rows[0] || null;
  }

  async createBody(clientId, tenantId, data) {
    const {
      measurementDate,
      weightKg,
      bodyFatPercentage,
      muscleMassKg,
      notes,
    } = data;
    const date = measurementDate || new Date().toISOString().split("T")[0];

    const result = await query(
      `
            INSERT INTO body_measurements
            (tenant_id, client_id, measurement_date, weight_kg, body_fat_percentage, muscle_mass_kg, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      [
        tenantId,
        clientId,
        date,
        weightKg || null,
        bodyFatPercentage || null,
        muscleMassKg || null,
        notes || null,
      ],
    );

    if (weightKg) {
      await query(
        "UPDATE clients SET current_weight_kg = ? WHERE id = ? AND tenant_id = ?",
        [weightKg, clientId, tenantId],
      );
    }

    return { id: result.insertId };
  }

  async updateBody(id, tenantId, data) {
    const {
      measurementDate,
      weightKg,
      bodyFatPercentage,
      muscleMassKg,
      notes,
    } = data;
    const result = await query(
      `
            UPDATE body_measurements SET
                measurement_date = COALESCE(?, measurement_date),
                weight_kg = ?, body_fat_percentage = ?, muscle_mass_kg = ?, notes = ?
            WHERE id = ? AND tenant_id = ?
        `,
      [
        measurementDate || null,
        weightKg || null,
        bodyFatPercentage || null,
        muscleMassKg || null,
        notes || null,
        id,
        tenantId,
      ],
    );

    if (!result.affectedRows) return null;
    return { id };
  }

  async deleteBody(id, tenantId) {
    const result = await query(
      "DELETE FROM body_measurements WHERE id = ? AND tenant_id = ?",
      [id, tenantId],
    );
    return result.affectedRows > 0;
  }

  // ============================================
  // CIRCONFERENZE
  // ============================================

  async getCircumferenceList(clientId, tenantId, options = {}) {
    const { limit = 50, startDate, endDate } = options;
    let sql =
      "SELECT * FROM circumference_measurements WHERE client_id = ? AND tenant_id = ?";
    const params = [clientId, tenantId];
    if (startDate) {
      sql += " AND measurement_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND measurement_date <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY measurement_date DESC LIMIT ?";
    params.push(limit);
    return await query(sql, params);
  }

  async getLatestCircumference(clientId, tenantId) {
    const rows = await query(
      "SELECT * FROM circumference_measurements WHERE client_id = ? AND tenant_id = ? ORDER BY measurement_date DESC LIMIT 1",
      [clientId, tenantId],
    );
    return rows[0] || null;
  }

  async createCircumference(clientId, tenantId, data) {
    const {
      measurementDate,
      waistCm,
      hipsCm,
      bicepsCm,
      bicepsFlexedCm,
      shouldersCm,
      chestCm,
      thighUpperCm,
      thighLowerCm,
      glutesCm,
      notes,
    } = data;
    const date = measurementDate || new Date().toISOString().split("T")[0];

    let waistHipRatio = null;
    if (waistCm && hipsCm) {
      waistHipRatio = parseFloat((waistCm / hipsCm).toFixed(2));
    }

    const result = await query(
      `
            INSERT INTO circumference_measurements
            (tenant_id, client_id, measurement_date, waist_cm, hips_cm, biceps_cm,
             biceps_flexed_cm, shoulders_cm, chest_cm, thigh_upper_cm, thigh_lower_cm,
             glutes_cm, waist_hip_ratio, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        tenantId,
        clientId,
        date,
        waistCm || null,
        hipsCm || null,
        bicepsCm || null,
        bicepsFlexedCm || null,
        shouldersCm || null,
        chestCm || null,
        thighUpperCm || null,
        thighLowerCm || null,
        glutesCm || null,
        waistHipRatio,
        notes || null,
      ],
    );

    return { id: result.insertId, waistHipRatio };
  }

  async updateCircumference(id, tenantId, data) {
    const {
      measurementDate,
      waistCm,
      hipsCm,
      bicepsCm,
      bicepsFlexedCm,
      shouldersCm,
      chestCm,
      thighUpperCm,
      thighLowerCm,
      glutesCm,
      notes,
    } = data;

    let waistHipRatio = null;
    if (waistCm && hipsCm) {
      waistHipRatio = parseFloat((waistCm / hipsCm).toFixed(2));
    }

    const result = await query(
      `
            UPDATE circumference_measurements SET
                measurement_date = COALESCE(?, measurement_date),
                waist_cm = ?, hips_cm = ?, biceps_cm = ?, biceps_flexed_cm = ?,
                shoulders_cm = ?, chest_cm = ?, thigh_upper_cm = ?, thigh_lower_cm = ?,
                glutes_cm = ?, waist_hip_ratio = ?, notes = ?
            WHERE id = ? AND tenant_id = ?
        `,
      [
        measurementDate || null,
        waistCm || null,
        hipsCm || null,
        bicepsCm || null,
        bicepsFlexedCm || null,
        shouldersCm || null,
        chestCm || null,
        thighUpperCm || null,
        thighLowerCm || null,
        glutesCm || null,
        waistHipRatio,
        notes || null,
        id,
        tenantId,
      ],
    );

    if (!result.affectedRows) return null;
    return { id, waistHipRatio };
  }

  async deleteCircumference(id, tenantId) {
    const result = await query(
      "DELETE FROM circumference_measurements WHERE id = ? AND tenant_id = ?",
      [id, tenantId],
    );
    return result.affectedRows > 0;
  }

  // ============================================
  // PLICOMETRIA
  // ============================================

  async getSkinfoldList(clientId, tenantId, options = {}) {
    const { limit = 50, startDate, endDate } = options;
    let sql =
      "SELECT * FROM skinfold_measurements WHERE client_id = ? AND tenant_id = ?";
    const params = [clientId, tenantId];
    if (startDate) {
      sql += " AND measurement_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND measurement_date <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY measurement_date DESC LIMIT ?";
    params.push(limit);
    return await query(sql, params);
  }

  async getLatestSkinfold(clientId, tenantId) {
    const rows = await query(
      "SELECT * FROM skinfold_measurements WHERE client_id = ? AND tenant_id = ? ORDER BY measurement_date DESC LIMIT 1",
      [clientId, tenantId],
    );
    return rows[0] || null;
  }

  async createSkinfold(clientId, tenantId, data) {
    const {
      measurementDate,
      chestMm,
      subscapularMm,
      suprailiacMm,
      abdominalMm,
      quadricepsMm,
      bicepsMm,
      tricepsMm,
      cheekMm,
      calfMm,
      calculationMethod,
      gender,
      age,
      notes,
    } = data;
    const date = measurementDate || new Date().toISOString().split("T")[0];

    const values = [
      chestMm,
      subscapularMm,
      suprailiacMm,
      abdominalMm,
      quadricepsMm,
      bicepsMm,
      tricepsMm,
      cheekMm,
      calfMm,
    ];
    const sumTotal = values.reduce((acc, v) => acc + (v || 0), 0);

    let bodyFatPercentage = null;
    const clientAge = age || 30;
    const clientGender = gender || "male";
    const method = calculationMethod || "jackson_pollock_3";

    try {
      if (method === "jackson_pollock_3") {
        if (clientGender === "male" && chestMm && abdominalMm && quadricepsMm) {
          bodyFatPercentage = MeasurementService.calculateBodyFatJP3Male(
            chestMm,
            abdominalMm,
            quadricepsMm,
            clientAge,
          );
        } else if (
          clientGender === "female" &&
          tricepsMm &&
          suprailiacMm &&
          quadricepsMm
        ) {
          bodyFatPercentage = MeasurementService.calculateBodyFatJP3Female(
            tricepsMm,
            suprailiacMm,
            quadricepsMm,
            clientAge,
          );
        }
      } else if (method === "jackson_pollock_7") {
        if (
          chestMm &&
          abdominalMm &&
          quadricepsMm &&
          tricepsMm &&
          subscapularMm &&
          suprailiacMm &&
          bicepsMm
        ) {
          if (clientGender === "male") {
            bodyFatPercentage = MeasurementService.calculateBodyFatJP7Male(
              chestMm,
              abdominalMm,
              quadricepsMm,
              tricepsMm,
              subscapularMm,
              suprailiacMm,
              bicepsMm,
              clientAge,
            );
          } else {
            bodyFatPercentage = MeasurementService.calculateBodyFatJP7Female(
              chestMm,
              abdominalMm,
              quadricepsMm,
              tricepsMm,
              subscapularMm,
              suprailiacMm,
              bicepsMm,
              clientAge,
            );
          }
        }
      } else if (method === "durnin_womersley") {
        if (bicepsMm && tricepsMm && subscapularMm && suprailiacMm) {
          bodyFatPercentage = MeasurementService.calculateBodyFatDW(
            bicepsMm,
            tricepsMm,
            subscapularMm,
            suprailiacMm,
            clientAge,
            clientGender,
          );
        }
      }

      if (bodyFatPercentage !== null) {
        bodyFatPercentage = Math.max(3, Math.min(60, bodyFatPercentage));
      }
    } catch (err) {
      logger.error("Errore calcolo % grasso", { error: err.message });
    }

    const result = await query(
      `
            INSERT INTO skinfold_measurements
            (tenant_id, client_id, measurement_date, chest_mm, subscapular_mm, suprailiac_mm,
             abdominal_mm, quadriceps_mm, biceps_mm, triceps_mm, cheek_mm, calf_mm,
             sum_total_mm, body_fat_percentage, calculation_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        tenantId,
        clientId,
        date,
        chestMm || null,
        subscapularMm || null,
        suprailiacMm || null,
        abdominalMm || null,
        quadricepsMm || null,
        bicepsMm || null,
        tricepsMm || null,
        cheekMm || null,
        calfMm || null,
        sumTotal || null,
        bodyFatPercentage,
        method,
        notes || null,
      ],
    );

    return {
      id: result.insertId,
      sumTotal,
      bodyFatPercentage,
      calculationMethod: method,
    };
  }

  async updateSkinfold(id, tenantId, data) {
    const {
      measurementDate,
      chestMm,
      subscapularMm,
      suprailiacMm,
      abdominalMm,
      quadricepsMm,
      bicepsMm,
      tricepsMm,
      cheekMm,
      calfMm,
      calculationMethod,
      gender,
      age,
      notes,
    } = data;

    const values = [
      chestMm,
      subscapularMm,
      suprailiacMm,
      abdominalMm,
      quadricepsMm,
      bicepsMm,
      tricepsMm,
      cheekMm,
      calfMm,
    ];
    const sumTotal = values.reduce((acc, v) => acc + (v || 0), 0);

    let bodyFatPercentage = null;
    const clientAge = age || 30;
    const clientGender = gender || "male";
    const method = calculationMethod || "jackson_pollock_3";

    try {
      if (method === "jackson_pollock_3") {
        if (clientGender === "male" && chestMm && abdominalMm && quadricepsMm) {
          bodyFatPercentage = MeasurementService.calculateBodyFatJP3Male(
            chestMm,
            abdominalMm,
            quadricepsMm,
            clientAge,
          );
        } else if (
          clientGender === "female" &&
          tricepsMm &&
          suprailiacMm &&
          quadricepsMm
        ) {
          bodyFatPercentage = MeasurementService.calculateBodyFatJP3Female(
            tricepsMm,
            suprailiacMm,
            quadricepsMm,
            clientAge,
          );
        }
      } else if (method === "jackson_pollock_7") {
        if (
          chestMm &&
          abdominalMm &&
          quadricepsMm &&
          tricepsMm &&
          subscapularMm &&
          suprailiacMm &&
          bicepsMm
        ) {
          if (clientGender === "male") {
            bodyFatPercentage = MeasurementService.calculateBodyFatJP7Male(
              chestMm,
              abdominalMm,
              quadricepsMm,
              tricepsMm,
              subscapularMm,
              suprailiacMm,
              bicepsMm,
              clientAge,
            );
          } else {
            bodyFatPercentage = MeasurementService.calculateBodyFatJP7Female(
              chestMm,
              abdominalMm,
              quadricepsMm,
              tricepsMm,
              subscapularMm,
              suprailiacMm,
              bicepsMm,
              clientAge,
            );
          }
        }
      } else if (method === "durnin_womersley") {
        if (bicepsMm && tricepsMm && subscapularMm && suprailiacMm) {
          bodyFatPercentage = MeasurementService.calculateBodyFatDW(
            bicepsMm,
            tricepsMm,
            subscapularMm,
            suprailiacMm,
            clientAge,
            clientGender,
          );
        }
      }
      if (bodyFatPercentage !== null) {
        bodyFatPercentage = Math.max(3, Math.min(60, bodyFatPercentage));
      }
    } catch (err) {
      logger.error("Errore calcolo % grasso in update", { error: err.message });
    }

    const result = await query(
      `
            UPDATE skinfold_measurements SET
                measurement_date = COALESCE(?, measurement_date),
                chest_mm = ?, subscapular_mm = ?, suprailiac_mm = ?, abdominal_mm = ?,
                quadriceps_mm = ?, biceps_mm = ?, triceps_mm = ?, cheek_mm = ?, calf_mm = ?,
                sum_total_mm = ?, body_fat_percentage = ?, calculation_method = ?, notes = ?
            WHERE id = ? AND tenant_id = ?
        `,
      [
        measurementDate || null,
        chestMm || null,
        subscapularMm || null,
        suprailiacMm || null,
        abdominalMm || null,
        quadricepsMm || null,
        bicepsMm || null,
        tricepsMm || null,
        cheekMm || null,
        calfMm || null,
        sumTotal || null,
        bodyFatPercentage,
        method,
        notes || null,
        id,
        tenantId,
      ],
    );

    if (!result.affectedRows) return null;
    return { id, sumTotal, bodyFatPercentage, calculationMethod: method };
  }

  async deleteSkinfold(id, tenantId) {
    const result = await query(
      "DELETE FROM skinfold_measurements WHERE id = ? AND tenant_id = ?",
      [id, tenantId],
    );
    return result.affectedRows > 0;
  }

  async getBodyFatTrend(clientId, tenantId, options = {}) {
    const { limit = 20 } = options;
    return await query(
      `
            SELECT measurement_date, body_fat_percentage, sum_total_mm, calculation_method
            FROM skinfold_measurements
            WHERE client_id = ? AND tenant_id = ? AND body_fat_percentage IS NOT NULL
            ORDER BY measurement_date ASC LIMIT ?
        `,
      [clientId, tenantId, limit],
    );
  }

  // ============================================
  // BIA - BIOIMPEDENZA
  // ============================================

  async getBiaList(clientId, tenantId, options = {}) {
    const { limit = 50, startDate, endDate } = options;
    let sql =
      "SELECT * FROM bia_measurements WHERE client_id = ? AND tenant_id = ?";
    const params = [clientId, tenantId];
    if (startDate) {
      sql += " AND measurement_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND measurement_date <= ?";
      params.push(endDate);
    }
    sql += " ORDER BY measurement_date DESC LIMIT ?";
    params.push(limit);
    return await query(sql, params);
  }

  async getLatestBia(clientId, tenantId) {
    const rows = await query(
      "SELECT * FROM bia_measurements WHERE client_id = ? AND tenant_id = ? ORDER BY measurement_date DESC LIMIT 1",
      [clientId, tenantId],
    );
    return rows[0] || null;
  }

  async createBia(clientId, tenantId, data) {
    const {
      measurementDate,
      leanMassKg,
      leanMassPct,
      fatMassKg,
      fatMassPct,
      totalBodyWaterL,
      totalBodyWaterPct,
      muscleMassKg,
      basalMetabolicRate,
      visceralFatLevel,
      boneMassKg,
      deviceModel,
      notes,
    } = data;
    const date = measurementDate || new Date().toISOString().split("T")[0];

    const result = await query(
      `
            INSERT INTO bia_measurements
            (tenant_id, client_id, measurement_date, lean_mass_kg, lean_mass_pct,
             fat_mass_kg, fat_mass_pct, total_body_water_l, total_body_water_pct,
             muscle_mass_kg, basal_metabolic_rate, visceral_fat_level, bone_mass_kg,
             device_model, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        tenantId,
        clientId,
        date,
        leanMassKg || null,
        leanMassPct || null,
        fatMassKg || null,
        fatMassPct || null,
        totalBodyWaterL || null,
        totalBodyWaterPct || null,
        muscleMassKg || null,
        basalMetabolicRate || null,
        visceralFatLevel || null,
        boneMassKg || null,
        deviceModel || null,
        notes || null,
      ],
    );

    return { id: result.insertId };
  }

  async updateBia(id, tenantId, data) {
    const {
      measurementDate,
      leanMassKg,
      leanMassPct,
      fatMassKg,
      fatMassPct,
      totalBodyWaterL,
      totalBodyWaterPct,
      muscleMassKg,
      basalMetabolicRate,
      visceralFatLevel,
      boneMassKg,
      deviceModel,
      notes,
    } = data;

    const result = await query(
      `
            UPDATE bia_measurements SET
                measurement_date = COALESCE(?, measurement_date),
                lean_mass_kg = ?, lean_mass_pct = ?, fat_mass_kg = ?, fat_mass_pct = ?,
                total_body_water_l = ?, total_body_water_pct = ?, muscle_mass_kg = ?,
                basal_metabolic_rate = ?, visceral_fat_level = ?, bone_mass_kg = ?,
                device_model = ?, notes = ?
            WHERE id = ? AND tenant_id = ?
        `,
      [
        measurementDate || null,
        leanMassKg || null,
        leanMassPct || null,
        fatMassKg || null,
        fatMassPct || null,
        totalBodyWaterL || null,
        totalBodyWaterPct || null,
        muscleMassKg || null,
        basalMetabolicRate || null,
        visceralFatLevel || null,
        boneMassKg || null,
        deviceModel || null,
        notes || null,
        id,
        tenantId,
      ],
    );

    if (!result.affectedRows) return null;
    return { id };
  }

  async deleteBia(id, tenantId) {
    const result = await query(
      "DELETE FROM bia_measurements WHERE id = ? AND tenant_id = ?",
      [id, tenantId],
    );
    return result.affectedRows > 0;
  }
}

module.exports = new MeasurementService();
