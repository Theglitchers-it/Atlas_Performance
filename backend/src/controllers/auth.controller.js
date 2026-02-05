/**
 * Auth Controller
 * Gestione richieste HTTP autenticazione
 */

const authService = require('../services/auth.service');

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

            res.status(201).json({
                success: true,
                message: 'Registrazione completata con successo',
                data: result
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

            res.json({
                success: true,
                message: 'Login effettuato con successo',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/refresh-token
     * Rinnova access token
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;

            const result = await authService.refreshToken(refreshToken);

            res.json({
                success: true,
                data: result
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
            const { refreshToken } = req.body;

            await authService.logout(refreshToken);

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
            await authService.logoutAll(req.user.id);

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
