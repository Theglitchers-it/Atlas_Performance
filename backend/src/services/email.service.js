/**
 * Email Service
 * Invio email tramite Nodemailer SMTP
 * Supporta template HTML per reminder, benvenuto, reset password
 */

const nodemailer = require('nodemailer');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('EMAIL');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    /**
     * Inizializza il transporter SMTP
     */
    init() {
        if (this.initialized) return;

        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            logger.warn('Configurazione SMTP mancante. Le email non verranno inviate.');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });

        this.fromAddress = process.env.SMTP_FROM || `"PT SAAS" <${user}>`;
        this.initialized = true;
        logger.info('Transporter SMTP inizializzato');
    }

    /**
     * Invia email generica
     */
    async sendEmail({ to, subject, html, text, critical = false }) {
        this.init();
        if (!this.transporter) {
            logger.warn(`Email non inviata a ${to}: SMTP non configurato`);
            return null;
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to,
                subject,
                html,
                text: text || subject
            });
            logger.info(`Inviata a ${to}: ${subject} (${info.messageId})`);
            return info;
        } catch (error) {
            logger.error(`Errore invio a ${to}`, { error: error.message });
            if (critical) {
                throw { status: 500, message: 'Errore invio email. Riprova più tardi.' };
            }
            return null;
        }
    }

    /**
     * Email reminder appuntamento
     */
    async sendAppointmentReminder({ to, clientName, date, time, type }) {
        const subject = 'Promemoria Appuntamento';
        const html = this._wrapTemplate(`
            <h2>Promemoria Appuntamento</h2>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>Ti ricordiamo il tuo appuntamento:</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Data:</strong> ${date}</p>
                <p style="margin:4px 0;"><strong>Ora:</strong> ${time}</p>
                <p style="margin:4px 0;"><strong>Tipo:</strong> ${type || 'Allenamento'}</p>
            </div>
            <p>Non dimenticare di presentarti in orario!</p>
        `);
        return this.sendEmail({ to, subject, html });
    }

    /**
     * Email reminder pagamento
     */
    async sendPaymentReminder({ to, clientName, amount, dueDate, planType }) {
        const subject = 'Pagamento in Scadenza';
        const html = this._wrapTemplate(`
            <h2>Pagamento in Scadenza</h2>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>Ti ricordiamo che il tuo pagamento e' in scadenza:</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Importo:</strong> &euro;${amount}</p>
                <p style="margin:4px 0;"><strong>Scadenza:</strong> ${dueDate}</p>
                <p style="margin:4px 0;"><strong>Piano:</strong> ${planType || 'Abbonamento'}</p>
            </div>
            <p>Contatta il tuo trainer per maggiori informazioni.</p>
        `);
        return this.sendEmail({ to, subject, html });
    }

    /**
     * Email reminder workout
     */
    async sendWorkoutReminder({ to, clientName, workoutName }) {
        const subject = 'Allenamento di Oggi';
        const html = this._wrapTemplate(`
            <h2>Allenamento di Oggi</h2>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>Oggi hai in programma:</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="font-size:18px;font-weight:bold;color:#2563eb;margin:0;">${workoutName}</p>
            </div>
            <p>Buon allenamento!</p>
        `);
        return this.sendEmail({ to, subject, html });
    }

    /**
     * Email reminder check-in
     */
    async sendCheckinReminder({ to, clientName }) {
        const subject = 'Check-in Giornaliero';
        const html = this._wrapTemplate(`
            <h2>Come ti senti oggi?</h2>
            <p>Ciao <strong>${clientName}</strong>,</p>
            <p>Non dimenticare di completare il tuo check-in giornaliero per monitorare il tuo stato di recupero e readiness.</p>
            <p>Accedi alla piattaforma per compilare il questionario.</p>
        `);
        return this.sendEmail({ to, subject, html });
    }

    /**
     * Email di benvenuto
     */
    async sendWelcome({ to, name, role, loginUrl }) {
        const subject = 'Benvenuto su PT SAAS!';
        const html = this._wrapTemplate(`
            <h2>Benvenuto su PT SAAS!</h2>
            <p>Ciao <strong>${name}</strong>,</p>
            <p>Il tuo account ${role === 'client' ? 'cliente' : 'trainer'} e' stato creato con successo.</p>
            <p>Puoi accedere alla piattaforma qui:</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="${loginUrl || '#'}" style="background:#2563eb;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Accedi alla Piattaforma</a>
            </div>
        `);
        return this.sendEmail({ to, subject, html });
    }

    /**
     * Email reset password
     */
    async sendPasswordReset({ to, name, resetUrl }) {
        const subject = 'Reset Password';
        const html = this._wrapTemplate(`
            <h2>Reset Password</h2>
            <p>Ciao <strong>${name}</strong>,</p>
            <p>Hai richiesto il reset della password. Clicca il pulsante qui sotto per impostarne una nuova:</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Reimposta Password</a>
            </div>
            <p style="color:#64748b;font-size:12px;">Se non hai richiesto il reset, ignora questa email. Il link scade tra 1 ora.</p>
        `);
        return this.sendEmail({ to, subject, html, critical: true });
    }

    /**
     * Template HTML wrapper
     */
    _wrapTemplate(content) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#2563eb;font-size:24px;margin:0;">PT SAAS</h1>
            </div>
            ${content}
        </div>
        <div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">
            <p>Questa email e' stata inviata automaticamente da PT SAAS</p>
            <p>Non rispondere a questa email</p>
        </div>
    </div>
</body>
</html>`;
    }
}

module.exports = new EmailService();
