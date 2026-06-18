const aiService = require('../services/ai.service');

const requireAIAvailable = async (req, res, next) => {
    try {
        if (!aiService.isConfigured()) {
            return res.status(503).json({
                success: false,
                message: 'Servizio AI non configurato'
            });
        }
        const usage = await aiService.checkUsageLimit(req.user.tenantId);
        if (!usage.withinLimit) {
            return res.status(429).json({
                success: false,
                message: 'Limite utilizzo AI raggiunto per questo mese'
            });
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { requireAIAvailable };
