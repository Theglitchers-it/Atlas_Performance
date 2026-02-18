/**
 * Tests for Search Controller
 * globalSearch
 */

// Mock dependencies
jest.mock('../src/services/search.service', () => ({
    globalSearch: jest.fn()
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

const searchController = require('../src/controllers/search.controller');
const searchService = require('../src/services/search.service');

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
    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('SearchController', () => {
    describe('globalSearch', () => {
        test('returns search results for a valid query', async () => {
            const results = {
                clients: [{ id: 1, name: 'Mario Rossi' }],
                exercises: [{ id: 10, name: 'Squat' }],
                workouts: []
            };
            searchService.globalSearch.mockResolvedValue(results);

            const req = mockReq({ query: { q: 'Mario' } });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(searchService.globalSearch).toHaveBeenCalledWith('tenant-1', 'Mario', 'tenant_owner');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: results });
        });

        test('trims whitespace from query string', async () => {
            searchService.globalSearch.mockResolvedValue({ clients: [], exercises: [], workouts: [] });

            const req = mockReq({ query: { q: '  Squat  ' } });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(searchService.globalSearch).toHaveBeenCalledWith('tenant-1', 'Squat', 'tenant_owner');
        });

        test('returns 400 when query is missing', async () => {
            const req = mockReq({ query: {} });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La query di ricerca deve avere almeno 2 caratteri'
            });
            expect(searchService.globalSearch).not.toHaveBeenCalled();
        });

        test('returns 400 when query is too short (1 character)', async () => {
            const req = mockReq({ query: { q: 'a' } });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La query di ricerca deve avere almeno 2 caratteri'
            });
            expect(searchService.globalSearch).not.toHaveBeenCalled();
        });

        test('returns 400 when query is only whitespace', async () => {
            const req = mockReq({ query: { q: '  ' } });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(searchService.globalSearch).not.toHaveBeenCalled();
        });

        test('returns 500 when service throws an error', async () => {
            searchService.globalSearch.mockRejectedValue(new Error('DB connection lost'));

            const req = mockReq({ query: { q: 'test query' } });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore durante la ricerca'
            });
        });

        test('passes the user role to the service', async () => {
            searchService.globalSearch.mockResolvedValue({ clients: [], exercises: [], workouts: [] });

            const req = mockReq({
                user: { id: 2, tenantId: 'tenant-1', role: 'client' },
                query: { q: 'bench press' }
            });
            const res = mockRes();

            await searchController.globalSearch(req, res);

            expect(searchService.globalSearch).toHaveBeenCalledWith('tenant-1', 'bench press', 'client');
        });
    });
});
