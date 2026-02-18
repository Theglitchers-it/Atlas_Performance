/**
 * Export Service
 * Esportazione dati in formato CSV per clienti, pagamenti e analytics
 * Tutti gli export utilizzano intestazioni in italiano
 */

const { query } = require("../config/database");

class ExportService {
  /**
   * Converte array di oggetti in formato CSV
   */
  _arrayToCSV(data, headers) {
    if (!data || data.length === 0) {
      return Object.values(headers).join(",");
    }

    const headerKeys = Object.keys(headers);
    const headerLine = Object.values(headers).join(",");

    const rows = data.map((row) => {
      return headerKeys
        .map((key) => {
          let value = row[key];

          // Handle null/undefined
          if (value === null || value === undefined) {
            return "";
          }

          // Handle dates
          if (value instanceof Date) {
            value = value.toLocaleDateString("it-IT");
          } else if (
            typeof value === "string" &&
            value.match(/^\d{4}-\d{2}-\d{2}/)
          ) {
            // ISO date string
            value = new Date(value).toLocaleDateString("it-IT");
          }

          // Handle numbers
          if (typeof value === "number") {
            value = value.toString().replace(".", ",");
          }

          // Convert to string and escape
          value = String(value);

          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }

          return value;
        })
        .join(",");
    });

    return [headerLine, ...rows].join("\n");
  }

  /**
   * Generate filename with current date
   */
  _generateFilename(prefix) {
    const date = new Date().toISOString().split("T")[0];
    return `${prefix}_${date}.csv`;
  }

  /**
   * Export payments as CSV
   */
  async exportPaymentsCSV(tenantId, filters = {}) {
    const { startDate, endDate, clientId, status } = filters;

    let sql = `
            SELECT
                p.id,
                p.payment_date,
                CONCAT(c.first_name, ' ', c.last_name) as client_name,
                c.email as client_email,
                p.amount,
                p.currency,
                p.status,
                p.payment_method,
                p.transaction_id,
                p.notes
            FROM payments p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.tenant_id = ?
        `;
    const params = [tenantId];

    if (startDate) {
      sql += " AND p.payment_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND p.payment_date <= ?";
      params.push(endDate);
    }
    if (clientId) {
      sql += " AND p.client_id = ?";
      params.push(clientId);
    }
    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }

    sql += " ORDER BY p.payment_date DESC";

    const payments = await query(sql, params);

    // Map status to Italian
    const statusMap = {
      completed: "Completato",
      pending: "In Attesa",
      failed: "Fallito",
      cancelled: "Annullato",
    };

    const mappedPayments = payments.map((p) => ({
      id: p.id,
      payment_date: p.payment_date,
      client_name: p.client_name || "N/D",
      client_email: p.client_email || "N/D",
      amount: p.amount,
      currency: p.currency,
      status: statusMap[p.status] || p.status,
      payment_method: p.payment_method || "N/D",
      transaction_id: p.transaction_id || "N/D",
      notes: p.notes || "",
    }));

    const headers = {
      id: "ID",
      payment_date: "Data Pagamento",
      client_name: "Nome Cliente",
      client_email: "Email Cliente",
      amount: "Importo",
      currency: "Valuta",
      status: "Stato",
      payment_method: "Metodo Pagamento",
      transaction_id: "ID Transazione",
      notes: "Note",
    };

    const csvContent = this._arrayToCSV(mappedPayments, headers);
    const filename = this._generateFilename("pagamenti");

    return {
      content: csvContent,
      filename: filename,
    };
  }

  /**
   * Export clients list as CSV
   */
  async exportClientsCSV(tenantId, filters = {}) {
    const { status, fitnessLevel, assignedTo } = filters;

    let sql = `
            SELECT
                c.id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.date_of_birth,
                c.gender,
                c.height_cm,
                c.current_weight_kg,
                c.fitness_level,
                c.primary_goal,
                c.status,
                c.level,
                c.xp_points,
                c.streak_days,
                c.last_workout_at,
                c.training_location,
                CONCAT(u.first_name, ' ', u.last_name) as assigned_trainer,
                c.created_at
            FROM clients c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.tenant_id = ?
        `;
    const params = [tenantId];

    if (status) {
      sql += " AND c.status = ?";
      params.push(status);
    }
    if (fitnessLevel) {
      sql += " AND c.fitness_level = ?";
      params.push(fitnessLevel);
    }
    if (assignedTo) {
      sql += " AND c.assigned_to = ?";
      params.push(assignedTo);
    }

    sql += " ORDER BY c.created_at DESC";

    const clients = await query(sql, params);

    // Map enums to Italian
    const statusMap = {
      active: "Attivo",
      inactive: "Inattivo",
      paused: "In Pausa",
      cancelled: "Annullato",
    };

    const fitnessLevelMap = {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzato",
      elite: "Elite",
    };

    const genderMap = {
      male: "Maschio",
      female: "Femmina",
      other: "Altro",
    };

    const trainingLocationMap = {
      online: "Online",
      in_person: "Di Persona",
      hybrid: "Ibrido",
    };

    const mappedClients = clients.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email || "N/D",
      phone: c.phone || "N/D",
      date_of_birth: c.date_of_birth || "N/D",
      gender: genderMap[c.gender] || c.gender || "N/D",
      height_cm: c.height_cm || "N/D",
      current_weight_kg: c.current_weight_kg || "N/D",
      fitness_level: fitnessLevelMap[c.fitness_level] || c.fitness_level,
      primary_goal: c.primary_goal || "N/D",
      status: statusMap[c.status] || c.status,
      level: c.level,
      xp_points: c.xp_points,
      streak_days: c.streak_days,
      last_workout_at: c.last_workout_at || "Mai",
      training_location:
        trainingLocationMap[c.training_location] || c.training_location,
      assigned_trainer: c.assigned_trainer || "Non Assegnato",
      created_at: c.created_at,
    }));

    const headers = {
      id: "ID",
      first_name: "Nome",
      last_name: "Cognome",
      email: "Email",
      phone: "Telefono",
      date_of_birth: "Data di Nascita",
      gender: "Genere",
      height_cm: "Altezza (cm)",
      current_weight_kg: "Peso (kg)",
      fitness_level: "Livello Fitness",
      primary_goal: "Obiettivo Principale",
      status: "Stato",
      level: "Livello",
      xp_points: "Punti XP",
      streak_days: "Streak (giorni)",
      last_workout_at: "Ultimo Workout",
      training_location: "Modalità Allenamento",
      assigned_trainer: "Trainer Assegnato",
      created_at: "Data Creazione",
    };

    const csvContent = this._arrayToCSV(mappedClients, headers);
    const filename = this._generateFilename("clienti");

    return {
      content: csvContent,
      filename: filename,
    };
  }

  /**
   * Export analytics as CSV
   */
  async exportAnalyticsCSV(tenantId, period = "30d") {
    // Parse period
    const periodMap = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "365d": 365,
    };
    const days = periodMap[period] || 30;

    // Get workout sessions stats
    const sessions = await query(
      `SELECT
                DATE(created_at) as date,
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_sessions,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN duration_minutes END), 0) as avg_duration
            FROM workout_sessions
            WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC`,
      [tenantId, days],
    );

    // Get daily checkins stats
    const checkins = await query(
      `SELECT
                DATE(dc.checkin_date) as date,
                COUNT(*) as total_checkins,
                COALESCE(AVG(dc.readiness_score), 0) as avg_readiness,
                COALESCE(AVG(dc.sleep_hours), 0) as avg_sleep,
                COALESCE(AVG(dc.stress_level), 0) as avg_stress
            FROM daily_checkins dc
            JOIN clients c ON dc.client_id = c.id
            WHERE c.tenant_id = ? AND dc.checkin_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(dc.checkin_date)
            ORDER BY date ASC`,
      [tenantId, days],
    );

    // Get appointments stats
    const appointments = await query(
      `SELECT
                DATE(start_datetime) as date,
                COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments
            FROM appointments
            WHERE tenant_id = ? AND start_datetime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(start_datetime)
            ORDER BY date ASC`,
      [tenantId, days],
    );

    // Get payments stats
    const payments = await query(
      `SELECT
                DATE(payment_date) as date,
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
            FROM payments
            WHERE tenant_id = ? AND payment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(payment_date)
            ORDER BY date ASC`,
      [tenantId, days],
    );

    // Merge all stats by date
    const allDates = new Set([
      ...sessions.map((s) => s.date),
      ...checkins.map((c) => c.date),
      ...appointments.map((a) => a.date),
      ...payments.map((p) => p.date),
    ]);

    const analytics = Array.from(allDates)
      .sort()
      .map((date) => {
        const sessionData = sessions.find((s) => s.date === date) || {};
        const checkinData = checkins.find((c) => c.date === date) || {};
        const appointmentData = appointments.find((a) => a.date === date) || {};
        const paymentData = payments.find((p) => p.date === date) || {};

        return {
          date: date,
          total_sessions: sessionData.total_sessions || 0,
          completed_sessions: sessionData.completed_sessions || 0,
          cancelled_sessions: sessionData.cancelled_sessions || 0,
          avg_duration: sessionData.avg_duration
            ? parseFloat(sessionData.avg_duration).toFixed(1)
            : 0,
          total_checkins: checkinData.total_checkins || 0,
          avg_readiness: checkinData.avg_readiness
            ? parseFloat(checkinData.avg_readiness).toFixed(1)
            : 0,
          avg_sleep: checkinData.avg_sleep
            ? parseFloat(checkinData.avg_sleep).toFixed(1)
            : 0,
          avg_stress: checkinData.avg_stress
            ? parseFloat(checkinData.avg_stress).toFixed(1)
            : 0,
          total_appointments: appointmentData.total_appointments || 0,
          completed_appointments: appointmentData.completed_appointments || 0,
          cancelled_appointments: appointmentData.cancelled_appointments || 0,
          total_payments: paymentData.total_payments || 0,
          revenue: paymentData.revenue
            ? parseFloat(paymentData.revenue).toFixed(2)
            : 0,
        };
      });

    const headers = {
      date: "Data",
      total_sessions: "Sessioni Totali",
      completed_sessions: "Sessioni Completate",
      cancelled_sessions: "Sessioni Annullate",
      avg_duration: "Durata Media (min)",
      total_checkins: "Check-in Totali",
      avg_readiness: "Readiness Media",
      avg_sleep: "Ore Sonno Medie",
      avg_stress: "Stress Medio",
      total_appointments: "Appuntamenti Totali",
      completed_appointments: "Appuntamenti Completati",
      cancelled_appointments: "Appuntamenti Annullati",
      total_payments: "Pagamenti Totali",
      revenue: "Entrate (€)",
    };

    const csvContent = this._arrayToCSV(analytics, headers);
    const filename = this._generateFilename(`analytics_${period}`);

    return {
      content: csvContent,
      filename: filename,
    };
  }

  /**
   * Export workout sessions as CSV
   */
  async exportWorkoutSessionsCSV(tenantId, filters = {}) {
    const { clientId, startDate, endDate, status } = filters;

    let sql = `
            SELECT
                ws.id,
                DATE(ws.created_at) as date,
                CONCAT(c.first_name, ' ', c.last_name) as client_name,
                wt.name as template_name,
                ws.status,
                ws.duration_minutes,
                ws.total_volume_kg,
                ws.avg_heart_rate,
                ws.calories_burned,
                ws.notes
            FROM workout_sessions ws
            LEFT JOIN clients c ON ws.client_id = c.id
            LEFT JOIN workout_templates wt ON ws.template_id = wt.id
            WHERE ws.tenant_id = ?
        `;
    const params = [tenantId];

    if (clientId) {
      sql += " AND ws.client_id = ?";
      params.push(clientId);
    }
    if (startDate) {
      sql += " AND ws.created_at >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND ws.created_at <= ?";
      params.push(endDate);
    }
    if (status) {
      sql += " AND ws.status = ?";
      params.push(status);
    }

    sql += " ORDER BY ws.created_at DESC";

    const workouts = await query(sql, params);

    const statusMap = {
      completed: "Completata",
      in_progress: "In Corso",
      cancelled: "Annullata",
      scheduled: "Programmata",
    };

    const mappedWorkouts = workouts.map((w) => ({
      id: w.id,
      date: w.date,
      client_name: w.client_name || "N/D",
      template_name: w.template_name || "N/D",
      status: statusMap[w.status] || w.status,
      duration_minutes: w.duration_minutes || 0,
      total_volume_kg: w.total_volume_kg || 0,
      avg_heart_rate: w.avg_heart_rate || "N/D",
      calories_burned: w.calories_burned || "N/D",
      notes: w.notes || "",
    }));

    const headers = {
      id: "ID",
      date: "Data",
      client_name: "Cliente",
      template_name: "Template",
      status: "Stato",
      duration_minutes: "Durata (min)",
      total_volume_kg: "Volume Totale (kg)",
      avg_heart_rate: "FC Media",
      calories_burned: "Calorie Bruciate",
      notes: "Note",
    };

    const csvContent = this._arrayToCSV(mappedWorkouts, headers);
    const filename = this._generateFilename("sessioni_allenamento");

    return {
      content: csvContent,
      filename: filename,
    };
  }

  /**
   * Export measurements/anthropometric data as CSV
   */
  async exportMeasurementsCSV(tenantId, filters = {}) {
    const { clientId, startDate, endDate } = filters;

    let sql = `
            SELECT
                ad.id,
                ad.measurement_date,
                CONCAT(c.first_name, ' ', c.last_name) as client_name,
                ad.weight_kg,
                ad.body_fat_percentage,
                ad.muscle_mass_kg,
                ad.waist_cm,
                ad.chest_cm,
                ad.hips_cm,
                ad.thigh_cm,
                ad.arm_cm,
                ad.notes
            FROM anthropometric_data ad
            JOIN clients c ON ad.client_id = c.id
            WHERE ad.tenant_id = ?
        `;
    const params = [tenantId];

    if (clientId) {
      sql += " AND ad.client_id = ?";
      params.push(clientId);
    }
    if (startDate) {
      sql += " AND ad.measurement_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND ad.measurement_date <= ?";
      params.push(endDate);
    }

    sql += " ORDER BY ad.measurement_date DESC";

    const measurements = await query(sql, params);

    const mappedMeasurements = measurements.map((m) => ({
      id: m.id,
      measurement_date: m.measurement_date,
      client_name: m.client_name,
      weight_kg: m.weight_kg || "N/D",
      body_fat_percentage: m.body_fat_percentage || "N/D",
      muscle_mass_kg: m.muscle_mass_kg || "N/D",
      waist_cm: m.waist_cm || "N/D",
      chest_cm: m.chest_cm || "N/D",
      hips_cm: m.hips_cm || "N/D",
      thigh_cm: m.thigh_cm || "N/D",
      arm_cm: m.arm_cm || "N/D",
      notes: m.notes || "",
    }));

    const headers = {
      id: "ID",
      measurement_date: "Data Misurazione",
      client_name: "Cliente",
      weight_kg: "Peso (kg)",
      body_fat_percentage: "Massa Grassa (%)",
      muscle_mass_kg: "Massa Muscolare (kg)",
      waist_cm: "Vita (cm)",
      chest_cm: "Petto (cm)",
      hips_cm: "Fianchi (cm)",
      thigh_cm: "Coscia (cm)",
      arm_cm: "Braccio (cm)",
      notes: "Note",
    };

    const csvContent = this._arrayToCSV(mappedMeasurements, headers);
    const filename = this._generateFilename("misurazioni");

    return {
      content: csvContent,
      filename: filename,
    };
  }
  // ============================================
  // EXPORT EXCEL (XLSX)
  // ============================================

  /**
   * Converte dati in formato Excel usando ExcelJS
   */
  async _createExcelWorkbook(sheetName, headers, data) {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PT SAAS";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName);

    // Header columns
    const headerKeys = Object.keys(headers);
    sheet.columns = headerKeys.map((key) => ({
      header: headers[key],
      key: key,
      width: 18,
    }));

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };

    // Add data rows
    data.forEach((row) => sheet.addRow(row));

    return workbook;
  }

  /**
   * Export pagamenti come Excel
   */
  async exportPaymentsExcel(tenantId, filters = {}) {
    const csvResult = await this.exportPaymentsCSV(tenantId, filters);
    const rows = this._parseCSVRows(csvResult.content);

    const headers = {
      id: "ID",
      payment_date: "Data Pagamento",
      client_name: "Nome Cliente",
      client_email: "Email Cliente",
      amount: "Importo",
      currency: "Valuta",
      status: "Stato",
      payment_method: "Metodo Pagamento",
      transaction_id: "ID Transazione",
      notes: "Note",
    };

    const workbook = await this._createExcelWorkbook(
      "Pagamenti",
      headers,
      rows,
    );
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      content: buffer,
      filename: this._generateFilename("pagamenti").replace(".csv", ".xlsx"),
    };
  }

  /**
   * Export clienti come Excel
   */
  async exportClientsExcel(tenantId, filters = {}) {
    const csvResult = await this.exportClientsCSV(tenantId, filters);
    const rows = this._parseCSVRows(csvResult.content);

    const headers = {
      id: "ID",
      first_name: "Nome",
      last_name: "Cognome",
      email: "Email",
      phone: "Telefono",
      fitness_level: "Livello Fitness",
      status: "Stato",
      level: "Livello",
      xp_points: "Punti XP",
      streak_days: "Streak",
    };

    const workbook = await this._createExcelWorkbook("Clienti", headers, rows);
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      content: buffer,
      filename: this._generateFilename("clienti").replace(".csv", ".xlsx"),
    };
  }

  /**
   * Export analytics come Excel
   */
  async exportAnalyticsExcel(tenantId, period = "30d") {
    const csvResult = await this.exportAnalyticsCSV(tenantId, period);
    const rows = this._parseCSVRows(csvResult.content);

    const headers = {
      date: "Data",
      total_sessions: "Sessioni",
      completed_sessions: "Completate",
      avg_readiness: "Readiness Media",
      total_appointments: "Appuntamenti",
      revenue: "Entrate",
    };

    const workbook = await this._createExcelWorkbook(
      "Analytics",
      headers,
      rows,
    );
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      content: buffer,
      filename: this._generateFilename(`analytics_${period}`).replace(
        ".csv",
        ".xlsx",
      ),
    };
  }

  /**
   * Helper: parse CSV content back to rows (per riutilizzare le query CSV)
   */
  _parseCSVRows(csvContent) {
    const lines = csvContent.split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");
    return lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = line.split(",");
        const row = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
  }
}

module.exports = new ExportService();
