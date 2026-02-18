/**
 * Tests for API Key Controller
 * generate, list, revoke, getUsageStats, validate
 */

// Mock dependencies
jest.mock('../src/services/apiKey.service', () => ({
    generate: jest.fn(),
    list: jest.fn(),
    revoke: jest.fn(),
    getUsageStats: jest.fn(),
    validate: jest.fn()
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const apiKeyController = require('../src/controllers/apiKey.controller');
const apiKeyService = require('../src/services/apiKey.service');

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

describe('ApiKeyController', () => {
    describe('generate', () => {
        test('generates a new API key and returns 201', async () => {
            const result = {
                id: 1,
                apiKey: 'pk_test_abc123',
                apiSecret: 'sk_test_xyz789',
                name: 'My API Key'
            };
            apiKeyService.generate.mockResolvedValue(result);

            const req = mockReq({
                body: { name: 'My API Key', permissions: ['read'], expiresInDays: 30 }
            });
            const res = mockRes();

            await apiKeyController.generate(req, res);

            expect(apiKeyService.generate).toHaveBeenCalledWith('tenant-1', 'My API Key', ['read'], 30);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('returns error status on generation failure', async () => {
            const error = new Error('Duplicate key name');
            error.status = 409;
            apiKeyService.generate.mockRejectedValue(error);

            const req = mockReq({
                body: { name: 'Duplicate', permissions: ['read'] }
            });
            const res = mockRes();

            await apiKeyController.generate(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Duplicate key name'
            });
        });

        test('defaults to 500 status when error has no status', async () => {
            const error = new Error('Unexpected error');
            apiKeyService.generate.mockRejectedValue(error);

            const req = mockReq({ body: { name: 'Test' } });
            const res = mockRes();

            await apiKeyController.generate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unexpected error'
            });
        });
    });

    describe('list', () => {
        test('returns list of API keys for the tenant', async () => {
            const keys = [
                { id: 1, name: 'Key 1', prefix: 'pk_test_abc', createdAt: '2025-01-01' },
                { id: 2, name: 'Key 2', prefix: 'pk_test_def', createdAt: '2025-02-01' }
            ];
            apiKeyService.list.mockResolvedValue(keys);

            const req = mockReq();
            const res = mockRes();

            await apiKeyController.list(req, res);

            expect(apiKeyService.list).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { keys }
            });
        });

        test('returns error status on list failure', async () => {
            const error = new Error('DB connection failed');
            apiKeyService.list.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await apiKeyController.list(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'DB connection failed'
            });
        });
    });

    describe('revoke', () => {
        test('revokes an API key by id', async () => {
            const result = { revoked: true };
            apiKeyService.revoke.mockResolvedValue(result);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await apiKeyController.revoke(req, res);

            expect(apiKeyService.revoke).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('returns error status when key not found', async () => {
            const error = new Error('API key not found');
            error.status = 404;
            apiKeyService.revoke.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await apiKeyController.revoke(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'API key not found'
            });
        });

        test('parses id parameter as integer', async () => {
            apiKeyService.revoke.mockResolvedValue({ revoked: true });

            const req = mockReq({ params: { id: '42' } });
            const res = mockRes();

            await apiKeyController.revoke(req, res);

            expect(apiKeyService.revoke).toHaveBeenCalledWith(42, 'tenant-1');
        });
    });

    describe('getUsageStats', () => {
        test('returns usage stats for all keys when no apiKeyId given', async () => {
            const stats = { totalCalls: 150, callsToday: 12 };
            apiKeyService.getUsageStats.mockResolvedValue(stats);

            const req = mockReq();
            const res = mockRes();

            await apiKeyController.getUsageStats(req, res);

            expect(apiKeyService.getUsageStats).toHaveBeenCalledWith('tenant-1', null);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { stats }
            });
        });

        test('returns usage stats for specific key when apiKeyId provided', async () => {
            const stats = { totalCalls: 50, callsToday: 3 };
            apiKeyService.getUsageStats.mockResolvedValue(stats);

            const req = mockReq({ query: { apiKeyId: '7' } });
            const res = mockRes();

            await apiKeyController.getUsageStats(req, res);

            expect(apiKeyService.getUsageStats).toHaveBeenCalledWith('tenant-1', 7);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { stats }
            });
        });

        test('returns error status on failure', async () => {
            const error = new Error('Stats query failed');
            apiKeyService.getUsageStats.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await apiKeyController.getUsageStats(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Stats query failed'
            });
        });
    });

    describe('validate', () => {
        test('validates an API key/secret pair successfully', async () => {
            const result = { valid: true, tenantId: 'tenant-1', permissions: ['read'] };
            apiKeyService.validate.mockResolvedValue(result);

            const req = mockReq({
                body: { apiKey: 'pk_test_abc123', apiSecret: 'sk_test_xyz789' }
            });
            const res = mockRes();

            await apiKeyController.validate(req, res);

            expect(apiKeyService.validate).toHaveBeenCalledWith('pk_test_abc123', 'sk_test_xyz789');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('returns error when validation fails', async () => {
            const error = new Error('Invalid API key');
            error.status = 401;
            apiKeyService.validate.mockRejectedValue(error);

            const req = mockReq({
                body: { apiKey: 'invalid', apiSecret: 'wrong' }
            });
            const res = mockRes();

            await apiKeyController.validate(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid API key'
            });
        });

        test('defaults to 500 when error has no status code', async () => {
            const error = new Error('Unexpected');
            apiKeyService.validate.mockRejectedValue(error);

            const req = mockReq({ body: { apiKey: 'test', apiSecret: 'test' } });
            const res = mockRes();

            await apiKeyController.validate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
