/**
 * Tests for NutritionService
 * Meal plans CRUD, days, meals, items
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
const mockConnection = {
    execute: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
};
const mockGetPool = jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue(mockConnection)
}));
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn),
    getPool: () => mockGetPool()
}));

const nutritionService = require('../src/services/nutrition.service');

beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.execute.mockReset();
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
});

describe('NutritionService.getMealPlans', () => {
    test('returns meal plans list', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, name: 'Dieta Massa', client_id: 5 },
            { id: 2, name: 'Dieta Cut', client_id: 5 }
        ]);

        const result = await nutritionService.getMealPlans('tenant-1');
        expect(result).toHaveLength(2);
    });

    test('filters by clientId', async () => {
        mockQuery.mockResolvedValueOnce([]);
        await nutritionService.getMealPlans('tenant-1', { clientId: 5 });
        expect(mockQuery.mock.calls[0][0]).toContain('client_id = ?');
    });
});

describe('NutritionService.getMealPlanById', () => {
    test('returns plan with days, meals, and items', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Dieta Massa' }]) // plan
            .mockResolvedValueOnce([{ id: 1, day_number: 1, day_name: 'Lunedi' }]) // days
            .mockResolvedValueOnce([{ id: 1, plan_day_id: 1, meal_type: 'breakfast' }]) // meals for day 1
            .mockResolvedValueOnce([{ id: 1, meal_id: 1, food_name: 'Uova' }]); // items for meal 1

        const result = await nutritionService.getMealPlanById(1, 'tenant-1');
        expect(result.name).toBe('Dieta Massa');
        expect(result.days).toHaveLength(1);
    });

    test('returns null for non-existent plan', async () => {
        mockQuery.mockResolvedValueOnce([]);
        const result = await nutritionService.getMealPlanById(999, 'tenant-1');
        expect(result).toBeNull();
    });
});

describe('NutritionService.createMealPlan', () => {
    test('creates meal plan with nested days/meals/items', async () => {
        mockConnection.beginTransaction.mockResolvedValue();
        mockConnection.commit.mockResolvedValue();
        mockConnection.release.mockResolvedValue();
        mockConnection.execute
            .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT plan
            .mockResolvedValueOnce([{ insertId: 20 }]) // INSERT day
            .mockResolvedValueOnce([{ insertId: 30 }]) // INSERT meal
            .mockResolvedValueOnce([{}]); // INSERT item

        const result = await nutritionService.createMealPlan('tenant-1', {
            clientId: 5,
            name: 'Dieta Massa',
            targetCalories: 2500,
            days: [{
                dayNumber: 1,
                dayName: 'Lunedi',
                meals: [{
                    mealType: 'breakfast',
                    name: 'Colazione',
                    items: [{ foodName: 'Uova', calories: 150, proteinG: 12 }]
                }]
            }]
        }, 1);

        expect(result.id).toBe(10);
    });
});

describe('NutritionService.deleteMealPlan', () => {
    test('deletes meal plan', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 }); // DELETE

        const result = await nutritionService.deleteMealPlan(1, 'tenant-1');
        expect(result).toBe(true);
    });
});

describe('NutritionService.calculateDayNutrition', () => {
    test('calculates daily nutrition totals', async () => {
        mockQuery.mockResolvedValueOnce([
            { calories: 500, protein_g: '40', carbs_g: '50', fat_g: '20', fiber_g: '5' },
            { calories: 600, protein_g: '35', carbs_g: '60', fat_g: '25', fiber_g: '8' }
        ]);

        const result = await nutritionService.calculateDayNutrition(1, 'tenant-1');
        expect(result.calories).toBe(1100);
        expect(result.protein).toBe(75);
    });
});
