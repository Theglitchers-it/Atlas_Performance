/**
 * Tests for ApiKeyService
 * Generate, validate, list, revoke, usage stats, masking
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('$2a$10$hashedSecretValue'),
    compare: jest.fn()
}));

// Mock crypto to produce deterministic keys for testing
jest.mock('crypto', () => ({
    randomBytes: jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('abcdef1234567890abcdef1234567890abcdef1234567890')
    })
}));

const bcrypt = require('bcryptjs');
const apiKeyService = require('../src/services/apiKey.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// generate
// =============================================
describe('ApiKeyService.generate', () => {
    test('generates API key with tenant_id scoping', async () => {
        mockQuery
            .mockResolvedValueOnce([])  // No existing key with same name
            .mockResolvedValueOnce({ insertId: 1 }); // INSERT result

        const result = await apiKeyService.generate('tenant-1', 'My Key', { read: true }, 30);

        expect(result.id).toBe(1);
        expect(result.name).toBe('My Key');
        expect(result.apiKey).toMatch(/^ptk_/);
        expect(result.apiSecret).toBeDefined();
        expect(result.warning).toContain('Store the API secret securely');

        // Verify tenant_id in duplicate check query
        const checkCall = mockQuery.mock.calls[0];
        expect(checkCall[0]).toContain('tenant_id = ?');
        expect(checkCall[1][0]).toBe('tenant-1');

        // Verify tenant_id in INSERT query
        const insertCall = mockQuery.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO api_keys');
        expect(insertCall[1][0]).toBe('tenant-1');
    });

    test('rejects empty name with 400', async () => {
        await expect(
            apiKeyService.generate('tenant-1', '', {})
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('name is required')
        }));

        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('rejects duplicate name within same tenant with 409', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 5 }]); // Existing key found

        await expect(
            apiKeyService.generate('tenant-1', 'Existing Key', {})
        ).rejects.toEqual(expect.objectContaining({
            status: 409,
            message: expect.stringContaining('already exists')
        }));
    });

    test('sets expiration date when expiresInDays is provided', async () => {
        mockQuery
            .mockResolvedValueOnce([])  // No duplicate
            .mockResolvedValueOnce({ insertId: 2 });

        const result = await apiKeyService.generate('tenant-1', 'Expiring Key', {}, 30);

        expect(result.expiresAt).toBeInstanceOf(Date);
    });

    test('sets null expiration when expiresInDays is not provided', async () => {
        mockQuery
            .mockResolvedValueOnce([])  // No duplicate
            .mockResolvedValueOnce({ insertId: 3 });

        const result = await apiKeyService.generate('tenant-1', 'No Expiry Key', {}, null);

        expect(result.expiresAt).toBeNull();
    });

    test('uses default rate limit of 1000 when not specified', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce({ insertId: 4 });

        const result = await apiKeyService.generate('tenant-1', 'Default Rate', {});

        expect(result.rateLimit).toBe(1000);
    });
});

// =============================================
// validate
// =============================================
describe('ApiKeyService.validate', () => {
    test('validates a valid API key/secret pair', async () => {
        mockQuery
            .mockResolvedValueOnce([{ // SELECT api key record
                id: 1,
                tenant_id: 'tenant-1',
                tenant_name: 'Test Tenant',
                tenant_status: 'active',
                name: 'My Key',
                api_key: 'ptk_abc123',
                api_secret_hash: '$2a$10$hashedValue',
                permissions: '{"read":true}',
                rate_limit: 1000,
                expires_at: null
            }])
            .mockResolvedValueOnce([]); // UPDATE last_used_at

        bcrypt.compare.mockResolvedValueOnce(true); // Secret matches

        const result = await apiKeyService.validate('ptk_abc123', 'valid-secret');

        expect(result.tenantId).toBe('tenant-1');
        expect(result.tenantName).toBe('Test Tenant');
        expect(result.apiKeyId).toBe(1);
        expect(result.permissions).toEqual({ read: true });
    });

    test('rejects missing API key or secret with 401', async () => {
        await expect(
            apiKeyService.validate(null, 'secret')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('required')
        }));

        await expect(
            apiKeyService.validate('ptk_abc', null)
        ).rejects.toEqual(expect.objectContaining({
            status: 401
        }));
    });

    test('rejects invalid API key with 401', async () => {
        mockQuery.mockResolvedValueOnce([]); // No key found

        await expect(
            apiKeyService.validate('ptk_invalid', 'secret')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('Invalid API key')
        }));
    });

    test('rejects expired API key and auto-revokes it', async () => {
        const pastDate = new Date('2020-01-01');
        mockQuery
            .mockResolvedValueOnce([{
                id: 1,
                tenant_id: 'tenant-1',
                tenant_name: 'Test',
                tenant_status: 'active',
                api_key: 'ptk_expired',
                api_secret_hash: '$2a$10$hash',
                permissions: '{}',
                rate_limit: 1000,
                expires_at: pastDate
            }])
            .mockResolvedValueOnce([]); // UPDATE status to expired

        await expect(
            apiKeyService.validate('ptk_expired', 'secret')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('expired')
        }));

        // Verify the key was auto-revoked
        expect(mockQuery.mock.calls[1][0]).toContain('status = "expired"');
    });

    test('rejects when tenant is not active with 403', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1,
            tenant_id: 'tenant-1',
            tenant_name: 'Suspended Tenant',
            tenant_status: 'suspended',
            api_key: 'ptk_suspended',
            api_secret_hash: '$2a$10$hash',
            permissions: '{}',
            rate_limit: 1000,
            expires_at: null
        }]);

        await expect(
            apiKeyService.validate('ptk_suspended', 'secret')
        ).rejects.toEqual(expect.objectContaining({
            status: 403,
            message: expect.stringContaining('not active')
        }));
    });

    test('rejects invalid secret with 401', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1,
            tenant_id: 'tenant-1',
            tenant_name: 'Test',
            tenant_status: 'active',
            api_key: 'ptk_abc',
            api_secret_hash: '$2a$10$hash',
            permissions: '{}',
            rate_limit: 1000,
            expires_at: null
        }]);

        bcrypt.compare.mockResolvedValueOnce(false); // Secret does NOT match

        await expect(
            apiKeyService.validate('ptk_abc', 'wrong-secret')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('Invalid API secret')
        }));
    });
});

// =============================================
// list
// =============================================
describe('ApiKeyService.list', () => {
    test('returns all API keys for a tenant with masked keys', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1,
                name: 'Key 1',
                api_key: 'ptk_abcdef1234567890abcdef',
                permissions: '{"read":true}',
                rate_limit: 1000,
                last_used_at: null,
                expires_at: null,
                status: 'active',
                created_at: new Date()
            },
            {
                id: 2,
                name: 'Key 2',
                api_key: 'ptk_xyz9876543210xyz9876',
                permissions: '{}',
                rate_limit: 500,
                last_used_at: new Date(),
                expires_at: null,
                status: 'active',
                created_at: new Date()
            }
        ]);

        const result = await apiKeyService.list('tenant-1');

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Key 1');
        // API key should be masked
        expect(result[0].apiKey).toMatch(/^ptk_abcd\*+$/);
        expect(result[0].apiKey).not.toBe('ptk_abcdef1234567890abcdef');
        expect(result[0].permissions).toEqual({ read: true });

        // Verify tenant_id scoping in query
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1']
        );
    });

    test('returns empty array when no keys exist', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await apiKeyService.list('tenant-1');

        expect(result).toEqual([]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1']
        );
    });
});

// =============================================
// revoke
// =============================================
describe('ApiKeyService.revoke', () => {
    test('revokes an API key owned by the tenant', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Key to Revoke' }]) // Ownership check
            .mockResolvedValueOnce([]); // UPDATE status

        const result = await apiKeyService.revoke(1, 'tenant-1');

        expect(result.id).toBe(1);
        expect(result.name).toBe('Key to Revoke');
        expect(result.status).toBe('revoked');

        // Verify tenant_id in ownership check
        const checkCall = mockQuery.mock.calls[0];
        expect(checkCall[0]).toContain('tenant_id = ?');
        expect(checkCall[1]).toEqual([1, 'tenant-1']);
    });

    test('throws 404 when key does not belong to tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // No key found for tenant

        await expect(
            apiKeyService.revoke(999, 'wrong-tenant')
        ).rejects.toEqual(expect.objectContaining({
            status: 404,
            message: expect.stringContaining('not found')
        }));
    });
});

// =============================================
// getUsageStats
// =============================================
describe('ApiKeyService.getUsageStats', () => {
    test('returns usage stats for all keys of a tenant', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1,
                name: 'Key 1',
                api_key: 'ptk_abcdef1234567890abcdef',
                total_requests: 150,
                successful_requests: 140,
                failed_requests: 10,
                last_request_at: new Date()
            }
        ]);

        const result = await apiKeyService.getUsageStats('tenant-1');

        expect(result).toHaveLength(1);
        expect(result[0].totalRequests).toBe(150);
        expect(result[0].successfulRequests).toBe(140);
        expect(result[0].failedRequests).toBe(10);
        // API key should be masked
        expect(result[0].apiKey).toMatch(/^\w{8}\*+$/);

        // Verify tenant_id in query
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('ak.tenant_id = ?'),
            ['tenant-1']
        );
    });

    test('filters by specific apiKeyId when provided', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 5,
                name: 'Specific Key',
                api_key: 'ptk_specific1234567890ab',
                total_requests: 50,
                successful_requests: 45,
                failed_requests: 5,
                last_request_at: null
            }
        ]);

        const result = await apiKeyService.getUsageStats('tenant-1', 5);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(5);

        // Verify both tenant_id and apiKeyId in query params
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('ak.tenant_id = ?'),
            ['tenant-1', 5]
        );
        expect(mockQuery.mock.calls[0][0]).toContain('ak.id = ?');
    });

    test('returns zero counts when no usage data exists', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1,
                name: 'Unused Key',
                api_key: 'ptk_unused1234567890abcd',
                total_requests: null,
                successful_requests: null,
                failed_requests: null,
                last_request_at: null
            }
        ]);

        const result = await apiKeyService.getUsageStats('tenant-1');

        expect(result[0].totalRequests).toBe(0);
        expect(result[0].successfulRequests).toBe(0);
        expect(result[0].failedRequests).toBe(0);
    });
});

// =============================================
// _maskApiKey (private helper, tested indirectly)
// =============================================
describe('ApiKeyService._maskApiKey', () => {
    test('masks API key showing only first 8 chars', () => {
        const masked = apiKeyService._maskApiKey('ptk_abcdef1234567890');
        expect(masked).toBe('ptk_abcd' + '*'.repeat(12));
    });

    test('returns short keys unchanged', () => {
        const result = apiKeyService._maskApiKey('short');
        expect(result).toBe('short');
    });

    test('handles null/undefined gracefully', () => {
        expect(apiKeyService._maskApiKey(null)).toBeNull();
        expect(apiKeyService._maskApiKey(undefined)).toBeUndefined();
    });
});
