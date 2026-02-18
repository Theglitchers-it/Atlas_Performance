/**
 * Report Service
 * Generazione PDF di report professionali per clienti, pagamenti, workout e nutrition
 * Utilizza PDFKit per creare documenti stampabili
 */

const PDFDocument = require('pdfkit');
const { query } = require('../config/database');

class ReportService {
    /**
     * Configurazione comune PDF
     */
    _createPDF() {
        return new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: 'PT SAAS Report',
                Author: 'PT SAAS Platform'
            }
        });
    }

    /**
     * Header comune per tutti i report
     */
    _addHeader(doc, title, subtitle = null) {
        doc.fontSize(24)
           .fillColor('#2563eb')
           .text('PT SAAS', 50, 50);

        doc.fontSize(18)
           .fillColor('#1e293b')
           .text(title, 50, 85);

        if (subtitle) {
            doc.fontSize(10)
               .fillColor('#64748b')
               .text(subtitle, 50, 110);
        }

        doc.moveTo(50, 130)
           .lineTo(545, 130)
           .strokeColor('#e2e8f0')
           .stroke();

        return 145; // Return Y position after header
    }

    /**
     * Footer con numero pagina e data generazione
     */
    _addFooter(doc) {
        const bottom = doc.page.height - 50;
        doc.fontSize(8)
           .fillColor('#94a3b8')
           .text(
               `Generato il ${new Date().toLocaleDateString('it-IT')} - Pagina ${doc.bufferedPageRange().start + 1}`,
               50,
               bottom,
               { align: 'center', width: 495 }
           );
    }

    /**
     * Tabella generica
     */
    _addTable(doc, y, headers, rows, columnWidths) {
        const startX = 50;
        let currentY = y;

        // Headers
        doc.fontSize(9)
           .fillColor('#1e293b')
           .font('Helvetica-Bold');

        let x = startX;
        headers.forEach((header, i) => {
            doc.text(header, x, currentY, { width: columnWidths[i], align: 'left' });
            x += columnWidths[i];
        });

        currentY += 20;
        doc.moveTo(startX, currentY)
           .lineTo(545, currentY)
           .strokeColor('#cbd5e1')
           .stroke();
        currentY += 10;

        // Rows
        doc.font('Helvetica')
           .fontSize(8)
           .fillColor('#475569');

        rows.forEach((row, rowIndex) => {
            if (currentY > doc.page.height - 100) {
                doc.addPage();
                currentY = 50;
                this._addFooter(doc);
            }

            x = startX;
            row.forEach((cell, i) => {
                doc.text(String(cell || '-'), x, currentY, {
                    width: columnWidths[i],
                    align: i > 0 ? 'right' : 'left',
                    lineBreak: false
                });
                x += columnWidths[i];
            });

            currentY += 18;

            if (rowIndex < rows.length - 1) {
                doc.moveTo(startX, currentY)
                   .lineTo(545, currentY)
                   .strokeColor('#f1f5f9')
                   .stroke();
                currentY += 5;
            }
        });

        return currentY + 10;
    }

    /**
     * Generate client progress report PDF
     */
    async generateClientProgressReport(clientId, tenantId, options = {}) {
        const { startDate, endDate } = options;

        // Fetch client data
        const [client] = await query(
            `SELECT c.*, u.email as user_email
             FROM clients c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.id = ? AND c.tenant_id = ?`,
            [clientId, tenantId]
        );

        if (!client) {
            throw new Error('Cliente non trovato');
        }

        // Fetch workout sessions
        const sessions = await query(
            `SELECT DATE(created_at) as date, status, duration_minutes, notes
             FROM workout_sessions
             WHERE client_id = ? AND tenant_id = ?
             ${startDate ? 'AND created_at >= ?' : ''}
             ${endDate ? 'AND created_at <= ?' : ''}
             ORDER BY created_at DESC
             LIMIT 20`,
            [clientId, tenantId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]
        );

        // Fetch measurements
        const measurements = await query(
            `SELECT measurement_date, weight_kg, body_fat_percentage, muscle_mass_kg
             FROM anthropometric_data
             WHERE client_id = ? AND tenant_id = ?
             ORDER BY measurement_date DESC
             LIMIT 10`,
            [clientId, tenantId]
        );

        // Fetch achievements
        const achievements = await query(
            `SELECT a.name, ca.earned_at
             FROM client_achievements ca
             JOIN achievements a ON ca.achievement_id = a.id
             WHERE ca.client_id = ? AND ca.tenant_id = ?
             ORDER BY ca.earned_at DESC
             LIMIT 10`,
            [clientId, tenantId]
        );

        // Create PDF
        const doc = this._createPDF();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {});

        // Header
        let y = this._addHeader(
            doc,
            'Report Progresso Cliente',
            `${client.first_name} ${client.last_name} - Generato ${new Date().toLocaleDateString('it-IT')}`
        );

        // Client Info Section
        doc.fontSize(12)
           .fillColor('#1e293b')
           .font('Helvetica-Bold')
           .text('Informazioni Cliente', 50, y);
        y += 25;

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#475569');

        const clientInfo = [
            `Nome: ${client.first_name} ${client.last_name}`,
            `Email: ${client.email || client.user_email || 'N/D'}`,
            `Livello Fitness: ${client.fitness_level}`,
            `Obiettivo: ${client.primary_goal}`,
            `Livello Gamification: ${client.level} (${client.xp_points} XP)`,
            `Streak: ${client.streak_days} giorni`,
            `Ultimo Workout: ${client.last_workout_at ? new Date(client.last_workout_at).toLocaleDateString('it-IT') : 'Mai'}`
        ];

        clientInfo.forEach(line => {
            doc.text(line, 50, y);
            y += 15;
        });

        y += 20;

        // Sessions Table
        if (sessions.length > 0) {
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#1e293b')
               .text('Sessioni di Allenamento', 50, y);
            y += 25;

            const sessionRows = sessions.map(s => [
                new Date(s.date).toLocaleDateString('it-IT'),
                s.status === 'completed' ? 'Completata' : s.status,
                `${s.duration_minutes || 0} min`,
                (s.notes || '').substring(0, 30)
            ]);

            y = this._addTable(
                doc,
                y,
                ['Data', 'Stato', 'Durata', 'Note'],
                sessionRows,
                [120, 100, 80, 195]
            );
        }

        y += 20;

        // Measurements Table
        if (measurements.length > 0) {
            if (y > doc.page.height - 200) {
                doc.addPage();
                y = 50;
            }

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#1e293b')
               .text('Misurazioni Antropometriche', 50, y);
            y += 25;

            const measurementRows = measurements.map(m => [
                new Date(m.measurement_date).toLocaleDateString('it-IT'),
                m.weight_kg ? `${m.weight_kg} kg` : '-',
                m.body_fat_percentage ? `${m.body_fat_percentage}%` : '-',
                m.muscle_mass_kg ? `${m.muscle_mass_kg} kg` : '-'
            ]);

            y = this._addTable(
                doc,
                y,
                ['Data', 'Peso', 'Massa Grassa', 'Massa Muscolare'],
                measurementRows,
                [120, 125, 125, 125]
            );
        }

        y += 20;

        // Achievements
        if (achievements.length > 0) {
            if (y > doc.page.height - 200) {
                doc.addPage();
                y = 50;
            }

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#1e293b')
               .text('Achievement Recenti', 50, y);
            y += 25;

            const achievementRows = achievements.map(a => [
                a.name,
                new Date(a.earned_at).toLocaleDateString('it-IT')
            ]);

            y = this._addTable(
                doc,
                y,
                ['Achievement', 'Data Ottenimento'],
                achievementRows,
                [370, 125]
            );
        }

        // Footer
        this._addFooter(doc);

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });
    }

    /**
     * Generate payment report PDF
     */
    async generatePaymentReport(tenantId, options = {}) {
        const { startDate, endDate, clientId } = options;

        // Fetch payments
        let sql = `
            SELECT p.payment_date, p.amount, p.currency, p.status, p.payment_method,
                   c.first_name, c.last_name, c.email
            FROM payments p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.tenant_id = ?
        `;
        const params = [tenantId];

        if (startDate) {
            sql += ' AND p.payment_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND p.payment_date <= ?';
            params.push(endDate);
        }
        if (clientId) {
            sql += ' AND p.client_id = ?';
            params.push(clientId);
        }

        sql += ' ORDER BY p.payment_date DESC';

        const payments = await query(sql, params);

        // Calculate totals
        const totalCompleted = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const totalPending = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Create PDF
        const doc = this._createPDF();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {});

        // Header
        let y = this._addHeader(
            doc,
            'Report Pagamenti',
            `Periodo: ${startDate || 'Inizio'} - ${endDate || 'Oggi'}`
        );

        // Summary
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1e293b')
           .text('Riepilogo', 50, y);
        y += 25;

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#475569');

        doc.text(`Totale Pagamenti Completati: €${totalCompleted.toFixed(2)}`, 50, y);
        y += 20;
        doc.text(`Totale Pagamenti In Attesa: €${totalPending.toFixed(2)}`, 50, y);
        y += 20;
        doc.text(`Numero Transazioni: ${payments.length}`, 50, y);
        y += 35;

        // Payments Table
        if (payments.length > 0) {
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#1e293b')
               .text('Dettaglio Pagamenti', 50, y);
            y += 25;

            const paymentRows = payments.map(p => [
                new Date(p.payment_date).toLocaleDateString('it-IT'),
                `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'N/D',
                `€${parseFloat(p.amount).toFixed(2)}`,
                p.status === 'completed' ? 'Completato' : p.status === 'pending' ? 'In Attesa' : p.status,
                p.payment_method || 'N/D'
            ]);

            y = this._addTable(
                doc,
                y,
                ['Data', 'Cliente', 'Importo', 'Stato', 'Metodo'],
                paymentRows,
                [90, 150, 85, 85, 85]
            );
        } else {
            doc.fontSize(10)
               .fillColor('#64748b')
               .text('Nessun pagamento trovato per il periodo selezionato.', 50, y);
        }

        // Footer
        this._addFooter(doc);

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });
    }

    /**
     * Generate workout plan PDF (printable)
     */
    async generateWorkoutPlanPDF(templateId, tenantId) {
        // Fetch template
        const [template] = await query(
            `SELECT * FROM workout_templates WHERE id = ? AND tenant_id = ?`,
            [templateId, tenantId]
        );

        if (!template) {
            throw new Error('Template non trovato');
        }

        // Fetch exercises in template
        const exercises = await query(
            `SELECT wte.*, e.name, e.description, e.category, e.equipment
             FROM workout_template_exercises wte
             JOIN exercises e ON wte.exercise_id = e.id
             WHERE wte.template_id = ?
             ORDER BY wte.exercise_order ASC`,
            [templateId]
        );

        // Create PDF
        const doc = this._createPDF();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {});

        // Header
        let y = this._addHeader(
            doc,
            'Piano di Allenamento',
            template.name
        );

        // Template Info
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#475569');

        if (template.description) {
            doc.text(`Descrizione: ${template.description}`, 50, y, { width: 495 });
            y += 30;
        }

        doc.text(`Livello: ${template.difficulty_level || 'N/D'}`, 50, y);
        y += 15;
        doc.text(`Durata Stimata: ${template.estimated_duration_minutes || 'N/D'} minuti`, 50, y);
        y += 35;

        // Exercises
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1e293b')
           .text('Esercizi', 50, y);
        y += 25;

        exercises.forEach((ex, idx) => {
            if (y > doc.page.height - 150) {
                doc.addPage();
                y = 50;
            }

            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#2563eb')
               .text(`${idx + 1}. ${ex.name}`, 50, y);
            y += 20;

            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#475569');

            if (ex.description) {
                doc.text(ex.description, 70, y, { width: 475 });
                y += doc.heightOfString(ex.description, { width: 475 }) + 10;
            }

            const details = [];
            if (ex.sets) details.push(`Serie: ${ex.sets}`);
            if (ex.reps) details.push(`Ripetizioni: ${ex.reps}`);
            if (ex.duration_seconds) details.push(`Durata: ${ex.duration_seconds}s`);
            if (ex.rest_seconds) details.push(`Recupero: ${ex.rest_seconds}s`);
            if (ex.weight_kg) details.push(`Peso: ${ex.weight_kg}kg`);

            if (details.length > 0) {
                doc.text(details.join(' | '), 70, y);
                y += 15;
            }

            if (ex.notes) {
                doc.fillColor('#64748b')
                   .text(`Note: ${ex.notes}`, 70, y, { width: 475 });
                y += doc.heightOfString(`Note: ${ex.notes}`, { width: 475 }) + 10;
            }

            y += 15;
        });

        // Footer
        this._addFooter(doc);

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });
    }

    /**
     * Generate meal plan PDF (printable)
     */
    async generateMealPlanPDF(planId, tenantId) {
        // Fetch meal plan
        const [plan] = await query(
            `SELECT mp.*, c.first_name, c.last_name
             FROM meal_plans mp
             LEFT JOIN clients c ON mp.client_id = c.id
             WHERE mp.id = ? AND mp.tenant_id = ?`,
            [planId, tenantId]
        );

        if (!plan) {
            throw new Error('Piano alimentare non trovato');
        }

        // Fetch meals
        const meals = await query(
            `SELECT * FROM meal_plan_items
             WHERE meal_plan_id = ?
             ORDER BY day_of_week ASC, meal_type ASC`,
            [planId]
        );

        // Create PDF
        const doc = this._createPDF();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {});

        // Header
        let y = this._addHeader(
            doc,
            'Piano Alimentare',
            plan.client_id ? `Cliente: ${plan.first_name} ${plan.last_name}` : plan.name
        );

        // Plan Info
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#475569');

        const planInfo = [
            `Nome Piano: ${plan.name || 'N/D'}`,
            `Calorie Giornaliere Target: ${plan.daily_calories_target || 'N/D'} kcal`,
            `Proteine: ${plan.protein_target_g || 'N/D'}g | Carboidrati: ${plan.carbs_target_g || 'N/D'}g | Grassi: ${plan.fat_target_g || 'N/D'}g`
        ];

        planInfo.forEach(line => {
            doc.text(line, 50, y);
            y += 15;
        });

        if (plan.notes) {
            y += 10;
            doc.text(`Note: ${plan.notes}`, 50, y, { width: 495 });
            y += doc.heightOfString(`Note: ${plan.notes}`, { width: 495 }) + 10;
        }

        y += 25;

        // Group meals by day
        const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
        const mealTypes = {
            breakfast: 'Colazione',
            morning_snack: 'Spuntino Mattina',
            lunch: 'Pranzo',
            afternoon_snack: 'Spuntino Pomeriggio',
            dinner: 'Cena',
            evening_snack: 'Spuntino Sera'
        };

        for (let dayIdx = 1; dayIdx <= 7; dayIdx++) {
            const dayMeals = meals.filter(m => m.day_of_week === dayIdx);

            if (dayMeals.length === 0) continue;

            if (y > doc.page.height - 200) {
                doc.addPage();
                y = 50;
            }

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#2563eb')
               .text(days[dayIdx - 1], 50, y);
            y += 25;

            dayMeals.forEach(meal => {
                if (y > doc.page.height - 100) {
                    doc.addPage();
                    y = 50;
                }

                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#1e293b')
                   .text(mealTypes[meal.meal_type] || meal.meal_type, 70, y);
                y += 18;

                doc.fontSize(9)
                   .font('Helvetica')
                   .fillColor('#475569');

                if (meal.food_description) {
                    doc.text(meal.food_description, 90, y, { width: 455 });
                    y += doc.heightOfString(meal.food_description, { width: 455 }) + 5;
                }

                const macros = [];
                if (meal.calories) macros.push(`${meal.calories} kcal`);
                if (meal.protein_g) macros.push(`P: ${meal.protein_g}g`);
                if (meal.carbs_g) macros.push(`C: ${meal.carbs_g}g`);
                if (meal.fat_g) macros.push(`G: ${meal.fat_g}g`);

                if (macros.length > 0) {
                    doc.fillColor('#64748b')
                       .text(macros.join(' | '), 90, y);
                    y += 15;
                }

                if (meal.notes) {
                    doc.fillColor('#94a3b8')
                       .text(`Note: ${meal.notes}`, 90, y, { width: 455 });
                    y += doc.heightOfString(`Note: ${meal.notes}`, { width: 455 }) + 5;
                }

                y += 10;
            });

            y += 15;
        }

        // Footer
        this._addFooter(doc);

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });
    }
}

module.exports = new ReportService();
