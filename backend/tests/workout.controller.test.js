/**
 * Tests for Workout Controller
 * getAll, getById, create, update, delete, duplicate
 */

// Mock dependencies
jest.mock('../src/services/workout.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    duplicate: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const workoutController = require('../src/controllers/workout.controller');
const workoutService = require('../src/services/workout.service');

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

describe('WorkoutController', () => {
    describe('getAll', () => {
        test('returns paginated list of workouts', async () => {
            const result = {
                workouts: [{ id: 1, name: 'Push Day' }],
                total: 1,
                page: 1,
                limit: 20
            };
            workoutService.getAll.mockResolvedValue(result);

            const req = mockReq({ query: { page: '1', limit: '20' } });
            const res = mockRes();

            await workoutController.getAll(req, res, mockNext);

            expect(workoutService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 1,
                limit: 20
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes filter options to service', async () => {
            workoutService.getAll.mockResolvedValue({ workouts: [], total: 0 });

            const req = mockReq({
                query: { category: 'strength', difficulty: 'advanced', search: 'push' }
            });
            const res = mockRes();

            await workoutController.getAll(req, res, mockNext);

            expect(workoutService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                category: 'strength',
                difficulty: 'advanced',
                search: 'push'
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            workoutService.getAll.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await workoutController.getAll(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single workout', async () => {
            const workout = { id: 5, name: 'Push Day', category: 'strength' };
            workoutService.getById.mockResolvedValue(workout);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await workoutController.getById(req, res, mockNext);

            expect(workoutService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { workout }
            });
        });

        test('calls next(error) when workout not found', async () => {
            const error = new Error('Workout not found');
            workoutService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await workoutController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        test('returns 201 with created workout', async () => {
            workoutService.create.mockResolvedValue({ templateId: 10 });
            const workout = { id: 10, name: 'New Workout' };
            workoutService.getById.mockResolvedValue(workout);

            const req = mockReq({
                body: { name: 'New Workout', category: 'strength', exercises: [] }
            });
            const res = mockRes();

            await workoutController.create(req, res, mockNext);

            expect(workoutService.create).toHaveBeenCalledWith('tenant-1', req.body, 1);
            expect(workoutService.getById).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Scheda creata',
                data: { workout }
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            workoutService.create.mockRejectedValue(error);

            const req = mockReq({ body: { name: '' } });
            const res = mockRes();

            await workoutController.create(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        test('returns updated workout data', async () => {
            workoutService.update.mockResolvedValue();
            const workout = { id: 5, name: 'Updated Workout' };
            workoutService.getById.mockResolvedValue(workout);

            const req = mockReq({
                params: { id: '5' },
                body: { name: 'Updated Workout' }
            });
            const res = mockRes();

            await workoutController.update(req, res, mockNext);

            expect(workoutService.update).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(workoutService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Scheda aggiornata',
                data: { workout }
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Not found');
            workoutService.update.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: {} });
            const res = mockRes();

            await workoutController.update(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('delete', () => {
        test('returns success message on deletion', async () => {
            workoutService.delete.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await workoutController.delete(req, res, mockNext);

            expect(workoutService.delete).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Scheda eliminata'
            });
        });

        test('calls next(error) when deletion fails', async () => {
            const error = new Error('Cannot delete');
            workoutService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await workoutController.delete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('duplicate', () => {
        test('returns 201 with duplicated workout', async () => {
            workoutService.duplicate.mockResolvedValue({ templateId: 15 });
            const workout = { id: 15, name: 'Push Day (Copy)' };
            workoutService.getById.mockResolvedValue(workout);

            const req = mockReq({
                params: { id: '5' },
                body: { name: 'Push Day (Copy)' }
            });
            const res = mockRes();

            await workoutController.duplicate(req, res, mockNext);

            expect(workoutService.duplicate).toHaveBeenCalledWith(5, 'tenant-1', 'Push Day (Copy)', 1);
            expect(workoutService.getById).toHaveBeenCalledWith(15, 'tenant-1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Scheda duplicata',
                data: { workout }
            });
        });

        test('calls next(error) when duplicate fails', async () => {
            const error = new Error('Template not found');
            workoutService.duplicate.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: { name: 'Copy' } });
            const res = mockRes();

            await workoutController.duplicate(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
