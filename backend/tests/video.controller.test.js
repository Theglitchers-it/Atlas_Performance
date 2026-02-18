/**
 * Tests for Video Controller
 * getAll, getById, create, update, delete, incrementViews,
 * getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse,
 * getCourseProgress, updateModuleProgress, getStats, uploadFile
 */

// Mock dependencies
jest.mock('../src/services/video.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementViews: jest.fn(),
    getAllCourses: jest.fn(),
    getCourseById: jest.fn(),
    createCourse: jest.fn(),
    updateCourse: jest.fn(),
    deleteCourse: jest.fn(),
    getCourseProgress: jest.fn(),
    updateModuleProgress: jest.fn(),
    getStats: jest.fn()
}));

jest.mock('../src/middlewares/upload', () => ({
    getFileUrl: jest.fn((path) => `https://cdn.example.com/${path}`)
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const videoController = require('../src/controllers/video.controller');
const videoService = require('../src/services/video.service');

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

describe('VideoController', () => {
    // === VIDEO ===

    describe('getAll', () => {
        test('returns paginated list of videos', async () => {
            const result = { videos: [{ id: 1, title: 'Squat Tutorial' }], total: 1 };
            videoService.getAll.mockResolvedValue(result);

            const req = mockReq({
                query: { videoType: 'tutorial', search: 'squat', isPublic: 'true', page: '2', limit: '10' }
            });
            const res = mockRes();

            await videoController.getAll(req, res, mockNext);

            expect(videoService.getAll).toHaveBeenCalledWith('tenant-1', {
                videoType: 'tutorial',
                search: 'squat',
                isPublic: true,
                page: 2,
                limit: 10
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('uses default pagination and undefined for missing filters', async () => {
            videoService.getAll.mockResolvedValue({ videos: [], total: 0 });

            const req = mockReq();
            const res = mockRes();

            await videoController.getAll(req, res, mockNext);

            expect(videoService.getAll).toHaveBeenCalledWith('tenant-1', {
                videoType: undefined,
                search: undefined,
                isPublic: undefined,
                page: 1,
                limit: 20
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            videoService.getAll.mockRejectedValue(error);

            await videoController.getAll(mockReq(), mockRes(), mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        test('returns a single video', async () => {
            const video = { id: 5, title: 'Deadlift Form' };
            videoService.getById.mockResolvedValue(video);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await videoController.getById(req, res, mockNext);

            expect(videoService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { video } });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Not found');
            videoService.getById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await videoController.getById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('create', () => {
        test('returns 201 with created video', async () => {
            videoService.create.mockResolvedValue({ videoId: 10 });
            const video = { id: 10, title: 'New Video' };
            videoService.getById.mockResolvedValue(video);

            const req = mockReq({
                body: { title: 'New Video', url: 'https://youtube.com/watch?v=abc', videoType: 'tutorial' }
            });
            const res = mockRes();

            await videoController.create(req, res, mockNext);

            expect(videoService.create).toHaveBeenCalledWith('tenant-1', req.body, 1);
            expect(videoService.getById).toHaveBeenCalledWith(10, 'tenant-1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Video creato',
                data: { video }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Validation error');
            videoService.create.mockRejectedValue(error);

            const req = mockReq({ body: { title: 'Bad Video' } });
            const res = mockRes();

            await videoController.create(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('update', () => {
        test('returns updated video', async () => {
            videoService.update.mockResolvedValue();
            const video = { id: 5, title: 'Updated Video' };
            videoService.getById.mockResolvedValue(video);

            const req = mockReq({ params: { id: '5' }, body: { title: 'Updated Video' } });
            const res = mockRes();

            await videoController.update(req, res, mockNext);

            expect(videoService.update).toHaveBeenCalledWith(5, 'tenant-1', { title: 'Updated Video' });
            expect(videoService.getById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Video aggiornato',
                data: { video }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Not found');
            videoService.update.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: {} });
            const res = mockRes();

            await videoController.update(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('delete', () => {
        test('returns success on deletion', async () => {
            videoService.delete.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await videoController.delete(req, res, mockNext);

            expect(videoService.delete).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Video eliminato' });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Delete failed');
            videoService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await videoController.delete(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('incrementViews', () => {
        test('increments view count successfully', async () => {
            videoService.incrementViews.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await videoController.incrementViews(req, res, mockNext);

            expect(videoService.incrementViews).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            videoService.incrementViews.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await videoController.incrementViews(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // === CORSI ===

    describe('getAllCourses', () => {
        test('returns paginated list of courses with filters', async () => {
            const result = { courses: [{ id: 1, title: 'Beginner Program' }], total: 1 };
            videoService.getAllCourses.mockResolvedValue(result);

            const req = mockReq({
                query: { difficulty: 'beginner', category: 'fitness', search: 'program', isPublished: 'true', page: '1', limit: '10' }
            });
            const res = mockRes();

            await videoController.getAllCourses(req, res, mockNext);

            expect(videoService.getAllCourses).toHaveBeenCalledWith('tenant-1', {
                difficulty: 'beginner',
                category: 'fitness',
                search: 'program',
                isPublished: true,
                page: 1,
                limit: 10
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('uses defaults when no query params', async () => {
            videoService.getAllCourses.mockResolvedValue({ courses: [], total: 0 });

            const req = mockReq();
            const res = mockRes();

            await videoController.getAllCourses(req, res, mockNext);

            expect(videoService.getAllCourses).toHaveBeenCalledWith('tenant-1', {
                difficulty: undefined,
                category: undefined,
                search: undefined,
                isPublished: undefined,
                page: 1,
                limit: 20
            });
        });
    });

    describe('getCourseById', () => {
        test('returns a single course', async () => {
            const course = { id: 3, title: 'Advanced Course' };
            videoService.getCourseById.mockResolvedValue(course);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await videoController.getCourseById(req, res, mockNext);

            expect(videoService.getCourseById).toHaveBeenCalledWith(3, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { course } });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Not found');
            videoService.getCourseById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await videoController.getCourseById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createCourse', () => {
        test('returns 201 with created course', async () => {
            videoService.createCourse.mockResolvedValue({ courseId: 15 });
            const course = { id: 15, title: 'New Course' };
            videoService.getCourseById.mockResolvedValue(course);

            const req = mockReq({
                body: { title: 'New Course', difficulty: 'intermediate' }
            });
            const res = mockRes();

            await videoController.createCourse(req, res, mockNext);

            expect(videoService.createCourse).toHaveBeenCalledWith('tenant-1', req.body, 1);
            expect(videoService.getCourseById).toHaveBeenCalledWith(15, 'tenant-1');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Corso creato',
                data: { course }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Creation failed');
            videoService.createCourse.mockRejectedValue(error);

            const req = mockReq({ body: { title: 'Fail Course' } });
            const res = mockRes();

            await videoController.createCourse(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateCourse', () => {
        test('returns updated course', async () => {
            videoService.updateCourse.mockResolvedValue();
            const course = { id: 3, title: 'Updated Course' };
            videoService.getCourseById.mockResolvedValue(course);

            const req = mockReq({ params: { id: '3' }, body: { title: 'Updated Course' } });
            const res = mockRes();

            await videoController.updateCourse(req, res, mockNext);

            expect(videoService.updateCourse).toHaveBeenCalledWith(3, 'tenant-1', { title: 'Updated Course' });
            expect(videoService.getCourseById).toHaveBeenCalledWith(3, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Corso aggiornato',
                data: { course }
            });
        });
    });

    describe('deleteCourse', () => {
        test('returns success on deletion', async () => {
            videoService.deleteCourse.mockResolvedValue();

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await videoController.deleteCourse(req, res, mockNext);

            expect(videoService.deleteCourse).toHaveBeenCalledWith(3, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Corso eliminato' });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Delete failed');
            videoService.deleteCourse.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await videoController.deleteCourse(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // === PROGRESSO CORSO ===

    describe('getCourseProgress', () => {
        test('returns course progress for current user', async () => {
            const progress = { completedModules: 3, totalModules: 10, percentage: 30 };
            videoService.getCourseProgress.mockResolvedValue(progress);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await videoController.getCourseProgress(req, res, mockNext);

            expect(videoService.getCourseProgress).toHaveBeenCalledWith(3, 1);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { progress } });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            videoService.getCourseProgress.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await videoController.getCourseProgress(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateModuleProgress', () => {
        test('updates module progress successfully', async () => {
            videoService.updateModuleProgress.mockResolvedValue();

            const req = mockReq({
                params: { courseId: '3', moduleId: '7' },
                body: { completed: true, watchedSeconds: 300 }
            });
            const res = mockRes();

            await videoController.updateModuleProgress(req, res, mockNext);

            expect(videoService.updateModuleProgress).toHaveBeenCalledWith(3, 7, 1, {
                completed: true,
                watchedSeconds: 300
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Progresso aggiornato' });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Update failed');
            videoService.updateModuleProgress.mockRejectedValue(error);

            const req = mockReq({
                params: { courseId: '3', moduleId: '7' },
                body: {}
            });
            const res = mockRes();

            await videoController.updateModuleProgress(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // === STATISTICHE ===

    describe('getStats', () => {
        test('returns video statistics', async () => {
            const stats = { totalVideos: 25, totalCourses: 5, totalViews: 1000 };
            videoService.getStats.mockResolvedValue(stats);

            const req = mockReq();
            const res = mockRes();

            await videoController.getStats(req, res, mockNext);

            expect(videoService.getStats).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { stats } });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            videoService.getStats.mockRejectedValue(error);

            await videoController.getStats(mockReq(), mockRes(), mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // === UPLOAD ===

    describe('uploadFile', () => {
        test('returns file data on successful upload', async () => {
            const req = mockReq({
                file: {
                    path: 'uploads/video-123.mp4',
                    filename: 'video-123.mp4',
                    originalname: 'my-video.mp4',
                    size: 5242880,
                    mimetype: 'video/mp4'
                }
            });
            const res = mockRes();

            await videoController.uploadFile(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    url: 'https://cdn.example.com/uploads/video-123.mp4',
                    filename: 'video-123.mp4',
                    originalName: 'my-video.mp4',
                    size: 5242880,
                    mimetype: 'video/mp4'
                }
            });
        });

        test('returns 400 when no file is uploaded', async () => {
            const req = mockReq();
            const res = mockRes();

            await videoController.uploadFile(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Nessun file caricato'
            });
        });
    });
});
