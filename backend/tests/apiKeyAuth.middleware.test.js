/**
 * Tests for API Key Authentication Middleware
 * verifyApiKey, requireApiPermission, apiKeyRateLimit
 */

// Mock apiKey service
const mockValidate = jest.fn();
jest.mock('../src/services/apiKey.service', () => ({
    validate: (...args) => mockValidate(...args)
}));

// Mock logger
jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
}));

// Mock database (used by logApiRequest)
const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const { verifyApiKey, requireApiPermission, apiKeyRateLimit } = require('../src/middlewares/apiKeyAuth');

// Test helpers
const mockReq = (overrides = {}) => ({
    headers: {},
    header: function (name) {
        // Case-insensitive header lookup
        const lower = name.toLowerCase();
        for (const key of Object.keys(this.headers)) {
            if (key.toLowerCase() === lower) return this.headers[key];
        }
        return undefined;
    },
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = () => jest.fn();

const validationResult = {
    apiKeyId: 42,
    apiKeyName: 'test-key',
    tenantId: 'tenant-abc',
    tenantName: 'Test Tenant',
    permissions: { clients: { read: true, write: true }, workouts: { read: true } },
    rateLimit: 1000
};

beforeEach(() => {
    mockValidate.mockReset();
    mockQuery.mockReset();
});

describe('verifyApiKey', () => {
    test('passes with valid API key and secret', async () => {
        mockValidate.mockResolvedValue(validationResult);
        const req = mockReq({
            headers: { 'X-API-Key': 'pk_test_123', 'X-API-Secret': 'sk_test_456' }
        });
        const res = mockRes();
        const next = mockNext();

        await verifyApiKey(req, res, next);

        expect(mockValidate).toHaveBeenCalledWith('pk_test_123', 'sk_test_456');
        expect(next).toHaveBeenCalled();
        expect(req.apiKey).toEqual({
            id: 42,
            name: 'test-key',
            tenantId: 'tenant-abc',
            tenantName: 'Test Tenant',
            permissions: validationResult.permissions,
            rateLimit: 1000
        });
        expect(req.user).toEqual({
            tenantId: 'tenant-abc',
            id: null,
            role: 'api_key',
            isApiKey: true
        });
    });

    test('returns 401 when API key header is missing', async () => {
        const req = mockReq({
            headers: { 'X-API-Secret': 'sk_test_456' }
        });
        const res = mockRes();
        const next = mockNext();

        await verifyApiKey(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('API key and secret are required')
        }));
        expect(next).not.toHaveBeenCalled();
        expect(mockValidate).not.toHaveBeenCalled();
    });

    test('returns 401 when API secret header is missing', async () => {
        const req = mockReq({
            headers: { 'X-API-Key': 'pk_test_123' }
        });
        const res = mockRes();
        const next = mockNext();

        await verifyApiKey(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('API key and secret are required')
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when both headers are missing', async () => {
        const req = mockReq({ headers: {} });
        const res = mockRes();
        const next = mockNext();

        await verifyApiKey(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns error status from service when validation fails (invalid key)', async () => {
        const error = new Error('Invalid API key');
        error.status = 401;
        mockValidate.mockRejectedValue(error);

        const req = mockReq({
            headers: { 'X-API-Key': 'pk_invalid', 'X-API-Secret': 'sk_invalid' }
        });
        const res = mockRes();
        const next = mockNext();

        await verifyApiKey(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Invalid API key'
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when API key has expired', async () => {
        const error = new Error('API key has expired');
        error.status = 401;
        mockValidate.mockRejectedValue(error);

        const req = mockReq({
            headers: { 'X-API-Key': 'pk_expired', 'X-API-Secret': 'sk_expired' }
        });
        const res = mockRes();
        const next = mockNext();

        await verifyApiKey(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'API key has expired'
        }));
        expect(next).not.toHaveBeenCalled();
    });
});

describe('requireApiPermission', () => {
    test('passes when API key has the required permission', () => {
        const req = mockReq({
            apiKey: {
                permissions: { clients: { read: true, write: true } }
            }
        });
        const res = mockRes();
        const next = mockNext();

        requireApiPermission('clients.read')(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('blocks when API key lacks the required permission', () => {
        const req = mockReq({
            apiKey: {
                permissions: { clients: { read: true } }
            }
        });
        const res = mockRes();
        const next = mockNext();

        requireApiPermission('clients.write')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('clients.write')
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when no apiKey is set on request', () => {
        const req = mockReq({});
        const res = mockRes();
        const next = mockNext();

        requireApiPermission('clients.read')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'API key authentication required'
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('checks multiple permissions - all required', () => {
        const req = mockReq({
            apiKey: {
                permissions: { clients: { read: true }, workouts: { read: true } }
            }
        });
        const res = mockRes();
        const next = mockNext();

        requireApiPermission('clients.read', 'workouts.read')(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('blocks when one of multiple required permissions is missing', () => {
        const req = mockReq({
            apiKey: {
                permissions: { clients: { read: true } }
            }
        });
        const res = mockRes();
        const next = mockNext();

        requireApiPermission('clients.read', 'workouts.write')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('apiKeyRateLimit', () => {
    test('passes when under rate limit', async () => {
        const req = mockReq({
            apiKey: { id: 'rate-test-1', rateLimit: 100 }
        });
        const res = mockRes();
        const next = mockNext();

        await apiKeyRateLimit(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
        expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });

    test('skips rate limiting when no apiKey on request', async () => {
        const req = mockReq({});
        const res = mockRes();
        const next = mockNext();

        await apiKeyRateLimit(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.set).not.toHaveBeenCalled();
    });

    test('returns 429 when rate limit exceeded', async () => {
        const keyId = 'rate-test-exceeded-' + Date.now();
        const req = mockReq({
            apiKey: { id: keyId, rateLimit: 1 }
        });
        const res = mockRes();

        // First request should pass
        const next1 = mockNext();
        await apiKeyRateLimit(req, res, next1);
        expect(next1).toHaveBeenCalled();

        // Second request should be rate limited (limit is 1)
        const res2 = mockRes();
        const next2 = mockNext();
        await apiKeyRateLimit(req, res2, next2);

        expect(res2.status).toHaveBeenCalledWith(429);
        expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('rate limit exceeded')
        }));
        expect(next2).not.toHaveBeenCalled();
    });

    test('uses default rate limit of 1000 when not specified', async () => {
        const req = mockReq({
            apiKey: { id: 'rate-test-default-' + Date.now(), rateLimit: undefined }
        });
        const res = mockRes();
        const next = mockNext();

        await apiKeyRateLimit(req, res, next);

        expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '1000');
    });
});
