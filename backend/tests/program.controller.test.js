/**
 * Tests for Program Controller
 * getAll, getById, create, update, delete, updateStatus, addWorkout, removeWorkout
 */

// Mock dependencies
jest.mock('../src/services/program.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
    addWorkout: jest.fn(),
    removeWorkout: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const programController = require('../src/controllers/program.controller');
const programService = require('../src/services/program.service');

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

describe('ProgramController', () => {
    describe('getAll', () => {
        test('returns paginated list of programs', async () => {
            const result = {
                programs: [{ id: 1, name: 'Forza Base' }],
                total: 1,
                page: 1,
                limit: 20
            };
            programService.getAll.mockResolvedValue(result);

            const req = mockReq({ query: { page: '2', limit: '10' } });
            const res = mockRes();

            await programController.getAll(req, res, mockNext);

            expect(programService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 2,
                limit: 10
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes clientId and status filters to service', async () => {
            programService.getAll.mockResolvedValue({ programs: [], total: 0 });

            const req = mockReq({
                query: { clientId: '7', status: 'active' }
            });
            const res = mockRes();

            await programController.getAll(req, res, mockNext);

            expect(programService.getAll).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                clientId: 7,
                status: 'active'
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            programService.getAll.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await programController.getAll(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single program', async () => {
            const program = { id: 3, name: 'Ipertrofia Avanzata' };
            programService.getById.mockResolvedValue(program);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await programController.getById(req, res, mockNext);

            expect(programService.getById).toHaveBeenCalledWith(3, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { program }
            });
        });

        test('returns 404 when program not found', async () => {
            programService.getById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await programController.getById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Programma non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            programService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await programController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        test('returns 201 with created program', async () => {
            const result = { programId: 10, name: 'Nuovo Programma' };
            programService.create.mockResolvedValue(result);

            const req = mockReq({
                body: { name: 'Nuovo Programma', duration: 8 }
            });
            const res = mockRes();

            await programController.create(req, res, mockNext);

            expect(programService.create).toHaveBeenCalledWith('tenant-1', 1, req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Programma creato',
                data: result
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            programService.create.mockRejectedValue(error);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await programController.create(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        test('returns updated program', async () => {
            const program = { id: 5, name: 'Updated Program' };
            programService.update.mockResolvedValue(program);

            const req = mockReq({
                params: { id: '5' },
                body: { name: 'Updated Program' }
            });
            const res = mockRes();

            await programController.update(req, res, mockNext);

            expect(programService.update).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Programma aggiornato',
                data: { program }
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Not found');
            programService.update.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, body: {} });
            const res = mockRes();

            await programController.update(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('delete', () => {
        test('returns success message on deletion', async () => {
            programService.delete.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await programController.delete(req, res, mockNext);

            expect(programService.delete).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Programma eliminato'
            });
        });

        test('returns 404 when program to delete not found', async () => {
            programService.delete.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await programController.delete(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Programma non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('FK constraint');
            programService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await programController.delete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateStatus', () => {
        test('returns updated program with new status', async () => {
            const program = { id: 3, status: 'active' };
            programService.updateStatus.mockResolvedValue(program);

            const req = mockReq({
                params: { id: '3' },
                body: { status: 'active' }
            });
            const res = mockRes();

            await programController.updateStatus(req, res, mockNext);

            expect(programService.updateStatus).toHaveBeenCalledWith(3, 'tenant-1', 'active');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Stato aggiornato',
                data: { program }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Invalid status');
            programService.updateStatus.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' }, body: { status: 'invalid' } });
            const res = mockRes();

            await programController.updateStatus(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('addWorkout', () => {
        test('returns 201 with added workout', async () => {
            const result = { workoutId: 20, programId: 3 };
            programService.addWorkout.mockResolvedValue(result);

            const req = mockReq({
                params: { id: '3' },
                body: { name: 'Upper Body', day: 1 }
            });
            const res = mockRes();

            await programController.addWorkout(req, res, mockNext);

            expect(programService.addWorkout).toHaveBeenCalledWith(3, req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Workout aggiunto',
                data: result
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Program not found');
            programService.addWorkout.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' }, body: {} });
            const res = mockRes();

            await programController.addWorkout(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('removeWorkout', () => {
        test('returns success message on removal', async () => {
            programService.removeWorkout.mockResolvedValue(true);

            const req = mockReq({ params: { id: '3', workoutId: '20' } });
            const res = mockRes();

            await programController.removeWorkout(req, res, mockNext);

            expect(programService.removeWorkout).toHaveBeenCalledWith(20, 3);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Workout rimosso'
            });
        });

        test('returns 404 when workout not found', async () => {
            programService.removeWorkout.mockResolvedValue(false);

            const req = mockReq({ params: { id: '3', workoutId: '999' } });
            const res = mockRes();

            await programController.removeWorkout(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Workout non trovato'
            });
        });
    });
});
