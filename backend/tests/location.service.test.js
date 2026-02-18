/**
 * Tests for LocationService
 * CRUD, client assignment, stats
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const locationService = require('../src/services/location.service');

beforeEach(() => jest.clearAllMocks());

describe('LocationService.getAll', () => {
    test('returns paginated locations', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 3 }])
            .mockResolvedValueOnce([
                { id: 1, name: 'Palestra Centro', city: 'Milano', status: 'active' },
                { id: 2, name: 'Palestra Nord', city: 'Torino', status: 'active' }
            ]);

        const result = await locationService.getAll('tenant-1');
        expect(result.locations).toHaveLength(2);
    });

    test('filters by city', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await locationService.getAll('tenant-1', { city: 'Milano' });
        expect(mockQuery.mock.calls[0][0]).toContain('city = ?');
    });

    test('filters online locations', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await locationService.getAll('tenant-1', { isOnline: true });
        expect(mockQuery.mock.calls[0][0]).toContain('is_online = ?');
    });
});

describe('LocationService.create', () => {
    test('creates new location', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // No duplicate check
            .mockResolvedValueOnce({ insertId: 10 }) // INSERT
            // getById call after INSERT (returns full location data)
            .mockResolvedValueOnce([{
                id: 10, name: 'Nuova Palestra', address: 'Via Roma 1', city: 'Milano',
                capacity: 50, status: 'active', is_online: 0,
                opening_hours: null, amenities: null,
                client_count: 0, scheduled_classes: 0
            }]);

        const result = await locationService.create('tenant-1', {
            name: 'Nuova Palestra',
            address: 'Via Roma 1',
            city: 'Milano',
            capacity: 50
        });

        expect(result.id).toBe(10);
        expect(result.name).toBe('Nuova Palestra');
    });

    test('rejects duplicate name', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 1 }]); // Duplicate exists

        await expect(locationService.create('tenant-1', {
            name: 'Palestra Esistente',
            city: 'Milano'
        })).rejects.toEqual(expect.objectContaining({ status: 409 }));
    });
});

describe('LocationService.getById', () => {
    test('returns location details', async () => {
        mockQuery.mockResolvedValueOnce([{ id: 1, name: 'Palestra Centro', opening_hours: '{}', amenities: '[]' }]);

        const result = await locationService.getById(1, 'tenant-1');
        expect(result.name).toBe('Palestra Centro');
    });

    test('throws 404 for non-existent location', async () => {
        mockQuery.mockResolvedValueOnce([]);
        await expect(locationService.getById(999, 'tenant-1'))
            .rejects.toEqual(expect.objectContaining({ status: 404 }));
    });
});

describe('LocationService.delete', () => {
    test('soft deletes location without clients', async () => {
        mockQuery
            // getById: SELECT location (needs proper fields for _parseLocationData)
            .mockResolvedValueOnce([{
                id: 1, name: 'Palestra Centro', status: 'active', is_online: 0,
                opening_hours: null, amenities: null,
                client_count: 0, scheduled_classes: 0
            }])
            .mockResolvedValueOnce([{ count: 0 }]) // no clients
            .mockResolvedValueOnce([{ count: 0 }]) // no classes
            .mockResolvedValueOnce([]); // UPDATE

        await locationService.delete(1, 'tenant-1');
        // The service uses double quotes in SQL: status = "inactive"
        expect(mockQuery.mock.calls[3][0]).toContain('status = "inactive"');
    });
});

describe('LocationService.getAvailableCities', () => {
    test('returns distinct cities', async () => {
        mockQuery.mockResolvedValueOnce([
            { city: 'Milano' },
            { city: 'Roma' },
            { city: 'Torino' }
        ]);

        const cities = await locationService.getAvailableCities('tenant-1');
        expect(cities).toHaveLength(3);
    });
});
