/**
 * Tests for Staff Permission Middleware
 * checkStaffPermission, invalidatePermissionCache
 */

// Mock database
const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const { checkStaffPermission, invalidatePermissionCache } = require('../src/middlewares/checkStaffPermission');

// Test helpers
const mockReq = (overrides = {}) => ({
    headers: {},
    user: { id: 1, tenantId: 'tenant-1', role: 'trainer' },
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = () => jest.fn();

beforeEach(() => {
    mockQuery.mockReset();
    // Invalidate cache between tests to avoid cross-test contamination
    invalidatePermissionCache(1, 'tenant-1');
    invalidatePermissionCache(2, 'tenant-1');
    invalidatePermissionCache(3, 'tenant-1');
});

describe('checkStaffPermission', () => {
    test('tenant_owner bypasses all permission checks', async () => {
        const req = mockReq({
            user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('super_admin bypasses all permission checks', async () => {
        const req = mockReq({
            user: { id: 1, tenantId: 'tenant-1', role: 'super_admin' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('staff with correct permission passes', async () => {
        mockQuery.mockResolvedValue([{
            user_id: 2,
            tenant_id: 'tenant-1',
            can_manage_clients: true,
            can_manage_workouts: false
        }]);

        const req = mockReq({
            user: { id: 2, tenantId: 'tenant-1', role: 'staff' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('staff_permissions'),
            [2, 'tenant-1']
        );
    });

    test('staff without required permission is blocked', async () => {
        mockQuery.mockResolvedValue([{
            user_id: 2,
            tenant_id: 'tenant-1',
            can_manage_clients: true,
            can_manage_workouts: false
        }]);

        // Invalidate cache so the query runs fresh
        invalidatePermissionCache(2, 'tenant-1');

        const req = mockReq({
            user: { id: 2, tenantId: 'tenant-1', role: 'staff' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_workouts')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('Non hai il permesso')
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('non-staff role (client) is blocked with 403', async () => {
        const req = mockReq({
            user: { id: 3, tenantId: 'tenant-1', role: 'client' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Accesso non autorizzato'
        }));
        expect(next).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('staff with no permission rows in DB is blocked', async () => {
        mockQuery.mockResolvedValue([]);

        const req = mockReq({
            user: { id: 3, tenantId: 'tenant-1', role: 'staff' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('Permessi non configurati')
        }));
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next(error) on database failure', async () => {
        const dbError = new Error('DB connection failed');
        mockQuery.mockRejectedValue(dbError);

        // Use a unique user id to avoid cache hits
        invalidatePermissionCache(99, 'tenant-err');
        const req = mockReq({
            user: { id: 99, tenantId: 'tenant-err', role: 'staff' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);

        expect(next).toHaveBeenCalledWith(dbError);
    });
});

describe('invalidatePermissionCache', () => {
    test('clears cached permissions for a specific user', async () => {
        // First call populates cache
        mockQuery.mockResolvedValue([{
            user_id: 2,
            tenant_id: 'tenant-1',
            can_manage_clients: true
        }]);

        const req = mockReq({
            user: { id: 2, tenantId: 'tenant-1', role: 'staff' }
        });
        const res = mockRes();
        const next = mockNext();

        await checkStaffPermission('can_manage_clients')(req, res, next);
        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalled();

        // Second call should use cache (no additional query)
        const next2 = mockNext();
        await checkStaffPermission('can_manage_clients')(req, mockRes(), next2);
        expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, used cache

        // Invalidate cache
        invalidatePermissionCache(2, 'tenant-1');

        // Third call should query DB again
        const next3 = mockNext();
        await checkStaffPermission('can_manage_clients')(req, mockRes(), next3);
        expect(mockQuery).toHaveBeenCalledTimes(2); // Now 2, cache was invalidated
    });
});
