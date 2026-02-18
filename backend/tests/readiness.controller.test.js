/**
 * Tests for Readiness Controller
 * getToday, getHistory, saveCheckin, getAverage
 */

// Mock dependencies
jest.mock('../src/services/readiness.service', () => ({
    getCheckin: jest.fn(),
    getHistory: jest.fn(),
    saveCheckin: jest.fn(),
    getAverageReadiness: jest.fn(),
    checkReadinessAlerts: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const readinessController = require('../src/controllers/readiness.controller');
const readinessService = require('../src/services/readiness.service');

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

describe('ReadinessController', () => {
    describe('getToday', () => {
        test('returns today checkin for a client', async () => {
            const checkin = { id: 1, sleepQuality: 8, stress: 3, readinessScore: 7.5 };
            readinessService.getCheckin.mockResolvedValue(checkin);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getToday(req, res, mockNext);

            expect(readinessService.getCheckin).toHaveBeenCalledWith(
                5,
                'tenant-1',
                expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { checkin }
            });
        });

        test('returns null checkin when no data for today', async () => {
            readinessService.getCheckin.mockResolvedValue(null);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getToday(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { checkin: null }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            readinessService.getCheckin.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getToday(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getHistory', () => {
        test('returns checkin history with date filters', async () => {
            const checkins = [
                { id: 1, date: '2025-03-01', readinessScore: 7 },
                { id: 2, date: '2025-03-02', readinessScore: 8 }
            ];
            readinessService.getHistory.mockResolvedValue(checkins);

            const req = mockReq({
                params: { clientId: '5' },
                query: { startDate: '2025-03-01', endDate: '2025-03-31', limit: '15' }
            });
            const res = mockRes();

            await readinessController.getHistory(req, res, mockNext);

            expect(readinessService.getHistory).toHaveBeenCalledWith(5, 'tenant-1', {
                startDate: '2025-03-01',
                endDate: '2025-03-31',
                limit: 15
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { checkins }
            });
        });

        test('uses default limit of 30 when not specified', async () => {
            readinessService.getHistory.mockResolvedValue([]);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getHistory(req, res, mockNext);

            expect(readinessService.getHistory).toHaveBeenCalledWith(5, 'tenant-1', expect.objectContaining({
                limit: 30
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Client not found');
            readinessService.getHistory.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getHistory(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('saveCheckin', () => {
        test('saves checkin and triggers alert check', async () => {
            const checkin = { id: 10, sleepQuality: 7, stress: 4, readinessScore: 6.5 };
            readinessService.saveCheckin.mockResolvedValue(checkin);
            readinessService.checkReadinessAlerts.mockResolvedValue();

            const req = mockReq({
                params: { clientId: '5' },
                body: { sleepQuality: 7, stress: 4, soreness: 5, mood: 6 }
            });
            const res = mockRes();

            await readinessController.saveCheckin(req, res, mockNext);

            expect(readinessService.saveCheckin).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(readinessService.checkReadinessAlerts).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Check-in salvato',
                data: { checkin }
            });
        });

        test('calls checkReadinessAlerts after saving', async () => {
            readinessService.saveCheckin.mockResolvedValue({ id: 10 });
            readinessService.checkReadinessAlerts.mockResolvedValue();

            const req = mockReq({
                params: { clientId: '8' },
                body: { sleepQuality: 3, stress: 9 }
            });
            const res = mockRes();

            await readinessController.saveCheckin(req, res, mockNext);

            expect(readinessService.saveCheckin).toHaveBeenCalled();
            expect(readinessService.checkReadinessAlerts).toHaveBeenCalledWith(8, 'tenant-1');
        });

        test('calls next(error) when save fails', async () => {
            const error = new Error('Validation error');
            readinessService.saveCheckin.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' }, body: {} });
            const res = mockRes();

            await readinessController.saveCheckin(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(readinessService.checkReadinessAlerts).not.toHaveBeenCalled();
        });
    });

    describe('getAverage', () => {
        test('returns average readiness with custom days param', async () => {
            const average = { avgScore: 7.2, days: 14 };
            readinessService.getAverageReadiness.mockResolvedValue(average);

            const req = mockReq({
                params: { clientId: '5' },
                query: { days: '14' }
            });
            const res = mockRes();

            await readinessController.getAverage(req, res, mockNext);

            expect(readinessService.getAverageReadiness).toHaveBeenCalledWith(5, 'tenant-1', 14);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { average }
            });
        });

        test('uses default 7 days when not specified', async () => {
            readinessService.getAverageReadiness.mockResolvedValue({ avgScore: 6.8 });

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getAverage(req, res, mockNext);

            expect(readinessService.getAverageReadiness).toHaveBeenCalledWith(5, 'tenant-1', 7);
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            readinessService.getAverageReadiness.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await readinessController.getAverage(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
