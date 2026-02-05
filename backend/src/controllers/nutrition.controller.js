/**
 * Nutrition Controller
 */

const nutritionService = require('../services/nutrition.service');

class NutritionController {
    // ==================== MEAL PLANS ====================

    async getMealPlans(req, res, next) {
        try {
            const options = {
                clientId: req.query.clientId ? parseInt(req.query.clientId) : null,
                status: req.query.status,
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0
            };
            const plans = await nutritionService.getMealPlans(req.user.tenantId, options);
            res.json({ success: true, data: { plans } });
        } catch (error) {
            next(error);
        }
    }

    async getMealPlanById(req, res, next) {
        try {
            const plan = await nutritionService.getMealPlanById(
                parseInt(req.params.planId),
                req.user.tenantId
            );
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Piano non trovato' });
            }
            res.json({ success: true, data: { plan } });
        } catch (error) {
            next(error);
        }
    }

    async createMealPlan(req, res, next) {
        try {
            const result = await nutritionService.createMealPlan(
                req.user.tenantId,
                req.body,
                req.user.id
            );
            res.status(201).json({ success: true, message: 'Piano creato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateMealPlan(req, res, next) {
        try {
            const result = await nutritionService.updateMealPlan(
                parseInt(req.params.planId),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, message: 'Piano aggiornato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteMealPlan(req, res, next) {
        try {
            const deleted = await nutritionService.deleteMealPlan(
                parseInt(req.params.planId),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Piano non trovato' });
            }
            res.json({ success: true, message: 'Piano eliminato' });
        } catch (error) {
            next(error);
        }
    }

    // ==================== PLAN DAYS ====================

    async addPlanDay(req, res, next) {
        try {
            const result = await nutritionService.addPlanDay(
                parseInt(req.params.planId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Giorno aggiunto', data: result });
        } catch (error) {
            next(error);
        }
    }

    async updatePlanDay(req, res, next) {
        try {
            const result = await nutritionService.updatePlanDay(
                parseInt(req.params.dayId),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, message: 'Giorno aggiornato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async deletePlanDay(req, res, next) {
        try {
            const deleted = await nutritionService.deletePlanDay(
                parseInt(req.params.dayId),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Giorno non trovato' });
            }
            res.json({ success: true, message: 'Giorno eliminato' });
        } catch (error) {
            next(error);
        }
    }

    // ==================== MEALS ====================

    async addMeal(req, res, next) {
        try {
            const result = await nutritionService.addMeal(
                parseInt(req.params.dayId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Pasto aggiunto', data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateMeal(req, res, next) {
        try {
            const result = await nutritionService.updateMeal(
                parseInt(req.params.mealId),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, message: 'Pasto aggiornato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteMeal(req, res, next) {
        try {
            const deleted = await nutritionService.deleteMeal(
                parseInt(req.params.mealId),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Pasto non trovato' });
            }
            res.json({ success: true, message: 'Pasto eliminato' });
        } catch (error) {
            next(error);
        }
    }

    // ==================== MEAL ITEMS ====================

    async addMealItem(req, res, next) {
        try {
            const result = await nutritionService.addMealItem(
                parseInt(req.params.mealId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Alimento aggiunto', data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateMealItem(req, res, next) {
        try {
            const result = await nutritionService.updateMealItem(
                parseInt(req.params.itemId),
                req.user.tenantId,
                req.body
            );
            res.json({ success: true, message: 'Alimento aggiornato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteMealItem(req, res, next) {
        try {
            const deleted = await nutritionService.deleteMealItem(
                parseInt(req.params.itemId),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Alimento non trovato' });
            }
            res.json({ success: true, message: 'Alimento eliminato' });
        } catch (error) {
            next(error);
        }
    }

    // ==================== STATS ====================

    async getClientNutritionSummary(req, res, next) {
        try {
            const summary = await nutritionService.getClientNutritionSummary(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    }

    async calculateDayNutrition(req, res, next) {
        try {
            const totals = await nutritionService.calculateDayNutrition(
                parseInt(req.params.dayId),
                req.user.tenantId
            );
            res.json({ success: true, data: { totals } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NutritionController();
