/**
 * Tests for VideoService
 * Videos CRUD, courses, progress, stats
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const videoService = require('../src/services/video.service');

beforeEach(() => jest.clearAllMocks());

describe('VideoService.getAll', () => {
    test('returns paginated videos', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 5 }])
            .mockResolvedValueOnce([
                { id: 1, title: 'Squat Tutorial', video_type: 'tutorial' },
                { id: 2, title: 'Deadlift Guide', video_type: 'tutorial' }
            ]);

        const result = await videoService.getAll('tenant-1');
        expect(result.videos).toHaveLength(2);
        expect(result.pagination.total).toBe(5);
    });

    test('filters by video type', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await videoService.getAll('tenant-1', { videoType: 'tutorial' });
        expect(mockQuery.mock.calls[0][0]).toContain('video_type = ?');
    });
});

describe('VideoService.create', () => {
    test('creates new video', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 10 });

        const result = await videoService.create('tenant-1', {
            title: 'New Video',
            description: 'Tutorial',
            videoType: 'tutorial',
            isPublic: false
        }, 1);

        expect(result.videoId).toBe(10);
    });
});

describe('VideoService.incrementViews', () => {
    test('increments view count', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await videoService.incrementViews(1, 'tenant-1');
        expect(mockQuery.mock.calls[0][0]).toContain('views_count = views_count + 1');
    });
});

describe('VideoService.getAllCourses', () => {
    test('returns paginated courses', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }])
            .mockResolvedValueOnce([
                { id: 1, title: 'Fitness Base', modules_count: 5 },
                { id: 2, title: 'Advanced Training', modules_count: 10 }
            ]);

        const result = await videoService.getAllCourses('tenant-1');
        expect(result.courses).toHaveLength(2);
    });
});

describe('VideoService.createCourse', () => {
    test('creates course with modules', async () => {
        const mockConnection = {
            query: jest.fn()
                .mockResolvedValueOnce({ insertId: 5 }) // INSERT course
                .mockResolvedValueOnce({}) // INSERT module 1
                .mockResolvedValueOnce({}) // INSERT module 2
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));

        const result = await videoService.createCourse('tenant-1', {
            title: 'New Course',
            price: 29.90,
            modules: [
                { title: 'Module 1', orderIndex: 1 },
                { title: 'Module 2', orderIndex: 2 }
            ]
        }, 1);

        expect(result.courseId).toBe(5);
    });
});

describe('VideoService.updateModuleProgress', () => {
    test('creates new progress record', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // No existing progress
            .mockResolvedValueOnce({ insertId: 1 }); // INSERT

        await videoService.updateModuleProgress(1, 1, 5, {
            watchedSeconds: 120,
            isCompleted: false
        });

        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO course_progress');
    });

    test('updates existing progress', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1 }]) // Existing progress
            .mockResolvedValueOnce([]); // UPDATE

        await videoService.updateModuleProgress(1, 1, 5, {
            watchedSeconds: 300,
            isCompleted: true
        });

        expect(mockQuery.mock.calls[1][0]).toContain('UPDATE course_progress');
    });
});

describe('VideoService.getStats', () => {
    test('returns video/course statistics', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                total_videos: 20,
                total_views: 1000,
                course_videos: 10,
                demo_videos: 5,
                free_videos: 5
            }])
            .mockResolvedValueOnce([{
                total_courses: 5,
                published_courses: 3
            }]);

        const stats = await videoService.getStats('tenant-1');
        expect(stats.videos.total_videos).toBe(20);
        expect(stats.courses.total_courses).toBe(5);
    });
});
