/**
 * Nutrition Routes
 */

const express = require('express');
const router = express.Router();

const nutritionController = require('../controllers/nutrition.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

// ==================== MEAL PLANS ====================

// GET /api/nutrition/plans - Lista piani alimentari
router.get('/plans', nutritionController.getMealPlans);

// GET /api/nutrition/plans/:planId - Dettaglio piano
router.get('/plans/:planId', nutritionController.getMealPlanById);

// POST /api/nutrition/plans - Crea piano
router.post('/plans', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.createMealPlan);

// PUT /api/nutrition/plans/:planId - Aggiorna piano
router.put('/plans/:planId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updateMealPlan);

// DELETE /api/nutrition/plans/:planId - Elimina piano
router.delete('/plans/:planId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deleteMealPlan);

// ==================== PLAN DAYS ====================

// POST /api/nutrition/plans/:planId/days - Aggiungi giorno
router.post('/plans/:planId/days', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.addPlanDay);

// PUT /api/nutrition/days/:dayId - Aggiorna giorno
router.put('/days/:dayId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updatePlanDay);

// DELETE /api/nutrition/days/:dayId - Elimina giorno
router.delete('/days/:dayId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deletePlanDay);

// GET /api/nutrition/days/:dayId/totals - Calcola nutrienti giorno
router.get('/days/:dayId/totals', nutritionController.calculateDayNutrition);

// ==================== MEALS ====================

// POST /api/nutrition/days/:dayId/meals - Aggiungi pasto
router.post('/days/:dayId/meals', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.addMeal);

// PUT /api/nutrition/meals/:mealId - Aggiorna pasto
router.put('/meals/:mealId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updateMeal);

// DELETE /api/nutrition/meals/:mealId - Elimina pasto
router.delete('/meals/:mealId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deleteMeal);

// ==================== MEAL ITEMS ====================

// POST /api/nutrition/meals/:mealId/items - Aggiungi alimento
router.post('/meals/:mealId/items', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.addMealItem);

// PUT /api/nutrition/items/:itemId - Aggiorna alimento
router.put('/items/:itemId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.updateMealItem);

// DELETE /api/nutrition/items/:itemId - Elimina alimento
router.delete('/items/:itemId', requireRole('tenant_owner', 'staff', 'super_admin'), nutritionController.deleteMealItem);

// ==================== CLIENT SUMMARY ====================

// GET /api/nutrition/clients/:clientId/summary - Riepilogo nutrizione cliente
router.get('/clients/:clientId/summary', nutritionController.getClientNutritionSummary);

module.exports = router;
