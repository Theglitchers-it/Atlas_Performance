/**
 * Tests for Measurement Controller (unified)
 * getOverview, getWeightChange, compareMeasurements, getAvailableDates,
 * CRUD for: Anthropometric, Body, Circumferences, Skinfolds, BIA
 */

jest.mock('../src/services/measurement.service', () => ({
    getOverview: jest.fn(),
    getWeightChange: jest.fn(),
    compareMeasurements: jest.fn(),
    getAvailableDates: jest.fn(),
    getAnthropometricList: jest.fn(),
    getLatestAnthropometric: jest.fn(),
    createAnthropometric: jest.fn(),
    updateAnthropometric: jest.fn(),
    deleteAnthropometric: jest.fn(),
    getBodyList: jest.fn(),
    getLatestBody: jest.fn(),
    createBody: jest.fn(),
    updateBody: jest.fn(),
    deleteBody: jest.fn(),
    getCircumferenceList: jest.fn(),
    getLatestCircumference: jest.fn(),
    createCircumference: jest.fn(),
    updateCircumference: jest.fn(),
    deleteCircumference: jest.fn(),
    getSkinfoldList: jest.fn(),
    getLatestSkinfold: jest.fn(),
    createSkinfold: jest.fn(),
    updateSkinfold: jest.fn(),
    deleteSkinfold: jest.fn(),
    getBodyFatTrend: jest.fn(),
    getBiaList: jest.fn(),
    getLatestBia: jest.fn(),
    createBia: jest.fn(),
    updateBia: jest.fn(),
    deleteBia: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const measurementController = require('../src/controllers/measurement.controller');
const measurementService = require('../src/services/measurement.service');

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

beforeEach(() => jest.clearAllMocks());

describe('MeasurementController', () => {
    // ====== OVERVIEW ======

    describe('getOverview', () => {
        test('returns overview data for a client', async () => {
            const overview = { anthropometric: {}, body: {}, circumference: {}, skinfold: {}, bia: {} };
            measurementService.getOverview.mockResolvedValue(overview);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getOverview(req, res, mockNext);

            expect(measurementService.getOverview).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: overview });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            measurementService.getOverview.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getOverview(req, res, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ====== WEIGHT CHANGE ======

    describe('getWeightChange', () => {
        test('returns weight change data', async () => {
            const change = { startWeight: 82, endWeight: 79, diff: -3 };
            measurementService.getWeightChange.mockResolvedValue(change);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getWeightChange(req, res, mockNext);

            expect(measurementService.getWeightChange).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: change });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            measurementService.getWeightChange.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getWeightChange(req, res, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ====== BODY ======

    describe('getBodyList', () => {
        test('returns body measurements list', async () => {
            const measurements = [{ id: 1, weight_kg: 80 }];
            measurementService.getBodyList.mockResolvedValue(measurements);

            const req = mockReq({ params: { clientId: '5' }, query: { limit: '15' } });
            const res = mockRes();

            await measurementController.getBodyList(req, res, mockNext);

            expect(measurementService.getBodyList).toHaveBeenCalledWith(5, 'tenant-1', expect.objectContaining({ limit: 15 }));
            expect(res.json).toHaveBeenCalledWith({ success: true, data: measurements });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            measurementService.getBodyList.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getBodyList(req, res, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createBody', () => {
        test('returns 201 with created measurement', async () => {
            const result = { id: 10, weight_kg: 78.5 };
            measurementService.createBody.mockResolvedValue(result);

            const req = mockReq({ params: { clientId: '5' }, body: { weightKg: 78.5 } });
            const res = mockRes();

            await measurementController.createBody(req, res, mockNext);

            expect(measurementService.createBody).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            measurementService.createBody.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' }, body: {} });
            const res = mockRes();

            await measurementController.createBody(req, res, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ====== CIRCUMFERENCES ======

    describe('getCircumferenceList', () => {
        test('returns circumference measurements', async () => {
            const circumferences = [{ id: 1, waist_cm: 85 }];
            measurementService.getCircumferenceList.mockResolvedValue(circumferences);

            const req = mockReq({ params: { clientId: '5' }, query: { limit: '10' } });
            const res = mockRes();

            await measurementController.getCircumferenceList(req, res, mockNext);

            expect(measurementService.getCircumferenceList).toHaveBeenCalledWith(5, 'tenant-1', expect.objectContaining({ limit: 10 }));
            expect(res.json).toHaveBeenCalledWith({ success: true, data: circumferences });
        });
    });

    describe('createCircumference', () => {
        test('returns 201 with added circumferences', async () => {
            const result = { id: 5, waist_cm: 82 };
            measurementService.createCircumference.mockResolvedValue(result);

            const req = mockReq({ params: { clientId: '5' }, body: { waistCm: 82 } });
            const res = mockRes();

            await measurementController.createCircumference(req, res, mockNext);

            expect(measurementService.createCircumference).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    // ====== SKINFOLDS ======

    describe('getSkinfoldList', () => {
        test('returns skinfold measurements', async () => {
            const skinfolds = [{ id: 1, chest_mm: 12 }];
            measurementService.getSkinfoldList.mockResolvedValue(skinfolds);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getSkinfoldList(req, res, mockNext);

            expect(measurementService.getSkinfoldList).toHaveBeenCalledWith(5, 'tenant-1', expect.any(Object));
            expect(res.json).toHaveBeenCalledWith({ success: true, data: skinfolds });
        });
    });

    describe('createSkinfold', () => {
        test('returns 201 with added skinfold data', async () => {
            const result = { id: 8, chest_mm: 10 };
            measurementService.createSkinfold.mockResolvedValue(result);

            const req = mockReq({ params: { clientId: '5' }, body: { chestMm: 10, gender: 'male', age: 30 } });
            const res = mockRes();

            await measurementController.createSkinfold(req, res, mockNext);

            expect(measurementService.createSkinfold).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            measurementService.createSkinfold.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' }, body: {} });
            const res = mockRes();

            await measurementController.createSkinfold(req, res, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ====== BIA ======

    describe('getBiaList', () => {
        test('returns BIA measurements', async () => {
            const biaMeasurements = [{ id: 1, fat_mass_pct: 14.2, lean_mass_kg: 65.8 }];
            measurementService.getBiaList.mockResolvedValue(biaMeasurements);

            const req = mockReq({ params: { clientId: '5' }, query: { limit: '5' } });
            const res = mockRes();

            await measurementController.getBiaList(req, res, mockNext);

            expect(measurementService.getBiaList).toHaveBeenCalledWith(5, 'tenant-1', expect.objectContaining({ limit: 5 }));
            expect(res.json).toHaveBeenCalledWith({ success: true, data: biaMeasurements });
        });
    });

    describe('createBia', () => {
        test('returns 201 with added BIA data', async () => {
            const result = { id: 3, fat_mass_pct: 13.5, lean_mass_kg: 66.5 };
            measurementService.createBia.mockResolvedValue(result);

            const req = mockReq({ params: { clientId: '5' }, body: { fatMassKg: 13.5, leanMassKg: 66.5 } });
            const res = mockRes();

            await measurementController.createBia(req, res, mockNext);

            expect(measurementService.createBia).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    // ====== ANTHROPOMETRIC ======

    describe('getAnthropometricList', () => {
        test('returns anthropometric measurements', async () => {
            const data = [{ id: 1, height_cm: 175, weight_kg: 80 }];
            measurementService.getAnthropometricList.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getAnthropometricList(req, res, mockNext);

            expect(measurementService.getAnthropometricList).toHaveBeenCalledWith(5, 'tenant-1', expect.any(Object));
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });
    });

    describe('createAnthropometric', () => {
        test('returns 201 with created anthropometric data', async () => {
            const result = { id: 2, height_cm: 175, weight_kg: 80 };
            measurementService.createAnthropometric.mockResolvedValue(result);

            const req = mockReq({ params: { clientId: '5' }, body: { heightCm: 175, weightKg: 80 } });
            const res = mockRes();

            await measurementController.createAnthropometric(req, res, mockNext);

            expect(measurementService.createAnthropometric).toHaveBeenCalledWith(5, 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    // ====== AVAILABLE DATES ======

    describe('getAvailableDates', () => {
        test('returns list of available measurement dates', async () => {
            const dates = [{ measurement_date: '2026-01-01' }, { measurement_date: '2026-02-01' }];
            measurementService.getAvailableDates.mockResolvedValue(dates);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getAvailableDates(req, res, mockNext);

            expect(measurementService.getAvailableDates).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: dates });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            measurementService.getAvailableDates.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await measurementController.getAvailableDates(req, res, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ====== COMPARE ======

    describe('compareMeasurements', () => {
        test('returns comparison between two dates', async () => {
            const comparison = { anthropometric: {}, body: {} };
            measurementService.compareMeasurements.mockResolvedValue(comparison);

            const req = mockReq({
                params: { clientId: '5' },
                query: { date1: '2026-01-01', date2: '2026-02-01' }
            });
            const res = mockRes();

            await measurementController.compareMeasurements(req, res, mockNext);

            expect(measurementService.compareMeasurements).toHaveBeenCalledWith(5, 'tenant-1', '2026-01-01', '2026-02-01');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: comparison });
        });

        test('returns 400 when date1 is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                query: { date2: '2026-02-01' }
            });
            const res = mockRes();

            await measurementController.compareMeasurements(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 400 when date2 is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                query: { date1: '2026-01-01' }
            });
            const res = mockRes();

            await measurementController.compareMeasurements(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
