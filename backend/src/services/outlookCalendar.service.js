/**
 * Outlook Calendar Service
 * Sync bidirezionale appuntamenti con Microsoft Outlook/365 Calendar
 */

const { ConfidentialClientApplication } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('OUTLOOK');

class OutlookCalendarService {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.clientId = process.env.MICROSOFT_CLIENT_ID;
        this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        this.tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/booking/outlook/callback`;

        if (!this.clientId || !this.clientSecret) {
            logger.warn('Microsoft API credentials mancanti.');
            return;
        }

        this.initialized = true;
        logger.info('Configurazione inizializzata');
    }

    /**
     * Genera URL per autorizzazione OAuth2
     */
    getAuthUrl(userId) {
        this.init();
        if (!this.clientId) throw new Error('Outlook Calendar non configurato');

        const scope = 'openid offline_access Calendars.ReadWrite';
        const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize` +
            `?client_id=${this.clientId}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
            `&scope=${encodeURIComponent(scope)}` +
            `&state=${userId}` +
            `&response_mode=query`;

        return url;
    }

    /**
     * Scambia codice autorizzazione per tokens
     */
    async handleCallback(code, userId) {
        this.init();
        if (!this.clientId) throw new Error('Outlook Calendar non configurato');

        const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
                scope: 'openid offline_access Calendars.ReadWrite'
            })
        });

        const tokens = await response.json();

        if (tokens.error) {
            throw new Error(`OAuth error: ${tokens.error_description || tokens.error}`);
        }

        const expiryDate = new Date(Date.now() + (tokens.expires_in * 1000));

        await query(`
            INSERT INTO user_calendar_tokens (user_id, provider, access_token, refresh_token, token_expiry)
            VALUES (?, 'outlook', ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                access_token = VALUES(access_token),
                refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
                token_expiry = VALUES(token_expiry),
                updated_at = NOW()
        `, [userId, tokens.access_token, tokens.refresh_token || null, expiryDate]);

        return { success: true };
    }

    /**
     * Ottieni Graph client autenticato
     */
    async _getGraphClient(userId) {
        this.init();
        if (!this.clientId) return null;

        const rows = await query(
            'SELECT access_token, refresh_token, token_expiry FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
            [userId, 'outlook']
        );

        if (rows.length === 0) return null;

        let { access_token, refresh_token, token_expiry } = rows[0];

        // Refresh token se scaduto
        if (token_expiry && new Date(token_expiry) < new Date()) {
            if (!refresh_token) return null;

            const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    refresh_token,
                    grant_type: 'refresh_token',
                    scope: 'openid offline_access Calendars.ReadWrite'
                })
            });

            const newTokens = await response.json();
            if (newTokens.error) return null;

            access_token = newTokens.access_token;
            const newExpiry = new Date(Date.now() + (newTokens.expires_in * 1000));

            await query(
                'UPDATE user_calendar_tokens SET access_token = ?, refresh_token = COALESCE(?, refresh_token), token_expiry = ?, updated_at = NOW() WHERE user_id = ? AND provider = ?',
                [access_token, newTokens.refresh_token || null, newExpiry, userId, 'outlook']
            );
        }

        const client = Client.init({
            authProvider: (done) => done(null, access_token)
        });

        return client;
    }

    /**
     * Sincronizza appuntamento su Outlook Calendar
     */
    async syncAppointment(userId, appointment) {
        const client = await this._getGraphClient(userId);
        if (!client) return null;

        const event = {
            subject: `Appuntamento: ${appointment.clientName || 'Cliente'}`,
            body: {
                contentType: 'Text',
                content: appointment.notes || ''
            },
            start: {
                dateTime: appointment.startDatetime,
                timeZone: 'Europe/Rome'
            },
            end: {
                dateTime: appointment.endDatetime,
                timeZone: 'Europe/Rome'
            },
            reminderMinutesBeforeStart: 30
        };

        try {
            if (appointment.outlookEventId) {
                const result = await client.api(`/me/events/${appointment.outlookEventId}`).update(event);
                return result.id;
            } else {
                const result = await client.api('/me/events').post(event);
                await query(
                    'UPDATE appointments SET outlook_event_id = ? WHERE id = ?',
                    [result.id, appointment.id]
                );
                return result.id;
            }
        } catch (error) {
            logger.error(`Errore sync appuntamento ${appointment.id}`, { error: error.message });
            return null;
        }
    }

    /**
     * Elimina evento da Outlook Calendar
     */
    async deleteEvent(userId, outlookEventId) {
        const client = await this._getGraphClient(userId);
        if (!client || !outlookEventId) return;

        try {
            await client.api(`/me/events/${outlookEventId}`).delete();
        } catch (error) {
            logger.error(`Errore eliminazione evento ${outlookEventId}`, { error: error.message });
        }
    }

    /**
     * Verifica se l'utente ha connesso Outlook
     */
    async isConnected(userId) {
        const rows = await query(
            'SELECT id FROM user_calendar_tokens WHERE user_id = ? AND provider = ?',
            [userId, 'outlook']
        );
        return rows.length > 0;
    }

    /**
     * Disconnetti Outlook Calendar
     */
    async disconnect(userId) {
        await query('DELETE FROM user_calendar_tokens WHERE user_id = ? AND provider = ?', [userId, 'outlook']);
    }
}

module.exports = new OutlookCalendarService();
