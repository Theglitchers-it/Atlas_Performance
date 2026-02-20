/**
 * Tests for Auth Controller
 * register, login, refreshToken, logout, logoutAll, me, changePassword
 */

// Mock dependencies
jest.mock('../src/services/auth.service', () => ({
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    verifyAndGetUser: jest.fn(),
    changePassword: jest.fn()
}));

jest.mock('../src/utils/cookies', () => ({
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn()
}));

jest.mock('../src/middlewares/auth', () => ({
    verifyToken: jest.fn(),
    extractToken: jest.fn(() => 'mock-access-token'),
    blacklistToken: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    decode: jest.fn(() => ({ jti: 'mock-jti', exp: Math.floor(Date.now() / 1000) + 3600 })),
    verify: jest.fn(),
    sign: jest.fn()
}));

const authController = require('../src/controllers/auth.controller');
const authService = require('../src/services/auth.service');
const { setAuthCookies, clearAuthCookies } = require('../src/utils/cookies');

// Test helpers
const mockReq = (overrides = {}) => ({
    user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
    params: {},
    query: {},
    body: {},
    cookies: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('AuthController', () => {
    describe('register', () => {
        test('returns 201 with user data on successful registration', async () => {
            const registerResult = {
                user: { id: 1, email: 'test@example.com' },
                accessToken: 'access-token',
                refreshToken: 'refresh-token'
            };
            authService.register.mockResolvedValue(registerResult);

            const req = mockReq({
                body: {
                    email: 'test@example.com',
                    password: 'Password123!',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '123456',
                    businessName: 'FitGym'
                }
            });
            const res = mockRes();

            await authController.register(req, res, mockNext);

            expect(authService.register).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Doe',
                phone: '123456',
                businessName: 'FitGym'
            });
            expect(setAuthCookies).toHaveBeenCalledWith(res, 'access-token', 'refresh-token');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Registrazione completata con successo',
                data: { user: registerResult.user }
            });
        });

        test('calls next(error) when registration fails', async () => {
            const error = new Error('Email already exists');
            authService.register.mockRejectedValue(error);

            const req = mockReq({ body: { email: 'dup@example.com', password: 'pass' } });
            const res = mockRes();

            await authController.register(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        test('returns 200 with user data on successful login', async () => {
            const loginResult = {
                user: { id: 1, email: 'user@example.com', role: 'tenant_owner' },
                accessToken: 'access-tok',
                refreshToken: 'refresh-tok'
            };
            authService.login.mockResolvedValue(loginResult);

            const req = mockReq({
                body: { email: 'user@example.com', password: 'Password123!' }
            });
            const res = mockRes();

            await authController.login(req, res, mockNext);

            expect(authService.login).toHaveBeenCalledWith('user@example.com', 'Password123!');
            expect(setAuthCookies).toHaveBeenCalledWith(res, 'access-tok', 'refresh-tok');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login effettuato con successo',
                data: { user: loginResult.user }
            });
        });

        test('calls next(error) when login fails (wrong credentials)', async () => {
            const error = new Error('Credenziali non valide');
            authService.login.mockRejectedValue(error);

            const req = mockReq({ body: { email: 'user@example.com', password: 'wrong' } });
            const res = mockRes();

            await authController.login(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('refreshToken', () => {
        test('returns new access token from cookie refresh token', async () => {
            const refreshResult = {
                user: { id: 1 },
                accessToken: 'new-access-token'
            };
            authService.refreshToken.mockResolvedValue(refreshResult);

            const req = mockReq({
                cookies: { refresh_token: 'valid-refresh-token' },
                body: {}
            });
            const res = mockRes();

            await authController.refreshToken(req, res, mockNext);

            expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
            expect(setAuthCookies).toHaveBeenCalledWith(res, 'new-access-token', 'valid-refresh-token');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { user: refreshResult.user }
            });
        });

        test('falls back to body refreshToken if no cookie', async () => {
            const refreshResult = {
                user: { id: 1 },
                accessToken: 'new-access-token'
            };
            authService.refreshToken.mockResolvedValue(refreshResult);

            const req = mockReq({
                cookies: {},
                body: { refreshToken: 'body-refresh-token' }
            });
            const res = mockRes();

            await authController.refreshToken(req, res, mockNext);

            expect(authService.refreshToken).toHaveBeenCalledWith('body-refresh-token');
        });

        test('returns 401 when no refresh token is provided', async () => {
            const req = mockReq({ cookies: {}, body: {} });
            const res = mockRes();

            await authController.refreshToken(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Refresh token mancante'
            });
        });

        test('calls next(error) when service throws', async () => {
            const error = new Error('Token expired');
            authService.refreshToken.mockRejectedValue(error);

            const req = mockReq({ cookies: { refresh_token: 'expired-token' } });
            const res = mockRes();

            await authController.refreshToken(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('logout', () => {
        test('clears cookies and returns success', async () => {
            authService.logout.mockResolvedValue();

            const req = mockReq({ cookies: { refresh_token: 'some-token' } });
            const res = mockRes();

            await authController.logout(req, res, mockNext);

            expect(authService.logout).toHaveBeenCalledWith('some-token');
            expect(clearAuthCookies).toHaveBeenCalledWith(res);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout effettuato con successo'
            });
        });

        test('still clears cookies when no refresh token provided', async () => {
            const req = mockReq({ cookies: {}, body: {} });
            const res = mockRes();

            await authController.logout(req, res, mockNext);

            expect(authService.logout).not.toHaveBeenCalled();
            expect(clearAuthCookies).toHaveBeenCalledWith(res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('me', () => {
        test('returns current user data', async () => {
            const userData = { id: 1, email: 'me@example.com', role: 'tenant_owner' };
            authService.verifyAndGetUser.mockResolvedValue(userData);

            const req = mockReq();
            const res = mockRes();

            await authController.me(req, res, mockNext);

            expect(authService.verifyAndGetUser).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { user: userData }
            });
        });

        test('calls next(error) when service throws', async () => {
            const error = new Error('User not found');
            authService.verifyAndGetUser.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await authController.me(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('changePassword', () => {
        test('changes password and clears cookies', async () => {
            authService.changePassword.mockResolvedValue();

            const req = mockReq({
                body: { currentPassword: 'old123', newPassword: 'new456' }
            });
            const res = mockRes();

            await authController.changePassword(req, res, mockNext);

            expect(authService.changePassword).toHaveBeenCalledWith(1, 'old123', 'new456');
            expect(clearAuthCookies).toHaveBeenCalledWith(res);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password cambiata con successo. Effettua nuovamente il login.'
            });
        });

        test('calls next(error) when password change fails', async () => {
            const error = new Error('Password corrente non valida');
            authService.changePassword.mockRejectedValue(error);

            const req = mockReq({
                body: { currentPassword: 'wrong', newPassword: 'new456' }
            });
            const res = mockRes();

            await authController.changePassword(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
