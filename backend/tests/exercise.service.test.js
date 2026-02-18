/**
 * Tests for ExerciseService
 * CRUD, muscle groups, search, soft delete
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const exerciseService = require('../src/services/exercise.service');

beforeEach(() => jest.clearAllMocks());

describe('ExerciseService.getAll', () => {
    test('returns paginated exercises with muscle groups', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }]) // count
            .mockResolvedValueOnce([
                { id: 1, name: 'Bench Press', category: 'compound' },
                { id: 2, name: 'Bicep Curl', category: 'isolation' }
            ]) // exercises
            .mockResolvedValueOnce([ // muscle groups for exercise 1
                { name: 'chest' },
                { name: 'triceps' }
            ])
            .mockResolvedValueOnce([ // muscle groups for exercise 2
                { name: 'biceps' }
            ]);

        const result = await exerciseService.getAll('tenant-1');
        expect(result.exercises).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
    });

    test('filters by category', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await exerciseService.getAll('tenant-1', { category: 'compound' });
        expect(mockQuery.mock.calls[0][0]).toContain('category = ?');
    });

    test('filters by difficulty', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await exerciseService.getAll('tenant-1', { difficulty: 'advanced' });
        expect(mockQuery.mock.calls[0][0]).toContain('difficulty = ?');
    });

    test('search passes search pattern with LIKE', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await exerciseService.getAll('tenant-1', { search: '100%_test' });
        const params = mockQuery.mock.calls[0][1];
        const searchParam = params.find(p => typeof p === 'string' && p.includes('100'));
        // Service wraps search term with % wildcards without escaping
        expect(searchParam).toContain('100%_test');
    });
});

describe('ExerciseService.getById', () => {
    test('returns exercise with muscle groups', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Bench Press', tenant_id: 'tenant-1' }])
            .mockResolvedValueOnce([{ name: 'chest' }, { name: 'triceps' }]);

        const result = await exerciseService.getById(1, 'tenant-1');
        expect(result.name).toBe('Bench Press');
        expect(result.muscleGroups).toHaveLength(2);
    });

    test('throws 404 for non-existent exercise', async () => {
        mockQuery.mockResolvedValueOnce([]);
        await expect(exerciseService.getById(999, 'tenant-1'))
            .rejects.toEqual(expect.objectContaining({ status: 404 }));
    });
});

describe('ExerciseService.create', () => {
    test('creates exercise with muscle groups', async () => {
        mockQuery
            .mockResolvedValueOnce({ insertId: 10 }) // INSERT exercise
            .mockResolvedValueOnce([]) // INSERT muscle group 1
            .mockResolvedValueOnce([]) // INSERT muscle group 2
            // getById called internally after create:
            .mockResolvedValueOnce([{ id: 10, name: 'Bench Press', tenant_id: 'tenant-1' }]) // SELECT exercise
            .mockResolvedValueOnce([{ name: 'chest' }, { name: 'triceps' }]); // SELECT muscle groups

        const result = await exerciseService.create('tenant-1', {
            name: 'Bench Press',
            category: 'strength',
            difficulty: 'intermediate',
            muscleGroups: [{ id: 1 }, { id: 2 }]
        });

        expect(result.name).toBe('Bench Press');
        expect(result.muscleGroups).toHaveLength(2);
    });
});

describe('ExerciseService.delete', () => {
    test('soft deletes exercise', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, is_custom: true, tenant_id: 'tenant-1' }]) // getById: SELECT exercise
            .mockResolvedValueOnce([{ name: 'chest' }]) // getById: SELECT muscle groups
            .mockResolvedValueOnce([]); // UPDATE is_active = FALSE

        await exerciseService.delete(1, 'tenant-1');
        expect(mockQuery.mock.calls[2][0]).toContain('is_active = FALSE');
    });
});

describe('ExerciseService.getCategories', () => {
    test('returns static categories list', () => {
        const categories = exerciseService.getCategories();
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
    });
});
