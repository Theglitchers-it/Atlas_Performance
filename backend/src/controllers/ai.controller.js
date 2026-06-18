/**
 * AI Controller
 */

const aiService = require('../services/ai.service');
const clientService = require('../services/client.service');
const { assertClientAccess } = require('../utils/clientAccess');

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

    async suggestExercisesForClient(req, res, next) {
        try {
            const { clientId, focus, equipmentAvailable, sessionDurationMin, count } = req.body;
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'clientId richiesto' });
            }

            await assertClientAccess(clientId, req.user.tenantId, req.user);

            const ctx = await clientService.getAIContext(clientId, req.user.tenantId, {
                includeInjuries: true
            });
            if (!ctx) {
                return res.status(404).json({ success: false, message: 'Cliente non trovato' });
            }

            const result = await aiService.suggestExercisesForClient(ctx, {
                focus: focus || 'strength',
                equipmentAvailable: equipmentAvailable || [],
                sessionDurationMin: sessionDurationMin || 60,
                count: count || 6
            });

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'suggest_exercises',
                prompt: `Cliente ${ctx.firstName}, focus: ${focus}`,
                response: JSON.stringify(result).substring(0, 500)
            });

            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async generateFollowUpMessage(req, res, next) {
        try {
            const { clientId, context = 'dormant' } = req.body;
            if (!clientId) {
                return res.status(400).json({ success: false, message: 'clientId richiesto' });
            }

            await assertClientAccess(clientId, req.user.tenantId, req.user);

            const ctx = await clientService.getAIContext(clientId, req.user.tenantId, {
                includeLifetime: true
            });
            if (!ctx) {
                return res.status(404).json({ success: false, message: 'Cliente non trovato' });
            }

            const result = await aiService.generateFollowUpMessage(ctx, context);

            await aiService.logInteraction(req.user.tenantId, req.user.id, {
                type: 'followup_message',
                prompt: `Cliente ${ctx.firstName}, context: ${context}`,
                response: JSON.stringify(result).substring(0, 500)
            });

            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AIController();
