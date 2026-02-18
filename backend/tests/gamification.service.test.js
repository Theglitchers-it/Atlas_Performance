/**
 * Tests for Gamification Service
 * XP calculations, levels, dashboard, achievements, challenges, leaderboard
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const gamificationService = require('../src/services/gamification.service');

beforeEach(() => {
    mockQuery.mockReset();
});

// =========================================================================
// XP Calculations (pure functions, no DB)
// =========================================================================
describe('GamificationService - XP Calculations', () => {
    test('getLevelForXP: 0 XP = level 1', () => {
        expect(gamificationService.getLevelForXP(0)).toBe(1);
    });

    test('getLevelForXP: 99 XP = level 1', () => {
        expect(gamificationService.getLevelForXP(99)).toBe(1);
    });

    test('getLevelForXP: 100 XP = level 2', () => {
        expect(gamificationService.getLevelForXP(100)).toBe(2);
    });

    test('getLevelForXP: 250 XP = level 3', () => {
        expect(gamificationService.getLevelForXP(250)).toBe(3);
    });

    test('getLevelForXP: 1000 XP = level 11', () => {
        expect(gamificationService.getLevelForXP(1000)).toBe(11);
    });

    test('getLevelForXP: null/undefined treated as 0 → level 1', () => {
        expect(gamificationService.getLevelForXP(null)).toBe(1);
        expect(gamificationService.getLevelForXP(undefined)).toBe(1);
    });

    test('getXPForLevel: level 1 = 0 XP', () => {
        expect(gamificationService.getXPForLevel(1)).toBe(0);
    });

    test('getXPForLevel: level 2 = 100 XP', () => {
        expect(gamificationService.getXPForLevel(2)).toBe(100);
    });

    test('getXPForLevel: level 5 = 400 XP', () => {
        expect(gamificationService.getXPForLevel(5)).toBe(400);
    });

    test('getXPProgress returns correct progress', () => {
        const progress = gamificationService.getXPProgress(150);
        expect(progress.currentLevel).toBe(2);
        expect(progress.xpInLevel).toBe(50);
        expect(progress.xpNeeded).toBe(100);
        expect(progress.progressPct).toBe(50);
    });

    test('getXPProgress at level boundary', () => {
        const progress = gamificationService.getXPProgress(200);
        expect(progress.currentLevel).toBe(3);
        expect(progress.xpInLevel).toBe(0);
        expect(progress.progressPct).toBe(0);
    });

    test('getXPProgress at 0 XP', () => {
        const progress = gamificationService.getXPProgress(0);
        expect(progress.currentLevel).toBe(1);
        expect(progress.xpInLevel).toBe(0);
        expect(progress.progressPct).toBe(0);
    });
});

// =========================================================================
// getDashboard
// =========================================================================
describe('GamificationService - getDashboard', () => {
    test('returns dashboard data for client', async () => {
        // Query order in getDashboard:
        // 1. SELECT client (xp_points, level, streak_days)
        // 2. _getUserIdForClient → SELECT user_id FROM clients
        // 3. achievements count (uses destructuring [achievementRows])
        // 4. titles count (uses destructuring [titleRows])
        // 5. challenges count (uses destructuring [challengeRows])
        mockQuery
            .mockResolvedValueOnce([{ xp_points: 250, level: 3, streak_days: 5 }])   // 1. client
            .mockResolvedValueOnce([{ user_id: 100 }])                                 // 2. _getUserIdForClient
            .mockResolvedValueOnce([{ count: 3 }])                                     // 3. achievements
            .mockResolvedValueOnce([{ count: 2 }])                                     // 4. titles
            .mockResolvedValueOnce([{ count: 1 }]);                                    // 5. challenges

        const dashboard = await gamificationService.getDashboard('tenant-1', 10);

        expect(dashboard).toBeDefined();
        expect(dashboard.xp).toBe(250);
        expect(dashboard.level).toBe(3);
        expect(dashboard.streak).toBe(5);
        expect(dashboard.achievementsUnlocked).toBe(3);
        expect(dashboard.titlesUnlocked).toBe(2);
        expect(dashboard.activeChallenges).toBe(1);
        expect(dashboard.xpProgress).toBeDefined();
    });

    test('returns null if client not found', async () => {
        mockQuery.mockResolvedValueOnce([]); // empty client rows

        const dashboard = await gamificationService.getDashboard('tenant-1', 999);

        expect(dashboard).toBeNull();
    });
});

// =========================================================================
// addXP
// =========================================================================
describe('GamificationService - addXP', () => {
    test('adds XP, updates level, returns new totals', async () => {
        // Query order in addXP:
        // 1. INSERT INTO points_transactions
        // 2. UPDATE clients SET xp_points = xp_points + ?
        // 3. SELECT xp_points FROM clients (uses destructuring [updated])
        // 4. UPDATE clients SET level = ?
        mockQuery
            .mockResolvedValueOnce({ insertId: 1 })      // 1. insert transaction
            .mockResolvedValueOnce({ affectedRows: 1 })   // 2. update xp
            .mockResolvedValueOnce([{ xp_points: 150 }])  // 3. get new total
            .mockResolvedValueOnce({ affectedRows: 1 });   // 4. update level

        const result = await gamificationService.addXP('tenant-1', 10, 50, 'workout', null, null, 'Completed workout');

        expect(result).toEqual({ xp: 150, level: 2 });
        expect(mockQuery).toHaveBeenCalledTimes(4);
        // Verify INSERT call
        expect(mockQuery).toHaveBeenNthCalledWith(1,
            expect.stringContaining('INSERT INTO points_transactions'),
            ['tenant-1', 10, 50, 'workout', null, null, 'Completed workout']
        );
    });
});

// =========================================================================
// getLeaderboard
// =========================================================================
describe('GamificationService - getLeaderboard', () => {
    test('returns ranked leaderboard with pagination', async () => {
        // Query order: 1. COUNT (destructured [countResult]), 2. SELECT rows
        mockQuery
            .mockResolvedValueOnce([{ total: 3 }])    // count (destructured)
            .mockResolvedValueOnce([                   // leaderboard rows
                { id: 1, first_name: 'Alice', xp_points: 500, level: 6 },
                { id: 2, first_name: 'Bob', xp_points: 300, level: 4 },
                { id: 3, first_name: 'Carlo', xp_points: 100, level: 2 }
            ]);

        const result = await gamificationService.getLeaderboard('tenant-1', { limit: 10, page: 1 });

        expect(result.leaderboard).toHaveLength(3);
        expect(result.leaderboard[0].rank).toBe(1);
        expect(result.leaderboard[2].rank).toBe(3);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1
        });
    });

    test('leaderboard page 2 has correct rank offset', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 25 }])
            .mockResolvedValueOnce([
                { id: 11, first_name: 'Player11', xp_points: 50, level: 1 }
            ]);

        const result = await gamificationService.getLeaderboard('tenant-1', { limit: 10, page: 2 });

        // page 2 offset = 10, so first entry has rank 11
        expect(result.leaderboard[0].rank).toBe(11);
        expect(result.pagination.totalPages).toBe(3);
    });
});

// =========================================================================
// getChallenges
// =========================================================================
describe('GamificationService - getChallenges', () => {
    test('returns challenges with pagination', async () => {
        // Query order: 1. COUNT (destructured [countResult]), 2. SELECT rows
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }])
            .mockResolvedValueOnce([
                { id: 1, name: 'Challenge A', is_active: 1 },
                { id: 2, name: 'Challenge B', is_active: 1 }
            ]);

        const result = await gamificationService.getChallenges('tenant-1', { status: 'active', limit: 10, page: 1 });

        expect(result.challenges).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
    });

    test('returns empty challenges', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        const result = await gamificationService.getChallenges('tenant-1', { limit: 10, page: 1 });

        expect(result.challenges).toHaveLength(0);
        expect(result.pagination.total).toBe(0);
    });
});

// =========================================================================
// createChallenge
// =========================================================================
describe('GamificationService - createChallenge', () => {
    test('creates a challenge and returns insertId', async () => {
        // createChallenge returns result.insertId directly (a number)
        mockQuery.mockResolvedValueOnce({ insertId: 42 });

        const result = await gamificationService.createChallenge('tenant-1', 5, {
            name: 'January Challenge',
            description: 'Run 100km',
            challengeType: 'distance',
            targetValue: 100,
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            xpReward: 500
        });

        expect(result).toBe(42);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO challenges'),
            expect.any(Array)
        );
    });
});

// =========================================================================
// joinChallenge
// =========================================================================
describe('GamificationService - joinChallenge', () => {
    test('joins a challenge', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        await gamificationService.joinChallenge(42, 10);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO challenge_participants'),
            [42, 10]
        );
    });
});

// =========================================================================
// withdrawFromChallenge
// =========================================================================
describe('GamificationService - withdrawFromChallenge', () => {
    test('withdraws from a challenge', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        await gamificationService.withdrawFromChallenge(42, 10);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE challenge_participants'),
            [42, 10]
        );
    });
});

// =========================================================================
// getChallengeById
// =========================================================================
describe('GamificationService - getChallengeById', () => {
    test('returns challenge with participants', async () => {
        // Query order: 1. SELECT challenge (destructured [challenge]), 2. SELECT participants
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Test Challenge', tenant_id: 'tenant-1' }])
            .mockResolvedValueOnce([
                { client_id: 10, first_name: 'Alice', current_value: 50 },
                { client_id: 20, first_name: 'Bob', current_value: 30 }
            ]);

        const challenge = await gamificationService.getChallengeById(1, 'tenant-1');

        expect(challenge).toBeDefined();
        expect(challenge.name).toBe('Test Challenge');
        expect(challenge.participants).toHaveLength(2);
    });

    test('returns null if challenge not found', async () => {
        mockQuery.mockResolvedValueOnce([]); // empty → [challenge] = undefined

        const result = await gamificationService.getChallengeById(999, 'tenant-1');

        expect(result).toBeNull();
    });

    test('includes userParticipation when clientId is provided', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Test', tenant_id: 'tenant-1' }])
            .mockResolvedValueOnce([
                { client_id: 10, first_name: 'Alice', current_value: 50 },
                { client_id: 20, first_name: 'Bob', current_value: 30 }
            ]);

        const challenge = await gamificationService.getChallengeById(1, 'tenant-1', 10);

        expect(challenge.userParticipation).toBeDefined();
        expect(challenge.userParticipation.client_id).toBe(10);
    });
});

// =========================================================================
// getXPHistory
// =========================================================================
describe('GamificationService - getXPHistory', () => {
    test('returns XP transactions with pagination', async () => {
        // Query order: 1. COUNT (destructured [countResult]), 2. SELECT rows
        mockQuery
            .mockResolvedValueOnce([{ total: 5 }])
            .mockResolvedValueOnce([
                { id: 1, points: 50, transaction_type: 'workout', description: 'Completed' },
                { id: 2, points: 25, transaction_type: 'streak', description: 'Streak bonus' }
            ]);

        const result = await gamificationService.getXPHistory('tenant-1', 10, { limit: 2, page: 1 });

        expect(result.transactions).toHaveLength(2);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 2,
            total: 5,
            totalPages: 3
        });
    });
});
