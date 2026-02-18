/**
 * Tests for Nutrition Controller
 * getMealPlans, getMealPlanById, createMealPlan, updateMealPlan, deleteMealPlan,
 * addPlanDay, updatePlanDay, deletePlanDay,
 * addMeal, updateMeal, deleteMeal,
 * addMealItem, updateMealItem, deleteMealItem,
 * getClientNutritionSummary, calculateDayNutrition
 */

// Mock dependencies
jest.mock('../src/services/nutrition.service', () => ({
    getMealPlans: jest.fn(),
    getMealPlanById: jest.fn(),
    createMealPlan: jest.fn(),
    updateMealPlan: jest.fn(),
    deleteMealPlan: jest.fn(),
    addPlanDay: jest.fn(),
    updatePlanDay: jest.fn(),
    deletePlanDay: jest.fn(),
    addMeal: jest.fn(),
    updateMeal: jest.fn(),
    deleteMeal: jest.fn(),
    addMealItem: jest.fn(),
    updateMealItem: jest.fn(),
    deleteMealItem: jest.fn(),
    getClientNutritionSummary: jest.fn(),
    calculateDayNutrition: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const nutritionController = require('../src/controllers/nutrition.controller');
const nutritionService = require('../src/services/nutrition.service');

// Test helpers
const mockReq = (overrides = {}) => ({
    user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
    params: {},
    query: {},
    body: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('NutritionController', () => {
    // ==================== MEAL PLANS ====================

    describe('getMealPlans', () => {
        test('returns list of meal plans', async () => {
            const plans = [{ id: 1, name: 'Cutting Plan' }];
            nutritionService.getMealPlans.mockResolvedValue(plans);

            const req = mockReq({ query: { limit: '10', offset: '0' } });
            const res = mockRes();

            await nutritionController.getMealPlans(req, res, mockNext);

            expect(nutritionService.getMealPlans).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                limit: 10,
                offset: 0
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { plans }
            });
        });

        test('passes clientId filter as integer', async () => {
            nutritionService.getMealPlans.mockResolvedValue([]);

            const req = mockReq({ query: { clientId: '5', status: 'active' } });
            const res = mockRes();

            await nutritionController.getMealPlans(req, res, mockNext);

            expect(nutritionService.getMealPlans).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                clientId: 5,
                status: 'active'
            }));
        });

        test('passes clientId as null when not provided', async () => {
            nutritionService.getMealPlans.mockResolvedValue([]);

            const req = mockReq({ query: {} });
            const res = mockRes();

            await nutritionController.getMealPlans(req, res, mockNext);

            expect(nutritionService.getMealPlans).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                clientId: null
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            nutritionService.getMealPlans.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await nutritionController.getMealPlans(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getMealPlanById', () => {
        test('returns a single meal plan', async () => {
            const plan = { id: 5, name: 'Bulking Plan', days: [] };
            nutritionService.getMealPlanById.mockResolvedValue(plan);

            const req = mockReq({ params: { planId: '5' } });
            const res = mockRes();

            await nutritionController.getMealPlanById(req, res, mockNext);

            expect(nutritionService.getMealPlanById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { plan }
            });
        });

        test('returns 404 when plan is not found', async () => {
            nutritionService.getMealPlanById.mockResolvedValue(null);

            const req = mockReq({ params: { planId: '999' } });
            const res = mockRes();

            await nutritionController.getMealPlanById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Piano non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            nutritionService.getMealPlanById.mockRejectedValue(error);

            const req = mockReq({ params: { planId: '5' } });
            const res = mockRes();

            await nutritionController.getMealPlanById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createMealPlan', () => {
        test('returns 201 with created plan', async () => {
            const result = { planId: 10, name: 'New Plan' };
            nutritionService.createMealPlan.mockResolvedValue(result);

            const req = mockReq({
                body: { clientId: 3, name: 'New Plan', dailyCalories: 2500 }
            });
            const res = mockRes();

            await nutritionController.createMealPlan(req, res, mockNext);

            expect(nutritionService.createMealPlan).toHaveBeenCalledWith('tenant-1', req.body, 1);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Piano creato',
                data: result
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            nutritionService.createMealPlan.mockRejectedValue(error);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await nutritionController.createMealPlan(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateMealPlan', () => {
        test('returns updated plan', async () => {
            const result = { planId: 5, name: 'Updated Plan' };
            nutritionService.updateMealPlan.mockResolvedValue(result);

            const req = mockReq({
                params: { planId: '5' },
                body: { name: 'Updated Plan' }
            });
            const res = mockRes();

            await nutritionController.updateMealPlan(req, res, mockNext);

            expect(nutritionService.updateMealPlan).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Piano aggiornato',
                data: result
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Not found');
            nutritionService.updateMealPlan.mockRejectedValue(error);

            const req = mockReq({ params: { planId: '999' }, body: {} });
            const res = mockRes();

            await nutritionController.updateMealPlan(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('deleteMealPlan', () => {
        test('returns success message when plan deleted', async () => {
            nutritionService.deleteMealPlan.mockResolvedValue(true);

            const req = mockReq({ params: { planId: '5' } });
            const res = mockRes();

            await nutritionController.deleteMealPlan(req, res, mockNext);

            expect(nutritionService.deleteMealPlan).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Piano eliminato'
            });
        });

        test('returns 404 when plan not found for deletion', async () => {
            nutritionService.deleteMealPlan.mockResolvedValue(false);

            const req = mockReq({ params: { planId: '999' } });
            const res = mockRes();

            await nutritionController.deleteMealPlan(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Piano non trovato'
            });
        });
    });

    // ==================== PLAN DAYS ====================

    describe('addPlanDay', () => {
        test('returns 201 with added day', async () => {
            const result = { dayId: 1, dayNumber: 1, name: 'Monday' };
            nutritionService.addPlanDay.mockResolvedValue(result);

            const req = mockReq({
                params: { planId: '5' },
                body: { dayNumber: 1, name: 'Monday' }
            });
            const res = mockRes();

            await nutritionController.addPlanDay(req, res, mockNext);

            expect(nutritionService.addPlanDay).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Giorno aggiunto',
                data: result
            });
        });

        test('calls next(error) when adding day fails', async () => {
            const error = new Error('Plan not found');
            nutritionService.addPlanDay.mockRejectedValue(error);

            const req = mockReq({ params: { planId: '5' }, body: {} });
            const res = mockRes();

            await nutritionController.addPlanDay(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updatePlanDay', () => {
        test('returns updated day', async () => {
            const result = { dayId: 2, name: 'Updated Day' };
            nutritionService.updatePlanDay.mockResolvedValue(result);

            const req = mockReq({
                params: { dayId: '2' },
                body: { name: 'Updated Day' }
            });
            const res = mockRes();

            await nutritionController.updatePlanDay(req, res, mockNext);

            expect(nutritionService.updatePlanDay).toHaveBeenCalledWith(2, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Giorno aggiornato',
                data: result
            });
        });
    });

    describe('deletePlanDay', () => {
        test('returns success when day deleted', async () => {
            nutritionService.deletePlanDay.mockResolvedValue(true);

            const req = mockReq({ params: { dayId: '2' } });
            const res = mockRes();

            await nutritionController.deletePlanDay(req, res, mockNext);

            expect(nutritionService.deletePlanDay).toHaveBeenCalledWith(2, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Giorno eliminato'
            });
        });

        test('returns 404 when day not found', async () => {
            nutritionService.deletePlanDay.mockResolvedValue(false);

            const req = mockReq({ params: { dayId: '999' } });
            const res = mockRes();

            await nutritionController.deletePlanDay(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Giorno non trovato'
            });
        });
    });

    // ==================== MEALS ====================

    describe('addMeal', () => {
        test('returns 201 with added meal', async () => {
            const result = { mealId: 1, name: 'Breakfast' };
            nutritionService.addMeal.mockResolvedValue(result);

            const req = mockReq({
                params: { dayId: '2' },
                body: { name: 'Breakfast', time: '08:00' }
            });
            const res = mockRes();

            await nutritionController.addMeal(req, res, mockNext);

            expect(nutritionService.addMeal).toHaveBeenCalledWith(2, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Pasto aggiunto',
                data: result
            });
        });

        test('calls next(error) when adding meal fails', async () => {
            const error = new Error('Day not found');
            nutritionService.addMeal.mockRejectedValue(error);

            const req = mockReq({ params: { dayId: '2' }, body: {} });
            const res = mockRes();

            await nutritionController.addMeal(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateMeal', () => {
        test('returns updated meal', async () => {
            const result = { mealId: 3, name: 'Lunch Updated' };
            nutritionService.updateMeal.mockResolvedValue(result);

            const req = mockReq({
                params: { mealId: '3' },
                body: { name: 'Lunch Updated' }
            });
            const res = mockRes();

            await nutritionController.updateMeal(req, res, mockNext);

            expect(nutritionService.updateMeal).toHaveBeenCalledWith(3, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Pasto aggiornato',
                data: result
            });
        });
    });

    describe('deleteMeal', () => {
        test('returns success when meal deleted', async () => {
            nutritionService.deleteMeal.mockResolvedValue(true);

            const req = mockReq({ params: { mealId: '3' } });
            const res = mockRes();

            await nutritionController.deleteMeal(req, res, mockNext);

            expect(nutritionService.deleteMeal).toHaveBeenCalledWith(3, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Pasto eliminato'
            });
        });

        test('returns 404 when meal not found', async () => {
            nutritionService.deleteMeal.mockResolvedValue(false);

            const req = mockReq({ params: { mealId: '999' } });
            const res = mockRes();

            await nutritionController.deleteMeal(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Pasto non trovato'
            });
        });
    });

    // ==================== MEAL ITEMS ====================

    describe('addMealItem', () => {
        test('returns 201 with added meal item', async () => {
            const result = { itemId: 1, name: 'Chicken Breast', quantity: 200 };
            nutritionService.addMealItem.mockResolvedValue(result);

            const req = mockReq({
                params: { mealId: '3' },
                body: { name: 'Chicken Breast', quantity: 200, unit: 'g' }
            });
            const res = mockRes();

            await nutritionController.addMealItem(req, res, mockNext);

            expect(nutritionService.addMealItem).toHaveBeenCalledWith(3, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Alimento aggiunto',
                data: result
            });
        });

        test('calls next(error) when adding item fails', async () => {
            const error = new Error('Meal not found');
            nutritionService.addMealItem.mockRejectedValue(error);

            const req = mockReq({ params: { mealId: '3' }, body: {} });
            const res = mockRes();

            await nutritionController.addMealItem(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateMealItem', () => {
        test('returns updated meal item', async () => {
            const result = { itemId: 1, quantity: 250 };
            nutritionService.updateMealItem.mockResolvedValue(result);

            const req = mockReq({
                params: { itemId: '1' },
                body: { quantity: 250 }
            });
            const res = mockRes();

            await nutritionController.updateMealItem(req, res, mockNext);

            expect(nutritionService.updateMealItem).toHaveBeenCalledWith(1, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Alimento aggiornato',
                data: result
            });
        });
    });

    describe('deleteMealItem', () => {
        test('returns success when item deleted', async () => {
            nutritionService.deleteMealItem.mockResolvedValue(true);

            const req = mockReq({ params: { itemId: '1' } });
            const res = mockRes();

            await nutritionController.deleteMealItem(req, res, mockNext);

            expect(nutritionService.deleteMealItem).toHaveBeenCalledWith(1, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Alimento eliminato'
            });
        });

        test('returns 404 when item not found', async () => {
            nutritionService.deleteMealItem.mockResolvedValue(false);

            const req = mockReq({ params: { itemId: '999' } });
            const res = mockRes();

            await nutritionController.deleteMealItem(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Alimento non trovato'
            });
        });
    });

    // ==================== STATS ====================

    describe('getClientNutritionSummary', () => {
        test('returns client nutrition summary', async () => {
            const summary = { averageCalories: 2200, averageProtein: 150 };
            nutritionService.getClientNutritionSummary.mockResolvedValue(summary);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await nutritionController.getClientNutritionSummary(req, res, mockNext);

            expect(nutritionService.getClientNutritionSummary).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: summary
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            nutritionService.getClientNutritionSummary.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await nutritionController.getClientNutritionSummary(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('calculateDayNutrition', () => {
        test('returns daily nutrition totals', async () => {
            const totals = { calories: 2500, protein: 180, carbs: 300, fat: 80 };
            nutritionService.calculateDayNutrition.mockResolvedValue(totals);

            const req = mockReq({ params: { dayId: '2' } });
            const res = mockRes();

            await nutritionController.calculateDayNutrition(req, res, mockNext);

            expect(nutritionService.calculateDayNutrition).toHaveBeenCalledWith(2, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { totals }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            nutritionService.calculateDayNutrition.mockRejectedValue(error);

            const req = mockReq({ params: { dayId: '2' } });
            const res = mockRes();

            await nutritionController.calculateDayNutrition(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
