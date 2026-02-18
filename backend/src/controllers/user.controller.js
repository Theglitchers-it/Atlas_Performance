/**
 * User Controller
 * Gestione richieste HTTP utenti
 */

const userService = require('../services/user.service');
const { getFileUrl } = require('../middlewares/upload');

class UserController {
    /**
     * GET /api/users
     */
    async getAll(req, res, next) {
        try {
            const options = {
                role: req.query.role,
                status: req.query.status,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            const result = await userService.getAll(req.user.tenantId, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/users/:id
     */
    async getById(req, res, next) {
        try {
            const user = await userService.getById(
                parseInt(req.params.id),
                req.user.tenantId
            );

            res.json({
                success: true,
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/users
     */
    async create(req, res, next) {
        try {
            const user = await userService.create(req.user.tenantId, req.body);

            res.status(201).json({
                success: true,
                message: 'Utente creato con successo',
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/users/:id
     */
    async update(req, res, next) {
        try {
            const user = await userService.update(
                parseInt(req.params.id),
                req.user.tenantId,
                req.body
            );

            res.json({
                success: true,
                message: 'Utente aggiornato con successo',
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/users/:id
     */
    async delete(req, res, next) {
        try {
            await userService.delete(
                parseInt(req.params.id),
                req.user.tenantId,
                req.user.id
            );

            res.json({
                success: true,
                message: 'Utente eliminato con successo'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/users/:id/avatar
     */
    async updateAvatar(req, res, next) {
        try {
            const { avatarUrl } = req.body;

            const user = await userService.updateAvatar(
                parseInt(req.params.id),
                req.user.tenantId,
                avatarUrl
            );

            res.json({
                success: true,
                data: { user }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/users/me/avatar
     * Upload file avatar per l'utente corrente
     */
    async uploadMyAvatar(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Nessun file caricato' });
            }

            const avatarUrl = getFileUrl(req.file.path);

            const user = await userService.updateAvatar(
                req.user.id,
                req.user.tenantId,
                avatarUrl
            );

            res.json({
                success: true,
                message: 'Avatar aggiornato',
                data: { user, avatarUrl }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/users/me/business
     */
    async getBusinessInfo(req, res, next) {
        try {
            if (req.user.role !== 'tenant_owner' && req.user.role !== 'super_admin') {
                return res.status(403).json({ success: false, message: 'Accesso negato' });
            }
            const info = await userService.getBusinessInfo(req.user.tenantId);
            res.json({ success: true, data: info });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/users/me/business
     */
    async updateBusinessInfo(req, res, next) {
        try {
            if (req.user.role !== 'tenant_owner' && req.user.role !== 'super_admin') {
                return res.status(403).json({ success: false, message: 'Accesso negato' });
            }
            const info = await userService.updateBusinessInfo(req.user.tenantId, req.body);
            res.json({ success: true, message: 'Info business aggiornate', data: info });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
