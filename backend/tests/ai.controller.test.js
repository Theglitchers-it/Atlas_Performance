/**
 * Tests for AI Controller
 * getStatus, suggestAlternativeExercises, answerClientQuestion,
 * generateMealPlan, analyzeProgress, suggestWorkout
 */

// Mock dependencies
jest.mock('../src/services/ai.service', () => ({
    isConfigured: jest.fn(),
    checkUsageLimit: jest.fn(),
    suggestAlternativeExercises: jest.fn(),
    logInteraction: jest.fn(),
    answerClientQuestion: jest.fn(),
    generateMealPlanDraft: jest.fn(),
    analyzeProgress: jest.fn(),
    suggestWorkoutByReadiness: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const aiController = require('../src/controllers/ai.controller');
const aiService = require('../src/services/ai.service');

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

describe('AIController', () => {
    describe('getStatus', () => {
        test('returns configured status and usage data', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true, used: 5, limit: 100 });

            const req = mockReq();
            const res = mockRes();

            await aiController.getStatus(req, res, mockNext);

            expect(aiService.isConfigured).toHaveBeenCalled();
            expect(aiService.checkUsageLimit).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    configured: true,
                    usage: { withinLimit: true, used: 5, limit: 100 }
                }
            });
        });

        test('returns configured false when AI is not set up', async () => {
            aiService.isConfigured.mockReturnValue(false);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true, used: 0, limit: 100 });

            const req = mockReq();
            const res = mockRes();

            await aiController.getStatus(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    configured: false,
                    usage: { withinLimit: true, used: 0, limit: 100 }
                }
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Service down');
            aiService.isConfigured.mockImplementation(() => { throw error; });

            const req = mockReq();
            const res = mockRes();

            await aiController.getStatus(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('suggestAlternativeExercises', () => {
        test('returns suggestions when AI is configured and within limit', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true });
            const suggestions = [{ name: 'Push-up', reason: 'Similar muscle group' }];
            aiService.suggestAlternativeExercises.mockResolvedValue(suggestions);
            aiService.logInteraction.mockResolvedValue();

            const req = mockReq({ body: { exerciseName: 'Bench Press' } });
            const res = mockRes();

            await aiController.suggestAlternativeExercises(req, res, mockNext);

            expect(aiService.suggestAlternativeExercises).toHaveBeenCalledWith({ exerciseName: 'Bench Press' });
            expect(aiService.logInteraction).toHaveBeenCalledWith('tenant-1', 1, expect.objectContaining({
                type: 'alternative_exercises'
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { suggestions }
            });
        });

        test('returns 503 when AI is not configured', async () => {
            aiService.isConfigured.mockReturnValue(false);

            const req = mockReq({ body: { exerciseName: 'Bench Press' } });
            const res = mockRes();

            await aiController.suggestAlternativeExercises(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Servizio AI non configurato'
            });
        });

        test('returns 429 when usage limit exceeded', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: false });

            const req = mockReq({ body: { exerciseName: 'Bench Press' } });
            const res = mockRes();

            await aiController.suggestAlternativeExercises(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(429);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Limite utilizzo AI raggiunto per questo mese'
            });
        });

        test('calls next(error) on service failure', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true });
            const error = new Error('AI API error');
            aiService.suggestAlternativeExercises.mockRejectedValue(error);

            const req = mockReq({ body: { exerciseName: 'Bench Press' } });
            const res = mockRes();

            await aiController.suggestAlternativeExercises(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('answerClientQuestion', () => {
        test('returns answer when configured and within limit', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true });
            aiService.answerClientQuestion.mockResolvedValue('You should rest for 48h between sessions.');
            aiService.logInteraction.mockResolvedValue();

            const req = mockReq({ body: { question: 'How long should I rest?' } });
            const res = mockRes();

            await aiController.answerClientQuestion(req, res, mockNext);

            expect(aiService.answerClientQuestion).toHaveBeenCalledWith({ question: 'How long should I rest?' });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { answer: 'You should rest for 48h between sessions.' }
            });
        });

        test('returns 503 when AI is not configured', async () => {
            aiService.isConfigured.mockReturnValue(false);

            const req = mockReq({ body: { question: 'Test' } });
            const res = mockRes();

            await aiController.answerClientQuestion(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(503);
        });

        test('returns 429 when usage limit exceeded', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: false });

            const req = mockReq({ body: { question: 'Test' } });
            const res = mockRes();

            await aiController.answerClientQuestion(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(429);
        });
    });

    describe('generateMealPlan', () => {
        test('returns meal plan on success', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true });
            const mealPlan = { meals: [{ name: 'Breakfast', calories: 400 }] };
            aiService.generateMealPlanDraft.mockResolvedValue(mealPlan);
            aiService.logInteraction.mockResolvedValue();

            const req = mockReq({ body: { clientName: 'Mario', calories: 2000 } });
            const res = mockRes();

            await aiController.generateMealPlan(req, res, mockNext);

            expect(aiService.generateMealPlanDraft).toHaveBeenCalledWith({ clientName: 'Mario', calories: 2000 });
            expect(aiService.logInteraction).toHaveBeenCalledWith('tenant-1', 1, expect.objectContaining({
                type: 'meal_plan',
                prompt: 'Piano per Mario'
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { mealPlan }
            });
        });

        test('calls next(error) on service failure', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.checkUsageLimit.mockResolvedValue({ withinLimit: true });
            const error = new Error('Generation failed');
            aiService.generateMealPlanDraft.mockRejectedValue(error);

            const req = mockReq({ body: { clientName: 'Mario' } });
            const res = mockRes();

            await aiController.generateMealPlan(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('analyzeProgress', () => {
        test('returns analysis without checking usage limit', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.analyzeProgress.mockResolvedValue('Client is making good progress.');
            aiService.logInteraction.mockResolvedValue();

            const req = mockReq({ body: { clientName: 'Luigi' } });
            const res = mockRes();

            await aiController.analyzeProgress(req, res, mockNext);

            expect(aiService.analyzeProgress).toHaveBeenCalledWith({ clientName: 'Luigi' });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { analysis: 'Client is making good progress.' }
            });
        });

        test('returns 503 when AI is not configured', async () => {
            aiService.isConfigured.mockReturnValue(false);

            const req = mockReq({ body: { clientName: 'Luigi' } });
            const res = mockRes();

            await aiController.analyzeProgress(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Servizio AI non configurato'
            });
        });
    });

    describe('suggestWorkout', () => {
        test('returns workout suggestion based on readiness', async () => {
            aiService.isConfigured.mockReturnValue(true);
            aiService.suggestWorkoutByReadiness.mockResolvedValue('Light cardio recommended.');
            aiService.logInteraction.mockResolvedValue();

            const req = mockReq({ body: { readinessScore: 6 } });
            const res = mockRes();

            await aiController.suggestWorkout(req, res, mockNext);

            expect(aiService.suggestWorkoutByReadiness).toHaveBeenCalledWith({ readinessScore: 6 });
            expect(aiService.logInteraction).toHaveBeenCalledWith('tenant-1', 1, expect.objectContaining({
                type: 'workout_suggestion',
                prompt: 'Readiness: 6'
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { suggestion: 'Light cardio recommended.' }
            });
        });

        test('returns 503 when AI is not configured', async () => {
            aiService.isConfigured.mockReturnValue(false);

            const req = mockReq({ body: { readinessScore: 8 } });
            const res = mockRes();

            await aiController.suggestWorkout(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(503);
        });

        test('calls next(error) on service failure', async () => {
            aiService.isConfigured.mockReturnValue(true);
            const error = new Error('Readiness analysis failed');
            aiService.suggestWorkoutByReadiness.mockRejectedValue(error);

            const req = mockReq({ body: { readinessScore: 8 } });
            const res = mockRes();

            await aiController.suggestWorkout(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
