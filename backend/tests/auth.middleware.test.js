/**
 * Tests for Auth Middleware
 * verifyToken, requireRole, requireTenantOwner, requireSuperAdmin, optionalAuth, extractToken
 */

const jwt = require('jsonwebtoken');

// Mock database
const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const { verifyToken, requireRole, requireTenantOwner, requireSuperAdmin, optionalAuth, extractToken } = require('../src/middlewares/auth');

// Test helpers
const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

const mockNext = () => jest.fn();

const validPayload = { userId: 1 };
const validToken = jwt.sign(validPayload, process.env.JWT_SECRET || 'test-secret-key');
const expiredToken = jwt.sign(validPayload, process.env.JWT_SECRET || 'test-secret-key', { expiresIn: '0s' });

const mockUser = {
    id: 1,
    tenant_id: 'tenant-abc',
    email: 'test@example.com',
    role: 'tenant_owner',
    status: 'active'
};

beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
});

beforeEach(() => {
    mockQuery.mockReset();
});

describe('extractToken', () => {
    test('extracts token from cookie (priority)', () => {
        const req = {
            cookies: { access_token: 'cookie-token' },
            headers: { authorization: 'Bearer header-token' }
        };
        expect(extractToken(req)).toBe('cookie-token');
    });

    test('falls back to Authorization header if no cookie', () => {
        const req = {
            cookies: {},
            headers: { authorization: 'Bearer header-token' }
        };
        expect(extractToken(req)).toBe('header-token');
    });

    test('returns null if no cookie and no header', () => {
        const req = {
            cookies: {},
            headers: {}
        };
        expect(extractToken(req)).toBeNull();
    });

    test('returns null if cookies undefined', () => {
        const req = { headers: {} };
        expect(extractToken(req)).toBeNull();
    });

    test('returns null if Authorization header is not Bearer', () => {
        const req = {
            cookies: {},
            headers: { authorization: 'Basic abc123' }
        };
        expect(extractToken(req)).toBeNull();
    });
});

describe('verifyToken', () => {
    test('authenticates user from cookie token', async () => {
        mockQuery.mockResolvedValue([mockUser]);
        const req = { cookies: { access_token: validToken }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({
            id: 1,
            tenantId: 'tenant-abc',
            email: 'test@example.com',
            role: 'tenant_owner'
        });
    });

    test('authenticates user from Authorization header', async () => {
        mockQuery.mockResolvedValue([mockUser]);
        const req = { cookies: {}, headers: { authorization: `Bearer ${validToken}` } };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user.id).toBe(1);
    });

    test('returns 401 if no token at all', async () => {
        const req = { cookies: {}, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('mancante')
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 for expired token', async () => {
        // Generate a fresh expired token
        const expired = jwt.sign(validPayload, process.env.JWT_SECRET, { expiresIn: '-1s' });
        const req = { cookies: { access_token: expired }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'TOKEN_EXPIRED'
        }));
    });

    test('returns 401 for invalid token', async () => {
        const req = { cookies: { access_token: 'invalid-garbage-token' }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Token non valido'
        }));
    });

    test('returns 401 if user not found in DB', async () => {
        mockQuery.mockResolvedValue([]);
        const req = { cookies: { access_token: validToken }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('non trovato')
        }));
    });

    test('cookie takes priority over Authorization header', async () => {
        const cookieToken = jwt.sign({ userId: 10 }, process.env.JWT_SECRET);
        const headerToken = jwt.sign({ userId: 20 }, process.env.JWT_SECRET);
        mockQuery.mockResolvedValue([{ ...mockUser, id: 10 }]);

        const req = {
            cookies: { access_token: cookieToken },
            headers: { authorization: `Bearer ${headerToken}` }
        };
        const res = mockRes();
        const next = mockNext();

        await verifyToken(req, res, next);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [10] // Should use cookie token's userId, not header's
        );
    });
});

describe('requireRole', () => {
    test('allows user with matching role', () => {
        const req = { user: { role: 'tenant_owner' } };
        const res = mockRes();
        const next = mockNext();

        requireRole('tenant_owner', 'super_admin')(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('denies user with non-matching role', () => {
        const req = { user: { role: 'client' } };
        const res = mockRes();
        const next = mockNext();

        requireRole('tenant_owner', 'super_admin')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if user not set', () => {
        const req = {};
        const res = mockRes();
        const next = mockNext();

        requireRole('tenant_owner')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('works with single role', () => {
        const req = { user: { role: 'staff' } };
        const res = mockRes();
        const next = mockNext();

        requireRole('staff')(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});

describe('requireTenantOwner', () => {
    test('allows tenant_owner', () => {
        const req = { user: { role: 'tenant_owner' } };
        const res = mockRes();
        const next = mockNext();

        requireTenantOwner(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('allows super_admin', () => {
        const req = { user: { role: 'super_admin' } };
        const res = mockRes();
        const next = mockNext();

        requireTenantOwner(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('denies client', () => {
        const req = { user: { role: 'client' } };
        const res = mockRes();
        const next = mockNext();

        requireTenantOwner(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('denies staff', () => {
        const req = { user: { role: 'staff' } };
        const res = mockRes();
        const next = mockNext();

        requireTenantOwner(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 401 if no user', () => {
        const req = {};
        const res = mockRes();
        const next = mockNext();

        requireTenantOwner(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('requireSuperAdmin', () => {
    test('allows super_admin', () => {
        const req = { user: { role: 'super_admin' } };
        const res = mockRes();
        const next = mockNext();

        requireSuperAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('denies tenant_owner', () => {
        const req = { user: { role: 'tenant_owner' } };
        const res = mockRes();
        const next = mockNext();

        requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 401 if no user', () => {
        const req = {};
        const res = mockRes();
        const next = mockNext();

        requireSuperAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('optionalAuth', () => {
    test('sets user if valid cookie token', async () => {
        mockQuery.mockResolvedValue([mockUser]);
        const req = { cookies: { access_token: validToken }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await optionalAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(1);
    });

    test('sets user if valid Authorization header', async () => {
        mockQuery.mockResolvedValue([mockUser]);
        const req = { cookies: {}, headers: { authorization: `Bearer ${validToken}` } };
        const res = mockRes();
        const next = mockNext();

        await optionalAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
    });

    test('continues without user if no token', async () => {
        const req = { cookies: {}, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await optionalAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    test('continues without user if token invalid', async () => {
        const req = { cookies: { access_token: 'bad-token' }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await optionalAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });

    test('continues without user if DB returns empty', async () => {
        mockQuery.mockResolvedValue([]);
        const req = { cookies: { access_token: validToken }, headers: {} };
        const res = mockRes();
        const next = mockNext();

        await optionalAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });
});
