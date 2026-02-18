/**
 * Tests for ClientService
 * CRUD, search with LIKE sanitization, pagination, XP, streaks
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const clientService = require('../src/services/client.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// getAll
// =============================================
describe('ClientService.getAll', () => {
    test('returns paginated client list', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }]) // COUNT
            .mockResolvedValueOnce([ // SELECT
                { id: 1, first_name: 'Mario', last_name: 'Rossi', email: 'mario@test.com' },
                { id: 2, first_name: 'Luigi', last_name: 'Verdi', email: 'luigi@test.com' }
            ]);

        const result = await clientService.getAll('tenant-1');

        expect(result.clients).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);
    });

    test('filters by status', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, status: 'active' }]);

        await clientService.getAll('tenant-1', { status: 'active' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.status = ?');
        expect(countCall[1]).toContain('active');
    });

    test('filters by fitness level', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await clientService.getAll('tenant-1', { fitnessLevel: 'advanced' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.fitness_level = ?');
    });

    test('search sanitizes LIKE wildcards', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await clientService.getAll('tenant-1', { search: '50%_off' });

        // The search should have escaped % and _
        const countCall = mockQuery.mock.calls[0];
        const searchParam = countCall[1].find(p => typeof p === 'string' && p.includes('50'));
        expect(searchParam).toContain('50\\%\\_off');
        expect(searchParam).not.toBe('%50%_off%'); // Should NOT pass through unescaped
    });

    test('search with normal text works', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, first_name: 'Mario' }]);

        await clientService.getAll('tenant-1', { search: 'Mario' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.first_name LIKE ?');
        expect(countCall[1]).toContain('%Mario%');
    });

    test('pagination works correctly', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 50 }])
            .mockResolvedValueOnce([]);

        const result = await clientService.getAll('tenant-1', { page: 3, limit: 10 });

        expect(result.pagination.page).toBe(3);
        expect(result.pagination.totalPages).toBe(5);
        // Verify offset = (3-1) * 10 = 20
        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[1]).toContain(20); // offset
    });

    test('always includes tenant_id in query', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await clientService.getAll('tenant-1');

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.tenant_id = ?');
        expect(countCall[1][0]).toBe('tenant-1');
    });
});

// =============================================
// getById
// =============================================
describe('ClientService.getById', () => {
    test('returns client with goals and injuries', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, first_name: 'Mario', tenant_id: 'tenant-1' }])
            .mockResolvedValueOnce([{ id: 1, goal_type: 'weight_loss' }]) // goals
            .mockResolvedValueOnce([{ id: 1, body_part: 'knee' }]); // injuries

        const result = await clientService.getById(1, 'tenant-1');

        expect(result.first_name).toBe('Mario');
        expect(result.goals).toHaveLength(1);
        expect(result.injuries).toHaveLength(1);
    });

    test('throws 404 for non-existent client', async () => {
        mockQuery.mockResolvedValueOnce([]); // No client found

        await expect(
            clientService.getById(999, 'tenant-1')
        ).rejects.toEqual(expect.objectContaining({
            status: 404,
            message: expect.stringContaining('non trovato')
        }));
    });

    test('enforces tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce([]); // Client exists but wrong tenant

        await expect(
            clientService.getById(1, 'wrong-tenant')
        ).rejects.toEqual(expect.objectContaining({
            status: 404
        }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('c.tenant_id = ?'),
            [1, 'wrong-tenant']
        );
    });
});

// =============================================
// create
// =============================================
describe('ClientService.create', () => {
    test('creates client successfully', async () => {
        mockQuery.mockResolvedValueOnce([{ max_clients: 50 }]); // Tenant limit
        mockQuery.mockResolvedValueOnce([{ count: 5 }]); // Current count
        mockQuery.mockResolvedValueOnce([]); // Email check

        const mockConnection = {
            execute: jest.fn().mockResolvedValueOnce([{ insertId: 10 }])
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));

        const result = await clientService.create('tenant-1', {
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario@test.com',
            fitnessLevel: 'beginner',
            primaryGoal: 'weight_loss'
        }, 1);

        expect(result.clientId).toBe(10);
    });

    test('rejects when client limit reached', async () => {
        mockQuery.mockResolvedValueOnce([{ max_clients: 5 }]); // Limit
        mockQuery.mockResolvedValueOnce([{ count: 5 }]); // At limit

        await expect(
            clientService.create('tenant-1', {
                firstName: 'Mario',
                lastName: 'Rossi'
            }, 1)
        ).rejects.toEqual(expect.objectContaining({
            status: 403,
            message: expect.stringContaining('limite massimo')
        }));
    });

    test('rejects duplicate email within tenant', async () => {
        mockQuery.mockResolvedValueOnce([{ max_clients: 50 }]);
        mockQuery.mockResolvedValueOnce([{ count: 1 }]);
        mockQuery.mockResolvedValueOnce([{ id: 5 }]); // Email already exists

        await expect(
            clientService.create('tenant-1', {
                firstName: 'Mario',
                lastName: 'Rossi',
                email: 'existing@test.com'
            }, 1)
        ).rejects.toEqual(expect.objectContaining({
            status: 409
        }));
    });

    test('creates user account when createAccount is true', async () => {
        mockQuery.mockResolvedValueOnce([{ max_clients: 50 }]);
        mockQuery.mockResolvedValueOnce([{ count: 0 }]);
        mockQuery.mockResolvedValueOnce([]); // No duplicate

        const mockConnection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{ insertId: 100 }]) // INSERT user
                .mockResolvedValueOnce([{ insertId: 200 }]) // INSERT client
        };
        mockTransaction.mockImplementation(async (fn) => fn(mockConnection));

        const result = await clientService.create('tenant-1', {
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario@test.com',
            createAccount: true,
            password: 'Password1'
        }, 1);

        expect(result.userId).toBe(100);
        expect(result.clientId).toBe(200);
        // Verify user was created with 'client' role
        const userInsert = mockConnection.execute.mock.calls[0][0];
        expect(userInsert).toContain("'client'");
    });
});

// =============================================
// delete (soft delete)
// =============================================
describe('ClientService.delete', () => {
    test('soft deletes client by setting status to cancelled', async () => {
        // getById mock
        mockQuery
            .mockResolvedValueOnce([{ id: 1, first_name: 'Mario' }])
            .mockResolvedValueOnce([]) // goals
            .mockResolvedValueOnce([]) // injuries
            .mockResolvedValueOnce([]); // UPDATE status

        const result = await clientService.delete(1, 'tenant-1');

        expect(result).toEqual({ success: true });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("status = \"cancelled\""),
            [1, 'tenant-1']
        );
    });

    test('throws 404 when deleting non-existent client', async () => {
        mockQuery.mockResolvedValueOnce([]); // Client not found

        await expect(
            clientService.delete(999, 'tenant-1')
        ).rejects.toEqual(expect.objectContaining({
            status: 404
        }));
    });
});

// =============================================
// addGoal
// =============================================
describe('ClientService.addGoal', () => {
    test('adds goal to client', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 5 });

        const result = await clientService.addGoal(1, 'tenant-1', {
            goalType: 'weight_loss',
            targetValue: 70,
            unit: 'kg',
            priority: 1
        });

        expect(result.id).toBe(5);
    });
});

// =============================================
// addInjury
// =============================================
describe('ClientService.addInjury', () => {
    test('adds injury to client', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 3 });

        const result = await clientService.addInjury(1, 'tenant-1', {
            bodyPart: 'knee',
            severity: 'moderate',
            description: 'Meniscus tear'
        });

        expect(result.id).toBe(3);
    });
});

// =============================================
// getStats
// =============================================
describe('ClientService.getStats', () => {
    test('returns client workout statistics', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total_workouts: 20, total_minutes: 600, avg_duration: 30 }])
            .mockResolvedValueOnce([{ workouts_this_week: 3 }])
            .mockResolvedValueOnce([{ measurement_date: '2026-01-01', weight_kg: 75 }]);

        const result = await clientService.getStats(1, 'tenant-1');

        expect(result.totalWorkouts).toBe(20);
        expect(result.avgDuration).toBe(30);
        expect(result.workoutsThisWeek).toBe(3);
        expect(result.weightHistory).toHaveLength(1);
    });

    test('handles zero stats', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total_workouts: null, total_minutes: null, avg_duration: null }])
            .mockResolvedValueOnce([{ workouts_this_week: 0 }])
            .mockResolvedValueOnce([]);

        const result = await clientService.getStats(1, 'tenant-1');

        expect(result.totalWorkouts).toBe(0);
        expect(result.totalMinutes).toBe(0);
        expect(result.avgDuration).toBe(0);
    });
});
