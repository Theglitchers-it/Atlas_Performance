/**
 * Tests for TitleService
 * Achievement titles: getTitles, getTitleById, getDisplayedTitle, setDisplayedTitle,
 * getManageableTitles, createTitle, updateTitle, deleteTitle
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const titleService = require('../src/services/title.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// getTitles
// =============================================
describe('TitleService.getTitles', () => {
    test('returns all titles for a client with tenant_id scoping', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, title_name: 'Bench Beginner', exercise_name: 'Bench Press', unlocked: 0 },
            { id: 2, title_name: 'Squat Novice', exercise_name: 'Squat', unlocked: 1, unlocked_at: '2026-01-15' }
        ]);

        const result = await titleService.getTitles('tenant-1', 10);

        expect(result).toHaveLength(2);
        expect(result[0].title_name).toBe('Bench Beginner');

        // Verify tenant_id in query
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('at.tenant_id');
        expect(call[1]).toContain('tenant-1');
        // Verify client_id
        expect(call[1]).toContain(10);
    });

    test('filters by category', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await titleService.getTitles('tenant-1', 10, { category: 'strength' });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('at.category = ?');
        expect(call[1]).toContain('strength');
    });

    test('filters by exerciseId', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await titleService.getTitles('tenant-1', 10, { exerciseId: 5 });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('at.exercise_id = ?');
        expect(call[1]).toContain(5);
    });

    test('filters to unlocked titles only', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await titleService.getTitles('tenant-1', 10, { unlockedOnly: true });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ct.id IS NOT NULL');
    });

    test('returns empty array when no titles exist', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await titleService.getTitles('tenant-1', 10);

        expect(result).toEqual([]);
    });
});

// =============================================
// getTitleById
// =============================================
describe('TitleService.getTitleById', () => {
    test('returns a specific title with unlock status', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1,
                title_name: 'Bench Master',
                exercise_name: 'Bench Press',
                unlocked: 1,
                unlocked_at: '2026-01-10',
                unlocked_value: 120,
                is_displayed: 1
            }
        ]);

        const result = await titleService.getTitleById(1, 10);

        expect(result.title_name).toBe('Bench Master');
        expect(result.unlocked).toBe(1);
        expect(result.unlocked_value).toBe(120);
    });

    test('returns null when title does not exist', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await titleService.getTitleById(999, 10);

        expect(result).toBeNull();
    });
});

// =============================================
// getDisplayedTitle
// =============================================
describe('TitleService.getDisplayedTitle', () => {
    test('returns the currently displayed title for a client', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 3,
                title_name: 'Iron Warrior',
                unlocked_at: '2026-01-05',
                unlocked_value: 200
            }
        ]);

        const result = await titleService.getDisplayedTitle('tenant-1', 10);

        expect(result.title_name).toBe('Iron Warrior');

        // Verify tenant_id scoping
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ct.tenant_id = ?');
        expect(call[1]).toEqual([10, 'tenant-1']);
    });

    test('returns null when no title is displayed', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await titleService.getDisplayedTitle('tenant-1', 10);

        expect(result).toBeNull();
    });
});

// =============================================
// setDisplayedTitle
// =============================================
describe('TitleService.setDisplayedTitle', () => {
    test('clears current display and sets new title', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 })  // UPDATE is_displayed = 0
            .mockResolvedValueOnce({ affectedRows: 1 }); // UPDATE is_displayed = 1

        await titleService.setDisplayedTitle('tenant-1', 10, 3);

        // First call: clear all displayed titles for client
        expect(mockQuery.mock.calls[0][0]).toContain('is_displayed = 0');
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([10, 'tenant-1']);

        // Second call: set new displayed title
        expect(mockQuery.mock.calls[1][0]).toContain('is_displayed = 1');
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1]).toEqual([10, 'tenant-1', 3]);
    });

    test('only clears display when titleId is null', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 }); // UPDATE is_displayed = 0

        await titleService.setDisplayedTitle('tenant-1', 10, null);

        // Should only clear, not set a new one
        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('is_displayed = 0');
    });
});

// =============================================
// getManageableTitles
// =============================================
describe('TitleService.getManageableTitles', () => {
    test('returns tenant-specific titles for management', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, title_name: 'Custom Title', tenant_id: 'tenant-1', exercise_name: 'Squat' },
            { id: 2, title_name: 'Another Title', tenant_id: 'tenant-1', exercise_name: null }
        ]);

        const result = await titleService.getManageableTitles('tenant-1');

        expect(result).toHaveLength(2);

        // Verify tenant_id scoping
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('at.tenant_id = ?'),
            ['tenant-1']
        );
    });

    test('returns empty array when tenant has no custom titles', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await titleService.getManageableTitles('tenant-1');

        expect(result).toEqual([]);
    });
});

// =============================================
// createTitle
// =============================================
describe('TitleService.createTitle', () => {
    test('creates a new title for a tenant', async () => {
        // Exercise lookup
        mockQuery.mockResolvedValueOnce([{ id: 5 }]);
        // INSERT title
        mockQuery.mockResolvedValueOnce({ insertId: 10 });

        const result = await titleService.createTitle('tenant-1', {
            title_name: 'Squat King',
            title_description: 'Squat 200kg',
            category: 'strength',
            exercise_name: 'Squat',
            metric_type: 'weight_kg',
            threshold_value: 200,
            rarity: 'legendary',
            sort_order: 1
        });

        expect(result.id).toBe(10);
        expect(result.title_name).toBe('Squat King');
        expect(result.rarity).toBe('legendary');

        // Verify tenant_id in exercise lookup
        const exerciseCall = mockQuery.mock.calls[0];
        expect(exerciseCall[0]).toContain('tenant_id = ?');
        expect(exerciseCall[1]).toContain('tenant-1');

        // Verify tenant_id in INSERT
        const insertCall = mockQuery.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO achievement_titles');
        expect(insertCall[1][0]).toBe('tenant-1');
    });

    test('creates title without exercise association', async () => {
        // No exercise lookup needed
        mockQuery.mockResolvedValueOnce({ insertId: 11 });

        const result = await titleService.createTitle('tenant-1', {
            title_name: 'Consistency Champion',
            threshold_value: 30
        });

        expect(result.id).toBe(11);
        expect(result.title_name).toBe('Consistency Champion');

        // Only one query (INSERT), no exercise lookup
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('handles exercise not found gracefully (exerciseId set to null)', async () => {
        // Exercise lookup returns empty
        mockQuery.mockResolvedValueOnce([]);
        // INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 12 });

        const result = await titleService.createTitle('tenant-1', {
            title_name: 'Unknown Exercise Title',
            exercise_name: 'NonExistentExercise',
            threshold_value: 100
        });

        expect(result.id).toBe(12);
        // exerciseId should be null in the INSERT params
        // Params: [tenantId, title_name, title_description, category, exerciseId, ...]
        const insertCall = mockQuery.mock.calls[1];
        expect(insertCall[1][4]).toBeNull(); // exercise_id is at index 4
    });
});

// =============================================
// updateTitle
// =============================================
describe('TitleService.updateTitle', () => {
    test('updates an existing title owned by tenant', async () => {
        // Ownership check
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // UPDATE
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await titleService.updateTitle('tenant-1', 1, {
            title_name: 'Updated Title',
            threshold_value: 250
        });

        expect(result.id).toBe(1);
        expect(result.title_name).toBe('Updated Title');

        // Verify tenant_id in ownership check
        const ownerCheck = mockQuery.mock.calls[0];
        expect(ownerCheck[0]).toContain('tenant_id = ?');
        expect(ownerCheck[1]).toEqual([1, 'tenant-1']);

        // Verify tenant_id in UPDATE WHERE clause
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('WHERE id = ? AND tenant_id = ?');
    });

    test('returns null when title does not belong to tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // Not found for tenant

        const result = await titleService.updateTitle('wrong-tenant', 1, {
            title_name: 'Hacked Title'
        });

        expect(result).toBeNull();
        // Should NOT have called UPDATE
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('returns existing title when no fields to update', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 1 }]); // Ownership check

        const result = await titleService.updateTitle('tenant-1', 1, {});

        // Should return existing without calling UPDATE
        expect(result).toEqual({ id: 1 });
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('resolves exercise_name to exercise_id during update', async () => {
        // Ownership check
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Exercise lookup
        mockQuery.mockResolvedValueOnce([{ id: 7 }]);
        // UPDATE
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        await titleService.updateTitle('tenant-1', 1, {
            exercise_name: 'Deadlift'
        });

        // Verify exercise lookup used tenant_id
        const exerciseCall = mockQuery.mock.calls[1];
        expect(exerciseCall[0]).toContain('tenant_id = ?');
        expect(exerciseCall[1]).toContain('tenant-1');
    });
});

// =============================================
// deleteTitle
// =============================================
describe('TitleService.deleteTitle', () => {
    test('deletes title and associated client_titles', async () => {
        // Ownership check
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // DELETE client_titles
        mockQuery.mockResolvedValueOnce({ affectedRows: 3 });
        // DELETE achievement_titles
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await titleService.deleteTitle('tenant-1', 1);

        expect(result).toBe(true);

        // Verify tenant_id in ownership check
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);

        // Verify tenant_id in DELETE client_titles
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1]).toEqual([1, 'tenant-1']);

        // Verify tenant_id in DELETE achievement_titles
        expect(mockQuery.mock.calls[2][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[2][1]).toEqual([1, 'tenant-1']);
    });

    test('returns false when title does not belong to tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // Not found

        const result = await titleService.deleteTitle('wrong-tenant', 999);

        expect(result).toBe(false);
        // Should NOT have called DELETE
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});
