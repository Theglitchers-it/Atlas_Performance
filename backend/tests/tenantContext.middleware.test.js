/**
 * Tests for Tenant Context Middleware
 * validateTenant: tenant extraction, tenant_id on request, missing tenant handling
 * checkPlanLimits: plan-based resource gating
 */

// Mock database
const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

// Mock logger
jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    })
}));

const { validateTenant, checkPlanLimits } = require('../src/middlewares/tenantContext');

// Test helpers
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockNext = jest.fn();

beforeEach(() => {
    mockQuery.mockReset();
    mockNext.mockClear();
});

describe('validateTenant', () => {
    test('sets req.tenant when tenant is found and active', async () => {
        const tenantData = { id: 'tenant-abc', name: 'FitGym', plan: 'pro', status: 'active' };
        mockQuery.mockResolvedValue([tenantData]);

        const req = { user: { tenantId: 'tenant-abc' } };
        const res = mockRes();

        await validateTenant(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(req.tenant).toEqual({
            id: 'tenant-abc',
            name: 'FitGym',
            plan: 'pro',
            status: 'active'
        });
    });

    test('returns 400 when req.user is missing', async () => {
        const req = {};
        const res = mockRes();

        await validateTenant(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Contesto tenant mancante'
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('returns 400 when req.user.tenantId is missing', async () => {
        const req = { user: { id: 1 } };
        const res = mockRes();

        await validateTenant(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Contesto tenant mancante'
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('returns 403 when tenant is not found in database', async () => {
        mockQuery.mockResolvedValue([]);

        const req = { user: { tenantId: 'nonexistent' } };
        const res = mockRes();

        await validateTenant(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Tenant non trovato o disattivato'
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('queries database with correct tenant ID', async () => {
        mockQuery.mockResolvedValue([{ id: 'tenant-xyz', name: 'Test', plan: 'free', status: 'active' }]);

        const req = { user: { tenantId: 'tenant-xyz' } };
        const res = mockRes();

        await validateTenant(req, res, mockNext);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('SELECT'),
            ['tenant-xyz']
        );
    });

    test('returns 500 when database query throws', async () => {
        mockQuery.mockRejectedValue(new Error('DB connection failed'));

        const req = { user: { tenantId: 'tenant-abc' } };
        const res = mockRes();

        await validateTenant(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Errore interno validazione tenant'
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });
});

describe('checkPlanLimits', () => {
    test('calls next() when no req.tenant is set', async () => {
        const req = { user: { tenantId: 'tenant-abc' } };
        const res = mockRes();

        await checkPlanLimits('clients')(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    test('returns 403 when client limit is reached for free plan', async () => {
        mockQuery.mockResolvedValue([{ total: 5 }]);

        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'free' }
        };
        const res = mockRes();

        await checkPlanLimits('clients')(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            limit: 5,
            current: 5
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('allows when client count is below limit', async () => {
        mockQuery.mockResolvedValue([{ total: 3 }]);

        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'free' }
        };
        const res = mockRes();

        await checkPlanLimits('clients')(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    test('returns 403 when videos are not available on free plan', async () => {
        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'free' }
        };
        const res = mockRes();

        await checkPlanLimits('videos')(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('returns 403 when API is not available on free plan', async () => {
        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'free' }
        };
        const res = mockRes();

        await checkPlanLimits('api')(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('allows API access on starter plan', async () => {
        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'starter' }
        };
        const res = mockRes();

        await checkPlanLimits('api')(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    test('returns 403 for ai_advanced on starter plan', async () => {
        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'starter' }
        };
        const res = mockRes();

        await checkPlanLimits('ai_advanced')(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });

    test('allows ai_advanced on pro plan', async () => {
        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'pro' }
        };
        const res = mockRes();

        await checkPlanLimits('ai_advanced')(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    test('calls next on DB error in plan limit check (fail-open)', async () => {
        mockQuery.mockRejectedValue(new Error('DB error'));

        const req = {
            user: { tenantId: 'tenant-abc' },
            tenant: { plan: 'free' }
        };
        const res = mockRes();

        await checkPlanLimits('clients')(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });
});
