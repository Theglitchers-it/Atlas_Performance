/**
 * Auth Controller
 * Gestione richieste HTTP autenticazione
 */

const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');
const { blacklistToken, extractToken } = require('../middlewares/auth');

class AuthController {
    /**
     * POST /api/auth/register
     * Registrazione nuovo tenant owner
     */
    async register(req, res, next) {
        try {
            const { email, password, firstName, lastName, phone, businessName } = req.body;

            const result = await authService.register({
                email,
                password,
                firstName,
                lastName,
                phone,
                businessName
            });

            // Set httpOnly cookies
            setAuthCookies(res, result.accessToken, result.refreshToken);

            res.status(201).json({
                success: true,
                message: 'Registrazione completata con successo',
                data: { user: result.user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/login
     * Login utente
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await authService.login(email, password);

            // Set httpOnly cookies
            setAuthCookies(res, result.accessToken, result.refreshToken);

            res.json({
                success: true,
                message: 'Login effettuato con successo',
                data: { user: result.user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/refresh-token
     * Rinnova access token — legge refresh token dal cookie
     */
    async refreshToken(req, res, next) {
        try {
            // Leggi refresh token dal cookie, fallback al body per client API
            const token = req.cookies?.refresh_token || req.body?.refreshToken;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token mancante'
                });
            }

            const result = await authService.refreshToken(token);

            // Set nuovo access token cookie
            setAuthCookies(res, result.accessToken, token);

            res.json({
                success: true,
                data: { user: result.user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/logout
     * Logout utente
     */
    async logout(req, res, next) {
        try {
            // Blacklist the current access token so it can't be reused
            const accessToken = extractToken(req);
            if (accessToken) {
                try {
                    const decoded = jwt.decode(accessToken);
                    if (decoded && decoded.jti && decoded.exp) {
                        blacklistToken(decoded.jti, decoded.exp * 1000);
                    }
                } catch { /* ignore decode errors */ }
            }

            // Leggi refresh token dal cookie, fallback al body
            const token = req.cookies?.refresh_token || req.body?.refreshToken;

            if (token) {
                await authService.logout(token);
            }

            // Clear httpOnly cookies
            clearAuthCookies(res);

            res.json({
                success: true,
                message: 'Logout effettuato con successo'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/logout-all
     * Logout da tutti i dispositivi
     */
    async logoutAll(req, res, next) {
        try {
            // Blacklist current access token
            const accessToken = extractToken(req);
            if (accessToken) {
                try {
                    const decoded = jwt.decode(accessToken);
                    if (decoded && decoded.jti && decoded.exp) {
                        blacklistToken(decoded.jti, decoded.exp * 1000);
                    }
                } catch { /* ignore decode errors */ }
            }

            await authService.logoutAll(req.user.id);

            // Clear httpOnly cookies
            clearAuthCookies(res);

            res.json({
                success: true,
                message: 'Logout da tutti i dispositivi effettuato'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/me
     * Ottieni dati utente corrente
     */
    async me(req, res, next) {
        try {
            const user = await authService.verifyAndGetUser(req.user.id);

            res.json({
                success: true,
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/change-password
     * Cambia password
     */
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;

            await authService.changePassword(req.user.id, currentPassword, newPassword);

            // Clear cookies — forza re-login
            clearAuthCookies(res);

            res.json({
                success: true,
                message: 'Password cambiata con successo. Effettua nuovamente il login.'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
