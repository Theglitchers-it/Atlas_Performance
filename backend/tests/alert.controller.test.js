/**
 * Tests for Alert Controller
 * getAlerts, runChecks, dismiss, dismissAll
 */

// Mock dependencies
jest.mock('../src/services/alert.service', () => ({
    getAlerts: jest.fn(),
    runAllChecks: jest.fn(),
    dismissAlert: jest.fn(),
    dismissAllForClient: jest.fn()
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const alertController = require('../src/controllers/alert.controller');
const alertService = require('../src/services/alert.service');

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

describe('AlertController', () => {
    describe('getAlerts', () => {
        test('returns list of alerts with default filters', async () => {
            const alerts = [
                { id: 1, type: 'no_progress', severity: 'warning', clientId: 5 },
                { id: 2, type: 'missed_sessions', severity: 'high', clientId: 3 }
            ];
            alertService.getAlerts.mockResolvedValue(alerts);

            const req = mockReq();
            const res = mockRes();

            await alertController.getAlerts(req, res, mockNext);

            expect(alertService.getAlerts).toHaveBeenCalledWith('tenant-1', {
                clientId: undefined,
                severity: undefined,
                dismissed: false
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: alerts
            });
        });

        test('parses query filters correctly', async () => {
            alertService.getAlerts.mockResolvedValue([]);

            const req = mockReq({
                query: { clientId: '5', severity: 'high', dismissed: 'true' }
            });
            const res = mockRes();

            await alertController.getAlerts(req, res, mockNext);

            expect(alertService.getAlerts).toHaveBeenCalledWith('tenant-1', {
                clientId: 5,
                severity: 'high',
                dismissed: true
            });
        });

        test('returns empty array when training_alerts table does not exist', async () => {
            const tableError = new Error('Table not found');
            tableError.code = 'ER_NO_SUCH_TABLE';
            alertService.getAlerts.mockRejectedValue(tableError);

            const req = mockReq();
            const res = mockRes();

            await alertController.getAlerts(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: []
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        test('calls next(error) on non-table errors', async () => {
            const error = new Error('Connection refused');
            alertService.getAlerts.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await alertController.getAlerts(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('runChecks', () => {
        test('runs all checks for a given client and returns alerts', async () => {
            const alerts = [
                { type: 'missed_sessions', severity: 'warning' },
                { type: 'plateau', severity: 'info' }
            ];
            alertService.runAllChecks.mockResolvedValue(alerts);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await alertController.runChecks(req, res, mockNext);

            expect(alertService.runAllChecks).toHaveBeenCalledWith('10', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { alerts, count: 2 }
            });
        });

        test('returns empty alerts array when no issues found', async () => {
            alertService.runAllChecks.mockResolvedValue([]);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await alertController.runChecks(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { alerts: [], count: 0 }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Check failed');
            alertService.runAllChecks.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await alertController.runChecks(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('dismiss', () => {
        test('dismisses an alert successfully', async () => {
            alertService.dismissAlert.mockResolvedValue(true);

            const req = mockReq({ params: { alertId: '42' } });
            const res = mockRes();

            await alertController.dismiss(req, res, mockNext);

            expect(alertService.dismissAlert).toHaveBeenCalledWith('42', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('returns 404 when alert not found', async () => {
            alertService.dismissAlert.mockResolvedValue(false);

            const req = mockReq({ params: { alertId: '999' } });
            const res = mockRes();

            await alertController.dismiss(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Alert non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Dismiss failed');
            alertService.dismissAlert.mockRejectedValue(error);

            const req = mockReq({ params: { alertId: '42' } });
            const res = mockRes();

            await alertController.dismiss(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('dismissAll', () => {
        test('dismisses all alerts for a client', async () => {
            const result = { dismissed: 5 };
            alertService.dismissAllForClient.mockResolvedValue(result);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await alertController.dismissAll(req, res, mockNext);

            expect(alertService.dismissAllForClient).toHaveBeenCalledWith('10', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Dismiss all failed');
            alertService.dismissAllForClient.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await alertController.dismissAll(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
