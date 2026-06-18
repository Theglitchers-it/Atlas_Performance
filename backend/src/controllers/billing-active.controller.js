/**
 * Pay-per-Active-Client Controller
 */

const billingService = require('../services/billing-active.service');

const asInt = (v) => parseInt(v, 10);

class BillingActiveController {

    async getUsage(req, res, next) {
        try { res.json({ success: true, data: await billingService.getCurrentUsage(req.user.tenantId) }); }
        catch (err) { next(err); }
    }

    async updateSettings(req, res, next) {
        try {
            await billingService.updateSettings(req.user.tenantId, req.body);
            res.json({ success: true, message: 'Settings aggiornate' });
        } catch (err) { next(err); }
    }

    async activateClient(req, res, next) {
        try {
            const result = await billingService.activateClient({
                tenantId: req.user.tenantId,
                clientId: asInt(req.params.id),
                actorUserId: req.user.id,
                reason: req.body?.reason || null
            });
            res.json({ success: true, ...result });
        } catch (err) { next(err); }
    }

    async deactivateClient(req, res, next) {
        try {
            const result = await billingService.deactivateClient({
                tenantId: req.user.tenantId,
                clientId: asInt(req.params.id),
                actorUserId: req.user.id,
                reason: req.body?.reason || null
            });
            res.json({ success: true, ...result });
        } catch (err) { next(err); }
    }

    async getClientHistory(req, res, next) {
        try {
            const data = await billingService.getClientActivationHistory(asInt(req.params.id), req.user.tenantId);
            res.json({ success: true, data });
        } catch (err) { next(err); }
    }

    async reportUsage(req, res, next) {
        try { res.json({ success: true, ...(await billingService.reportUsageToStripe(req.user.tenantId)) }); }
        catch (err) { next(err); }
    }
}

module.exports = new BillingActiveController();
