/**
 * User Controller
 * Gestione richieste HTTP utenti
 */

const userService = require('../services/user.service');
const { userHasAnyRole } = require('../middlewares/auth');

const AVATAR_ADMIN_ROLES = ['tenant_owner', 'staff', 'super_admin', 'gym_admin'];
const { getFileUrl } = require('../middlewares/upload');
const audit = require('../services/audit.service');

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

            audit.log({ req, action: audit.AUDIT_ACTIONS.USER_CREATE, resourceId: user.id, details: { email: req.body.email, role: req.body.role } });

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

            audit.log({ req, action: audit.AUDIT_ACTIONS.USER_UPDATE, resourceId: req.params.id, details: { fields: Object.keys(req.body) } });

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

            audit.log({ req, action: audit.AUDIT_ACTIONS.USER_DELETE, resourceId: req.params.id });

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
     * Solo il proprietario del profilo (req.user.id === id) o ruoli admin del tenant
     * possono modificare l'avatar. Previene IDOR su altri user del tenant.
     */
    async updateAvatar(req, res, next) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (!Number.isInteger(targetId) || targetId <= 0) {
                return res.status(400).json({ success: false, message: 'id non valido' });
            }

            const isOwner = req.user.id === targetId;
            if (!isOwner && !userHasAnyRole(req.user, AVATAR_ADMIN_ROLES)) {
                return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo profilo' });
            }

            const { avatarUrl } = req.body;
            if (avatarUrl !== null && avatarUrl !== undefined) {
                if (typeof avatarUrl !== 'string' || avatarUrl.length > 500) {
                    return res.status(400).json({ success: false, message: 'avatarUrl non valido' });
                }
                if (!/^(https?:\/\/|\/uploads\/)/i.test(avatarUrl)) {
                    return res.status(400).json({ success: false, message: 'avatarUrl deve essere http(s) o path /uploads/' });
                }
            }

            const user = await userService.updateAvatar(
                targetId,
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

    /**
     * PUT /api/users/me/profile
     * Aggiorna i campi pubblici del proprio profilo (bio, city, firstName, lastName)
     */
    async updateMyProfile(req, res, next) {
        try {
            const updated = await userService.updateMyProfile(req.user.id, req.body);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Utente non trovato' });
            }
            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/users/:id/profile
     * Profilo pubblico tenant-scoped: avatar, bio, città, stats follower/following/posts, isFollowing
     */
    async getPublicProfile(req, res, next) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (!Number.isInteger(targetId)) {
                return res.status(400).json({ success: false, message: 'ID non valido' });
            }
            const profile = await userService.getPublicProfile(
                targetId,
                req.user.tenantId,
                req.user.id
            );
            if (!profile) {
                return res.status(404).json({ success: false, message: 'Utente non trovato' });
            }
            res.json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/users/:id/follow
     */
    async followUser(req, res, next) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (!Number.isInteger(targetId)) {
                return res.status(400).json({ success: false, message: 'ID non valido' });
            }
            if (targetId === req.user.id) {
                return res.status(400).json({ success: false, message: 'Non puoi seguire te stesso' });
            }
            const result = await userService.followUser(
                req.user.id,
                targetId,
                req.user.tenantId
            );
            if (!result.ok) {
                return res.status(result.status || 400).json({ success: false, message: result.message });
            }
            res.status(201).json({ success: true, data: { isFollowing: true, followers: result.followers } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/users/:id/follow
     */
    async unfollowUser(req, res, next) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (!Number.isInteger(targetId)) {
                return res.status(400).json({ success: false, message: 'ID non valido' });
            }
            const result = await userService.unfollowUser(
                req.user.id,
                targetId,
                req.user.tenantId
            );
            res.json({ success: true, data: { isFollowing: false, followers: result.followers } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
