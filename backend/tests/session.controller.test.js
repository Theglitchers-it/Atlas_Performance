/**
 * Tests for Session Controller
 * getByClient, getById, start, logSet, complete, skip, getStats
 */

// Mock dependencies
jest.mock('../src/services/session.service', () => ({
    getByClient: jest.fn(),
    getById: jest.fn(),
    start: jest.fn(),
    logSet: jest.fn(),
    complete: jest.fn(),
    skip: jest.fn(),
    getStats: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const sessionController = require('../src/controllers/session.controller');
const sessionService = require('../src/services/session.service');

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

describe('SessionController', () => {
    describe('getByClient', () => {
        test('returns paginated sessions for a client', async () => {
            const result = {
                sessions: [{ id: 1, status: 'completed' }],
                total: 1,
                page: 1,
                limit: 20
            };
            sessionService.getByClient.mockResolvedValue(result);

            const req = mockReq({
                params: { clientId: '10' },
                query: { page: '1', limit: '20' }
            });
            const res = mockRes();

            await sessionController.getByClient(req, res, mockNext);

            expect(sessionService.getByClient).toHaveBeenCalledWith(10, 'tenant-1', expect.objectContaining({
                page: 1,
                limit: 20
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes filter options to service', async () => {
            sessionService.getByClient.mockResolvedValue({ sessions: [], total: 0 });

            const req = mockReq({
                params: { clientId: '10' },
                query: { status: 'completed', startDate: '2025-01-01', endDate: '2025-12-31' }
            });
            const res = mockRes();

            await sessionController.getByClient(req, res, mockNext);

            expect(sessionService.getByClient).toHaveBeenCalledWith(10, 'tenant-1', expect.objectContaining({
                status: 'completed',
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            sessionService.getByClient.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await sessionController.getByClient(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single session', async () => {
            const session = { id: 5, status: 'in_progress', template_name: 'Push Pull' };
            sessionService.getById.mockResolvedValue(session);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await sessionController.getById(req, res, mockNext);

            expect(sessionService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { session }
            });
        });

        test('calls next(error) when session not found', async () => {
            const error = new Error('Session not found');
            sessionService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await sessionController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('start', () => {
        test('returns 201 with started session', async () => {
            sessionService.start.mockResolvedValue({ sessionId: 20 });
            const session = { id: 20, status: 'in_progress' };
            sessionService.getById.mockResolvedValue(session);

            const req = mockReq({
                body: { clientId: 10, templateId: 3 }
            });
            const res = mockRes();

            await sessionController.start(req, res, mockNext);

            expect(sessionService.start).toHaveBeenCalledWith('tenant-1', req.body);
            expect(sessionService.getById).toHaveBeenCalledWith(20, 'tenant-1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sessione iniziata',
                data: { session }
            });
        });

        test('calls next(error) when start fails', async () => {
            const error = new Error('Invalid template');
            sessionService.start.mockRejectedValue(error);

            const req = mockReq({ body: { clientId: 10 } });
            const res = mockRes();

            await sessionController.start(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('logSet', () => {
        test('returns logged set data', async () => {
            const result = { setId: 1, reps: 10, weight: 80 };
            sessionService.logSet.mockResolvedValue(result);

            const req = mockReq({
                params: { id: '5' },
                body: { exerciseId: 2, reps: 10, weight: 80 }
            });
            const res = mockRes();

            await sessionController.logSet(req, res, mockNext);

            expect(sessionService.logSet).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('calls next(error) when logSet fails', async () => {
            const error = new Error('Session not active');
            sessionService.logSet.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, body: {} });
            const res = mockRes();

            await sessionController.logSet(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('complete', () => {
        test('returns completed session', async () => {
            const session = { id: 5, status: 'completed', duration: 3600 };
            sessionService.complete.mockResolvedValue(session);

            const req = mockReq({
                params: { id: '5' },
                body: { notes: 'Great workout' }
            });
            const res = mockRes();

            await sessionController.complete(req, res, mockNext);

            expect(sessionService.complete).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sessione completata',
                data: { session }
            });
        });

        test('calls next(error) when complete fails', async () => {
            const error = new Error('Already completed');
            sessionService.complete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, body: {} });
            const res = mockRes();

            await sessionController.complete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('skip', () => {
        test('returns success message when session skipped', async () => {
            sessionService.skip.mockResolvedValue();

            const req = mockReq({
                params: { id: '5' },
                body: { reason: 'Injury' }
            });
            const res = mockRes();

            await sessionController.skip(req, res, mockNext);

            expect(sessionService.skip).toHaveBeenCalledWith(5, 'tenant-1', 'Injury');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sessione saltata'
            });
        });

        test('calls next(error) when skip fails', async () => {
            const error = new Error('Cannot skip');
            sessionService.skip.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, body: {} });
            const res = mockRes();

            await sessionController.skip(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getStats', () => {
        test('returns session statistics with default period', async () => {
            const stats = { totalSessions: 20, completionRate: 0.85 };
            sessionService.getStats.mockResolvedValue(stats);

            const req = mockReq({
                params: { clientId: '10' },
                query: {}
            });
            const res = mockRes();

            await sessionController.getStats(req, res, mockNext);

            expect(sessionService.getStats).toHaveBeenCalledWith(10, 'tenant-1', 'month');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { stats }
            });
        });

        test('passes custom period to service', async () => {
            sessionService.getStats.mockResolvedValue({ totalSessions: 100 });

            const req = mockReq({
                params: { clientId: '10' },
                query: { period: 'year' }
            });
            const res = mockRes();

            await sessionController.getStats(req, res, mockNext);

            expect(sessionService.getStats).toHaveBeenCalledWith(10, 'tenant-1', 'year');
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Stats error');
            sessionService.getStats.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await sessionController.getStats(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
