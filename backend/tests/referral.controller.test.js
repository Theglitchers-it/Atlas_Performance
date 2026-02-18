/**
 * Tests for Referral Controller
 * generateCode, applyCode, getStats, listCodes, listConversions, completeConversion
 *
 * Note: This controller does NOT use next(error). It catches errors inline and
 * responds with res.status(error.status || 500).json({ success: false, message }).
 */

// Mock dependencies
jest.mock('../src/services/referral.service', () => ({
    generateCode: jest.fn(),
    applyCode: jest.fn(),
    getStats: jest.fn(),
    listCodes: jest.fn(),
    listConversions: jest.fn(),
    completeConversion: jest.fn()
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const referralController = require('../src/controllers/referral.controller');
const referralService = require('../src/services/referral.service');

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

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ReferralController', () => {
    describe('generateCode', () => {
        test('returns 201 with generated referral code', async () => {
            const result = { code: 'REF-ABC123', type: 'general' };
            referralService.generateCode.mockResolvedValue(result);

            const req = mockReq({
                body: { type: 'general', customCode: 'MYCODE', name: 'Summer Promo' }
            });
            const res = mockRes();

            await referralController.generateCode(req, res);

            expect(referralService.generateCode).toHaveBeenCalledWith(
                1, 'tenant-1', 'general', 'MYCODE', 'Summer Promo'
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('uses default type and null name when not provided', async () => {
            const result = { code: 'REF-XYZ789' };
            referralService.generateCode.mockResolvedValue(result);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await referralController.generateCode(req, res);

            expect(referralService.generateCode).toHaveBeenCalledWith(
                1, 'tenant-1', 'general', undefined, null
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('returns error status on service failure', async () => {
            const error = new Error('Code already exists');
            error.status = 409;
            referralService.generateCode.mockRejectedValue(error);

            const req = mockReq({ body: { customCode: 'TAKEN' } });
            const res = mockRes();

            await referralController.generateCode(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Code already exists'
            });
        });

        test('defaults to 500 when error has no status', async () => {
            const error = new Error('Unexpected failure');
            referralService.generateCode.mockRejectedValue(error);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await referralController.generateCode(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unexpected failure'
            });
        });
    });

    describe('applyCode', () => {
        test('applies a referral code successfully', async () => {
            const result = { discount: '10%', referrerId: 5 };
            referralService.applyCode.mockResolvedValue(result);

            const req = mockReq({ body: { code: 'REF-ABC123' } });
            const res = mockRes();

            await referralController.applyCode(req, res);

            expect(referralService.applyCode).toHaveBeenCalledWith('REF-ABC123', 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('returns error status on invalid code', async () => {
            const error = new Error('Codice non valido');
            error.status = 404;
            referralService.applyCode.mockRejectedValue(error);

            const req = mockReq({ body: { code: 'INVALID' } });
            const res = mockRes();

            await referralController.applyCode(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Codice non valido'
            });
        });
    });

    describe('getStats', () => {
        test('returns referral statistics', async () => {
            const stats = { totalReferrals: 12, activeReferrals: 8, totalEarnings: 150 };
            referralService.getStats.mockResolvedValue(stats);

            const req = mockReq();
            const res = mockRes();

            await referralController.getStats(req, res);

            expect(referralService.getStats).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: stats
            });
        });

        test('returns 500 on service failure', async () => {
            const error = new Error('Stats query failed');
            referralService.getStats.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await referralController.getStats(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Stats query failed'
            });
        });
    });

    describe('listCodes', () => {
        test('returns all referral codes for the user', async () => {
            const codes = [
                { id: 1, code: 'REF-ABC', type: 'general', usageCount: 3 },
                { id: 2, code: 'REF-XYZ', type: 'premium', usageCount: 1 }
            ];
            referralService.listCodes.mockResolvedValue(codes);

            const req = mockReq();
            const res = mockRes();

            await referralController.listCodes(req, res);

            expect(referralService.listCodes).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: codes
            });
        });

        test('returns 500 on service failure', async () => {
            const error = new Error('List codes failed');
            referralService.listCodes.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await referralController.listCodes(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'List codes failed'
            });
        });
    });

    describe('listConversions', () => {
        test('returns conversions with status filter', async () => {
            const conversions = [
                { id: 1, referredUserId: 10, status: 'completed' }
            ];
            referralService.listConversions.mockResolvedValue(conversions);

            const req = mockReq({ query: { status: 'completed' } });
            const res = mockRes();

            await referralController.listConversions(req, res);

            expect(referralService.listConversions).toHaveBeenCalledWith(1, 'completed');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: conversions
            });
        });

        test('returns all conversions when no status filter', async () => {
            const conversions = [
                { id: 1, status: 'pending' },
                { id: 2, status: 'completed' }
            ];
            referralService.listConversions.mockResolvedValue(conversions);

            const req = mockReq();
            const res = mockRes();

            await referralController.listConversions(req, res);

            expect(referralService.listConversions).toHaveBeenCalledWith(1, undefined);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: conversions
            });
        });

        test('returns 500 on service failure', async () => {
            const error = new Error('List conversions failed');
            referralService.listConversions.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await referralController.listConversions(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'List conversions failed'
            });
        });
    });

    describe('completeConversion', () => {
        test('completes a conversion successfully', async () => {
            const result = { conversionId: 5, status: 'completed', rewardGranted: true };
            referralService.completeConversion.mockResolvedValue(result);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await referralController.completeConversion(req, res);

            expect(referralService.completeConversion).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('returns error status on failure', async () => {
            const error = new Error('Conversion not found');
            error.status = 404;
            referralService.completeConversion.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await referralController.completeConversion(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Conversion not found'
            });
        });

        test('parses id param as integer', async () => {
            referralService.completeConversion.mockResolvedValue({ status: 'completed' });

            const req = mockReq({ params: { id: '42' } });
            const res = mockRes();

            await referralController.completeConversion(req, res);

            expect(referralService.completeConversion).toHaveBeenCalledWith(42, 'tenant-1');
        });
    });
});
