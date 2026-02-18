/**
 * OAuth Service
 * Gestione login sociale: Google, GitHub, Discord
 */

const { v4: uuidv4 } = require('uuid');
const { google } = require('googleapis');
const { query, transaction } = require('../config/database');
const jwt = require('jsonwebtoken');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('OAUTH');

// ═══════════════════════════════════════════════
// Provider Configs
// ═══════════════════════════════════════════════

const PROVIDERS = {
    google: {
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: 'openid email profile',
        getClientId: () => process.env.GOOGLE_CLIENT_ID,
        getClientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
        getRedirectUri: () => process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/google/callback'
    },
    github: {
        name: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        profileUrl: 'https://api.github.com/user',
        emailUrl: 'https://api.github.com/user/emails',
        scopes: 'user:email read:user',
        getClientId: () => process.env.GITHUB_CLIENT_ID,
        getClientSecret: () => process.env.GITHUB_CLIENT_SECRET,
        getRedirectUri: () => process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/github/callback'
    },
    discord: {
        name: 'Discord',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        profileUrl: 'https://discord.com/api/users/@me',
        scopes: 'identify email',
        getClientId: () => process.env.DISCORD_CLIENT_ID,
        getClientSecret: () => process.env.DISCORD_CLIENT_SECRET,
        getRedirectUri: () => process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/discord/callback'
    }
};

class OAuthService {

    // ═══════════════════════════════════════════════
    // Generate Auth URL
    // ═══════════════════════════════════════════════

    async getAuthUrl(provider) {
        const config = PROVIDERS[provider];
        if (!config) throw { status: 400, message: `Provider "${provider}" non supportato` };

        const clientId = config.getClientId();
        if (!clientId) throw { status: 500, message: `${config.name} OAuth non configurato. Aggiungi le credenziali nel file .env` };

        // Generate CSRF state
        const state = uuidv4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await query(
            'INSERT INTO oauth_states (state, provider, expires_at) VALUES (?, ?, ?)',
            [state, provider, expiresAt]
        );

        // Cleanup expired states
        await query('DELETE FROM oauth_states WHERE expires_at < NOW()');

        // Build auth URL
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: config.getRedirectUri(),
            response_type: 'code',
            scope: config.scopes,
            state: state
        });

        // Provider-specific params
        if (provider === 'google') {
            params.set('access_type', 'offline');
            params.set('prompt', 'select_account');
        }
        if (provider === 'discord') {
            params.set('prompt', 'consent');
        }

        return { url: `${config.authUrl}?${params.toString()}` };
    }

    // ═══════════════════════════════════════════════
    // Handle Callback
    // ═══════════════════════════════════════════════

    async handleCallback(provider, code, state) {
        const config = PROVIDERS[provider];
        if (!config) throw { status: 400, message: `Provider "${provider}" non supportato` };

        // Validate CSRF state
        const states = await query(
            'SELECT * FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > NOW()',
            [state, provider]
        );

        if (states.length === 0) {
            throw { status: 400, message: 'State OAuth non valido o scaduto. Riprova.' };
        }

        // Delete used state
        await query('DELETE FROM oauth_states WHERE state = ?', [state]);

        // Exchange code for access token
        const accessToken = await this.exchangeCode(provider, code, config);

        // Fetch user profile
        const profile = await this.fetchProfile(provider, accessToken, config);

        // Find or create user
        return this.findOrCreateOAuthUser(provider, profile);
    }

    // ═══════════════════════════════════════════════
    // Exchange Code for Token
    // ═══════════════════════════════════════════════

    async exchangeCode(provider, code, config) {
        const body = {
            client_id: config.getClientId(),
            client_secret: config.getClientSecret(),
            code: code,
            redirect_uri: config.getRedirectUri(),
            grant_type: 'authorization_code'
        };

        let response;

        if (provider === 'github') {
            // GitHub wants JSON accept header
            response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            });
        } else if (provider === 'discord') {
            // Discord wants form-urlencoded
            response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(body).toString()
            });
        } else {
            // Google
            response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }

        const data = await response.json();

        if (data.error) {
            logger.error(`Token exchange error for ${provider}`, { error: data.error_description || data.error });
            throw { status: 400, message: `Errore autenticazione ${config.name}: ${data.error_description || data.error}` };
        }

        return data.access_token;
    }

    // ═══════════════════════════════════════════════
    // Fetch User Profile
    // ═══════════════════════════════════════════════

    async fetchProfile(provider, accessToken, config) {
        const headers = { 'Authorization': `Bearer ${accessToken}` };

        if (provider === 'github') {
            headers['Accept'] = 'application/vnd.github+json';
            headers['User-Agent'] = 'PT-SaaS-App';
        }

        const response = await fetch(config.profileUrl, { headers });
        const data = await response.json();

        if (provider === 'google') {
            return {
                providerId: String(data.id),
                email: data.email,
                firstName: data.given_name || data.name?.split(' ')[0] || 'Utente',
                lastName: data.family_name || data.name?.split(' ').slice(1).join(' ') || 'Google',
                avatarUrl: data.picture || null
            };
        }

        if (provider === 'github') {
            // GitHub email might be private, need to fetch from /user/emails
            let email = data.email;
            if (!email) {
                const emailResponse = await fetch(config.emailUrl, { headers });
                const emails = await emailResponse.json();
                const primary = emails.find(e => e.primary && e.verified) || emails[0];
                email = primary?.email;
            }

            if (!email) {
                throw { status: 400, message: 'Impossibile ottenere l\'email dal tuo account GitHub. Assicurati di avere un\'email verificata.' };
            }

            const nameParts = (data.name || data.login || 'Utente GitHub').split(' ');
            return {
                providerId: String(data.id),
                email: email,
                firstName: nameParts[0] || 'Utente',
                lastName: nameParts.slice(1).join(' ') || 'GitHub',
                avatarUrl: data.avatar_url || null
            };
        }

        if (provider === 'discord') {
            if (!data.email) {
                throw { status: 400, message: 'Impossibile ottenere l\'email dal tuo account Discord. Assicurati di avere un\'email verificata.' };
            }

            const nameParts = (data.global_name || data.username || 'Utente Discord').split(' ');
            const avatarHash = data.avatar;
            const avatarUrl = avatarHash
                ? `https://cdn.discordapp.com/avatars/${data.id}/${avatarHash}.png?size=256`
                : null;

            return {
                providerId: String(data.id),
                email: data.email,
                firstName: nameParts[0] || 'Utente',
                lastName: nameParts.slice(1).join(' ') || 'Discord',
                avatarUrl: avatarUrl
            };
        }

        throw { status: 500, message: 'Provider non gestito' };
    }

    // ═══════════════════════════════════════════════
    // Find or Create User
    // ═══════════════════════════════════════════════

    async findOrCreateOAuthUser(provider, profile) {
        // 1. Search by provider + provider_id
        let users = await query(
            `SELECT u.id, u.tenant_id, u.email, u.role, u.first_name, u.last_name,
                    u.avatar_url, u.status, t.business_name, t.subscription_plan, t.subscription_status
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             WHERE u.oauth_provider = ? AND u.oauth_provider_id = ?`,
            [provider, profile.providerId]
        );

        if (users.length > 0) {
            const user = users[0];
            if (user.status !== 'active') {
                throw { status: 403, message: 'Account non attivo. Contatta il supporto.' };
            }

            // Update last login + avatar
            await query(
                'UPDATE users SET last_login_at = NOW(), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
                [profile.avatarUrl, user.id]
            );

            return this.generateLoginResponse(user);
        }

        // 2. Search by email
        users = await query(
            `SELECT u.id, u.tenant_id, u.email, u.role, u.first_name, u.last_name,
                    u.avatar_url, u.status, t.business_name, t.subscription_plan, t.subscription_status
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             WHERE u.email = ?`,
            [profile.email]
        );

        if (users.length > 0) {
            const user = users[0];
            if (user.status !== 'active') {
                throw { status: 403, message: 'Account non attivo. Contatta il supporto.' };
            }

            // Link OAuth to existing account
            await query(
                'UPDATE users SET oauth_provider = ?, oauth_provider_id = ?, last_login_at = NOW(), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
                [provider, profile.providerId, profile.avatarUrl, user.id]
            );

            return this.generateLoginResponse(user);
        }

        // 3. Create new user + tenant
        const result = await transaction(async (connection) => {
            const tenantId = uuidv4();
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);

            const businessName = `${profile.firstName}'s Studio`;

            await connection.execute(
                `INSERT INTO tenants (id, business_name, owner_email, subscription_plan, subscription_status, trial_ends_at, max_clients)
                 VALUES (?, ?, ?, 'free', 'trial', ?, 5)`,
                [tenantId, businessName, profile.email, trialEndsAt]
            );

            const [userResult] = await connection.execute(
                `INSERT INTO users (tenant_id, email, password_hash, oauth_provider, oauth_provider_id, role, first_name, last_name, avatar_url, status, email_verified_at)
                 VALUES (?, ?, NULL, ?, ?, 'tenant_owner', ?, ?, ?, 'active', NOW())`,
                [tenantId, profile.email, provider, profile.providerId, profile.firstName, profile.lastName, profile.avatarUrl]
            );

            return {
                userId: userResult.insertId,
                tenantId,
                businessName
            };
        });

        const newUser = {
            id: result.userId,
            tenant_id: result.tenantId,
            email: profile.email,
            role: 'tenant_owner',
            first_name: profile.firstName,
            last_name: profile.lastName,
            avatar_url: profile.avatarUrl,
            business_name: result.businessName,
            subscription_plan: 'free',
            subscription_status: 'trial'
        };

        return this.generateLoginResponse(newUser, true);
    }

    // ═══════════════════════════════════════════════
    // Generate Login Response (JWT)
    // ═══════════════════════════════════════════════

    generateLoginResponse(user, isNewUser = false) {
        const accessToken = jwt.sign(
            { userId: user.id, tenantId: user.tenant_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Save refresh token
        const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        const days = parseInt(expiresIn) || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, expiresAt]
        ).catch(err => logger.error('Errore salvataggio refresh token', { error: err.message }));

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
            accessToken,
            refreshToken,
            isNewUser
        };
    }
}

module.exports = new OAuthService();
