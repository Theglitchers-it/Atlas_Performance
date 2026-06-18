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
            const { category, rarity, unlockedOnly, sort } = req.query;
            const achievements = await gamificationService.getAllAchievements(tenantId, req.user.id, {
                category, rarity,
                unlockedOnly: unlockedOnly === 'true',
                sort
            });
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
            const { limit, page, locationId } = req.query;
            const result = await gamificationService.getLeaderboard(tenantId, {
                limit: parseInt(limit) || 20,
                page: parseInt(page) || 1,
                locationId: locationId ? parseInt(locationId) : null
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

    // === Sparkline / Heatmap / Next Achievement / Ranking / Weekly / Goals ===

    async getXPSparkline(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
            const data = await gamificationService.getXPSparkline(req.user.tenantId, clientId, days);
            res.json({ success: true, data: { sparkline: data } });
        } catch (error) { next(error); }
    }

    async getStreakHeatmap(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const data = await gamificationService.getStreakHeatmap(req.user.tenantId, clientId, year);
            res.json({ success: true, data: { year, heatmap: data } });
        } catch (error) { next(error); }
    }

    async getNextAchievement(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            const userId = clientId
                ? await gamificationService._getUserIdForClient(clientId)
                : req.user.id;
            if (!userId) return res.status(400).json({ success: false, message: 'User ID non risolvibile' });
            const next = await gamificationService.getNextAchievement(req.user.tenantId, userId);
            res.json({ success: true, data: { next } });
        } catch (error) { next(error); }
    }

    async getRanking(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const ranking = await gamificationService.getRanking(req.user.tenantId, clientId);
            if (!ranking) return res.status(404).json({ success: false, message: 'Cliente non trovato' });
            res.json({ success: true, data: { ranking } });
        } catch (error) { next(error); }
    }

    async getWeeklyRecap(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const recap = await gamificationService.getWeeklyRecap(req.user.tenantId, clientId);
            res.json({ success: true, data: { recap } });
        } catch (error) { next(error); }
    }

    async getWeeklyGoals(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const result = await gamificationService.getWeeklyGoals(req.user.tenantId, clientId);
            res.json({ success: true, data: result });
        } catch (error) { next(error); }
    }

    async upsertWeeklyGoal(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const { goal_type, target_value } = req.body;
            const allowedTypes = ['xp', 'workouts', 'challenges', 'streak'];
            if (!allowedTypes.includes(goal_type)) {
                return res.status(400).json({ success: false, message: `goal_type deve essere uno di: ${allowedTypes.join(', ')}` });
            }
            const target = parseInt(target_value);
            if (!Number.isInteger(target) || target <= 0) {
                return res.status(400).json({ success: false, message: 'target_value deve essere intero positivo' });
            }
            const result = await gamificationService.upsertWeeklyGoal(req.user.tenantId, clientId, goal_type, target);
            res.json({ success: true, data: result });
        } catch (error) { next(error); }
    }

    async deleteWeeklyGoal(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            if (!clientId) return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            const goalId = parseInt(req.params.id);
            const ok = await gamificationService.deleteWeeklyGoal(req.user.tenantId, clientId, goalId);
            if (!ok) return res.status(404).json({ success: false, message: 'Goal non trovato' });
            res.json({ success: true });
        } catch (error) { next(error); }
    }
}

module.exports = new GamificationController();
