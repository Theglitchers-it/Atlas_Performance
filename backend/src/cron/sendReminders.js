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
        const appointments = await query(`
            SELECT a.id, a.tenant_id, a.client_id, a.date, a.start_time,
                   a.type, c.user_id, u.first_name, u.last_name, u.email
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE a.status = 'confirmed'
              AND a.date = CURDATE()
              AND a.start_time BETWEEN ADDTIME(CURTIME(), '02:30:00') AND ADDTIME(CURTIME(), '03:30:00')
              AND a.id NOT IN (
                  SELECT CAST(JSON_EXTRACT(metadata, '$.appointment_id') AS UNSIGNED)
                  FROM notifications
                  WHERE type = 'appointment_reminder'
                    AND DATE(created_at) = CURDATE()
                    AND JSON_EXTRACT(metadata, '$.appointment_id') IS NOT NULL
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
                    message: `Hai un appuntamento oggi alle ${appt.start_time}`,
                    actionUrl: '/calendar',
                    metadata: { appointment_id: appt.id },
                    priority: 'high'
                });

                // Email
                if (appt.email) {
                    emailService.sendAppointmentReminder({
                        to: appt.email,
                        clientName: `${appt.first_name} ${appt.last_name}`,
                        date: new Date(appt.date).toLocaleDateString('it-IT'),
                        time: appt.start_time,
                        type: appt.type
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
        const subscriptions = await query(`
            SELECT cs.id, cs.tenant_id, cs.client_id, cs.next_payment_date,
                   cs.amount, cs.plan_type, c.user_id, u.first_name, u.last_name, u.email
            FROM client_subscriptions cs
            JOIN clients c ON cs.client_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE cs.status = 'active'
              AND cs.next_payment_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
              AND cs.id NOT IN (
                  SELECT CAST(JSON_EXTRACT(metadata, '$.subscription_id') AS UNSIGNED)
                  FROM notifications
                  WHERE type = 'payment_reminder'
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
                    AND JSON_EXTRACT(metadata, '$.subscription_id') IS NOT NULL
              )
        `);

        for (const sub of subscriptions) {
            try {
                // Notifica in-app + WebSocket + Web Push
                await notificationService.create({
                    tenantId: sub.tenant_id,
                    userId: sub.user_id,
                    type: 'payment_reminder',
                    title: 'Pagamento in Scadenza',
                    message: `Il tuo pagamento di €${sub.amount} scade il ${sub.next_payment_date}`,
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
                        dueDate: new Date(sub.next_payment_date).toLocaleDateString('it-IT'),
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
              AND cp.id NOT IN (
                  SELECT CAST(JSON_EXTRACT(metadata, '$.program_id') AS UNSIGNED)
                  FROM notifications
                  WHERE type = 'workout_reminder'
                    AND DATE(created_at) = CURDATE()
                    AND JSON_EXTRACT(metadata, '$.program_id') IS NOT NULL
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
              AND c.id NOT IN (
                  SELECT client_id FROM daily_checkins
                  WHERE DATE(checkin_date) = CURDATE()
              )
              AND c.id NOT IN (
                  SELECT CAST(JSON_EXTRACT(metadata, '$.client_id') AS UNSIGNED)
                  FROM notifications
                  WHERE type = 'checkin_reminder'
                    AND DATE(created_at) = CURDATE()
                    AND JSON_EXTRACT(metadata, '$.client_id') IS NOT NULL
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
