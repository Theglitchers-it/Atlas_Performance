/**
 * Tests for OAuth Controller
 * getAuthUrl, handleCallback, buildCallbackHTML
 */

// Mock dependencies
jest.mock('../src/services/oauth.service', () => ({
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn()
}));

jest.mock('../src/utils/cookies', () => ({
    setAuthCookies: jest.fn()
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

const oauthController = require('../src/controllers/oauth.controller');
const oauthService = require('../src/services/oauth.service');
const { setAuthCookies } = require('../src/utils/cookies');

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
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('OAuthController', () => {
    describe('getAuthUrl', () => {
        test('returns auth URL for valid provider (google)', async () => {
            const result = { url: 'https://accounts.google.com/o/oauth2/v2/auth?...', state: 'abc123' };
            oauthService.getAuthUrl.mockResolvedValue(result);

            const req = mockReq({ params: { provider: 'google' } });
            const res = mockRes();

            await oauthController.getAuthUrl(req, res, mockNext);

            expect(oauthService.getAuthUrl).toHaveBeenCalledWith('google');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('returns auth URL for valid provider (github)', async () => {
            const result = { url: 'https://github.com/login/oauth/authorize?...', state: 'xyz789' };
            oauthService.getAuthUrl.mockResolvedValue(result);

            const req = mockReq({ params: { provider: 'github' } });
            const res = mockRes();

            await oauthController.getAuthUrl(req, res, mockNext);

            expect(oauthService.getAuthUrl).toHaveBeenCalledWith('github');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('returns 400 for unsupported provider', async () => {
            const req = mockReq({ params: { provider: 'facebook' } });
            const res = mockRes();

            await oauthController.getAuthUrl(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: expect.stringContaining('facebook')
            });
            expect(oauthService.getAuthUrl).not.toHaveBeenCalled();
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Config missing');
            oauthService.getAuthUrl.mockRejectedValue(error);

            const req = mockReq({ params: { provider: 'google' } });
            const res = mockRes();

            await oauthController.getAuthUrl(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('handleCallback', () => {
        test('handles successful callback with code and state', async () => {
            const result = {
                accessToken: 'access-token-123',
                refreshToken: 'refresh-token-456',
                user: { id: 1, email: 'user@test.com', name: 'Test User' }
            };
            oauthService.handleCallback.mockResolvedValue(result);

            const req = mockReq({
                params: { provider: 'google' },
                query: { code: 'auth-code-xyz', state: 'state-abc' }
            });
            const res = mockRes();

            await oauthController.handleCallback(req, res, mockNext);

            expect(oauthService.handleCallback).toHaveBeenCalledWith('google', 'auth-code-xyz', 'state-abc');
            expect(setAuthCookies).toHaveBeenCalledWith(res, 'access-token-123', 'refresh-token-456');
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('oauth-callback'));
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('success'));
        });

        test('sends error HTML for unsupported provider', async () => {
            const req = mockReq({
                params: { provider: 'facebook' },
                query: { code: 'code', state: 'state' }
            });
            const res = mockRes();

            await oauthController.handleCallback(req, res, mockNext);

            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Provider non supportato'));
            expect(oauthService.handleCallback).not.toHaveBeenCalled();
        });

        test('sends error HTML when provider returns an oauth error (access_denied)', async () => {
            const req = mockReq({
                params: { provider: 'google' },
                query: { error: 'access_denied', error_description: 'User denied access' }
            });
            const res = mockRes();

            await oauthController.handleCallback(req, res, mockNext);

            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Accesso negato'));
            expect(oauthService.handleCallback).not.toHaveBeenCalled();
        });

        test('sends error HTML when provider returns a generic error', async () => {
            const req = mockReq({
                params: { provider: 'google' },
                query: { error: 'server_error', error_description: 'Internal error' }
            });
            const res = mockRes();

            await oauthController.handleCallback(req, res, mockNext);

            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Internal error'));
        });

        test('sends error HTML when code or state is missing', async () => {
            const req = mockReq({
                params: { provider: 'google' },
                query: { code: 'abc' }
            });
            const res = mockRes();

            await oauthController.handleCallback(req, res, mockNext);

            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Parametri mancanti'));
            expect(oauthService.handleCallback).not.toHaveBeenCalled();
        });

        test('sends error HTML when service throws an error', async () => {
            oauthService.handleCallback.mockRejectedValue(new Error('Token exchange failed'));

            const req = mockReq({
                params: { provider: 'google' },
                query: { code: 'code', state: 'state' }
            });
            const res = mockRes();

            await oauthController.handleCallback(req, res, mockNext);

            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Token exchange failed'));
            // Note: handleCallback catches errors internally and sends HTML, does NOT call next()
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('buildCallbackHTML', () => {
        test('builds success HTML with postMessage payload', () => {
            const html = oauthController.buildCallbackHTML(true, { user: { id: 1 } }, null);

            expect(html).toContain('oauth-callback');
            expect(html).toContain('"success":true');
            expect(html).toContain('postMessage');
            expect(html).toContain('Accesso effettuato');
        });

        test('builds error HTML with error message', () => {
            const html = oauthController.buildCallbackHTML(false, null, 'Something went wrong');

            expect(html).toContain('oauth-callback');
            expect(html).toContain('"success":false');
            expect(html).toContain('Something went wrong');
        });
    });
});
