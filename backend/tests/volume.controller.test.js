/**
 * Tests for Volume Controller
 * getVolume, calculateWeekly, getMesocycleSummary, compareMesocycles,
 * detectPlateau, getPriorities, setPriority, deletePriority
 */

// Mock dependencies
jest.mock('../src/services/volume.service', () => ({
    getVolumeByClient: jest.fn(),
    calculateWeeklyVolume: jest.fn(),
    getMesocycleSummary: jest.fn(),
    compareMesocycles: jest.fn(),
    detectVolumePlateau: jest.fn(),
    getMusclePriorities: jest.fn(),
    setMusclePriority: jest.fn(),
    deleteMusclePriority: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const volumeController = require('../src/controllers/volume.controller');
const volumeService = require('../src/services/volume.service');

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

describe('VolumeController', () => {
    describe('getVolume', () => {
        test('returns volume analytics with filter options', async () => {
            const data = { weeklyVolumes: [{ week: '2025-W10', totalSets: 50 }] };
            volumeService.getVolumeByClient.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                query: { weeks: '8', muscleGroupId: '2', mesocycleId: '3' }
            });
            const res = mockRes();

            await volumeController.getVolume(req, res, mockNext);

            expect(volumeService.getVolumeByClient).toHaveBeenCalledWith('5', 'tenant-1', {
                weeks: 8,
                muscleGroupId: 2,
                mesocycleId: 3
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('passes undefined for unspecified query params', async () => {
            volumeService.getVolumeByClient.mockResolvedValue({});

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await volumeController.getVolume(req, res, mockNext);

            expect(volumeService.getVolumeByClient).toHaveBeenCalledWith('5', 'tenant-1', {
                weeks: undefined,
                muscleGroupId: undefined,
                mesocycleId: undefined
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            volumeService.getVolumeByClient.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await volumeController.getVolume(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('calculateWeekly', () => {
        test('returns calculated weekly volume', async () => {
            const data = { totalSets: 45, muscleGroups: { chest: 12, back: 15 } };
            volumeService.calculateWeeklyVolume.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                body: { weekStart: '2025-03-10' }
            });
            const res = mockRes();

            await volumeController.calculateWeekly(req, res, mockNext);

            expect(volumeService.calculateWeeklyVolume).toHaveBeenCalledWith('5', 'tenant-1', '2025-03-10');
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('returns 400 when weekStart is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                body: {}
            });
            const res = mockRes();

            await volumeController.calculateWeekly(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'weekStart richiesto'
            });
            expect(volumeService.calculateWeeklyVolume).not.toHaveBeenCalled();
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Calculation error');
            volumeService.calculateWeeklyVolume.mockRejectedValue(error);

            const req = mockReq({
                params: { clientId: '5' },
                body: { weekStart: '2025-03-10' }
            });
            const res = mockRes();

            await volumeController.calculateWeekly(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getMesocycleSummary', () => {
        test('returns mesocycle summary', async () => {
            const data = { programId: 3, totalWeeks: 6, avgVolume: 48 };
            volumeService.getMesocycleSummary.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5', programId: '3' }
            });
            const res = mockRes();

            await volumeController.getMesocycleSummary(req, res, mockNext);

            expect(volumeService.getMesocycleSummary).toHaveBeenCalledWith('5', 'tenant-1', '3');
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Program not found');
            volumeService.getMesocycleSummary.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5', programId: '3' } });
            const res = mockRes();

            await volumeController.getMesocycleSummary(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('compareMesocycles', () => {
        test('returns mesocycle comparison data', async () => {
            const data = { mesocycles: [{ id: 1, avg: 40 }, { id: 2, avg: 48 }] };
            volumeService.compareMesocycles.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await volumeController.compareMesocycles(req, res, mockNext);

            expect(volumeService.compareMesocycles).toHaveBeenCalledWith('5', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });
    });

    describe('detectPlateau', () => {
        test('returns plateau alerts wrapped in data.alerts', async () => {
            const alerts = [{ muscleGroup: 'chest', message: 'Volume stagnante' }];
            volumeService.detectVolumePlateau.mockResolvedValue(alerts);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await volumeController.detectPlateau(req, res, mockNext);

            expect(volumeService.detectVolumePlateau).toHaveBeenCalledWith('5', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { alerts }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Analysis failed');
            volumeService.detectVolumePlateau.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await volumeController.detectPlateau(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // === MUSCLE PRIORITIES ===

    describe('getPriorities', () => {
        test('returns muscle priorities for a client', async () => {
            const data = { priorities: [{ muscleGroupId: 1, priority: 'high' }] };
            volumeService.getMusclePriorities.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await volumeController.getPriorities(req, res, mockNext);

            expect(volumeService.getMusclePriorities).toHaveBeenCalledWith('5', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });
    });

    describe('setPriority', () => {
        test('returns set priority data', async () => {
            const data = { muscleGroupId: 2, priority: 'high', notes: 'Focus area' };
            volumeService.setMusclePriority.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                body: { muscleGroupId: 2, priority: 'high', notes: 'Focus area' }
            });
            const res = mockRes();

            await volumeController.setPriority(req, res, mockNext);

            expect(volumeService.setMusclePriority).toHaveBeenCalledWith(
                '5', 'tenant-1', 2, 'high', 'Focus area'
            );
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('returns 400 when muscleGroupId is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                body: { priority: 'high' }
            });
            const res = mockRes();

            await volumeController.setPriority(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'muscleGroupId e priority richiesti'
            });
            expect(volumeService.setMusclePriority).not.toHaveBeenCalled();
        });

        test('returns 400 when priority is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                body: { muscleGroupId: 2 }
            });
            const res = mockRes();

            await volumeController.setPriority(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'muscleGroupId e priority richiesti'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            volumeService.setMusclePriority.mockRejectedValue(error);

            const req = mockReq({
                params: { clientId: '5' },
                body: { muscleGroupId: 2, priority: 'high' }
            });
            const res = mockRes();

            await volumeController.setPriority(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('deletePriority', () => {
        test('returns success on deletion', async () => {
            volumeService.deleteMusclePriority.mockResolvedValue(true);

            const req = mockReq({ params: { clientId: '5', muscleGroupId: '2' } });
            const res = mockRes();

            await volumeController.deletePriority(req, res, mockNext);

            expect(volumeService.deleteMusclePriority).toHaveBeenCalledWith('5', 'tenant-1', '2');
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('returns 404 when priority not found', async () => {
            volumeService.deleteMusclePriority.mockResolvedValue(false);

            const req = mockReq({ params: { clientId: '5', muscleGroupId: '99' } });
            const res = mockRes();

            await volumeController.deletePriority(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Priorita non trovata'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            volumeService.deleteMusclePriority.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5', muscleGroupId: '2' } });
            const res = mockRes();

            await volumeController.deletePriority(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
