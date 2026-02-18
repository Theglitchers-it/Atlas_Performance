/**
 * Referral Controller
 * Gestione HTTP per programma referral
 */

const referralService = require('../services/referral.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('REFERRAL');

class ReferralController {
    /**
     * POST /api/referrals/codes - Genera un nuovo codice referral
     */
    async generateCode(req, res) {
        try {
            const { type, customCode, name } = req.body;

            const result = await referralService.generateCode(
                req.user.id,
                req.user.tenantId,
                type || 'general',
                customCode,
                name || null
            );

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error generating referral code', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/referrals/apply - Applica un codice referral
     */
    async applyCode(req, res) {
        try {
            const { code } = req.body;

            const result = await referralService.applyCode(
                code,
                req.user.id
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error applying referral code', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/referrals/stats - Ottieni statistiche referral
     */
    async getStats(req, res) {
        try {
            const stats = await referralService.getStats(req.user.id);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error fetching referral stats', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/referrals/codes - Lista tutti i codici referral dell'utente
     */
    async listCodes(req, res) {
        try {
            const codes = await referralService.listCodes(req.user.id);

            res.json({
                success: true,
                data: codes
            });
        } catch (error) {
            logger.error('Error listing referral codes', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/referrals/conversions - Lista tutte le conversioni dell'utente
     */
    async listConversions(req, res) {
        try {
            const { status } = req.query;

            const conversions = await referralService.listConversions(
                req.user.id,
                status
            );

            res.json({
                success: true,
                data: conversions
            });
        } catch (error) {
            logger.error('Error listing referral conversions', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * PUT /api/referrals/conversions/:id/complete - Marca conversione come completata
     */
    async completeConversion(req, res) {
        try {
            const { id } = req.params;

            const result = await referralService.completeConversion(
                parseInt(id),
                req.user.tenantId
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error completing referral conversion', { error: error.message });
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new ReferralController();
