/**
 * Tests for Analytics Controller
 * getOverview, getSessionTrend, getTopClients, getAppointmentDistribution,
 * getReadinessTrend, getProgramCompletion, getQuickStats
 */

// Mock dependencies
jest.mock('../src/services/analytics.service', () => ({
    getOverview: jest.fn(),
    getSessionTrend: jest.fn(),
    getTopClients: jest.fn(),
    getAppointmentDistribution: jest.fn(),
    getReadinessTrend: jest.fn(),
    getProgramCompletion: jest.fn(),
    getQuickStats: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const analyticsController = require('../src/controllers/analytics.controller');
const analyticsService = require('../src/services/analytics.service');

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

describe('AnalyticsController', () => {
    describe('getOverview', () => {
        test('returns overview data for the tenant', async () => {
            const overview = {
                totalClients: 25,
                activeClients: 18,
                totalSessions: 150,
                revenue: 5000
            };
            analyticsService.getOverview.mockResolvedValue(overview);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getOverview(req, res, mockNext);

            expect(analyticsService.getOverview).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: overview
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            analyticsService.getOverview.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getOverview(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getSessionTrend', () => {
        test('returns session trend grouped by week by default', async () => {
            const trend = [
                { period: '2025-W01', count: 10 },
                { period: '2025-W02', count: 12 }
            ];
            analyticsService.getSessionTrend.mockResolvedValue(trend);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getSessionTrend(req, res, mockNext);

            expect(analyticsService.getSessionTrend).toHaveBeenCalledWith('tenant-1', 'week');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { trend }
            });
        });

        test('passes custom groupBy from query parameter', async () => {
            analyticsService.getSessionTrend.mockResolvedValue([]);

            const req = mockReq({ query: { groupBy: 'month' } });
            const res = mockRes();

            await analyticsController.getSessionTrend(req, res, mockNext);

            expect(analyticsService.getSessionTrend).toHaveBeenCalledWith('tenant-1', 'month');
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Query failed');
            analyticsService.getSessionTrend.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getSessionTrend(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getTopClients', () => {
        test('returns top clients with default limit of 10', async () => {
            const clients = [
                { id: 1, name: 'Mario', sessions: 20 },
                { id: 2, name: 'Luigi', sessions: 15 }
            ];
            analyticsService.getTopClients.mockResolvedValue(clients);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getTopClients(req, res, mockNext);

            expect(analyticsService.getTopClients).toHaveBeenCalledWith('tenant-1', 10);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { clients }
            });
        });

        test('passes custom limit from query parameter', async () => {
            analyticsService.getTopClients.mockResolvedValue([]);

            const req = mockReq({ query: { limit: '5' } });
            const res = mockRes();

            await analyticsController.getTopClients(req, res, mockNext);

            expect(analyticsService.getTopClients).toHaveBeenCalledWith('tenant-1', '5');
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Query failed');
            analyticsService.getTopClients.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getTopClients(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAppointmentDistribution', () => {
        test('returns appointment distribution data', async () => {
            const distribution = [
                { day: 'Monday', count: 15 },
                { day: 'Tuesday', count: 12 }
            ];
            analyticsService.getAppointmentDistribution.mockResolvedValue(distribution);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getAppointmentDistribution(req, res, mockNext);

            expect(analyticsService.getAppointmentDistribution).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { distribution }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Distribution query failed');
            analyticsService.getAppointmentDistribution.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getAppointmentDistribution(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getReadinessTrend', () => {
        test('returns readiness trend data', async () => {
            const trend = [{ date: '2025-01-01', avgScore: 7.5 }];
            analyticsService.getReadinessTrend.mockResolvedValue(trend);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getReadinessTrend(req, res, mockNext);

            expect(analyticsService.getReadinessTrend).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { trend }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Readiness query failed');
            analyticsService.getReadinessTrend.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getReadinessTrend(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getProgramCompletion', () => {
        test('returns program completion data', async () => {
            const completion = [
                { programId: 1, name: 'Strength', completionRate: 85 }
            ];
            analyticsService.getProgramCompletion.mockResolvedValue(completion);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getProgramCompletion(req, res, mockNext);

            expect(analyticsService.getProgramCompletion).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { completion }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Completion query failed');
            analyticsService.getProgramCompletion.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getProgramCompletion(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getQuickStats', () => {
        test('returns quick stats data', async () => {
            const stats = {
                newClientsThisMonth: 3,
                sessionsThisWeek: 12,
                avgReadiness: 7.2
            };
            analyticsService.getQuickStats.mockResolvedValue(stats);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getQuickStats(req, res, mockNext);

            expect(analyticsService.getQuickStats).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { stats }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Stats query failed');
            analyticsService.getQuickStats.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await analyticsController.getQuickStats(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
