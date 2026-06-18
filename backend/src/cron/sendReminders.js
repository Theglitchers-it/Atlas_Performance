/**
 * Cron Job: sendReminders
 * Invia reminder automatici per:
 * - Appuntamenti (3 ore prima)
 * - Pagamenti in scadenza (3 giorni prima)
 * - Workout del giorno
 * - Check-in readiness giornaliero
 * Da eseguire ogni ora
 * Ora include anche invio email tramite EmailService
 */

const { query } = require('../config/database');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('CRON_REMINDERS');

/**
 * Reminder appuntamenti - 3 ore prima
 */
async function sendAppointmentReminders() {
    let count = 0;

    try {
        // Schema: appointments(start_datetime DATETIME, end_datetime DATETIME, appointment_type, status ENUM('scheduled','completed','cancelled','no_show'))
        // Finestra 2.5h-3.5h da adesso. Confronto su DATETIME diretto per gestire correttamente l'attraversamento della mezzanotte.
        // Usa NOT EXISTS invece di NOT IN per evitare il pitfall di SQL NULL con JSON_EXTRACT.
        const appointments = await query(`
            SELECT a.id, a.tenant_id, a.client_id,
                   DATE(a.start_datetime) AS appt_date,
                   TIME(a.start_datetime) AS appt_time,
                   a.appointment_type, c.user_id, u.first_name, u.last_name, u.email
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE a.status = 'scheduled'
              AND a.start_datetime BETWEEN DATE_ADD(NOW(), INTERVAL 150 MINUTE) AND DATE_ADD(NOW(), INTERVAL 210 MINUTE)
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.type = 'appointment_reminder'
                    AND n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    AND CAST(JSON_EXTRACT(n.metadata, '$.appointment_id') AS UNSIGNED) = a.id
              )
        `);

        for (const appt of appointments) {
            try {
                // Notifica in-app + WebSocket + Web Push
                await notificationService.create({
                    tenantId: appt.tenant_id,
                    userId: appt.user_id,
                    type: 'appointment_reminder',
                    title: 'Promemoria Appuntamento',
                    message: `Hai un appuntamento oggi alle ${appt.appt_time}`,
                    actionUrl: '/calendar',
                    metadata: { appointment_id: appt.id },
                    priority: 'high'
                });

                // Email
                if (appt.email) {
                    emailService.sendAppointmentReminder({
                        to: appt.email,
                        clientName: `${appt.first_name} ${appt.last_name}`,
                        date: new Date(appt.appt_date).toLocaleDateString('it-IT'),
                        time: appt.appt_time,
                        type: appt.appointment_type
                    }).catch(err => logger.error(`Email appointment ${appt.id}`, { error: err.message }));
                }

                count++;
            } catch (err) {
                logger.error(`sendReminders appointment ${appt.id}`, { error: err.message });
            }
        }
    } catch (err) {
        logger.error('sendAppointmentReminders errore', { error: err.message });
    }

    return count;
}

/**
 * Reminder pagamenti in scadenza - 3 giorni prima
 */
async function sendPaymentReminders() {
    let count = 0;

    try {
        // Schema: client_subscriptions(start_date, end_date, status, billing_cycle ENUM('monthly','quarterly','yearly'), plan_type, amount).
        // Logica: reminder 3gg prima del prossimo pagamento ricorrente. Calcoliamo le date di rinnovo
        // tra start_date e end_date in base al billing_cycle e flagghiamo quelle a -3gg da oggi.
        // Dedup via NOT EXISTS (più sicuro di NOT IN con JSON_EXTRACT che fallisce su NULL).
        const subscriptions = await query(`
            SELECT cs.id, cs.tenant_id, cs.client_id, cs.start_date, cs.end_date, cs.billing_cycle,
                   cs.amount, cs.plan_type, c.user_id, u.first_name, u.last_name, u.email,
                   /* Calcola la prossima data di pagamento aggiungendo il numero corretto di cicli a start_date */
                   CASE cs.billing_cycle
                       WHEN 'monthly'   THEN DATE_ADD(cs.start_date, INTERVAL TIMESTAMPDIFF(MONTH,  cs.start_date, DATE_ADD(CURDATE(), INTERVAL 3 DAY)) MONTH)
                       WHEN 'quarterly' THEN DATE_ADD(cs.start_date, INTERVAL TIMESTAMPDIFF(MONTH,  cs.start_date, DATE_ADD(CURDATE(), INTERVAL 3 DAY)) / 3 * 3 MONTH)
                       WHEN 'yearly'    THEN DATE_ADD(cs.start_date, INTERVAL TIMESTAMPDIFF(YEAR,   cs.start_date, DATE_ADD(CURDATE(), INTERVAL 3 DAY)) YEAR)
                       ELSE cs.end_date
                   END AS next_due_date
            FROM client_subscriptions cs
            JOIN clients c ON cs.client_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE cs.status = 'active'
              AND cs.start_date IS NOT NULL
              AND (cs.end_date IS NULL OR cs.end_date >= CURDATE())
              AND (
                  /* Caso 1: rinnovo periodico (monthly/quarterly/yearly) atteso fra 3 giorni */
                  (cs.billing_cycle IN ('monthly','quarterly','yearly')
                    AND CASE cs.billing_cycle
                        WHEN 'monthly'   THEN DATE_ADD(cs.start_date, INTERVAL TIMESTAMPDIFF(MONTH,  cs.start_date, DATE_ADD(CURDATE(), INTERVAL 3 DAY)) MONTH)
                        WHEN 'quarterly' THEN DATE_ADD(cs.start_date, INTERVAL TIMESTAMPDIFF(MONTH,  cs.start_date, DATE_ADD(CURDATE(), INTERVAL 3 DAY)) / 3 * 3 MONTH)
                        WHEN 'yearly'    THEN DATE_ADD(cs.start_date, INTERVAL TIMESTAMPDIFF(YEAR,   cs.start_date, DATE_ADD(CURDATE(), INTERVAL 3 DAY)) YEAR)
                    END = DATE_ADD(CURDATE(), INTERVAL 3 DAY))
                  OR
                  /* Caso 2: end_date assoluto fra 3 giorni (sub senza ciclo) */
                  cs.end_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.type = 'payment_reminder'
                    AND n.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
                    AND CAST(JSON_EXTRACT(n.metadata, '$.subscription_id') AS UNSIGNED) = cs.id
              )
        `);

        for (const sub of subscriptions) {
            try {
                const dueDate = sub.next_due_date || sub.end_date;
                const dueDateFormatted = dueDate ? new Date(dueDate).toLocaleDateString('it-IT') : '—';
                const amountFormatted = (sub.amount != null) ? `€${sub.amount}` : 'l\'abbonamento';
                // Notifica in-app + WebSocket + Web Push
                await notificationService.create({
                    tenantId: sub.tenant_id,
                    userId: sub.user_id,
                    type: 'payment_reminder',
                    title: 'Pagamento in Scadenza',
                    message: `Il tuo pagamento di ${amountFormatted} scade il ${dueDateFormatted}`,
                    actionUrl: '/payments',
                    metadata: { subscription_id: sub.id },
                    priority: 'high'
                });

                // Email
                if (sub.email) {
                    emailService.sendPaymentReminder({
                        to: sub.email,
                        clientName: `${sub.first_name} ${sub.last_name}`,
                        amount: sub.amount,
                        dueDate: dueDateFormatted,
                        planType: sub.plan_type
                    }).catch(err => logger.error(`Email payment sub ${sub.id}`, { error: err.message }));
                }

                count++;
            } catch (err) {
                logger.error(`sendReminders payment sub ${sub.id}`, { error: err.message });
            }
        }
    } catch (err) {
        logger.error('sendPaymentReminders errore', { error: err.message });
    }

    return count;
}

/**
 * Reminder workout del giorno - inviato alle 8 di mattina
 */
async function sendWorkoutReminders() {
    let count = 0;

    const currentHour = new Date().getHours();
    if (currentHour !== 8) return 0;

    try {
        const programs = await query(`
            SELECT cp.id, cp.tenant_id, cp.client_id,
                   c.user_id, u.first_name, u.last_name, u.email,
                   pw.workout_template_id,
                   wt.name as workout_name
            FROM client_programs cp
            JOIN clients c ON cp.client_id = c.id
            JOIN users u ON c.user_id = u.id
            JOIN program_workouts pw ON pw.program_id = cp.id
            JOIN workout_templates wt ON pw.workout_template_id = wt.id
            WHERE cp.status = 'active'
              AND pw.day_of_week = DAYOFWEEK(CURDATE())
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.type = 'workout_reminder'
                    AND DATE(n.created_at) = CURDATE()
                    AND CAST(JSON_EXTRACT(n.metadata, '$.program_id') AS UNSIGNED) = cp.id
              )
        `);

        for (const prog of programs) {
            try {
                // Notifica in-app + WebSocket + Web Push
                await notificationService.create({
                    tenantId: prog.tenant_id,
                    userId: prog.user_id,
                    type: 'workout_reminder',
                    title: 'Allenamento di Oggi',
                    message: `Oggi hai in programma: ${prog.workout_name}`,
                    actionUrl: '/client/workout',
                    metadata: { program_id: prog.id },
                    priority: 'normal'
                });

                // Email
                if (prog.email) {
                    emailService.sendWorkoutReminder({
                        to: prog.email,
                        clientName: `${prog.first_name} ${prog.last_name}`,
                        workoutName: prog.workout_name
                    }).catch(err => logger.error(`Email workout prog ${prog.id}`, { error: err.message }));
                }

                count++;
            } catch (err) {
                logger.error(`sendReminders workout prog ${prog.id}`, { error: err.message });
            }
        }
    } catch (err) {
        logger.error('sendWorkoutReminders errore', { error: err.message });
    }

    return count;
}

/**
 * Reminder check-in readiness giornaliero - inviato alle 7 di mattina
 */
async function sendCheckinReminders() {
    let count = 0;

    const currentHour = new Date().getHours();
    if (currentHour !== 7) return 0;

    try {
        const clients = await query(`
            SELECT c.id as client_id, c.tenant_id, c.user_id, u.first_name, u.last_name, u.email
            FROM clients c
            JOIN users u ON c.user_id = u.id
            WHERE c.status = 'active'
              AND NOT EXISTS (
                  SELECT 1 FROM daily_checkins dc
                  WHERE dc.client_id = c.id AND DATE(dc.checkin_date) = CURDATE()
              )
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.type = 'checkin_reminder'
                    AND DATE(n.created_at) = CURDATE()
                    AND CAST(JSON_EXTRACT(n.metadata, '$.client_id') AS UNSIGNED) = c.id
              )
        `);

        for (const client of clients) {
            try {
                // Notifica in-app + WebSocket + Web Push
                await notificationService.create({
                    tenantId: client.tenant_id,
                    userId: client.user_id,
                    type: 'checkin_reminder',
                    title: 'Check-in Giornaliero',
                    message: 'Come ti senti oggi? Completa il tuo check-in giornaliero',
                    actionUrl: '/client/checkin',
                    metadata: { client_id: client.client_id },
                    priority: 'normal'
                });

                // Email
                if (client.email) {
                    emailService.sendCheckinReminder({
                        to: client.email,
                        clientName: `${client.first_name} ${client.last_name}`
                    }).catch(err => logger.error(`Email checkin client ${client.client_id}`, { error: err.message }));
                }

                count++;
            } catch (err) {
                logger.error(`sendReminders checkin client ${client.client_id}`, { error: err.message });
            }
        }
    } catch (err) {
        logger.error('sendCheckinReminders errore', { error: err.message });
    }

    return count;
}

/**
 * Esegui tutti i reminder
 */
async function sendAllReminders() {
    logger.info('sendReminders: avvio...');
    const startTime = Date.now();

    const results = await Promise.allSettled([
        sendAppointmentReminders(),
        sendPaymentReminders(),
        sendWorkoutReminders(),
        sendCheckinReminders()
    ]);

    const [appointments, payments, workouts, checkins] = results.map(r => r.status === 'fulfilled' ? r.value : 0);

    // Log eventuali errori
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            const names = ['appointments', 'payments', 'workouts', 'checkins'];
            logger.error(`sendReminders ${names[i]} failed`, { error: r.reason?.message || r.reason });
        }
    });

    const total = appointments + payments + workouts + checkins;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info(`sendReminders: completato in ${elapsed}s`, { appointments, payments, workouts, checkins });

    return total;
}

module.exports = { sendAllReminders };
