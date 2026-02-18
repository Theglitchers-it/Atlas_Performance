/**
 * Tests for ReferralService
 * Code generation, apply, stats, conversions
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const referralService = require('../src/services/referral.service');

beforeEach(() => jest.clearAllMocks());

describe('ReferralService.generateCode', () => {
    test('generates unique referral code', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // No existing code
            .mockResolvedValueOnce([{ first_name: 'Mario', last_name: 'Rossi' }]) // User info
            .mockResolvedValueOnce({ insertId: 1 }); // INSERT

        const result = await referralService.generateCode(1, 'tenant-1', 'general', null, 'Promo Estate');
        expect(result).toBeDefined();
        expect(result.code).toBeDefined();
    });
});

describe('ReferralService.applyCode', () => {
    test('applies valid referral code', async () => {
        mockQuery
            // 1. SELECT referral_codes + users JOIN (codeRows)
            .mockResolvedValueOnce([{
                id: 1, user_id: 5, code: 'ABC123', status: 'active', type: 'promotion',
                max_uses: 100, referrer_reward: 10, referee_reward: 10, expires_at: null,
                first_name: 'Mario', last_name: 'Rossi', email: 'mario@test.com'
            }])
            // 2. SELECT COUNT(*) FROM referral_conversions (usageCount, because max_uses is set)
            .mockResolvedValueOnce([{ count: 0 }])
            // 3. SELECT referral_conversions WHERE referred_user_id (existingConversion)
            .mockResolvedValueOnce([])
            // 4. SELECT users WHERE id = ? (referredUser)
            .mockResolvedValueOnce([{ first_name: 'Luca', last_name: 'Bianchi', email: 'new@test.com', tenant_id: 'tenant-1' }])
            // 5. INSERT INTO referral_conversions (conversionResult)
            .mockResolvedValueOnce({ insertId: 20 })
            // 6. UPDATE referral_conversions SET referrer_reward_value, referee_reward_value (_awardRewards)
            .mockResolvedValueOnce([]);

        const result = await referralService.applyCode('ABC123', 10);
        expect(result).toBeDefined();
        expect(result.conversionId).toBe(20);
        expect(result.code).toBe('ABC123');
    });

    test('rejects expired or invalid code', async () => {
        mockQuery.mockResolvedValueOnce([]); // Code not found

        await expect(referralService.applyCode('INVALID', 10))
            .rejects.toEqual(expect.objectContaining({ status: 404 }));
    });
});

describe('ReferralService.getStats', () => {
    test('returns referral statistics', async () => {
        mockQuery
            // 1. COUNT codes
            .mockResolvedValueOnce([{ total_codes: 5 }])
            // 2. COUNT conversions
            .mockResolvedValueOnce([{
                total_conversions: 10,
                completed_conversions: 8,
                total_earnings: 500
            }])
            // 3. Recent conversions
            .mockResolvedValueOnce([{
                id: 1, created_at: new Date(), status: 'completed',
                referrer_reward_value: 10, first_name: 'Luca', last_name: 'Bianchi', email: 'luca@test.com'
            }]);

        const stats = await referralService.getStats(1);
        expect(stats.totalCodes).toBe(5);
        expect(stats.totalConversions).toBe(10);
        expect(stats.completedConversions).toBe(8);
        expect(stats.totalEarnings).toBe(500);
    });
});

describe('ReferralService.listCodes', () => {
    test('returns user referral codes', async () => {
        mockQuery
            // 1. SELECT codes (simple query)
            .mockResolvedValueOnce([
                {
                    id: 1, code: 'ABC123', type: 'general', referrer_reward: 10, referee_reward: 10,
                    max_uses: null, status: 'active', expires_at: null,
                    metadata: JSON.stringify({ name: 'Promo 1' }),
                    created_at: new Date()
                },
                {
                    id: 2, code: 'DEF456', type: 'client', referrer_reward: 5, referee_reward: 5,
                    max_uses: 50, status: 'active', expires_at: null,
                    metadata: JSON.stringify({ name: 'Promo 2' }),
                    created_at: new Date()
                }
            ])
            // 2. SELECT usage counts from conversions
            .mockResolvedValueOnce([
                { referral_code_id: 1, uses_count: 5, completed_count: 3 }
            ]);

        const codes = await referralService.listCodes(1);
        expect(codes).toHaveLength(2);
        expect(codes[0].code).toBe('ABC123');
        expect(codes[0].name).toBe('Promo 1');
        expect(codes[0].uses).toBe(5);
        expect(codes[1].uses).toBe(0);
    });
});

describe('ReferralService.completeConversion', () => {
    test('completes a pending conversion', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, status: 'pending' }]) // conversion
            .mockResolvedValueOnce([]); // UPDATE

        await referralService.completeConversion(1, 'tenant-1');
        expect(mockQuery.mock.calls[1][0]).toContain('UPDATE');
    });
});

describe('ReferralService._generateCode', () => {
    test('generates alphanumeric code', () => {
        const code = referralService._generateCode();
        expect(code).toMatch(/^[A-Z0-9]+$/);
        expect(code.length).toBeGreaterThanOrEqual(6);
    });
});
