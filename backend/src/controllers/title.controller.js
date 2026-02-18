/**
 * Title Controller
 * Handler per gestione titoli di achievement
 */

const titleService = require('../services/title.service');
const { query } = require('../config/database');

class TitleController {

    async _resolveClientId(req) {
        if (req.user.role === 'client') {
            const [client] = await query('SELECT id FROM clients WHERE user_id = ? AND tenant_id = ?', [req.user.id, req.user.tenantId]);
            return client?.id || null;
        }
        return req.query.clientId ? parseInt(req.query.clientId) : null;
    }

    async getTitles(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            const { category, exerciseId, unlockedOnly } = req.query;
            const titles = await titleService.getTitles(tenantId, clientId, {
                category, exerciseId: exerciseId ? parseInt(exerciseId) : null,
                unlockedOnly: unlockedOnly === 'true'
            });
            res.json({ success: true, data: { titles } });
        } catch (error) {
            next(error);
        }
    }

    async getTitleById(req, res, next) {
        try {
            const clientId = await this._resolveClientId(req);
            const title = await titleService.getTitleById(req.params.id, clientId);
            if (!title) {
                return res.status(404).json({ success: false, message: 'Titolo non trovato' });
            }
            res.json({ success: true, data: { title } });
        } catch (error) {
            next(error);
        }
    }

    async getDisplayedTitle(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            const title = await titleService.getDisplayedTitle(tenantId, clientId);
            res.json({ success: true, data: { title } });
        } catch (error) {
            next(error);
        }
    }

    async setDisplayedTitle(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const clientId = await this._resolveClientId(req);
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'Client ID richiesto' });
            }
            const { titleId } = req.body;
            await titleService.setDisplayedTitle(tenantId, clientId, titleId);
            res.json({ success: true, data: { message: 'Titolo aggiornato' } });
        } catch (error) {
            next(error);
        }
    }

    // === TITLE MANAGEMENT (Trainer CRUD) ===

    async getManageableTitles(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const titles = await titleService.getManageableTitles(tenantId);
            res.json({ success: true, data: { titles } });
        } catch (error) {
            next(error);
        }
    }

    async createTitle(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { title_name, title_description, exercise_name, category, metric_type, threshold_value, rarity } = req.body;

            if (!title_name || threshold_value === undefined) {
                return res.status(400).json({ success: false, message: 'Nome titolo e soglia sono obbligatori' });
            }

            const title = await titleService.createTitle(tenantId, {
                title_name, title_description, exercise_name,
                category, metric_type, threshold_value, rarity
            });

            res.status(201).json({ success: true, data: { title } });
        } catch (error) {
            next(error);
        }
    }

    async updateTitle(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const titleId = parseInt(req.params.id);

            const result = await titleService.updateTitle(tenantId, titleId, req.body);
            if (!result) {
                return res.status(404).json({ success: false, message: 'Titolo non trovato' });
            }

            res.json({ success: true, data: { title: result } });
        } catch (error) {
            next(error);
        }
    }

    async deleteTitle(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const titleId = parseInt(req.params.id);

            const deleted = await titleService.deleteTitle(tenantId, titleId);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Titolo non trovato' });
            }

            res.json({ success: true, data: { message: 'Titolo eliminato' } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TitleController();
