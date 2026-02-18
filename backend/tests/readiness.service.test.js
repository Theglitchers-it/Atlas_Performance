/**
 * Tests for ReadinessService
 * Check-in, readiness score calculation, alerts
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const readinessService = require('../src/services/readiness.service');

beforeEach(() => jest.clearAllMocks());

describe('ReadinessService.getCheckin', () => {
    test('returns check-in for date', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1,
            sleep_quality: 4,
            energy_level: 3,
            stress_level: 2,
            readiness_score: 75
        }]);

        const result = await readinessService.getCheckin(1, 'tenant-1', '2026-02-16');
        expect(result.readiness_score).toBe(75);
    });

    test('returns null for no check-in', async () => {
        mockQuery.mockResolvedValueOnce([]);
        const result = await readinessService.getCheckin(1, 'tenant-1', '2026-02-16');
        expect(result).toBeNull();
    });
});

describe('ReadinessService.getHistory', () => {
    test('returns check-in history', async () => {
        mockQuery.mockResolvedValueOnce([
            { checkin_date: '2026-02-16', readiness_score: 75 },
            { checkin_date: '2026-02-15', readiness_score: 80 }
        ]);

        const result = await readinessService.getHistory(1, 'tenant-1');
        expect(result).toHaveLength(2);
    });
});

describe('ReadinessService.saveCheckin', () => {
    test('creates new check-in', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // getCheckin: no existing check-in
            .mockResolvedValueOnce({ insertId: 10 }) // INSERT
            .mockResolvedValueOnce([{ id: 10, readiness_score: 80 }]); // getCheckin after insert (return value)

        const result = await readinessService.saveCheckin(1, 'tenant-1', {
            checkinDate: '2026-02-16',
            sleepQuality: 4,
            sleepHours: 7.5,
            energyLevel: 4,
            stressLevel: 2,
            sorenessLevel: 3,
            motivationLevel: 4
        });

        expect(result).toBeDefined();
    });

    test('updates existing check-in', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 5 }]) // getCheckin: existing check-in
            .mockResolvedValueOnce([]) // UPDATE
            .mockResolvedValueOnce([{ id: 5, readiness_score: 95 }]); // getCheckin after update (return value)

        const result = await readinessService.saveCheckin(1, 'tenant-1', {
            checkinDate: '2026-02-16',
            sleepQuality: 5,
            sleepHours: 8,
            energyLevel: 5,
            stressLevel: 1,
            sorenessLevel: 1,
            motivationLevel: 5
        });

        expect(mockQuery.mock.calls[1][0]).toContain('UPDATE');
    });
});

describe('ReadinessService.calculateReadinessScore', () => {
    test('perfect scores return high readiness', () => {
        const score = readinessService.calculateReadinessScore({
            sleepQuality: 5,
            sleepHours: 8,
            energyLevel: 5,
            stressLevel: 1,
            sorenessLevel: 1,
            motivationLevel: 5
        });

        expect(score).toBeGreaterThanOrEqual(70);
    });

    test('poor scores return low readiness', () => {
        const score = readinessService.calculateReadinessScore({
            sleepQuality: 1,
            sleepHours: 4,
            energyLevel: 1,
            stressLevel: 5,
            sorenessLevel: 5,
            motivationLevel: 1
        });

        expect(score).toBeLessThanOrEqual(40);
    });

    test('score is between 0 and 100', () => {
        const score = readinessService.calculateReadinessScore({
            sleepQuality: 3,
            sleepHours: 6,
            energyLevel: 3,
            stressLevel: 3,
            sorenessLevel: 3,
            motivationLevel: 3
        });

        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });
});

describe('ReadinessService.getAverageReadiness', () => {
    test('returns average readiness metrics', async () => {
        mockQuery.mockResolvedValueOnce([{
            avg_readiness: 75,
            avg_sleep: 3.5,
            avg_energy: 4,
            avg_stress: 2.5
        }]);

        const result = await readinessService.getAverageReadiness(1, 'tenant-1', 7);
        expect(result.avg_readiness).toBe(75);
    });
});
