/**
 * Tests for Gamification Controller
 * getDashboard, getAchievements, getAchievementsByCategory, getRecentAchievements,
 * getRecentXPActivity, getXPHistory, addBonusXP, getLeaderboard, getChallenges,
 * getActiveChallengesPreview, getChallengeById, createChallenge, joinChallenge, withdrawFromChallenge
 */

// Mock dependencies
jest.mock('../src/services/gamification.service', () => ({
    getDashboard: jest.fn(),
    getAllAchievements: jest.fn(),
    getAchievementsByCategory: jest.fn(),
    getRecentAchievements: jest.fn(),
    getRecentXPActivity: jest.fn(),
    getXPHistory: jest.fn(),
    addXP: jest.fn(),
    getLeaderboard: jest.fn(),
    getChallenges: jest.fn(),
    getActiveChallengesPreview: jest.fn(),
    getChallengeById: jest.fn(),
    createChallenge: jest.fn(),
    joinChallenge: jest.fn(),
    withdrawFromChallenge: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const gamificationController = require('../src/controllers/gamification.controller');
const gamificationService = require('../src/services/gamification.service');

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

describe('GamificationController', () => {
    describe('getDashboard', () => {
        test('returns dashboard for a given clientId query param', async () => {
            const dashboard = { level: 5, xp: 1200, achievements: 3 };
            gamificationService.getDashboard.mockResolvedValue(dashboard);

            const req = mockReq({ query: { clientId: '10' } });
            const res = mockRes();

            await gamificationController.getDashboard(req, res, mockNext);

            expect(gamificationService.getDashboard).toHaveBeenCalledWith('tenant-1', 10);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { dashboard }
            });
        });

        test('returns 400 when clientId is missing for non-client role', async () => {
            const req = mockReq({ query: {} });
            const res = mockRes();

            await gamificationController.getDashboard(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Client ID richiesto'
            });
        });

        test('resolves clientId from database for client role', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const dashboard = { level: 2, xp: 300 };
            gamificationService.getDashboard.mockResolvedValue(dashboard);

            const req = mockReq({ user: { id: 1, tenantId: 'tenant-1', role: 'client' } });
            const res = mockRes();

            await gamificationController.getDashboard(req, res, mockNext);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM clients'),
                [1, 'tenant-1']
            );
            expect(gamificationService.getDashboard).toHaveBeenCalledWith('tenant-1', 7);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { dashboard }
            });
        });

        test('returns 404 when dashboard not found', async () => {
            gamificationService.getDashboard.mockResolvedValue(null);

            const req = mockReq({ query: { clientId: '99' } });
            const res = mockRes();

            await gamificationController.getDashboard(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cliente non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            gamificationService.getDashboard.mockRejectedValue(error);

            const req = mockReq({ query: { clientId: '10' } });
            const res = mockRes();

            await gamificationController.getDashboard(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAchievements', () => {
        test('returns achievements with filter options', async () => {
            const achievements = [{ id: 1, name: 'First Workout' }];
            gamificationService.getAllAchievements.mockResolvedValue(achievements);

            const req = mockReq({ query: { category: 'workout', rarity: 'common', unlockedOnly: 'true' } });
            const res = mockRes();

            await gamificationController.getAchievements(req, res, mockNext);

            expect(gamificationService.getAllAchievements).toHaveBeenCalledWith('tenant-1', 1, {
                category: 'workout',
                rarity: 'common',
                unlockedOnly: true
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { achievements }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Service error');
            gamificationService.getAllAchievements.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await gamificationController.getAchievements(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAchievementsByCategory', () => {
        test('returns achievements grouped by category', async () => {
            const categories = { workout: [{ id: 1 }], nutrition: [{ id: 2 }] };
            gamificationService.getAchievementsByCategory.mockResolvedValue(categories);

            const req = mockReq();
            const res = mockRes();

            await gamificationController.getAchievementsByCategory(req, res, mockNext);

            expect(gamificationService.getAchievementsByCategory).toHaveBeenCalledWith('tenant-1', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { categories }
            });
        });
    });

    describe('getRecentAchievements', () => {
        test('returns recent achievements with default limit', async () => {
            const achievements = [{ id: 1, name: 'Streak Master' }];
            gamificationService.getRecentAchievements.mockResolvedValue(achievements);

            const req = mockReq();
            const res = mockRes();

            await gamificationController.getRecentAchievements(req, res, mockNext);

            expect(gamificationService.getRecentAchievements).toHaveBeenCalledWith('tenant-1', 1, 5);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { achievements }
            });
        });

        test('parses custom limit from query', async () => {
            gamificationService.getRecentAchievements.mockResolvedValue([]);

            const req = mockReq({ query: { limit: '10' } });
            const res = mockRes();

            await gamificationController.getRecentAchievements(req, res, mockNext);

            expect(gamificationService.getRecentAchievements).toHaveBeenCalledWith('tenant-1', 1, 10);
        });
    });

    describe('addBonusXP', () => {
        test('adds bonus XP successfully', async () => {
            const result = { newXP: 150, levelUp: false };
            gamificationService.addXP.mockResolvedValue(result);

            const req = mockReq({ body: { clientId: 5, points: 50, description: 'Great effort' } });
            const res = mockRes();

            await gamificationController.addBonusXP(req, res, mockNext);

            expect(gamificationService.addXP).toHaveBeenCalledWith(
                'tenant-1', 5, 50, 'bonus', null, null, 'Great effort'
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('returns 400 when clientId or points missing', async () => {
            const req = mockReq({ body: { clientId: 5 } });
            const res = mockRes();

            await gamificationController.addBonusXP(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'clientId e points sono obbligatori'
            });
        });

        test('uses default description when not provided', async () => {
            gamificationService.addXP.mockResolvedValue({ newXP: 100 });

            const req = mockReq({ body: { clientId: 5, points: 30 } });
            const res = mockRes();

            await gamificationController.addBonusXP(req, res, mockNext);

            expect(gamificationService.addXP).toHaveBeenCalledWith(
                'tenant-1', 5, 30, 'bonus', null, null, 'Bonus XP'
            );
        });
    });

    describe('getLeaderboard', () => {
        test('returns leaderboard with pagination defaults', async () => {
            const result = { leaderboard: [{ rank: 1, name: 'Mario' }], total: 1 };
            gamificationService.getLeaderboard.mockResolvedValue(result);

            const req = mockReq();
            const res = mockRes();

            await gamificationController.getLeaderboard(req, res, mockNext);

            expect(gamificationService.getLeaderboard).toHaveBeenCalledWith('tenant-1', {
                limit: 20,
                page: 1
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('parses custom pagination from query', async () => {
            gamificationService.getLeaderboard.mockResolvedValue({ leaderboard: [], total: 0 });

            const req = mockReq({ query: { limit: '10', page: '3' } });
            const res = mockRes();

            await gamificationController.getLeaderboard(req, res, mockNext);

            expect(gamificationService.getLeaderboard).toHaveBeenCalledWith('tenant-1', {
                limit: 10,
                page: 3
            });
        });
    });

    describe('createChallenge', () => {
        test('returns 201 with created challenge id', async () => {
            gamificationService.createChallenge.mockResolvedValue(42);

            const req = mockReq({ body: { name: 'Monthly Steps', target: 100000 } });
            const res = mockRes();

            await gamificationController.createChallenge(req, res, mockNext);

            expect(gamificationService.createChallenge).toHaveBeenCalledWith('tenant-1', 1, req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { challengeId: 42 }
            });
        });

        test('calls next(error) on creation failure', async () => {
            const error = new Error('Validation error');
            gamificationService.createChallenge.mockRejectedValue(error);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await gamificationController.createChallenge(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('joinChallenge', () => {
        test('joins a challenge successfully', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            gamificationService.joinChallenge.mockResolvedValue();

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                params: { id: '15' }
            });
            const res = mockRes();

            await gamificationController.joinChallenge(req, res, mockNext);

            expect(gamificationService.joinChallenge).toHaveBeenCalledWith('15', 7);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: 'Iscrizione completata' }
            });
        });

        test('returns 400 when clientId cannot be resolved', async () => {
            const req = mockReq({ params: { id: '15' } });
            const res = mockRes();

            await gamificationController.joinChallenge(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Client ID richiesto'
            });
        });

        test('returns 409 on duplicate entry', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const error = new Error('Duplicate');
            error.code = 'ER_DUP_ENTRY';
            gamificationService.joinChallenge.mockRejectedValue(error);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                params: { id: '15' }
            });
            const res = mockRes();

            await gamificationController.joinChallenge(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Gia iscritto a questa sfida'
            });
        });
    });

    describe('getChallengeById', () => {
        test('returns a challenge by id', async () => {
            const challenge = { id: 15, name: 'Steps Challenge' };
            gamificationService.getChallengeById.mockResolvedValue(challenge);

            const req = mockReq({ params: { id: '15' }, query: { clientId: '10' } });
            const res = mockRes();

            await gamificationController.getChallengeById(req, res, mockNext);

            expect(gamificationService.getChallengeById).toHaveBeenCalledWith('15', 'tenant-1', 10);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { challenge }
            });
        });

        test('returns 404 when challenge not found', async () => {
            gamificationService.getChallengeById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' }, query: { clientId: '10' } });
            const res = mockRes();

            await gamificationController.getChallengeById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Sfida non trovata'
            });
        });
    });
});
