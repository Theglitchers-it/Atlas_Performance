/**
 * Tests for Exercise Controller
 * getAll, getById, create, update, delete, getMuscleGroups, getCategories
 */

// Mock dependencies
jest.mock('../src/services/exercise.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getMuscleGroups: jest.fn(),
    getCategories: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const exerciseController = require('../src/controllers/exercise.controller');
const exerciseService = require('../src/services/exercise.service');

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

describe('ExerciseController', () => {
    describe('getAll', () => {
        test('returns paginated list of exercises', async () => {
            const result = {
                exercises: [{ id: 1, name: 'Bench Press' }],
                total: 1,
                page: 1,
                limit: 50
            };
            exerciseService.getAll.mockResolvedValue(result);

            const req = mockReq({ query: { page: '1', limit: '50' } });
            const res = mockRes();

            await exerciseController.getAll(req, res, mockNext);

            expect(exerciseService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 1,
                limit: 50
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes filter options including muscleGroup as integer', async () => {
            exerciseService.getAll.mockResolvedValue({ exercises: [], total: 0 });

            const req = mockReq({
                query: { category: 'strength', difficulty: 'advanced', muscleGroup: '3', search: 'bench' }
            });
            const res = mockRes();

            await exerciseController.getAll(req, res, mockNext);

            expect(exerciseService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                category: 'strength',
                difficulty: 'advanced',
                muscleGroup: 3,
                search: 'bench'
            }));
        });

        test('passes muscleGroup as null when not provided', async () => {
            exerciseService.getAll.mockResolvedValue({ exercises: [], total: 0 });

            const req = mockReq({ query: {} });
            const res = mockRes();

            await exerciseController.getAll(req, res, mockNext);

            expect(exerciseService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                muscleGroup: null
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            exerciseService.getAll.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await exerciseController.getAll(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single exercise', async () => {
            const exercise = { id: 5, name: 'Squat', category: 'strength' };
            exerciseService.getById.mockResolvedValue(exercise);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await exerciseController.getById(req, res, mockNext);

            expect(exerciseService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { exercise }
            });
        });

        test('calls next(error) when exercise not found', async () => {
            const error = new Error('Exercise not found');
            exerciseService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await exerciseController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        test('returns 201 with created exercise', async () => {
            const exercise = { id: 10, name: 'Hip Thrust', category: 'strength' };
            exerciseService.create.mockResolvedValue(exercise);

            const req = mockReq({
                body: { name: 'Hip Thrust', category: 'strength', description: 'Glute exercise' }
            });
            const res = mockRes();

            await exerciseController.create(req, res, mockNext);

            expect(exerciseService.create).toHaveBeenCalledWith('tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Esercizio creato',
                data: { exercise }
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            exerciseService.create.mockRejectedValue(error);

            const req = mockReq({ body: { name: '' } });
            const res = mockRes();

            await exerciseController.create(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        test('returns updated exercise data', async () => {
            const exercise = { id: 5, name: 'Updated Squat' };
            exerciseService.update.mockResolvedValue(exercise);

            const req = mockReq({
                params: { id: '5' },
                body: { name: 'Updated Squat' }
            });
            const res = mockRes();

            await exerciseController.update(req, res, mockNext);

            expect(exerciseService.update).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Esercizio aggiornato',
                data: { exercise }
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Not found');
            exerciseService.update.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: {} });
            const res = mockRes();

            await exerciseController.update(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('delete', () => {
        test('returns success message on deletion', async () => {
            exerciseService.delete.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await exerciseController.delete(req, res, mockNext);

            expect(exerciseService.delete).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Esercizio eliminato'
            });
        });

        test('calls next(error) when deletion fails', async () => {
            const error = new Error('Cannot delete');
            exerciseService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await exerciseController.delete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getMuscleGroups', () => {
        test('returns list of muscle groups', async () => {
            const muscleGroups = [
                { id: 1, name: 'Chest', category: 'upper' },
                { id: 2, name: 'Back', category: 'upper' }
            ];
            exerciseService.getMuscleGroups.mockResolvedValue(muscleGroups);

            const req = mockReq();
            const res = mockRes();

            await exerciseController.getMuscleGroups(req, res, mockNext);

            expect(exerciseService.getMuscleGroups).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { muscleGroups }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            exerciseService.getMuscleGroups.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await exerciseController.getMuscleGroups(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getCategories', () => {
        test('returns list of exercise categories', async () => {
            const categories = [
                { value: 'strength', label: 'Forza' },
                { value: 'cardio', label: 'Cardio' }
            ];
            exerciseService.getCategories.mockReturnValue(categories);

            const req = mockReq();
            const res = mockRes();

            await exerciseController.getCategories(req, res, mockNext);

            expect(exerciseService.getCategories).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { categories }
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Unexpected error');
            exerciseService.getCategories.mockImplementation(() => { throw error; });

            const req = mockReq();
            const res = mockRes();

            await exerciseController.getCategories(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
