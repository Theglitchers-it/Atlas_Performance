/**
 * Tests for ProgressService
 * Progress photos CRUD, performance records (PR), personal bests, record history
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const progressService = require('../src/services/progress.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// getPhotos
// =============================================
describe('ProgressService.getPhotos', () => {
    test('returns paginated photo list for a client', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }]) // COUNT
            .mockResolvedValueOnce([                // SELECT
                { id: 1, photo_url: 'https://s3/photo1.jpg', photo_type: 'front', taken_at: '2025-01-01' },
                { id: 2, photo_url: 'https://s3/photo2.jpg', photo_type: 'side', taken_at: '2025-01-15' }
            ]);

        const result = await progressService.getPhotos(10, 'tenant-1');

        expect(result.photos).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);

        // Both queries must include tenant_id
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
        expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id');
        expect(mockQuery.mock.calls[1][1]).toContain('tenant-1');
    });

    test('filters by photoType', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, photo_type: 'front' }]);

        await progressService.getPhotos(10, 'tenant-1', { photoType: 'front' });

        // The count query should use the photoType branch
        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('photo_type');
        expect(countCall[1]).toContain('front');

        // The data query should also filter by photo_type
        const dataCall = mockQuery.mock.calls[1];
        expect(dataCall[0]).toContain('photo_type');
    });

    test('applies date range filters', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await progressService.getPhotos(10, 'tenant-1', {
            startDate: '2025-01-01',
            endDate: '2025-06-30'
        });

        const dataCall = mockQuery.mock.calls[1];
        expect(dataCall[0]).toContain('taken_at >=');
        expect(dataCall[0]).toContain('taken_at <=');
        expect(dataCall[1]).toContain('2025-01-01');
        expect(dataCall[1]).toContain('2025-06-30');
    });
});

// =============================================
// addPhoto
// =============================================
describe('ProgressService.addPhoto', () => {
    test('inserts a progress photo and returns insertId', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 42 });

        const result = await progressService.addPhoto(10, 'tenant-1', {
            photoUrl: 'https://s3/photo.jpg',
            thumbnailUrl: 'https://s3/thumb.jpg',
            photoType: 'front',
            takenAt: '2025-03-01',
            notes: 'Week 4',
            bodyWeight: 80.5,
            bodyFatPct: 15.2
        });

        expect(result.id).toBe(42);

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('INSERT INTO progress_photos');
        expect(call[0]).toContain('tenant_id');
        expect(call[1][0]).toBe('tenant-1');  // tenant_id first in VALUES
        expect(call[1][1]).toBe(10);           // client_id
        expect(call[1][2]).toBe('https://s3/photo.jpg');
    });

    test('defaults photoType to front when not provided', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 43 });

        await progressService.addPhoto(10, 'tenant-1', {
            photoUrl: 'https://s3/photo.jpg'
        });

        const call = mockQuery.mock.calls[0];
        // photoType defaults to 'front' (index 4 in the params array)
        expect(call[1][4]).toBe('front');
    });
});

// =============================================
// deletePhoto
// =============================================
describe('ProgressService.deletePhoto', () => {
    test('returns true when photo is deleted', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await progressService.deletePhoto(5, 'tenant-1');

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM progress_photos');
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([5, 'tenant-1']);
    });

    test('returns false when photo not found (tenant isolation)', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await progressService.deletePhoto(999, 'tenant-other');

        expect(result).toBe(false);
    });
});

// =============================================
// getPhotoComparison
// =============================================
describe('ProgressService.getPhotoComparison', () => {
    test('fetches photos for two dates to compare', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, taken_at: '2025-01-01', photo_type: 'front' },
            { id: 2, taken_at: '2025-03-01', photo_type: 'front' }
        ]);

        const result = await progressService.getPhotoComparison(
            10, 'tenant-1', '2025-01-01', '2025-03-01', 'front'
        );

        expect(result).toHaveLength(2);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1', 'front', '2025-01-01', '2025-03-01']);
    });
});

// =============================================
// addRecord (Performance Record / PR)
// =============================================
describe('ProgressService.addRecord', () => {
    test('creates PR and returns improvement over previous value', async () => {
        // First query: get previous record
        mockQuery.mockResolvedValueOnce([{ value: 90 }]);
        // Second query: INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 7 });

        const result = await progressService.addRecord(10, 'tenant-1', {
            exerciseId: 5,
            recordType: '1rm',
            value: 100,
            sessionId: 3,
            notes: 'New bench PR!'
        });

        expect(result.id).toBe(7);
        expect(result.previousValue).toBe(90);
        expect(result.improvement).toBe(10);

        // Previous record query must scope to tenant_id
        const prevCall = mockQuery.mock.calls[0];
        expect(prevCall[0]).toContain('tenant_id');
        expect(prevCall[1]).toContain('tenant-1');

        // Insert query must include tenant_id
        const insertCall = mockQuery.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO performance_records');
        expect(insertCall[0]).toContain('tenant_id');
        expect(insertCall[1][0]).toBe('tenant-1');
    });

    test('handles first-ever record (no previous value)', async () => {
        mockQuery.mockResolvedValueOnce([]); // No previous records
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await progressService.addRecord(10, 'tenant-1', {
            exerciseId: 5,
            recordType: '1rm',
            value: 60
        });

        expect(result.previousValue).toBeNull();
        expect(result.improvement).toBeNull();
    });
});

// =============================================
// getPersonalBests
// =============================================
describe('ProgressService.getPersonalBests', () => {
    test('returns personal best records for client', async () => {
        mockQuery.mockResolvedValueOnce([
            { exercise_id: 1, exercise_name: 'Bench Press', record_type: '1rm', value: 120, recorded_at: '2025-03-01' },
            { exercise_id: 2, exercise_name: 'Squat', record_type: '1rm', value: 160, recorded_at: '2025-02-15' }
        ]);

        const result = await progressService.getPersonalBests(10, 'tenant-1');

        expect(result).toHaveLength(2);
        expect(result[0].exercise_name).toBe('Bench Press');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        // The query uses tenant_id in both the subquery and outer WHERE
        expect(call[1]).toEqual([10, 'tenant-1', 10, 'tenant-1']);
    });
});

// =============================================
// getRecordHistory
// =============================================
describe('ProgressService.getRecordHistory', () => {
    test('returns chronological record history for an exercise', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, value: 80, recorded_at: '2025-01-01', exercise_name: 'Bench Press' },
            { id: 2, value: 90, recorded_at: '2025-02-01', exercise_name: 'Bench Press' },
            { id: 3, value: 100, recorded_at: '2025-03-01', exercise_name: 'Bench Press' }
        ]);

        const result = await progressService.getRecordHistory(10, 'tenant-1', 5, '1rm');

        expect(result).toHaveLength(3);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[0]).toContain('ORDER BY pr.recorded_at ASC');
        expect(call[1]).toEqual([10, 'tenant-1', 5, '1rm']);
    });
});

// =============================================
// deleteRecord
// =============================================
describe('ProgressService.deleteRecord', () => {
    test('deletes a performance record with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await progressService.deleteRecord(7, 'tenant-1');

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM performance_records');
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([7, 'tenant-1']);
    });

    test('returns false for non-existent record', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await progressService.deleteRecord(999, 'tenant-1');

        expect(result).toBe(false);
    });
});

// =============================================
// getRecords
// =============================================
describe('ProgressService.getRecords', () => {
    test('returns records with optional filters', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, exercise_name: 'Squat', record_type: '1rm', value: 140 }
        ]);

        const result = await progressService.getRecords(10, 'tenant-1', {
            exerciseId: 2,
            recordType: '1rm',
            limit: 10
        });

        expect(result).toHaveLength(1);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('pr.tenant_id');
        expect(call[0]).toContain('pr.exercise_id');
        expect(call[0]).toContain('pr.record_type');
        expect(call[1]).toContain('tenant-1');
        expect(call[1]).toContain(2);      // exerciseId
        expect(call[1]).toContain('1rm');   // recordType
    });

    test('returns all records when no filters applied', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await progressService.getRecords(10, 'tenant-1');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('pr.tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1', 50]); // default limit
    });
});
