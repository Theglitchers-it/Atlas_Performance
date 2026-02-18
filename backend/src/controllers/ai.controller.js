/**
 * AI Controller
 */

const aiService = require('../services/ai.service');

class AIController {
    async getStatus(req, res, next) {
        try {
            const configured = aiService.isConfigured();
            const usage = await aiService.checkUsageLimit(req.user.tenantId);
            res.json({
                success: true,
                data: {
                    configured,
                    usage
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async suggestAlternativeExercises(req, res, next) {
        try {
            if (!aiService.isConfigured()) {
                return res.status(503).json({ success: false, message: 'Servizio AI non configurato' });
            }

            const usage = await aiService.checkUsageLimit(req.user.tenantId);
            if (!usage.withinLimit) {
                return res.status(429).json({ success: false, message: 'Limite utilizzo AI raggiunto per questo mese' });
            }

            const result = await aiService.suggestAlternativeExercises(req.body);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'alternative_exercises',
                prompt: `Alternative per ${req.body.exerciseName}`,
                response: JSON.stringify(result).substring(0, 500)
            });

            res.json({ success: true, data: { suggestions: result } });
        } catch (error) {
            next(error);
        }
    }

    async answerClientQuestion(req, res, next) {
        try {
            if (!aiService.isConfigured()) {
                return res.status(503).json({ success: false, message: 'Servizio AI non configurato' });
            }

            const usage = await aiService.checkUsageLimit(req.user.tenantId);
            if (!usage.withinLimit) {
                return res.status(429).json({ success: false, message: 'Limite utilizzo AI raggiunto' });
            }

            const answer = await aiService.answerClientQuestion(req.body);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'client_question',
                prompt: req.body.question?.substring(0, 200),
                response: answer?.substring(0, 500)
            });

            res.json({ success: true, data: { answer } });
        } catch (error) {
            next(error);
        }
    }

    async generateMealPlan(req, res, next) {
        try {
            if (!aiService.isConfigured()) {
                return res.status(503).json({ success: false, message: 'Servizio AI non configurato' });
            }

            const usage = await aiService.checkUsageLimit(req.user.tenantId);
            if (!usage.withinLimit) {
                return res.status(429).json({ success: false, message: 'Limite utilizzo AI raggiunto' });
            }

            const mealPlan = await aiService.generateMealPlanDraft(req.body);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'meal_plan',
                prompt: `Piano per ${req.body.clientName || 'cliente'}`,
                response: 'Piano alimentare generato'
            });

            res.json({ success: true, data: { mealPlan } });
        } catch (error) {
            next(error);
        }
    }

    async analyzeProgress(req, res, next) {
        try {
            if (!aiService.isConfigured()) {
                return res.status(503).json({ success: false, message: 'Servizio AI non configurato' });
            }

            const analysis = await aiService.analyzeProgress(req.body);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'progress_analysis',
                prompt: `Analisi ${req.body.clientName || 'cliente'}`,
                response: analysis?.substring(0, 500)
            });

            res.json({ success: true, data: { analysis } });
        } catch (error) {
            next(error);
        }
    }

    async suggestWorkout(req, res, next) {
        try {
            if (!aiService.isConfigured()) {
                return res.status(503).json({ success: false, message: 'Servizio AI non configurato' });
            }

            const suggestion = await aiService.suggestWorkoutByReadiness(req.body);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'workout_suggestion',
                prompt: `Readiness: ${req.body.readinessScore}`,
                response: suggestion?.substring(0, 500)
            });

            res.json({ success: true, data: { suggestion } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AIController();
