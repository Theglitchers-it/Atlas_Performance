/**
 * Tests for SessionService
 * Start, logSet, complete, skip, stats
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

// Mock client service (used for addXP, updateStreak)
jest.mock('../src/services/client.service', () => ({
    addXP: jest.fn().mockResolvedValue({}),
    updateStreak: jest.fn().mockResolvedValue(5)
}));

const sessionService = require('../src/services/session.service');

beforeEach(() => jest.clearAllMocks());

describe('SessionService.getByClient', () => {
    test('returns paginated sessions', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 10 }])
            .mockResolvedValueOnce([
                { id: 1, status: 'completed', duration_minutes: 45 },
                { id: 2, status: 'in_progress', duration_minutes: 0 }
            ]);

        const result = await sessionService.getByClient(1, 'tenant-1');
        expect(result.sessions).toHaveLength(2);
        expect(result.pagination.total).toBe(10);
    });

    test('filters by status', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await sessionService.getByClient(1, 'tenant-1', { status: 'completed' });
        expect(mockQuery.mock.calls[0][0]).toContain('ws.status = ?');
    });
});

describe('SessionService.getById', () => {
    test('returns session with exercises and sets', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, status: 'completed' }])
            .mockResolvedValueOnce([{ id: 1, exercise_name: 'Bench Press' }])
            .mockResolvedValueOnce([{ session_exercise_id: 1, set_number: 1, reps_completed: 10 }]);

        const result = await sessionService.getById(1, 'tenant-1');
        expect(result.id).toBe(1);
        expect(result.exercises).toHaveLength(1);
    });

    test('throws 404 for non-existent session', async () => {
        mockQuery.mockResolvedValueOnce([]);
        await expect(sessionService.getById(999, 'tenant-1'))
            .rejects.toEqual(expect.objectContaining({ status: 404 }));
    });
});

describe('SessionService.start', () => {
    test('starts a new workout session from template', async () => {
        mockQuery.mockResolvedValueOnce([
            { exercise_id: 1, sets: 3, reps: '10', rest_seconds: 60, order_index: 1 }
        ]);

        const mockConnection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{ insertId: 100 }]) // INSERT session
                .mockResolvedValueOnce([{}]) // INSERT session exercise
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));

        const result = await sessionService.start('tenant-1', {
            clientId: 1,
            templateId: 5
        });

        expect(result.sessionId).toBe(100);
    });
});

describe('SessionService.logSet', () => {
    test('logs a set for a session exercise', async () => {
        // getById does: SELECT session, SELECT exercises, then SELECT sets for each exercise
        mockQuery
            .mockResolvedValueOnce([{ id: 1, status: 'in_progress' }]) // getById: SELECT session
            .mockResolvedValueOnce([{ id: 10, exercise_name: 'Bench Press' }]) // getById: SELECT exercises
            .mockResolvedValueOnce([{ session_exercise_id: 10, set_number: 1 }]) // getById: SELECT sets for exercise 10
            .mockResolvedValueOnce({ insertId: 50 }); // INSERT set log

        const result = await sessionService.logSet(1, 'tenant-1', {
            sessionExerciseId: 1,
            setNumber: 1,
            repsCompleted: 10,
            weightUsed: 80,
            rpe: 8
        });

        expect(result.setLogId).toBe(50);
    });
});

describe('SessionService.complete', () => {
    test('completes session and awards XP', async () => {
        const clientService = require('../src/services/client.service');
        // First getById call (to verify session):
        mockQuery
            .mockResolvedValueOnce([{ id: 1, client_id: 5, status: 'in_progress', started_at: new Date(Date.now() - 3600000) }]) // getById: SELECT session
            .mockResolvedValueOnce([{ id: 10, exercise_name: 'Squat' }]) // getById: SELECT exercises
            .mockResolvedValueOnce([{ session_exercise_id: 10, set_number: 1 }]) // getById: SELECT sets for exercise
            .mockResolvedValueOnce([]) // UPDATE session (complete)
            // Second getById call (return value at end of complete):
            .mockResolvedValueOnce([{ id: 1, client_id: 5, status: 'completed', started_at: new Date(Date.now() - 3600000) }]) // getById: SELECT session
            .mockResolvedValueOnce([{ id: 10, exercise_name: 'Squat' }]) // getById: SELECT exercises
            .mockResolvedValueOnce([{ session_exercise_id: 10, set_number: 1 }]); // getById: SELECT sets for exercise

        await sessionService.complete(1, 'tenant-1', { overallFeeling: 'good' });

        expect(clientService.addXP).toHaveBeenCalledWith(5, 'tenant-1', expect.any(Number), 'workout', expect.any(String));
        expect(clientService.updateStreak).toHaveBeenCalledWith(5, 'tenant-1');
    });
});

describe('SessionService.skip', () => {
    test('skips session with reason', async () => {
        // getById does: SELECT session, SELECT exercises, SELECT sets per exercise
        mockQuery
            .mockResolvedValueOnce([{ id: 1, status: 'in_progress' }]) // getById: SELECT session
            .mockResolvedValueOnce([]) // getById: SELECT exercises (empty, no sets queries needed)
            .mockResolvedValueOnce([]); // UPDATE session (skip)

        await sessionService.skip(1, 'tenant-1', 'Not feeling well');
        // The UPDATE query is the 3rd call (index 2), after session SELECT and exercises SELECT
        expect(mockQuery.mock.calls[2][0]).toContain("status = 'skipped'");
    });
});

describe('SessionService.getStats', () => {
    test('returns workout statistics', async () => {
        mockQuery.mockResolvedValueOnce([{
            total_sessions: 20,
            completed_sessions: 18,
            total_duration: 900,
            avg_duration: 45
        }]);

        const stats = await sessionService.getStats(1, 'tenant-1');
        expect(stats.total_sessions).toBe(20);
    });
});
