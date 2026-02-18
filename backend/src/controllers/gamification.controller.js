/**
 * Gamification Controller
 * Handler per achievements, XP, sfide e classifiche
 */

const gamificationService = require('../services/gamification.service');
const { query } = require('../config/database');

class GamificationController {

    // Helper: risolvi clientId dal ruolo utente
    async _resolveClientId(req) {
        if (req.user.role === 'client') {
            const [client] = await query('SELECT id FROM clients WHERE user_id = ? AND tenant_id = ?', [req.user.id, req.user.tenantId]);
            return client?.id || null;
        }
        return req.query.clientId ? parseInt(req.query.clientId) : null;
    }

    async getDashboard(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            const dashboard = await gamificationService.getDashboard(tenantId, clientId);
            if (!dashboard) {
                return res.status(404).json({ success: false, message: 'Cliente non trovato' });
            }
            res.json({ success: true, data: { dashboard } });
        } catch (error) {
            next(error);
        }
    }

    async getAchievements(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { category, rarity, unlockedOnly } = req.query;
            const achievements = await gamificationService.getAllAchievements(tenantId, req.user.id, { category, rarity, unlockedOnly: unlockedOnly === 'true' });
            res.json({ success: true, data: { achievements } });
        } catch (error) {
            next(error);
        }
    }

    async getAchievementsByCategory(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const categories = await gamificationService.getAchievementsByCategory(tenantId, req.user.id);
            res.json({ success: true, data: { categories } });
        } catch (error) {
            next(error);
        }
    }

    async getRecentAchievements(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const limit = parseInt(req.query.limit) || 5;
            const achievements = await gamificationService.getRecentAchievements(tenantId, req.user.id, limit);
            res.json({ success: true, data: { achievements } });
        } catch (error) {
            next(error);
        }
    }

    async getRecentXPActivity(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            const limit = parseInt(req.query.limit) || 10;
            const activity = await gamificationService.getRecentXPActivity(tenantId, clientId, limit);
            res.json({ success: true, data: { activity } });
        } catch (error) {
            next(error);
        }
    }

    async getXPHistory(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            const { limit, page, type } = req.query;
            const result = await gamificationService.getXPHistory(tenantId, clientId, {
                limit: parseInt(limit) || 20,
                page: parseInt(page) || 1,
                type
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async addBonusXP(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { clientId, points, description } = req.body;
            if (!clientId || !points) {
                return res.status(400).json({ success: false, message: 'clientId e points sono obbligatori' });
            }
            const result = await gamificationService.addXP(tenantId, clientId, points, 'bonus', null, null, description || 'Bonus XP');
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getLeaderboard(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { limit, page } = req.query;
            const result = await gamificationService.getLeaderboard(tenantId, {
                limit: parseInt(limit) || 20,
                page: parseInt(page) || 1
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getChallenges(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            const { status, limit, page } = req.query;
            const result = await gamificationService.getChallenges(tenantId, {
                status, clientId,
                limit: parseInt(limit) || 20,
                page: parseInt(page) || 1
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getActiveChallengesPreview(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            const challenges = await gamificationService.getActiveChallengesPreview(tenantId, clientId);
            res.json({ success: true, data: { challenges } });
        } catch (error) {
            next(error);
        }
    }

    async getChallengeById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            const challenge = await gamificationService.getChallengeById(req.params.id, tenantId, clientId);
            if (!challenge) {
                return res.status(404).json({ success: false, message: 'Sfida non trovata' });
            }
            res.json({ success: true, data: { challenge } });
        } catch (error) {
            next(error);
        }
    }

    async createChallenge(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const challengeId = await gamificationService.createChallenge(tenantId, req.user.id, req.body);
            res.status(201).json({ success: true, data: { challengeId } });
        } catch (error) {
            next(error);
        }
    }

    async joinChallenge(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            await gamificationService.joinChallenge(req.params.id, clientId);
            res.json({ success: true, data: { message: 'Iscrizione completata' } });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Gia iscritto a questa sfida' });
            }
            next(error);
        }
    }

    async withdrawFromChallenge(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            await gamificationService.withdrawFromChallenge(req.params.id, clientId);
            res.json({ success: true, data: { message: 'Ritiro completato' } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new GamificationController();
