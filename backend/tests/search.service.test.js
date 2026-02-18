/**
 * Tests for SearchService
 * globalSearch, LIKE wildcard sanitization, role-based restrictions
 */

const mockExecute = jest.fn();
jest.mock('../src/config/database', () => ({
    getPool: () => ({
        execute: (...args) => mockExecute(...args)
    })
}));

const searchService = require('../src/services/search.service');

beforeEach(() => jest.clearAllMocks());

// =============================================
// globalSearch
// =============================================
describe('SearchService.globalSearch', () => {
    test('returns clients, exercises, and workouts', async () => {
        // searchClients
        mockExecute.mockResolvedValueOnce([[
            { id: 1, name: 'Mario Rossi', email: 'mario@test.com' }
        ]]);
        // searchExercises
        mockExecute.mockResolvedValueOnce([[
            { id: 10, name: 'Bench Press' }
        ]]);
        // searchWorkouts
        mockExecute.mockResolvedValueOnce([[
            { id: 20, name: 'Upper Body' }
        ]]);

        const result = await searchService.globalSearch('tenant-1', 'bench', 'tenant_owner');

        expect(result.clients).toHaveLength(1);
        expect(result.clients[0].name).toBe('Mario Rossi');
        expect(result.exercises).toHaveLength(1);
        expect(result.exercises[0].name).toBe('Bench Press');
        expect(result.workouts).toHaveLength(1);
        expect(result.workouts[0].name).toBe('Upper Body');
    });

    test('returns empty arrays when no results', async () => {
        mockExecute.mockResolvedValueOnce([[]]); // clients
        mockExecute.mockResolvedValueOnce([[]]); // exercises
        mockExecute.mockResolvedValueOnce([[]]); // workouts

        const result = await searchService.globalSearch('tenant-1', 'nonexistent', 'tenant_owner');

        expect(result.clients).toEqual([]);
        expect(result.exercises).toEqual([]);
        expect(result.workouts).toEqual([]);
    });

    test('passes tenant_id and search term to all queries', async () => {
        mockExecute.mockResolvedValue([[]]);

        await searchService.globalSearch('tenant-1', 'test', 'tenant_owner');

        // All three execute calls should include tenant-1
        for (const call of mockExecute.mock.calls) {
            expect(call[1][0]).toBe('tenant-1');
        }
    });
});

// =============================================
// LIKE wildcard sanitization
// =============================================
describe('SearchService LIKE wildcard sanitization', () => {
    test('escapes % in search term', async () => {
        mockExecute.mockResolvedValue([[]]);

        await searchService.globalSearch('tenant-1', '100%', 'tenant_owner');

        // The searchTerm should be '%100\\%%' (% escaped to \\%)
        // Check searchClients call: params are [tenantId, searchTerm, searchTerm, searchTerm, searchTerm]
        const clientCall = mockExecute.mock.calls.find(call =>
            call[0].includes('clients')
        );
        expect(clientCall[1][1]).toBe('%100\\%%');
    });

    test('escapes _ in search term', async () => {
        mockExecute.mockResolvedValue([[]]);

        await searchService.globalSearch('tenant-1', 'user_name', 'tenant_owner');

        const clientCall = mockExecute.mock.calls.find(call =>
            call[0].includes('clients')
        );
        expect(clientCall[1][1]).toBe('%user\\_name%');
    });

    test('escapes both % and _ in search term', async () => {
        mockExecute.mockResolvedValue([[]]);

        await searchService.globalSearch('tenant-1', '50%_off', 'tenant_owner');

        const exerciseCall = mockExecute.mock.calls.find(call =>
            call[0].includes('exercises')
        );
        // 50%_off -> 50\%\_off -> wrapped: %50\%\_off%
        expect(exerciseCall[1][1]).toBe('%50\\%\\_off%');
    });
});

// =============================================
// Role-based restrictions
// =============================================
describe('SearchService role-based restrictions', () => {
    test('client role cannot see clients in search results', async () => {
        // When role is client, searchClients returns [] without querying
        // Only exercises and workouts queries are made
        mockExecute.mockResolvedValueOnce([[{ id: 10, name: 'Squat' }]]);     // exercises
        mockExecute.mockResolvedValueOnce([[{ id: 20, name: 'Leg Day' }]]);   // workouts

        const result = await searchService.globalSearch('tenant-1', 'squat', 'client');

        expect(result.clients).toEqual([]);
        expect(result.exercises).toHaveLength(1);
        expect(result.workouts).toHaveLength(1);

        // Verify no query was made to the clients table
        const clientQuery = mockExecute.mock.calls.find(call =>
            call[0].includes('FROM clients')
        );
        expect(clientQuery).toBeUndefined();
    });

    test('tenant_owner can see clients in search results', async () => {
        mockExecute.mockResolvedValueOnce([[{ id: 1, name: 'Mario Rossi', email: 'mario@test.com' }]]);
        mockExecute.mockResolvedValueOnce([[]]);
        mockExecute.mockResolvedValueOnce([[]]);

        const result = await searchService.globalSearch('tenant-1', 'mario', 'tenant_owner');

        expect(result.clients).toHaveLength(1);

        // Verify a query was made to the clients table
        const clientQuery = mockExecute.mock.calls.find(call =>
            call[0].includes('FROM clients')
        );
        expect(clientQuery).toBeDefined();
    });

    test('staff role can see clients in search results', async () => {
        mockExecute.mockResolvedValueOnce([[{ id: 2, name: 'Luigi Verdi', email: 'luigi@test.com' }]]);
        mockExecute.mockResolvedValueOnce([[]]);
        mockExecute.mockResolvedValueOnce([[]]);

        const result = await searchService.globalSearch('tenant-1', 'luigi', 'staff');

        expect(result.clients).toHaveLength(1);
        expect(result.clients[0].name).toBe('Luigi Verdi');
    });
});
