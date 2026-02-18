/**
 * Tests for VolumeService
 * Weekly volume calculation, volume analytics, mesocycle summary,
 * mesocycle comparison, plateau detection, muscle priorities
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const volumeService = require('../src/services/volume.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// calculateWeeklyVolume
// =============================================
describe('VolumeService.calculateWeeklyVolume', () => {
    test('calculates and upserts weekly volume for each muscle group', async () => {
        // First query: aggregate volume data per muscle group
        mockQuery.mockResolvedValueOnce([
            { muscle_group_id: 1, total_sets: 12, total_reps: 96, total_volume: 9600, avg_rpe: 7.5, avg_weight: 80 },
            { muscle_group_id: 2, total_sets: 8, total_reps: 64, total_volume: 5120, avg_rpe: 8.0, avg_weight: 60 }
        ]);

        // Second query: find active program
        mockQuery.mockResolvedValueOnce([
            { program_id: 5, mesocycle_id: 3, week_number: 2 }
        ]);

        // Third + Fourth: upsert for each muscle group
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await volumeService.calculateWeeklyVolume(10, 'tenant-1', '2025-03-03');

        expect(result).toHaveLength(2);
        expect(result[0].muscle_group_id).toBe(1);
        expect(result[0].total_sets).toBe(12);

        // Volume aggregation query must include tenant_id
        const volumeCall = mockQuery.mock.calls[0];
        expect(volumeCall[0]).toContain('tenant_id');
        expect(volumeCall[1]).toContain('tenant-1');

        // Active program query must include tenant_id
        const programCall = mockQuery.mock.calls[1];
        expect(programCall[0]).toContain('tenant_id');
        expect(programCall[1]).toContain('tenant-1');

        // Upsert queries must include tenant_id
        const upsertCall1 = mockQuery.mock.calls[2];
        expect(upsertCall1[0]).toContain('INSERT INTO weekly_volume_analytics');
        expect(upsertCall1[0]).toContain('tenant_id');
        expect(upsertCall1[1][0]).toBe('tenant-1');

        // Total calls: 1 (volume) + 1 (program) + 2 (upserts) = 4
        expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    test('handles no active program gracefully', async () => {
        mockQuery.mockResolvedValueOnce([
            { muscle_group_id: 1, total_sets: 5, total_reps: 40, total_volume: 4000, avg_rpe: 7, avg_weight: 70 }
        ]);

        // No active program
        mockQuery.mockResolvedValueOnce([]);

        // Upsert with null program_id and mesocycle_id
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        await volumeService.calculateWeeklyVolume(10, 'tenant-1', '2025-03-03');

        const upsertCall = mockQuery.mock.calls[2];
        expect(upsertCall[1][2]).toBeNull(); // program_id
        expect(upsertCall[1][3]).toBeNull(); // mesocycle_id
        expect(upsertCall[1][4]).toBe(1);    // default week_number
    });

    test('returns empty array when no volume data exists', async () => {
        mockQuery.mockResolvedValueOnce([]); // No volume data
        mockQuery.mockResolvedValueOnce([]); // No active program

        const result = await volumeService.calculateWeeklyVolume(10, 'tenant-1', '2025-03-03');

        expect(result).toEqual([]);
        // No upsert calls should be made
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});

// =============================================
// getVolumeByClient
// =============================================
describe('VolumeService.getVolumeByClient', () => {
    test('returns volume analytics with default 12 weeks', async () => {
        mockQuery.mockResolvedValueOnce([
            { muscle_group_name: 'Chest', total_sets: 15, total_volume: 12000, week_start: '2025-02-24' },
            { muscle_group_name: 'Back', total_sets: 18, total_volume: 14400, week_start: '2025-02-24' }
        ]);

        const result = await volumeService.getVolumeByClient(10, 'tenant-1');

        expect(result).toHaveLength(2);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('wva.tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1', 12]); // default 12 weeks
    });

    test('filters by muscleGroupId and mesocycleId', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await volumeService.getVolumeByClient(10, 'tenant-1', {
            weeks: 8,
            muscleGroupId: 3,
            mesocycleId: 2
        });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('wva.muscle_group_id = ?');
        expect(call[0]).toContain('wva.mesocycle_id = ?');
        expect(call[1]).toEqual([10, 'tenant-1', 8, 3, 2]);
    });
});

// =============================================
// getMesocycleSummary
// =============================================
describe('VolumeService.getMesocycleSummary', () => {
    test('returns aggregated volume summary per muscle group for a program', async () => {
        mockQuery.mockResolvedValueOnce([
            { muscle_group_id: 1, name: 'Chest', total_sets: 48, total_reps: 384, total_volume: 38400, avg_rpe: 7.8, weeks_trained: 4 },
            { muscle_group_id: 2, name: 'Back', total_sets: 52, total_reps: 416, total_volume: 41600, avg_rpe: 7.5, weeks_trained: 4 }
        ]);

        const result = await volumeService.getMesocycleSummary(10, 'tenant-1', 5);

        expect(result).toHaveLength(2);
        expect(result[1].name).toBe('Back');
        expect(result[1].weeks_trained).toBe(4);

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('wva.tenant_id');
        expect(call[0]).toContain('wva.program_id');
        expect(call[1]).toEqual([10, 'tenant-1', 5]);
    });
});

// =============================================
// compareMesocycles
// =============================================
describe('VolumeService.compareMesocycles', () => {
    test('returns cross-mesocycle comparison data', async () => {
        mockQuery.mockResolvedValueOnce([
            { mesocycle_id: 1, mesocycle_name: 'Hypertrophy', muscle_group_id: 1, muscle_group_name: 'Chest', avg_weekly_sets: 12, avg_weekly_volume: 9600 },
            { mesocycle_id: 2, mesocycle_name: 'Strength', muscle_group_id: 1, muscle_group_name: 'Chest', avg_weekly_sets: 8, avg_weekly_volume: 12800 }
        ]);

        const result = await volumeService.compareMesocycles(10, 'tenant-1');

        expect(result).toHaveLength(2);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('wva.tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1']);
    });
});

// =============================================
// detectVolumePlateau
// =============================================
describe('VolumeService.detectVolumePlateau', () => {
    test('detects plateau when volume varies less than 5% for 3+ weeks', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                muscle_group_id: 1,
                name: 'Chest',
                name_it: 'Petto',
                sets_trend: '12,12,12',
                volume_trend: '10000,10100,10050', // < 5% variation
                weeks_count: 3
            }
        ]);

        const result = await volumeService.detectVolumePlateau(10, 'tenant-1');

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('volume_plateau');
        expect(result[0].muscleGroupId).toBe(1);
        expect(result[0].muscleName).toBe('Petto');
        expect(result[0].weeks).toBe(3);

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('wva.tenant_id');
        expect(call[1]).toContain('tenant-1');
    });

    test('does not flag plateau when volume varies more than 5%', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                muscle_group_id: 1,
                name: 'Chest',
                name_it: 'Petto',
                sets_trend: '10,14,18',
                volume_trend: '8000,11200,14400', // clearly increasing
                weeks_count: 3
            }
        ]);

        const result = await volumeService.detectVolumePlateau(10, 'tenant-1');

        expect(result).toHaveLength(0);
    });

    test('returns empty when no groups have 3+ weeks of data', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await volumeService.detectVolumePlateau(10, 'tenant-1');

        expect(result).toEqual([]);
    });
});

// =============================================
// getMusclePriorities
// =============================================
describe('VolumeService.getMusclePriorities', () => {
    test('returns muscle priorities ordered by priority level', async () => {
        mockQuery.mockResolvedValueOnce([
            { muscle_group_id: 1, priority: 'high', name: 'Chest', name_it: 'Petto' },
            { muscle_group_id: 3, priority: 'medium', name: 'Back', name_it: 'Dorso' }
        ]);

        const result = await volumeService.getMusclePriorities(10, 'tenant-1');

        expect(result).toHaveLength(2);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('cmp.tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1']);
    });
});

// =============================================
// setMusclePriority
// =============================================
describe('VolumeService.setMusclePriority', () => {
    test('upserts muscle priority for a client', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await volumeService.setMusclePriority(10, 'tenant-1', 1, 'high', 'Weak point');

        expect(result).toEqual({ success: true });
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('INSERT INTO client_muscle_priorities');
        expect(call[0]).toContain('tenant_id');
        expect(call[0]).toContain('ON DUPLICATE KEY UPDATE');
        expect(call[1][0]).toBe('tenant-1');
    });
});

// =============================================
// deleteMusclePriority
// =============================================
describe('VolumeService.deleteMusclePriority', () => {
    test('deletes a muscle priority with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await volumeService.deleteMusclePriority(10, 'tenant-1', 1);

        expect(result).toBe(true);
        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('DELETE FROM client_muscle_priorities');
        expect(call[0]).toContain('tenant_id');
        expect(call[1]).toEqual([10, 'tenant-1', 1]);
    });

    test('returns false when priority not found', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await volumeService.deleteMusclePriority(10, 'tenant-1', 999);

        expect(result).toBe(false);
    });
});
