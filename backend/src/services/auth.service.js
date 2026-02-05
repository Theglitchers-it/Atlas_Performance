/**
 * Auth Service
 * Gestione logica business autenticazione
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');

class AuthService {
    /**
     * Registra un nuovo tenant owner
     */
    async register({ email, password, firstName, lastName, phone, businessName }) {
        // Verifica email non già registrata
        const existingUsers = await query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            throw { status: 409, message: 'Email già registrata' };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Crea tenant e utente in transazione
        const result = await transaction(async (connection) => {
            // Crea tenant
            const tenantId = uuidv4();
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 giorni trial

            await connection.execute(
                `INSERT INTO tenants (id, business_name, owner_email, phone, subscription_plan, subscription_status, trial_ends_at, max_clients)
                 VALUES (?, ?, ?, ?, 'free', 'trial', ?, 5)`,
                [tenantId, businessName, email, phone || null, trialEndsAt]
            );

            // Crea utente
            const [userResult] = await connection.execute(
                `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, status, email_verified_at)
                 VALUES (?, ?, ?, 'tenant_owner', ?, ?, ?, 'active', NOW())`,
                [tenantId, email, passwordHash, firstName, lastName, phone || null]
            );

            return {
                tenantId,
                userId: userResult.insertId
            };
        });

        // Genera tokens
        const tokens = this.generateTokens(result.userId, result.tenantId, 'tenant_owner');

        // Salva refresh token
        await this.saveRefreshToken(result.userId, tokens.refreshToken);

        return {
            user: {
                id: result.userId,
                tenantId: result.tenantId,
                email,
                firstName,
                lastName,
                role: 'tenant_owner'
            },
            ...tokens
        };
    }

    /**
     * Login utente
     */
    async login(email, password) {
        // Trova utente
        const users = await query(
            `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.role,
                    u.first_name, u.last_name, u.status, u.avatar_url,
                    t.business_name, t.subscription_plan, t.subscription_status
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             WHERE u.email = ?`,
            [email]
        );

        if (users.length === 0) {
            throw { status: 401, message: 'Credenziali non valide' };
        }

        const user = users[0];

        // Verifica status
        if (user.status !== 'active') {
            throw { status: 403, message: 'Account non attivo. Contatta il supporto.' };
        }

        // Verifica password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            throw { status: 401, message: 'Credenziali non valide' };
        }

        // Aggiorna last login
        await query(
            'UPDATE users SET last_login_at = NOW() WHERE id = ?',
            [user.id]
        );

        // Genera tokens
        const tokens = this.generateTokens(user.id, user.tenant_id, user.role);

        // Salva refresh token
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                tenantId: user.tenant_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                avatarUrl: user.avatar_url,
                businessName: user.business_name,
                subscriptionPlan: user.subscription_plan,
                subscriptionStatus: user.subscription_status
            },
            ...tokens
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        // Verifica token in database
        const tokens = await query(
            `SELECT rt.*, u.id as user_id, u.tenant_id, u.role, u.status,
                    u.first_name, u.last_name, u.email, u.avatar_url
             FROM refresh_tokens rt
             JOIN users u ON rt.user_id = u.id
             WHERE rt.token = ? AND rt.expires_at > NOW()`,
            [refreshToken]
        );

        if (tokens.length === 0) {
            throw { status: 401, message: 'Refresh token non valido o scaduto' };
        }

        const tokenData = tokens[0];

        if (tokenData.status !== 'active') {
            throw { status: 403, message: 'Account non attivo' };
        }

        // Elimina vecchio refresh token
        await query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

        // Genera nuovi tokens
        const newTokens = this.generateTokens(
            tokenData.user_id,
            tokenData.tenant_id,
            tokenData.role
        );

        // Salva nuovo refresh token
        await this.saveRefreshToken(tokenData.user_id, newTokens.refreshToken);

        return {
            user: {
                id: tokenData.user_id,
                tenantId: tokenData.tenant_id,
                email: tokenData.email,
                firstName: tokenData.first_name,
                lastName: tokenData.last_name,
                role: tokenData.role,
                avatarUrl: tokenData.avatar_url
            },
            ...newTokens
        };
    }

    /**
     * Logout - invalida refresh token
     */
    async logout(refreshToken) {
        if (refreshToken) {
            await query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
        }
        return { success: true };
    }

    /**
     * Logout da tutti i dispositivi
     */
    async logoutAll(userId) {
        await query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
        return { success: true };
    }

    /**
     * Verifica token e ritorna user data
     */
    async verifyAndGetUser(userId) {
        const users = await query(
            `SELECT u.id, u.tenant_id, u.email, u.role, u.first_name, u.last_name,
                    u.avatar_url, u.status, t.business_name, t.subscription_plan
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = ? AND u.status = 'active'`,
            [userId]
        );

        if (users.length === 0) {
            throw { status: 401, message: 'Utente non trovato' };
        }

        const user = users[0];
        return {
            id: user.id,
            tenantId: user.tenant_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            avatarUrl: user.avatar_url,
            businessName: user.business_name,
            subscriptionPlan: user.subscription_plan
        };
    }

    /**
     * Genera access e refresh token
     */
    generateTokens(userId, tenantId, role) {
        const accessToken = jwt.sign(
            { userId, tenantId, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        const refreshToken = jwt.sign(
            { userId, type: 'refresh' },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Salva refresh token in database
     */
    async saveRefreshToken(userId, token) {
        // Calcola expiry
        const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        const days = parseInt(expiresIn) || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        await query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );

        // Pulizia token scaduti
        await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    }

    /**
     * Cambia password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const users = await query(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            throw { status: 404, message: 'Utente non trovato' };
        }

        const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!validPassword) {
            throw { status: 401, message: 'Password attuale non corretta' };
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        await query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newPasswordHash, userId]
        );

        // Invalida tutti i refresh token
        await this.logoutAll(userId);

        return { success: true };
    }
}

module.exports = new AuthService();
