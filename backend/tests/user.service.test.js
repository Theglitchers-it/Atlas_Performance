/**
 * Tests for UserService
 * CRUD, role management, tenant isolation, search, pagination
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('$2a$12$hashed_password_value')
}));

const userService = require('../src/services/user.service');
const bcrypt = require('bcryptjs');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// getAll
// =============================================
describe('UserService.getAll', () => {
    test('returns paginated user list with defaults', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 3 }]) // COUNT
            .mockResolvedValueOnce([
                { id: 1, email: 'admin@test.com', role: 'trainer', first_name: 'Admin' },
                { id: 2, email: 'staff@test.com', role: 'staff', first_name: 'Staff' },
                { id: 3, email: 'client@test.com', role: 'client', first_name: 'Client' }
            ]);

        const result = await userService.getAll('tenant-1');

        expect(result.users).toHaveLength(3);
        expect(result.pagination.total).toBe(3);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(20);
        expect(result.pagination.totalPages).toBe(1);
    });

    test('always includes tenant_id in query', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await userService.getAll('tenant-1');

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('u.tenant_id = ?');
        expect(countCall[1][0]).toBe('tenant-1');

        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[0]).toContain('u.tenant_id = ?');
        expect(selectCall[1][0]).toBe('tenant-1');
    });

    test('filters by role', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, role: 'trainer' }]);

        await userService.getAll('tenant-1', { role: 'trainer' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('u.role = ?');
        expect(countCall[1]).toContain('trainer');
    });

    test('filters by status', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }])
            .mockResolvedValueOnce([{ id: 1, status: 'active' }, { id: 2, status: 'active' }]);

        await userService.getAll('tenant-1', { status: 'active' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('u.status = ?');
        expect(countCall[1]).toContain('active');
    });

    test('search sanitizes LIKE wildcards', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await userService.getAll('tenant-1', { search: '50%_off' });

        const countCall = mockQuery.mock.calls[0];
        const searchParam = countCall[1].find(p => typeof p === 'string' && p.includes('50'));
        expect(searchParam).toContain('50\\%\\_off');
        expect(searchParam).not.toBe('%50%_off%');
    });

    test('search matches first_name, last_name and email', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, first_name: 'Mario' }]);

        await userService.getAll('tenant-1', { search: 'Mario' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('u.first_name LIKE ?');
        expect(countCall[0]).toContain('u.last_name LIKE ?');
        expect(countCall[0]).toContain('u.email LIKE ?');
        expect(countCall[1]).toContain('%Mario%');
    });

    test('pagination calculates offset correctly', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 100 }])
            .mockResolvedValueOnce([]);

        const result = await userService.getAll('tenant-1', { page: 4, limit: 10 });

        expect(result.pagination.page).toBe(4);
        expect(result.pagination.totalPages).toBe(10);
        // offset = (4-1) * 10 = 30
        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[1]).toContain(30); // offset
        expect(selectCall[1]).toContain(10); // limit
    });

    test('combines multiple filters', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, role: 'trainer', status: 'active' }]);

        await userService.getAll('tenant-1', { role: 'trainer', status: 'active', search: 'Marco' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('u.role = ?');
        expect(countCall[0]).toContain('u.status = ?');
        expect(countCall[0]).toContain('u.first_name LIKE ?');
    });
});

// =============================================
// getById
// =============================================
describe('UserService.getById', () => {
    test('returns user by id with tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', email: 'admin@test.com',
            role: 'trainer', first_name: 'Admin', last_name: 'User',
            status: 'active'
        }]);

        const result = await userService.getById(1, 'tenant-1');

        expect(result.id).toBe(1);
        expect(result.email).toBe('admin@test.com');
        expect(result.role).toBe('trainer');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('u.tenant_id = ?'),
            [1, 'tenant-1']
        );
    });

    test('throws 404 for non-existent user', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await expect(
            userService.getById(999, 'tenant-1')
        ).rejects.toEqual(expect.objectContaining({
            status: 404,
            message: expect.stringContaining('non trovato')
        }));
    });

    test('enforces tenant isolation - wrong tenant returns 404', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await expect(
            userService.getById(1, 'wrong-tenant')
        ).rejects.toEqual(expect.objectContaining({
            status: 404
        }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('u.tenant_id = ?'),
            [1, 'wrong-tenant']
        );
    });
});

// =============================================
// create
// =============================================
describe('UserService.create', () => {
    test('creates user successfully with hashed password', async () => {
        // Email uniqueness check - no existing
        mockQuery.mockResolvedValueOnce([]);
        // INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 10 });
        // getById call after create
        mockQuery.mockResolvedValueOnce([{
            id: 10, tenant_id: 'tenant-1', email: 'new@test.com',
            role: 'staff', first_name: 'New', last_name: 'User', status: 'active'
        }]);

        const result = await userService.create('tenant-1', {
            email: 'new@test.com',
            password: 'SecurePass1',
            role: 'staff',
            firstName: 'New',
            lastName: 'User'
        });

        expect(result.id).toBe(10);
        expect(result.email).toBe('new@test.com');
        expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass1', 12);

        // Verify INSERT includes tenant_id
        const insertCall = mockQuery.mock.calls[1];
        expect(insertCall[0]).toContain('tenant_id');
        expect(insertCall[1][0]).toBe('tenant-1');
    });

    test('rejects duplicate email within tenant', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 5 }]); // Email already exists

        await expect(
            userService.create('tenant-1', {
                email: 'existing@test.com',
                password: 'SecurePass1',
                firstName: 'Test',
                lastName: 'User'
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 409,
            message: expect.stringContaining('Email')
        }));
    });

    test('email uniqueness check is scoped to tenant', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 5 }]);

        try {
            await userService.create('tenant-1', {
                email: 'test@test.com',
                password: 'Pass123',
                firstName: 'T',
                lastName: 'U'
            });
        } catch (e) { /* expected */ }

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['test@test.com', 'tenant-1']
        );
    });

    test('defaults role to staff when not specified', async () => {
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce({ insertId: 11 });
        mockQuery.mockResolvedValueOnce([{
            id: 11, tenant_id: 'tenant-1', email: 'noRole@test.com',
            role: 'staff', first_name: 'No', last_name: 'Role', status: 'active'
        }]);

        await userService.create('tenant-1', {
            email: 'noRole@test.com',
            password: 'Pass123',
            firstName: 'No',
            lastName: 'Role'
        });

        const insertCall = mockQuery.mock.calls[1];
        // role param should be 'staff' when role is undefined
        expect(insertCall[1]).toContain('staff');
    });
});

// =============================================
// update
// =============================================
describe('UserService.update', () => {
    test('updates user profile fields', async () => {
        // getById for existence check
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', email: 'user@test.com',
            first_name: 'Old', last_name: 'Name', status: 'active'
        }]);
        // UPDATE query
        mockQuery.mockResolvedValueOnce({});
        // getById after update
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', email: 'user@test.com',
            first_name: 'New', last_name: 'Name', status: 'active'
        }]);

        const result = await userService.update(1, 'tenant-1', {
            firstName: 'New'
        });

        expect(result.first_name).toBe('New');
        // UPDATE should enforce tenant_id
        const updateCall = mockQuery.mock.calls[1];
        expect(updateCall[0]).toContain('tenant_id = ?');
    });

    test('throws 404 when updating non-existent user', async () => {
        mockQuery.mockResolvedValueOnce([]); // getById returns nothing

        await expect(
            userService.update(999, 'tenant-1', { firstName: 'X' })
        ).rejects.toEqual(expect.objectContaining({
            status: 404
        }));
    });

    test('serializes preferences as JSON', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', email: 'user@test.com',
            first_name: 'Test', last_name: 'User', status: 'active'
        }]);
        mockQuery.mockResolvedValueOnce({});
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', email: 'user@test.com',
            first_name: 'Test', last_name: 'User', status: 'active',
            preferences: '{"theme":"dark"}'
        }]);

        await userService.update(1, 'tenant-1', {
            preferences: { theme: 'dark' }
        });

        const updateCall = mockQuery.mock.calls[1];
        // preferences param should be JSON stringified
        expect(updateCall[1]).toContain(JSON.stringify({ theme: 'dark' }));
    });
});

// =============================================
// delete
// =============================================
describe('UserService.delete', () => {
    test('deletes user successfully', async () => {
        // getById check
        mockQuery.mockResolvedValueOnce([{
            id: 2, tenant_id: 'tenant-1', email: 'staff@test.com',
            role: 'staff', first_name: 'Staff', last_name: 'User', status: 'active'
        }]);
        // DELETE query
        mockQuery.mockResolvedValueOnce({});

        const result = await userService.delete(2, 'tenant-1', 1);

        expect(result).toEqual({ success: true });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM users'),
            [2, 'tenant-1']
        );
    });

    test('prevents deleting yourself', async () => {
        await expect(
            userService.delete(1, 'tenant-1', 1)
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('tuo account')
        }));

        // Should not even query the database
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('prevents deleting tenant owner', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 2, tenant_id: 'tenant-1', email: 'owner@test.com',
            role: 'tenant_owner', first_name: 'Owner', last_name: 'User', status: 'active'
        }]);

        await expect(
            userService.delete(2, 'tenant-1', 1)
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('proprietario')
        }));
    });

    test('throws 404 when deleting non-existent user', async () => {
        mockQuery.mockResolvedValueOnce([]); // getById returns nothing

        await expect(
            userService.delete(999, 'tenant-1', 1)
        ).rejects.toEqual(expect.objectContaining({
            status: 404
        }));
    });

    test('DELETE query enforces tenant_id', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 3, tenant_id: 'tenant-1', email: 'test@test.com',
            role: 'staff', first_name: 'Test', last_name: 'U', status: 'active'
        }]);
        mockQuery.mockResolvedValueOnce({});

        await userService.delete(3, 'tenant-1', 1);

        const deleteCall = mockQuery.mock.calls[1];
        expect(deleteCall[0]).toContain('tenant_id = ?');
        expect(deleteCall[1]).toEqual([3, 'tenant-1']);
    });
});

// =============================================
// updateAvatar
// =============================================
describe('UserService.updateAvatar', () => {
    test('updates avatar URL and returns updated user', async () => {
        // UPDATE query
        mockQuery.mockResolvedValueOnce({});
        // getById after update
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', email: 'user@test.com',
            avatar_url: 'https://cdn.example.com/avatar.jpg',
            first_name: 'Test', last_name: 'User', status: 'active'
        }]);

        const result = await userService.updateAvatar(1, 'tenant-1', 'https://cdn.example.com/avatar.jpg');

        expect(result.avatar_url).toBe('https://cdn.example.com/avatar.jpg');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['https://cdn.example.com/avatar.jpg', 1, 'tenant-1']
        );
    });
});

// =============================================
// getBusinessInfo
// =============================================
describe('UserService.getBusinessInfo', () => {
    test('returns business info for tenant', async () => {
        mockQuery.mockResolvedValueOnce([{
            business_name: 'FitPro Gym',
            phone: '+39 02 1234567'
        }]);

        const result = await userService.getBusinessInfo('tenant-1');

        expect(result.business_name).toBe('FitPro Gym');
        expect(result.phone).toBe('+39 02 1234567');
    });

    test('throws 404 for non-existent tenant', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await expect(
            userService.getBusinessInfo('non-existent')
        ).rejects.toEqual(expect.objectContaining({
            status: 404,
            message: expect.stringContaining('Tenant non trovato')
        }));
    });
});
