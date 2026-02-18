/**
 * API Key Controller
 * Gestione HTTP per API keys
 */

const apiKeyService = require('../services/apiKey.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('API_KEY');

class ApiKeyController {
    /**
     * POST /api/api-keys - Genera una nuova API key
     */
    async generate(req, res) {
        try {
            const { name, permissions, expiresInDays } = req.body;

            const result = await apiKeyService.generate(
                req.user.tenantId,
                name,
                permissions,
                expiresInDays
            );

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error generating API key', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/api-keys - Lista tutte le API keys del tenant
     */
    async list(req, res) {
        try {
            const keys = await apiKeyService.list(req.user.tenantId);

            res.json({
                success: true,
                data: { keys }
            });
        } catch (error) {
            logger.error('Error listing API keys', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * DELETE /api/api-keys/:id - Revoca una API key
     */
    async revoke(req, res) {
        try {
            const { id } = req.params;

            const result = await apiKeyService.revoke(
                parseInt(id),
                req.user.tenantId
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error revoking API key', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/api-keys/usage - Ottieni statistiche di utilizzo
     */
    async getUsageStats(req, res) {
        try {
            const { apiKeyId } = req.query;

            const stats = await apiKeyService.getUsageStats(
                req.user.tenantId,
                apiKeyId ? parseInt(apiKeyId) : null
            );

            res.json({
                success: true,
                data: { stats }
            });
        } catch (error) {
            logger.error('Error fetching API key usage stats', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/api-keys/validate - Valida una API key/secret pair (usato internamente)
     */
    async validate(req, res) {
        try {
            const { apiKey, apiSecret } = req.body;

            const result = await apiKeyService.validate(apiKey, apiSecret);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error validating API key', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new ApiKeyController();
