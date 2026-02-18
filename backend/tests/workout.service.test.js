/**
 * Tests for WorkoutService
 * CRUD workout templates, duplicate, exercises
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const workoutService = require('../src/services/workout.service');

beforeEach(() => jest.clearAllMocks());

describe('WorkoutService.getAll', () => {
    test('returns paginated workout templates', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 5 }])
            .mockResolvedValueOnce([
                { id: 1, name: 'Push Day', category: 'strength' },
                { id: 2, name: 'Pull Day', category: 'strength' }
            ]);

        const result = await workoutService.getAll('tenant-1');
        expect(result.workouts).toHaveLength(2);
        expect(result.pagination.total).toBe(5);
    });

    test('filters by category and difficulty', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await workoutService.getAll('tenant-1', { category: 'cardio', difficulty: 'beginner' });
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toContain('category = ?');
        expect(sql).toContain('difficulty = ?');
    });

    test('search works', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([{ id: 1 }]);
        await workoutService.getAll('tenant-1', { search: 'push' });
        expect(mockQuery.mock.calls[0][0]).toContain('LIKE ?');
    });
});

describe('WorkoutService.getById', () => {
    test('returns template with exercises', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Push Day' }])
            .mockResolvedValueOnce([
                { id: 1, exercise_name: 'Bench Press', sets: 4 },
                { id: 2, exercise_name: 'OHP', sets: 3 }
            ]);

        const result = await workoutService.getById(1, 'tenant-1');
        expect(result.name).toBe('Push Day');
        expect(result.exercises).toHaveLength(2);
    });

    test('throws 404 for non-existent template', async () => {
        mockQuery.mockResolvedValueOnce([]);
        await expect(workoutService.getById(999, 'tenant-1'))
            .rejects.toEqual(expect.objectContaining({ status: 404 }));
    });
});

describe('WorkoutService.create', () => {
    test('creates template with exercises in transaction', async () => {
        const mockConnection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{ insertId: 5 }]) // INSERT template
                .mockResolvedValueOnce([{}]) // INSERT exercise 1
                .mockResolvedValueOnce([{}]) // INSERT exercise 2
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));

        const result = await workoutService.create('tenant-1', {
            name: 'Push Day',
            category: 'strength',
            difficulty: 'intermediate',
            exercises: [
                { exerciseId: 1, sets: 4, reps: '8-12', restSeconds: 90 },
                { exerciseId: 2, sets: 3, reps: '10-15', restSeconds: 60 }
            ]
        }, 1);

        expect(result.templateId).toBe(5);
        expect(mockConnection.execute).toHaveBeenCalledTimes(3);
    });
});

describe('WorkoutService.delete', () => {
    test('soft deletes template', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Push Day' }]) // getById: SELECT template
            .mockResolvedValueOnce([]) // getById: SELECT exercises
            .mockResolvedValueOnce([]); // UPDATE is_active = FALSE

        await workoutService.delete(1, 'tenant-1');
        expect(mockQuery.mock.calls[2][0]).toContain('is_active');
    });
});
