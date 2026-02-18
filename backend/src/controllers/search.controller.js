/**
 * Search Controller
 * Handler per ricerca globale
 */

const searchService = require('../services/search.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('SEARCH');

class SearchController {
    /**
     * GET /api/search?q=...
     * Ricerca globale su clienti, esercizi, workout
     */
    async globalSearch(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'La query di ricerca deve avere almeno 2 caratteri'
                });
            }

            const tenantId = req.user.tenantId;
            const role = req.user.role;

            const results = await searchService.globalSearch(tenantId, q.trim(), role);

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            logger.error('Errore ricerca globale', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Errore durante la ricerca'
            });
        }
    }
}

module.exports = new SearchController();
