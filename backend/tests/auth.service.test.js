/**
 * Tests for AuthService
 * login, register, refreshToken, logout, changePassword, account lockout
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock database
const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-1234')
}));

const authService = require('../src/services/auth.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// register
// =============================================
describe('AuthService.register', () => {
    test('registers new tenant owner successfully', async () => {
        // Email not taken
        mockQuery.mockResolvedValueOnce([]);
        // Transaction mock
        const mockConnection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{}]) // INSERT tenants
                .mockResolvedValueOnce([{ insertId: 42 }]) // INSERT users
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));
        // saveRefreshToken queries
        mockQuery.mockResolvedValueOnce([]); // INSERT refresh_tokens
        mockQuery.mockResolvedValueOnce([]); // DELETE expired tokens

        const result = await authService.register({
            email: 'mario@test.com',
            password: 'Password1!',
            firstName: 'Mario',
            lastName: 'Rossi',
            phone: '+39 333 1234567',
            businessName: 'Palestra Fit'
        });

        expect(result.user).toBeDefined();
        expect(result.user.email).toBe('mario@test.com');
        expect(result.user.role).toBe('tenant_owner');
        expect(result.user.tenantId).toBe('test-uuid-1234');
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
    });

    test('rejects duplicate email', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 1 }]); // Email exists

        await expect(
            authService.register({
                email: 'existing@test.com',
                password: 'Password1!',
                firstName: 'Test',
                lastName: 'User',
                businessName: 'Test'
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 409,
            message: expect.stringContaining('già registrata')
        }));
    });

    test('hashes password with bcrypt 12 rounds', async () => {
        mockQuery.mockResolvedValueOnce([]); // No existing user
        const mockConnection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{ insertId: 1 }])
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([]);

        await authService.register({
            email: 'new@test.com',
            password: 'MyPassword1!',
            firstName: 'Test',
            lastName: 'User',
            businessName: 'Test'
        });

        // Verify the password hash was created (stored in INSERT users call)
        const insertCall = mockConnection.execute.mock.calls[1];
        const passwordHash = insertCall[1][2]; // third param is password_hash
        expect(passwordHash).toBeDefined();
        expect(passwordHash).not.toBe('MyPassword1!'); // Not plaintext
        expect(await bcrypt.compare('MyPassword1!', passwordHash)).toBe(true);
    });
});

// =============================================
// login
// =============================================
describe('AuthService.login', () => {
    const hashedPassword = bcrypt.hashSync('Password1!', 12);
    const mockUser = {
        id: 1,
        tenant_id: 'tenant-1',
        email: 'test@test.com',
        password_hash: hashedPassword,
        role: 'tenant_owner',
        first_name: 'Mario',
        last_name: 'Rossi',
        status: 'active',
        avatar_url: null,
        failed_login_attempts: 0,
        locked_until: null,
        business_name: 'Palestra',
        subscription_plan: 'starter',
        subscription_status: 'active'
    };

    test('successful login returns user and tokens', async () => {
        mockQuery.mockResolvedValueOnce([mockUser]); // SELECT user
        mockQuery.mockResolvedValueOnce([]); // UPDATE last_login
        mockQuery.mockResolvedValueOnce([]); // INSERT refresh_token
        mockQuery.mockResolvedValueOnce([]); // DELETE expired tokens

        const result = await authService.login('test@test.com', 'Password1!');

        expect(result.user).toBeDefined();
        expect(result.user.id).toBe(1);
        expect(result.user.email).toBe('test@test.com');
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
    });

    test('rejects wrong email', async () => {
        mockQuery.mockResolvedValueOnce([]); // No user found

        await expect(
            authService.login('wrong@test.com', 'Password1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: 'Credenziali non valide'
        }));
    });

    test('rejects wrong password and increments failed attempts', async () => {
        mockQuery.mockResolvedValueOnce([mockUser]); // User found
        mockQuery.mockResolvedValueOnce([]); // UPDATE failed_login_attempts

        await expect(
            authService.login('test@test.com', 'WrongPassword1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 401
        }));

        // Verify failed attempts incremented via parameterized query
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('failed_login_attempts');
        expect(updateCall[0]).toContain('locked_until = ?');
        expect(updateCall[1][0]).toBe(1);    // attempts = 1
        expect(updateCall[1][1]).toBeNull();  // no lock (< 5 attempts)
        expect(updateCall[1][2]).toBe(1);     // user.id
    });

    test('locks account after 5 failed attempts', async () => {
        const lockedUser = {
            ...mockUser,
            failed_login_attempts: 4 // Will become 5
        };
        mockQuery.mockResolvedValueOnce([lockedUser]);
        mockQuery.mockResolvedValueOnce([]); // UPDATE with lock

        await expect(
            authService.login('test@test.com', 'WrongPassword1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 401
        }));

        // Verify lock is set via parameterized query
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('locked_until = ?');
        expect(updateCall[1][0]).toBe(5); // 5 attempts
        expect(updateCall[1][1]).toBeInstanceOf(Date); // lock date
        expect(updateCall[1][2]).toBe(1); // user.id
    });

    test('rejects locked account', async () => {
        const lockedUser = {
            ...mockUser,
            failed_login_attempts: 5,
            locked_until: new Date(Date.now() + 10 * 60 * 1000) // 10 min from now
        };
        mockQuery.mockResolvedValueOnce([lockedUser]);

        await expect(
            authService.login('test@test.com', 'Password1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 429,
            message: expect.stringContaining('bloccato')
        }));
    });

    test('resets lock after expiry', async () => {
        const expiredLockUser = {
            ...mockUser,
            failed_login_attempts: 5,
            locked_until: new Date(Date.now() - 1000) // 1 sec ago (expired)
        };
        mockQuery.mockResolvedValueOnce([expiredLockUser]); // SELECT user
        mockQuery.mockResolvedValueOnce([]); // Reset lock
        mockQuery.mockResolvedValueOnce([]); // UPDATE last_login
        mockQuery.mockResolvedValueOnce([]); // INSERT refresh_token
        mockQuery.mockResolvedValueOnce([]); // DELETE expired tokens

        const result = await authService.login('test@test.com', 'Password1!');

        expect(result.user).toBeDefined();
        // Verify lock was reset
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
            [1]
        );
    });

    test('rejects inactive account', async () => {
        const inactiveUser = { ...mockUser, status: 'suspended' };
        mockQuery.mockResolvedValueOnce([inactiveUser]);

        await expect(
            authService.login('test@test.com', 'Password1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 403,
            message: expect.stringContaining('non attivo')
        }));
    });

    test('rejects OAuth user without password_hash', async () => {
        const oauthUser = { ...mockUser, password_hash: null };
        mockQuery.mockResolvedValueOnce([oauthUser]);

        await expect(
            authService.login('test@test.com', 'Password1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('login sociale')
        }));
    });

    test('resets failed attempts on successful login', async () => {
        const userWithAttempts = { ...mockUser, failed_login_attempts: 3 };
        mockQuery.mockResolvedValueOnce([userWithAttempts]); // SELECT user
        mockQuery.mockResolvedValueOnce([]); // Reset attempts
        mockQuery.mockResolvedValueOnce([]); // UPDATE last_login
        mockQuery.mockResolvedValueOnce([]); // INSERT refresh_token
        mockQuery.mockResolvedValueOnce([]); // DELETE expired tokens

        await authService.login('test@test.com', 'Password1!');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
            [1]
        );
    });

    test('includes clientId for client role users', async () => {
        const clientUser = { ...mockUser, role: 'client' };
        mockQuery.mockResolvedValueOnce([clientUser]); // SELECT user
        // failed_login_attempts is 0, so no reset query
        mockQuery.mockResolvedValueOnce([]); // UPDATE last_login
        // saveRefreshToken runs before client SELECT:
        mockQuery.mockResolvedValueOnce([]); // INSERT refresh_token
        mockQuery.mockResolvedValueOnce([]); // DELETE expired tokens
        // Then client lookup for role='client':
        mockQuery.mockResolvedValueOnce([{ id: 99 }]); // SELECT client id

        const result = await authService.login('test@test.com', 'Password1!');
        expect(result.user.clientId).toBe(99);
    });
});

// =============================================
// refreshToken
// =============================================
describe('AuthService.refreshToken', () => {
    test('refreshes token successfully', async () => {
        const tokenData = {
            user_id: 1,
            tenant_id: 'tenant-1',
            role: 'tenant_owner',
            status: 'active',
            first_name: 'Mario',
            last_name: 'Rossi',
            email: 'test@test.com',
            avatar_url: null
        };
        mockQuery.mockResolvedValueOnce([tokenData]); // SELECT refresh_token
        mockQuery.mockResolvedValueOnce([]); // DELETE old token
        mockQuery.mockResolvedValueOnce([]); // INSERT new token
        mockQuery.mockResolvedValueOnce([]); // DELETE expired

        const result = await authService.refreshToken('valid-refresh-token');

        expect(result.user).toBeDefined();
        expect(result.user.id).toBe(1);
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
    });

    test('rejects invalid refresh token', async () => {
        mockQuery.mockResolvedValueOnce([]); // Token not found

        await expect(
            authService.refreshToken('invalid-token')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('non valido')
        }));
    });

    test('rejects inactive user', async () => {
        mockQuery.mockResolvedValueOnce([{
            user_id: 1,
            tenant_id: 'tenant-1',
            role: 'tenant_owner',
            status: 'suspended'
        }]);

        await expect(
            authService.refreshToken('token')
        ).rejects.toEqual(expect.objectContaining({
            status: 403,
            message: expect.stringContaining('non attivo')
        }));
    });
});

// =============================================
// logout
// =============================================
describe('AuthService.logout', () => {
    test('deletes refresh token', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await authService.logout('token-to-delete');

        expect(result).toEqual({ success: true });
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM refresh_tokens WHERE token = ?',
            ['token-to-delete']
        );
    });

    test('handles null token gracefully', async () => {
        const result = await authService.logout(null);
        expect(result).toEqual({ success: true });
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

// =============================================
// changePassword
// =============================================
describe('AuthService.changePassword', () => {
    test('changes password successfully', async () => {
        const hash = bcrypt.hashSync('OldPassword1!', 12);
        mockQuery.mockResolvedValueOnce([{ password_hash: hash }]); // SELECT user
        mockQuery.mockResolvedValueOnce([]); // UPDATE password
        mockQuery.mockResolvedValueOnce([]); // DELETE all refresh tokens

        const result = await authService.changePassword(1, 'OldPassword1!', 'NewPassword1!');
        expect(result).toEqual({ success: true });
    });

    test('rejects wrong current password', async () => {
        const hash = bcrypt.hashSync('CorrectPassword1!', 12);
        mockQuery.mockResolvedValueOnce([{ password_hash: hash }]);

        await expect(
            authService.changePassword(1, 'WrongPassword1!', 'NewPassword1!')
        ).rejects.toEqual(expect.objectContaining({
            status: 401,
            message: expect.stringContaining('non corretta')
        }));
    });

    test('allows OAuth users to set password without current', async () => {
        mockQuery.mockResolvedValueOnce([{ password_hash: null }]); // OAuth user
        mockQuery.mockResolvedValueOnce([]); // UPDATE
        mockQuery.mockResolvedValueOnce([]); // DELETE tokens

        const result = await authService.changePassword(1, '', 'NewPassword1!');
        expect(result).toEqual({ success: true });
    });

    test('rejects non-existent user', async () => {
        mockQuery.mockResolvedValueOnce([]); // User not found

        await expect(
            authService.changePassword(999, 'OldPass1!', 'NewPass99!')
        ).rejects.toEqual(expect.objectContaining({
            status: 404
        }));
    });

    test('invalidates all sessions after password change', async () => {
        const hash = bcrypt.hashSync('OldPass1!', 12);
        mockQuery.mockResolvedValueOnce([{ password_hash: hash }]);
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([]);

        await authService.changePassword(5, 'OldPass1!', 'NewPass99!');

        // Verify logout all was called
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM refresh_tokens WHERE user_id = ?',
            [5]
        );
    });
});

// =============================================
// generateTokens
// =============================================
describe('AuthService.generateTokens', () => {
    test('generates valid access and refresh tokens', () => {
        const tokens = authService.generateTokens(1, 'tenant-1', 'tenant_owner');

        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();

        // Verify access token payload
        const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
        expect(decoded.userId).toBe(1);
        expect(decoded.tenantId).toBe('tenant-1');
        expect(decoded.role).toBe('tenant_owner');

        // Verify refresh token payload
        const refreshDecoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);
        expect(refreshDecoded.userId).toBe(1);
        expect(refreshDecoded.type).toBe('refresh');
    });
});
