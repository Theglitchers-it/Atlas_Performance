/**
 * Tests for Anthropometric Controller
 * saveAnthropometric, getLatest, getHistory, deleteAnthropometric,
 * saveSkinfold, getLatestSkinfold, getSkinfoldHistory, getBodyFatTrend, deleteSkinfold,
 * saveCircumference, getLatestCircumference, getCircumferenceHistory, deleteCircumference,
 * saveBia, getLatestBia, getBiaHistory, deleteBia,
 * getOverview, compareMeasurements, getAvailableDates
 */

// Mock dependencies
jest.mock('../src/services/anthropometric.service', () => ({
    saveAnthropometric: jest.fn(),
    getLatest: jest.fn(),
    getHistory: jest.fn(),
    deleteAnthropometric: jest.fn(),
    saveSkinfold: jest.fn(),
    getLatestSkinfold: jest.fn(),
    getSkinfoldHistory: jest.fn(),
    getBodyFatTrend: jest.fn(),
    deleteSkinfold: jest.fn(),
    saveCircumference: jest.fn(),
    getLatestCircumference: jest.fn(),
    getCircumferenceHistory: jest.fn(),
    deleteCircumference: jest.fn(),
    saveBia: jest.fn(),
    getLatestBia: jest.fn(),
    getBiaHistory: jest.fn(),
    deleteBia: jest.fn(),
    getBodyCompositionOverview: jest.fn(),
    compareMeasurements: jest.fn(),
    getAvailableDates: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const anthropometricController = require('../src/controllers/anthropometric.controller');
const anthropometricService = require('../src/services/anthropometric.service');

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

describe('AnthropometricController', () => {
    // ============================================
    // PARAMETRI ANTROPOMETRICI BASE
    // ============================================

    describe('saveAnthropometric', () => {
        test('saves anthropometric data and returns 201', async () => {
            const result = { id: 1, height: 180, weight: 75 };
            anthropometricService.saveAnthropometric.mockResolvedValue(result);

            const req = mockReq({
                params: { clientId: '10' },
                body: { height: 180, weight: 75 }
            });
            const res = mockRes();

            await anthropometricController.saveAnthropometric(req, res, mockNext);

            expect(anthropometricService.saveAnthropometric).toHaveBeenCalledWith(10, 'tenant-1', { height: 180, weight: 75 });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Dati antropometrici salvati',
                data: result
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Save failed');
            anthropometricService.saveAnthropometric.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' }, body: {} });
            const res = mockRes();

            await anthropometricController.saveAnthropometric(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getLatest', () => {
        test('returns latest anthropometric data for a client', async () => {
            const data = { id: 5, height: 175, weight: 70, bmi: 22.9 };
            anthropometricService.getLatest.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getLatest(req, res, mockNext);

            expect(anthropometricService.getLatest).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { anthropometric: data }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Query failed');
            anthropometricService.getLatest.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getLatest(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getHistory', () => {
        test('returns history with default options', async () => {
            const history = [
                { id: 1, date: '2025-01-01', weight: 75 },
                { id: 2, date: '2025-02-01', weight: 73 }
            ];
            anthropometricService.getHistory.mockResolvedValue(history);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getHistory(req, res, mockNext);

            expect(anthropometricService.getHistory).toHaveBeenCalledWith(10, 'tenant-1', {
                limit: 50,
                startDate: undefined,
                endDate: undefined
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { history }
            });
        });

        test('passes query parameters for limit and date range', async () => {
            anthropometricService.getHistory.mockResolvedValue([]);

            const req = mockReq({
                params: { clientId: '10' },
                query: { limit: '20', startDate: '2025-01-01', endDate: '2025-06-01' }
            });
            const res = mockRes();

            await anthropometricController.getHistory(req, res, mockNext);

            expect(anthropometricService.getHistory).toHaveBeenCalledWith(10, 'tenant-1', {
                limit: 20,
                startDate: '2025-01-01',
                endDate: '2025-06-01'
            });
        });
    });

    describe('deleteAnthropometric', () => {
        test('deletes record successfully', async () => {
            anthropometricService.deleteAnthropometric.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await anthropometricController.deleteAnthropometric(req, res, mockNext);

            expect(anthropometricService.deleteAnthropometric).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Record eliminato'
            });
        });

        test('returns 404 when record not found', async () => {
            anthropometricService.deleteAnthropometric.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await anthropometricController.deleteAnthropometric(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Record non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Delete failed');
            anthropometricService.deleteAnthropometric.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await anthropometricController.deleteAnthropometric(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ============================================
    // PLICOMETRIA
    // ============================================

    describe('saveSkinfold', () => {
        test('saves skinfold data and returns 201', async () => {
            const result = { id: 1, triceps: 12, subscapular: 14, bodyFatPercentage: 18.5 };
            anthropometricService.saveSkinfold.mockResolvedValue(result);

            const req = mockReq({
                params: { clientId: '10' },
                body: { triceps: 12, subscapular: 14 }
            });
            const res = mockRes();

            await anthropometricController.saveSkinfold(req, res, mockNext);

            expect(anthropometricService.saveSkinfold).toHaveBeenCalledWith(10, 'tenant-1', { triceps: 12, subscapular: 14 });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Plicometria salvata',
                data: { skinfold: result }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Save failed');
            anthropometricService.saveSkinfold.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' }, body: {} });
            const res = mockRes();

            await anthropometricController.saveSkinfold(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getLatestSkinfold', () => {
        test('returns latest skinfold data', async () => {
            const data = { id: 3, triceps: 10, bodyFatPercentage: 16.2 };
            anthropometricService.getLatestSkinfold.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getLatestSkinfold(req, res, mockNext);

            expect(anthropometricService.getLatestSkinfold).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { skinfold: data }
            });
        });
    });

    describe('getSkinfoldHistory', () => {
        test('returns skinfold history with default limit', async () => {
            const history = [{ id: 1, date: '2025-01-01' }];
            anthropometricService.getSkinfoldHistory.mockResolvedValue(history);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getSkinfoldHistory(req, res, mockNext);

            expect(anthropometricService.getSkinfoldHistory).toHaveBeenCalledWith(10, 'tenant-1', { limit: 50 });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { history }
            });
        });

        test('passes custom limit from query', async () => {
            anthropometricService.getSkinfoldHistory.mockResolvedValue([]);

            const req = mockReq({ params: { clientId: '10' }, query: { limit: '10' } });
            const res = mockRes();

            await anthropometricController.getSkinfoldHistory(req, res, mockNext);

            expect(anthropometricService.getSkinfoldHistory).toHaveBeenCalledWith(10, 'tenant-1', { limit: 10 });
        });
    });

    describe('getBodyFatTrend', () => {
        test('returns body fat trend with default limit', async () => {
            const trend = [{ date: '2025-01-01', bodyFat: 18.5 }];
            anthropometricService.getBodyFatTrend.mockResolvedValue(trend);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getBodyFatTrend(req, res, mockNext);

            expect(anthropometricService.getBodyFatTrend).toHaveBeenCalledWith(10, 'tenant-1', { limit: 20 });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { trend }
            });
        });
    });

    describe('deleteSkinfold', () => {
        test('deletes skinfold record successfully', async () => {
            anthropometricService.deleteSkinfold.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await anthropometricController.deleteSkinfold(req, res, mockNext);

            expect(anthropometricService.deleteSkinfold).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Plicometria eliminata'
            });
        });

        test('returns 404 when skinfold record not found', async () => {
            anthropometricService.deleteSkinfold.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await anthropometricController.deleteSkinfold(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Record non trovato'
            });
        });
    });

    // ============================================
    // CIRCONFERENZE
    // ============================================

    describe('saveCircumference', () => {
        test('saves circumference data and returns 201', async () => {
            const result = { id: 1, waist: 80, chest: 100 };
            anthropometricService.saveCircumference.mockResolvedValue(result);

            const req = mockReq({
                params: { clientId: '10' },
                body: { waist: 80, chest: 100 }
            });
            const res = mockRes();

            await anthropometricController.saveCircumference(req, res, mockNext);

            expect(anthropometricService.saveCircumference).toHaveBeenCalledWith(10, 'tenant-1', { waist: 80, chest: 100 });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Circonferenze salvate',
                data: { circumference: result }
            });
        });
    });

    describe('getLatestCircumference', () => {
        test('returns latest circumference data', async () => {
            const data = { id: 2, waist: 78, chest: 98 };
            anthropometricService.getLatestCircumference.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getLatestCircumference(req, res, mockNext);

            expect(anthropometricService.getLatestCircumference).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { circumference: data }
            });
        });
    });

    describe('getCircumferenceHistory', () => {
        test('returns circumference history with default limit', async () => {
            const history = [{ id: 1, date: '2025-01-01', waist: 82 }];
            anthropometricService.getCircumferenceHistory.mockResolvedValue(history);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getCircumferenceHistory(req, res, mockNext);

            expect(anthropometricService.getCircumferenceHistory).toHaveBeenCalledWith(10, 'tenant-1', { limit: 50 });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { history }
            });
        });
    });

    describe('deleteCircumference', () => {
        test('deletes circumference record successfully', async () => {
            anthropometricService.deleteCircumference.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await anthropometricController.deleteCircumference(req, res, mockNext);

            expect(anthropometricService.deleteCircumference).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Circonferenze eliminate'
            });
        });

        test('returns 404 when circumference record not found', async () => {
            anthropometricService.deleteCircumference.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await anthropometricController.deleteCircumference(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Record non trovato'
            });
        });
    });

    // ============================================
    // BIA
    // ============================================

    describe('saveBia', () => {
        test('saves BIA data and returns 201', async () => {
            const result = { id: 1, fatMass: 15.2, leanMass: 60.5 };
            anthropometricService.saveBia.mockResolvedValue(result);

            const req = mockReq({
                params: { clientId: '10' },
                body: { fatMass: 15.2, leanMass: 60.5 }
            });
            const res = mockRes();

            await anthropometricController.saveBia(req, res, mockNext);

            expect(anthropometricService.saveBia).toHaveBeenCalledWith(10, 'tenant-1', { fatMass: 15.2, leanMass: 60.5 });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'BIA salvata',
                data: { bia: result }
            });
        });
    });

    describe('getLatestBia', () => {
        test('returns latest BIA data', async () => {
            const data = { id: 3, fatMass: 14.8, leanMass: 61.0 };
            anthropometricService.getLatestBia.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getLatestBia(req, res, mockNext);

            expect(anthropometricService.getLatestBia).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { bia: data }
            });
        });
    });

    describe('getBiaHistory', () => {
        test('returns BIA history with default limit', async () => {
            const history = [{ id: 1, date: '2025-01-01' }];
            anthropometricService.getBiaHistory.mockResolvedValue(history);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getBiaHistory(req, res, mockNext);

            expect(anthropometricService.getBiaHistory).toHaveBeenCalledWith(10, 'tenant-1', { limit: 50 });
        });
    });

    describe('deleteBia', () => {
        test('deletes BIA record successfully', async () => {
            anthropometricService.deleteBia.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await anthropometricController.deleteBia(req, res, mockNext);

            expect(anthropometricService.deleteBia).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'BIA eliminata'
            });
        });

        test('returns 404 when BIA record not found', async () => {
            anthropometricService.deleteBia.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await anthropometricController.deleteBia(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Record non trovato'
            });
        });
    });

    // ============================================
    // COMPOSIZIONE CORPOREA
    // ============================================

    describe('getOverview', () => {
        test('returns body composition overview', async () => {
            const overview = { latestWeight: 75, latestBodyFat: 18.5, trend: 'improving' };
            anthropometricService.getBodyCompositionOverview.mockResolvedValue(overview);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getOverview(req, res, mockNext);

            expect(anthropometricService.getBodyCompositionOverview).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { overview }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Overview failed');
            anthropometricService.getBodyCompositionOverview.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getOverview(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('compareMeasurements', () => {
        test('returns comparison between two dates', async () => {
            const comparison = { weightDelta: -2, bodyFatDelta: -1.5 };
            anthropometricService.compareMeasurements.mockResolvedValue(comparison);

            const req = mockReq({
                params: { clientId: '10' },
                query: { date1: '2025-01-01', date2: '2025-03-01' }
            });
            const res = mockRes();

            await anthropometricController.compareMeasurements(req, res, mockNext);

            expect(anthropometricService.compareMeasurements).toHaveBeenCalledWith(
                10, 'tenant-1', '2025-01-01', '2025-03-01'
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { comparison }
            });
        });

        test('returns 400 when date1 is missing', async () => {
            const req = mockReq({
                params: { clientId: '10' },
                query: { date2: '2025-03-01' }
            });
            const res = mockRes();

            await anthropometricController.compareMeasurements(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'date1 e date2 sono obbligatorie'
            });
        });

        test('returns 400 when date2 is missing', async () => {
            const req = mockReq({
                params: { clientId: '10' },
                query: { date1: '2025-01-01' }
            });
            const res = mockRes();

            await anthropometricController.compareMeasurements(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'date1 e date2 sono obbligatorie'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Comparison failed');
            anthropometricService.compareMeasurements.mockRejectedValue(error);

            const req = mockReq({
                params: { clientId: '10' },
                query: { date1: '2025-01-01', date2: '2025-03-01' }
            });
            const res = mockRes();

            await anthropometricController.compareMeasurements(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAvailableDates', () => {
        test('returns list of available measurement dates', async () => {
            const dates = ['2025-01-01', '2025-02-01', '2025-03-01'];
            anthropometricService.getAvailableDates.mockResolvedValue(dates);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getAvailableDates(req, res, mockNext);

            expect(anthropometricService.getAvailableDates).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { dates }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Dates query failed');
            anthropometricService.getAvailableDates.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '10' } });
            const res = mockRes();

            await anthropometricController.getAvailableDates(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
