const cookies = require('../src/utils/cookies');

describe('Cookie Utility', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    describe('accessTokenOptions', () => {
        test('development: httpOnly true, secure false, sameSite lax, path /api', () => {
            process.env.NODE_ENV = 'development';
            const opts = cookies.accessTokenOptions();
            expect(opts.httpOnly).toBe(true);
            expect(opts.secure).toBe(false);
            expect(opts.sameSite).toBe('lax');
            expect(opts.path).toBe('/api');
            expect(opts.maxAge).toBe(15 * 60 * 1000);
        });

        test('production: secure true, sameSite strict', () => {
            process.env.NODE_ENV = 'production';
            const opts = cookies.accessTokenOptions();
            expect(opts.httpOnly).toBe(true);
            expect(opts.secure).toBe(true);
            expect(opts.sameSite).toBe('strict');
            expect(opts.path).toBe('/api');
        });

        test('maxAge is 15 minutes', () => {
            const opts = cookies.accessTokenOptions();
            expect(opts.maxAge).toBe(900000);
        });
    });

    describe('refreshTokenOptions', () => {
        test('development: httpOnly true, secure false, sameSite lax, path /api/auth', () => {
            process.env.NODE_ENV = 'development';
            const opts = cookies.refreshTokenOptions();
            expect(opts.httpOnly).toBe(true);
            expect(opts.secure).toBe(false);
            expect(opts.sameSite).toBe('lax');
            expect(opts.path).toBe('/api/auth');
            expect(opts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
        });

        test('production: secure true, sameSite strict', () => {
            process.env.NODE_ENV = 'production';
            const opts = cookies.refreshTokenOptions();
            expect(opts.httpOnly).toBe(true);
            expect(opts.secure).toBe(true);
            expect(opts.sameSite).toBe('strict');
            expect(opts.path).toBe('/api/auth');
        });

        test('maxAge is 7 days', () => {
            const opts = cookies.refreshTokenOptions();
            expect(opts.maxAge).toBe(604800000);
        });
    });

    describe('setAuthCookies', () => {
        test('sets both access_token and refresh_token cookies', () => {
            const res = { cookie: jest.fn() };
            cookies.setAuthCookies(res, 'test-access', 'test-refresh');

            expect(res.cookie).toHaveBeenCalledTimes(2);
            expect(res.cookie).toHaveBeenCalledWith('access_token', 'test-access', expect.objectContaining({
                httpOnly: true,
                path: '/api'
            }));
            expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'test-refresh', expect.objectContaining({
                httpOnly: true,
                path: '/api/auth'
            }));
        });

        test('access token cookie has shorter maxAge than refresh token', () => {
            const res = { cookie: jest.fn() };
            cookies.setAuthCookies(res, 'a', 'r');

            const accessCall = res.cookie.mock.calls.find(c => c[0] === 'access_token');
            const refreshCall = res.cookie.mock.calls.find(c => c[0] === 'refresh_token');

            expect(accessCall[2].maxAge).toBeLessThan(refreshCall[2].maxAge);
        });
    });

    describe('clearAuthCookies', () => {
        test('clears both cookies with correct paths', () => {
            const res = { clearCookie: jest.fn() };
            cookies.clearAuthCookies(res);

            expect(res.clearCookie).toHaveBeenCalledTimes(2);
            expect(res.clearCookie).toHaveBeenCalledWith('access_token', { path: '/api' });
            expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/api/auth' });
        });
    });
});
