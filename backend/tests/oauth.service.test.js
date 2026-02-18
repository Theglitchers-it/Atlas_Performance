/**
 * Tests for OAuthService
 * getAuthUrl, handleCallback, exchangeCode, fetchProfile, findOrCreateOAuthUser, generateLoginResponse
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

jest.mock('googleapis', () => ({
    google: {
        auth: { OAuth2: jest.fn() }
    }
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Set required env vars for all providers
process.env.GOOGLE_CLIENT_ID = 'google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
process.env.GOOGLE_AUTH_REDIRECT_URI = 'http://localhost:3000/api/auth/oauth/google/callback';
process.env.GITHUB_CLIENT_ID = 'github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'github-client-secret';
process.env.DISCORD_CLIENT_ID = 'discord-client-id';
process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret';
// JWT secrets needed for generateLoginResponse
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';

const oauthService = require('../src/services/oauth.service');

beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
});

// =============================================
// getAuthUrl
// =============================================
describe('OAuthService.getAuthUrl', () => {
    test('generates Google auth URL with CSRF state', async () => {
        mockQuery.mockResolvedValue({ insertId: 1 });

        const result = await oauthService.getAuthUrl('google');

        expect(result.url).toContain('accounts.google.com');
        expect(result.url).toContain('client_id=google-client-id');
        expect(result.url).toContain('access_type=offline');
        // Should have saved state to DB
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO oauth_states'),
            expect.arrayContaining(['google'])
        );
        // Should clean up expired states
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM oauth_states WHERE expires_at < NOW()')
        );
    });

    test('throws for unsupported provider', async () => {
        await expect(oauthService.getAuthUrl('facebook')).rejects.toEqual(
            expect.objectContaining({ status: 400, message: expect.stringContaining('non supportato') })
        );
    });

    test('generates GitHub auth URL', async () => {
        mockQuery.mockResolvedValue({ insertId: 1 });

        const result = await oauthService.getAuthUrl('github');

        expect(result.url).toContain('github.com/login/oauth/authorize');
        expect(result.url).toContain('client_id=github-client-id');
    });
});

// =============================================
// handleCallback
// =============================================
describe('OAuthService.handleCallback', () => {
    test('validates CSRF state and rejects expired/invalid state', async () => {
        mockQuery.mockResolvedValue([]); // No matching state found

        await expect(
            oauthService.handleCallback('google', 'auth-code', 'invalid-state')
        ).rejects.toEqual(
            expect.objectContaining({ status: 400, message: expect.stringContaining('State OAuth non valido') })
        );
    });

    test('throws for unsupported provider', async () => {
        await expect(
            oauthService.handleCallback('facebook', 'code', 'state')
        ).rejects.toEqual(
            expect.objectContaining({ status: 400 })
        );
    });
});

// =============================================
// exchangeCode
// =============================================
describe('OAuthService.exchangeCode', () => {
    const googleConfig = {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        getClientId: () => 'google-client-id',
        getClientSecret: () => 'google-client-secret',
        getRedirectUri: () => 'http://localhost:3000/callback'
    };

    test('exchanges code for access token with Google', async () => {
        mockFetch.mockResolvedValue({
            json: async () => ({ access_token: 'google-access-token-123' })
        });

        const token = await oauthService.exchangeCode('google', 'auth-code-abc', googleConfig);

        expect(token).toBe('google-access-token-123');
        expect(mockFetch).toHaveBeenCalledWith(
            'https://oauth2.googleapis.com/token',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'Content-Type': 'application/json' })
            })
        );
    });

    test('throws on error response from provider', async () => {
        mockFetch.mockResolvedValue({
            json: async () => ({
                error: 'invalid_grant',
                error_description: 'Code has expired'
            })
        });

        await expect(
            oauthService.exchangeCode('google', 'bad-code', googleConfig)
        ).rejects.toEqual(
            expect.objectContaining({ status: 400 })
        );
    });
});

// =============================================
// findOrCreateOAuthUser
// =============================================
describe('OAuthService.findOrCreateOAuthUser', () => {
    const profile = {
        providerId: '12345',
        email: 'mario@test.com',
        firstName: 'Mario',
        lastName: 'Rossi',
        avatarUrl: 'https://example.com/avatar.png'
    };

    test('returns existing user found by provider + provider_id', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                id: 1,
                tenant_id: 'tenant-1',
                email: 'mario@test.com',
                role: 'tenant_owner',
                first_name: 'Mario',
                last_name: 'Rossi',
                avatar_url: null,
                status: 'active',
                business_name: 'Mario Studio',
                subscription_plan: 'pro',
                subscription_status: 'active'
            }])
            .mockResolvedValue({}); // UPDATE last_login + refresh token save

        const result = await oauthService.findOrCreateOAuthUser('google', profile);

        expect(result.user.email).toBe('mario@test.com');
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.isNewUser).toBe(false);
    });

    test('throws 403 when existing user is not active', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1,
            tenant_id: 'tenant-1',
            email: 'mario@test.com',
            role: 'tenant_owner',
            status: 'suspended'
        }]);

        await expect(
            oauthService.findOrCreateOAuthUser('google', profile)
        ).rejects.toEqual(
            expect.objectContaining({ status: 403 })
        );
    });

    test('links OAuth to existing account found by email', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // No user by provider_id
            .mockResolvedValueOnce([{  // Found by email
                id: 2,
                tenant_id: 'tenant-2',
                email: 'mario@test.com',
                role: 'trainer',
                first_name: 'Mario',
                last_name: 'Rossi',
                avatar_url: null,
                status: 'active',
                business_name: 'Gym One',
                subscription_plan: 'basic',
                subscription_status: 'active'
            }])
            .mockResolvedValue({}); // UPDATE oauth_provider + refresh token

        const result = await oauthService.findOrCreateOAuthUser('google', profile);

        expect(result.user.id).toBe(2);
        // Should have updated the user to link OAuth provider
        const updateCall = mockQuery.mock.calls[2];
        expect(updateCall[0]).toContain('UPDATE users SET oauth_provider');
        expect(updateCall[1]).toContain('google');
        expect(updateCall[1]).toContain('12345');
    });

    test('creates new user and tenant when no existing account', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // No user by provider_id
            .mockResolvedValueOnce([]); // No user by email

        const mockConnection = {
            execute: jest.fn()
                .mockResolvedValueOnce({}) // INSERT tenant
                .mockResolvedValueOnce([{ insertId: 99 }]) // INSERT user
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));

        // Mock the refresh token save (fire-and-forget)
        mockQuery.mockResolvedValue({});

        const result = await oauthService.findOrCreateOAuthUser('google', profile);

        expect(result.isNewUser).toBe(true);
        expect(result.user.role).toBe('tenant_owner');
        expect(result.user.email).toBe('mario@test.com');
        expect(result.accessToken).toBeDefined();

        // Verify tenant creation
        const tenantInsert = mockConnection.execute.mock.calls[0];
        expect(tenantInsert[0]).toContain('INSERT INTO tenants');

        // Verify user creation
        const userInsert = mockConnection.execute.mock.calls[1];
        expect(userInsert[0]).toContain('INSERT INTO users');
        expect(userInsert[1]).toContain('google'); // oauth_provider
    });
});

// =============================================
// generateLoginResponse
// =============================================
describe('OAuthService.generateLoginResponse', () => {
    test('generates JWT tokens with correct payload', () => {
        mockQuery.mockResolvedValue({}); // refresh token save (fire-and-forget)

        const user = {
            id: 1,
            tenant_id: 'tenant-1',
            email: 'test@test.com',
            role: 'tenant_owner',
            first_name: 'Test',
            last_name: 'User',
            avatar_url: null,
            business_name: 'Test Studio',
            subscription_plan: 'pro',
            subscription_status: 'active'
        };

        const result = oauthService.generateLoginResponse(user, false);

        expect(result.user.id).toBe(1);
        expect(result.user.tenantId).toBe('tenant-1');
        expect(result.user.email).toBe('test@test.com');
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.isNewUser).toBe(false);
    });
});
