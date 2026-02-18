/**
 * Google Calendar Service
 * Sync bidirezionale appuntamenti con Google Calendar
 */

const { google } = require('googleapis');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('GCAL');

class GoogleCalendarService {
    constructor() {
        this.initialized = false;
        this.oauth2Client = null;
    }

    init() {
        if (this.initialized) return;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/booking/google/callback`;

        if (!clientId || !clientSecret) {
            logger.warn('Google Calendar API credentials mancanti.');
            return;
        }

        this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        this.initialized = true;
        logger.info('OAuth2 inizializzato');
    }

    /**
     * Genera URL per autorizzazione OAuth2
     */
    getAuthUrl(userId) {
        this.init();
        if (!this.oauth2Client) throw new Error('Google Calendar non configurato');

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar'],
            state: String(userId),
            prompt: 'consent'
        });
    }

    /**
     * Scambia codice autorizzazione per tokens
     */
    async handleCallback(code, userId) {
        this.init();
        if (!this.oauth2Client) throw new Error('Google Calendar non configurato');

        const { tokens } = await this.oauth2Client.getToken(code);

        // Salva tokens nel DB
        await query(`
            INSERT INTO user_calendar_tokens (user_id, provider, access_token, refresh_token, token_expiry)
            VALUES (?, 'google', ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                access_token = VALUES(access_token),
                refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
                token_expiry = VALUES(token_expiry),
                updated_at = NOW()
        `, [userId, tokens.access_token, tokens.refresh_token || null, tokens.expiry_date ? new Date(tokens.expiry_date) : null]);

        return { success: true };
    }

    /**
     * Ottieni client autenticato per un utente
     */
    async _getAuthClient(userId) {
        this.init();
        if (!this.oauth2Client) return null;

        const rows = await query(
            'SELECT access_token, refresh_token, token_expiry FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
            [userId, 'google']
        );

        if (rows.length === 0) return null;

        const token = rows[0];
        const authClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        authClient.setCredentials({
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expiry_date: token.token_expiry ? new Date(token.token_expiry).getTime() : null
        });

        // Auto-refresh e salva nuovo token
        authClient.on('tokens', async (newTokens) => {
            await query(
                'UPDATE user_calendar_tokens SET access_token = ?, token_expiry = ?, updated_at = NOW() WHERE user_id = ? AND provider = ?',
                [newTokens.access_token, newTokens.expiry_date ? new Date(newTokens.expiry_date) : null, userId, 'google']
            );
        });

        return authClient;
    }

    /**
     * Sincronizza appuntamento su Google Calendar
     */
    async syncAppointment(userId, appointment) {
        const authClient = await this._getAuthClient(userId);
        if (!authClient) return null;

        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const event = {
            summary: `Appuntamento: ${appointment.clientName || 'Cliente'}`,
            description: appointment.notes || '',
            start: {
                dateTime: appointment.startDatetime,
                timeZone: 'Europe/Rome'
            },
            end: {
                dateTime: appointment.endDatetime,
                timeZone: 'Europe/Rome'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 }
                ]
            }
        };

        try {
            // Se esiste gia' un google_event_id, aggiorna
            if (appointment.googleEventId) {
                const result = await calendar.events.update({
                    calendarId: 'primary',
                    eventId: appointment.googleEventId,
                    resource: event
                });
                return result.data.id;
            } else {
                // Crea nuovo evento
                const result = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event
                });

                // Salva google_event_id nell'appuntamento
                await query(
                    'UPDATE appointments SET google_event_id = ? WHERE id = ?',
                    [result.data.id, appointment.id]
                );

                return result.data.id;
            }
        } catch (error) {
            logger.error(`Errore sync appuntamento ${appointment.id}`, { error: error.message });
            return null;
        }
    }

    /**
     * Elimina evento da Google Calendar
     */
    async deleteEvent(userId, googleEventId) {
        const authClient = await this._getAuthClient(userId);
        if (!authClient || !googleEventId) return;

        const calendar = google.calendar({ version: 'v3', auth: authClient });

        try {
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: googleEventId
            });
        } catch (error) {
            logger.error(`Errore eliminazione evento ${googleEventId}`, { error: error.message });
        }
    }

    /**
     * Verifica se l'utente ha connesso Google Calendar
     */
    async isConnected(userId) {
        const rows = await query(
            'SELECT id FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
            [userId, 'google']
        );
        return rows.length > 0;
    }

    /**
     * Disconnetti Google Calendar
     */
    async disconnect(userId) {
        await query('DELETE FROM user_calendar_tokens WHERE user_id = ? AND provider = ?', [userId, 'google']);
    }
}

module.exports = new GoogleCalendarService();
