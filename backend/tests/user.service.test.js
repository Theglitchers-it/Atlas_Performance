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

// =============================================
// updateMyProfile — whitelist + security fixes
// =============================================
describe('UserService.updateMyProfile', () => {
    beforeEach(() => mockQuery.mockReset());

    test('updates whitelisted fields and returns sanitized profile', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([{
                id: 1, first_name: 'Mario', last_name: 'Rossi',
                email: 'm@r.com', role: 'client', avatar_url: null,
                bio: 'New bio', city: 'Roma'
            }]);

        const result = await userService.updateMyProfile(1, {
            firstName: '  Mario  ',
            lastName: 'Rossi',
            bio: 'New bio',
            city: 'Roma'
        });

        expect(result).toEqual(expect.objectContaining({
            firstName: 'Mario', lastName: 'Rossi', bio: 'New bio', city: 'Roma'
        }));
        // First query is UPDATE — verify SQL has all 4 whitelisted columns
        const updateSql = mockQuery.mock.calls[0][0];
        expect(updateSql).toMatch(/first_name = \?/i);
        expect(updateSql).toMatch(/last_name = \?/i);
        expect(updateSql).toMatch(/bio = \?/i);
        expect(updateSql).toMatch(/city = \?/i);
    });

    test('ignores non-whitelisted fields (role, email, tenant_id)', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([{ id: 1, first_name: 'X', last_name: '', email: 'a@b', role: 'client' }]);

        await userService.updateMyProfile(1, {
            firstName: 'X',
            role: 'super_admin',
            email: 'evil@x',
            tenant_id: 'other-tenant'
        });

        const updateSql = mockQuery.mock.calls[0][0];
        expect(updateSql).not.toMatch(/role\s*=/i);
        expect(updateSql).not.toMatch(/email\s*=/i);
        expect(updateSql).not.toMatch(/tenant_id\s*=/i);
    });

    test('rejects non-string bio (no String() coerce)', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([{ id: 1, first_name: 'X', last_name: '' }]);

        // bio is an object — should be ignored (not coerced to "[object Object]")
        await userService.updateMyProfile(1, { firstName: 'X', bio: { malicious: true } });

        const updateSql = mockQuery.mock.calls[0][0];
        expect(updateSql).not.toMatch(/bio\s*=/i);
    });

    test('accepts bio = null (explicit clear)', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([{ id: 1, first_name: 'X', last_name: '', bio: null }]);

        await userService.updateMyProfile(1, { firstName: 'X', bio: null });

        const params = mockQuery.mock.calls[0][1];
        expect(params).toContain(null);
    });

    test('caps bio to 1000 chars', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([{ id: 1 }]);

        const longBio = 'a'.repeat(2000);
        await userService.updateMyProfile(1, { firstName: 'X', bio: longBio });

        const params = mockQuery.mock.calls[0][1];
        const bioParam = params.find(p => typeof p === 'string' && p.startsWith('aaa'));
        expect(bioParam.length).toBe(1000);
    });

    test('returns null when no whitelisted field is provided', async () => {
        const result = await userService.updateMyProfile(1, {
            role: 'super_admin',
            email: 'evil@x'
        });
        expect(result).toBeNull();
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

// =============================================
// getPublicProfile — tenant isolation + email leak guard
// =============================================
describe('UserService.getPublicProfile', () => {
    beforeEach(() => mockQuery.mockReset());

    test('returns profile with stats when target exists in viewer tenant', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                id: 3, first_name: 'Personal', last_name: 'Trainer', email: 'p@t.com',
                role: 'tenant_owner', avatar_url: null, bio: null, city: null,
                tenant_id: 'tenant-1'
            }])
            .mockResolvedValueOnce([{ posts: 5, followers: 10, following: 2, is_following: 0 }]);

        const result = await userService.getPublicProfile(3, 'tenant-1', 1);

        expect(result.user.id).toBe(3);
        expect(result.stats).toEqual({ posts: 5, followers: 10, following: 2 });
        expect(result.isFollowing).toBe(false);
        expect(result.isSelf).toBe(false);
        // Email NOT exposed (viewer != target)
        expect(result.user).not.toHaveProperty('email');
    });

    test('exposes email only when isSelf=true', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                id: 1, first_name: 'Me', last_name: 'Self', email: 'me@self.com',
                role: 'client', avatar_url: null, bio: null, city: null, tenant_id: 'tenant-1'
            }])
            .mockResolvedValueOnce([{ posts: 0, followers: 0, following: 0, is_following: 0 }]);

        const result = await userService.getPublicProfile(1, 'tenant-1', 1);

        expect(result.isSelf).toBe(true);
        expect(result.user.email).toBe('me@self.com');
    });

    test('returns null when target user is in different tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // SELECT trova nulla

        const result = await userService.getPublicProfile(99, 'tenant-1', 1);
        expect(result).toBeNull();
    });

    test('super_admin (tenantId=null) can view any profile', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                id: 5, first_name: 'X', last_name: 'Y', email: 'x@y.com',
                role: 'client', avatar_url: null, bio: null, city: null,
                tenant_id: 'tenant-other'
            }])
            .mockResolvedValueOnce([{ posts: 0, followers: 0, following: 0, is_following: 0 }]);

        const result = await userService.getPublicProfile(5, null, 99);

        expect(result.user.id).toBe(5);
        // Target lookup SQL must NOT include tenant_id filter when viewer is super_admin
        const lookupSql = mockQuery.mock.calls[0][0];
        expect(lookupSql).not.toMatch(/tenant_id\s*=\s*\?/i);
    });

    test('isFollowing query is tenant-scoped (no cross-tenant leak)', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                id: 3, first_name: 'A', last_name: 'B', email: 'a@b',
                role: 'client', avatar_url: null, bio: null, city: null,
                tenant_id: 'tenant-1'
            }])
            .mockResolvedValueOnce([{ posts: 1, followers: 1, following: 1, is_following: 1 }]);

        await userService.getPublicProfile(3, 'tenant-1', 1);

        // 2nd query è il SELECT con sotto-COUNTS — verifica che is_following sia tenant-scoped
        const statsSql = mockQuery.mock.calls[1][0];
        // Estrai la subquery che termina con "AS is_following": (...)  AS is_following
        const isFollowingPart = statsSql.match(/\(SELECT[\s\S]*?\)\s*AS\s+is_following/i)[0];
        expect(isFollowingPart).toMatch(/tenant_id\s*=\s*\?/i);
    });
});

// =============================================
// followUser / unfollowUser — idempotency + tenant scope
// =============================================
describe('UserService.followUser / unfollowUser', () => {
    beforeEach(() => mockQuery.mockReset());

    test('follow creates relationship and returns updated followers count', async () => {
        mockQuery
            .mockResolvedValueOnce([{ ok: 1 }]) // target exists
            .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT IGNORE
            .mockResolvedValueOnce([{ c: 11 }]); // followers count

        const result = await userService.followUser(1, 3, 'tenant-1');

        expect(result).toEqual({ ok: true, followers: 11 });
        // Verify INSERT IGNORE (idempotent)
        const insertSql = mockQuery.mock.calls[1][0];
        expect(insertSql).toMatch(/INSERT\s+IGNORE/i);
    });

    test('follow returns 404 when target does not exist in tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // target not found

        const result = await userService.followUser(1, 99, 'tenant-1');

        expect(result.ok).toBe(false);
        expect(result.status).toBe(404);
    });

    test('unfollow deletes scoped by tenant and returns updated count', async () => {
        mockQuery
            .mockResolvedValueOnce({ affectedRows: 1 }) // DELETE
            .mockResolvedValueOnce([{ c: 4 }]); // followers count

        const result = await userService.unfollowUser(1, 3, 'tenant-1');

        expect(result.followers).toBe(4);
        const deleteSql = mockQuery.mock.calls[0][0];
        expect(deleteSql).toMatch(/tenant_id\s*=\s*\?/i);
    });
});
