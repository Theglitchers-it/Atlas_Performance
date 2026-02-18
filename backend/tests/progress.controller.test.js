/**
 * Tests for Progress Controller
 * getPhotos, addPhoto, deletePhoto, comparePhotos,
 * getRecords, addRecord, getPersonalBests, getRecordHistory, deleteRecord
 */

// Mock dependencies
jest.mock('../src/services/progress.service', () => ({
    getPhotos: jest.fn(),
    addPhoto: jest.fn(),
    deletePhoto: jest.fn(),
    getPhotoComparison: jest.fn(),
    getRecords: jest.fn(),
    addRecord: jest.fn(),
    getPersonalBests: jest.fn(),
    getRecordHistory: jest.fn(),
    deleteRecord: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const progressController = require('../src/controllers/progress.controller');
const progressService = require('../src/services/progress.service');

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

describe('ProgressController', () => {
    // === PROGRESS PHOTOS ===

    describe('getPhotos', () => {
        test('returns photos with filter options', async () => {
            const data = { photos: [{ id: 1, url: '/photo1.jpg' }], total: 1 };
            progressService.getPhotos.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                query: { photoType: 'front', limit: '10', page: '1' }
            });
            const res = mockRes();

            await progressController.getPhotos(req, res, mockNext);

            expect(progressService.getPhotos).toHaveBeenCalledWith('5', 'tenant-1', {
                photoType: 'front',
                startDate: undefined,
                endDate: undefined,
                limit: 10,
                page: 1
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data
            });
        });

        test('passes date filters to service', async () => {
            progressService.getPhotos.mockResolvedValue({ photos: [], total: 0 });

            const req = mockReq({
                params: { clientId: '5' },
                query: { startDate: '2025-01-01', endDate: '2025-06-01' }
            });
            const res = mockRes();

            await progressController.getPhotos(req, res, mockNext);

            expect(progressService.getPhotos).toHaveBeenCalledWith('5', 'tenant-1', expect.objectContaining({
                startDate: '2025-01-01',
                endDate: '2025-06-01'
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            progressService.getPhotos.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await progressController.getPhotos(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('addPhoto', () => {
        test('returns 201 with added photo', async () => {
            const data = { id: 10, url: '/new-photo.jpg' };
            progressService.addPhoto.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                body: { url: '/new-photo.jpg', photoType: 'front', date: '2025-03-01' }
            });
            const res = mockRes();

            await progressController.addPhoto(req, res, mockNext);

            expect(progressService.addPhoto).toHaveBeenCalledWith('5', 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Upload failed');
            progressService.addPhoto.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' }, body: {} });
            const res = mockRes();

            await progressController.addPhoto(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('deletePhoto', () => {
        test('returns success on deletion', async () => {
            progressService.deletePhoto.mockResolvedValue(true);

            const req = mockReq({ params: { photoId: '10' } });
            const res = mockRes();

            await progressController.deletePhoto(req, res, mockNext);

            expect(progressService.deletePhoto).toHaveBeenCalledWith('10', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('returns 404 when photo not found', async () => {
            progressService.deletePhoto.mockResolvedValue(false);

            const req = mockReq({ params: { photoId: '999' } });
            const res = mockRes();

            await progressController.deletePhoto(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Foto non trovata'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            progressService.deletePhoto.mockRejectedValue(error);

            const req = mockReq({ params: { photoId: '10' } });
            const res = mockRes();

            await progressController.deletePhoto(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('comparePhotos', () => {
        test('returns photo comparison data', async () => {
            const data = { before: { url: '/a.jpg' }, after: { url: '/b.jpg' } };
            progressService.getPhotoComparison.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                query: { date1: '2025-01-01', date2: '2025-03-01', photoType: 'front' }
            });
            const res = mockRes();

            await progressController.comparePhotos(req, res, mockNext);

            expect(progressService.getPhotoComparison).toHaveBeenCalledWith(
                '5', 'tenant-1', '2025-01-01', '2025-03-01', 'front'
            );
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('returns 400 when date1 is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                query: { date2: '2025-03-01' }
            });
            const res = mockRes();

            await progressController.comparePhotos(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'date1 e date2 richiesti'
            });
            expect(progressService.getPhotoComparison).not.toHaveBeenCalled();
        });

        test('returns 400 when date2 is missing', async () => {
            const req = mockReq({
                params: { clientId: '5' },
                query: { date1: '2025-01-01' }
            });
            const res = mockRes();

            await progressController.comparePhotos(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'date1 e date2 richiesti'
            });
        });
    });

    // === PERFORMANCE RECORDS ===

    describe('getRecords', () => {
        test('returns records with filter options', async () => {
            const data = { records: [{ id: 1, exerciseId: 3, value: 100 }] };
            progressService.getRecords.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                query: { exerciseId: '3', recordType: '1rm', limit: '20' }
            });
            const res = mockRes();

            await progressController.getRecords(req, res, mockNext);

            expect(progressService.getRecords).toHaveBeenCalledWith('5', 'tenant-1', {
                exerciseId: 3,
                recordType: '1rm',
                limit: 20
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            progressService.getRecords.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await progressController.getRecords(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('addRecord', () => {
        test('returns 201 with added record', async () => {
            const data = { id: 15, exerciseId: 3, value: 120 };
            progressService.addRecord.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5' },
                body: { exerciseId: 3, recordType: '1rm', value: 120 }
            });
            const res = mockRes();

            await progressController.addRecord(req, res, mockNext);

            expect(progressService.addRecord).toHaveBeenCalledWith('5', 'tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });
    });

    describe('getPersonalBests', () => {
        test('returns personal bests for a client', async () => {
            const data = { bests: [{ exerciseId: 1, value: 140 }] };
            progressService.getPersonalBests.mockResolvedValue(data);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await progressController.getPersonalBests(req, res, mockNext);

            expect(progressService.getPersonalBests).toHaveBeenCalledWith('5', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Client not found');
            progressService.getPersonalBests.mockRejectedValue(error);

            const req = mockReq({ params: { clientId: '5' } });
            const res = mockRes();

            await progressController.getPersonalBests(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getRecordHistory', () => {
        test('returns record history for exercise', async () => {
            const data = { history: [{ date: '2025-01-01', value: 100 }, { date: '2025-02-01', value: 110 }] };
            progressService.getRecordHistory.mockResolvedValue(data);

            const req = mockReq({
                params: { clientId: '5', exerciseId: '3' },
                query: { recordType: '1rm' }
            });
            const res = mockRes();

            await progressController.getRecordHistory(req, res, mockNext);

            expect(progressService.getRecordHistory).toHaveBeenCalledWith('5', 'tenant-1', '3', '1rm');
            expect(res.json).toHaveBeenCalledWith({ success: true, data });
        });
    });

    describe('deleteRecord', () => {
        test('returns success on deletion', async () => {
            progressService.deleteRecord.mockResolvedValue(true);

            const req = mockReq({ params: { recordId: '15' } });
            const res = mockRes();

            await progressController.deleteRecord(req, res, mockNext);

            expect(progressService.deleteRecord).toHaveBeenCalledWith('15', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('returns 404 when record not found', async () => {
            progressService.deleteRecord.mockResolvedValue(false);

            const req = mockReq({ params: { recordId: '999' } });
            const res = mockRes();

            await progressController.deleteRecord(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Record non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            progressService.deleteRecord.mockRejectedValue(error);

            const req = mockReq({ params: { recordId: '15' } });
            const res = mockRes();

            await progressController.deleteRecord(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
