/**
 * Tests for ProgramService
 * CRUD, workouts, status management
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const programService = require('../src/services/program.service');

beforeEach(() => jest.clearAllMocks());

describe('ProgramService.getAll', () => {
    test('returns paginated programs', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 3 }])
            .mockResolvedValueOnce([
                { id: 1, name: 'Programma Massa', status: 'active' },
                { id: 2, name: 'Programma Cut', status: 'active' }
            ]);

        const result = await programService.getAll('tenant-1');
        expect(result.programs).toHaveLength(2);
    });

    test('filters by clientId', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await programService.getAll('tenant-1', { clientId: 5 });
        expect(mockQuery.mock.calls[0][0]).toContain('client_id = ?');
    });

    test('filters by status', async () => {
        mockQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await programService.getAll('tenant-1', { status: 'active' });
        expect(mockQuery.mock.calls[0][0]).toContain('status = ?');
    });
});

describe('ProgramService.getById', () => {
    test('returns program with workouts', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, name: 'Programma Massa' }])
            .mockResolvedValueOnce([
                { id: 1, template_name: 'Push Day', week_number: 1 },
                { id: 2, template_name: 'Pull Day', week_number: 1 }
            ]);

        const result = await programService.getById(1, 'tenant-1');
        expect(result.name).toBe('Programma Massa');
        expect(result.workouts).toHaveLength(2);
    });

    test('returns null for non-existent program', async () => {
        mockQuery.mockResolvedValueOnce([]);
        const result = await programService.getById(999, 'tenant-1');
        expect(result).toBeNull();
    });
});

describe('ProgramService.create', () => {
    test('creates new program', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 10 });

        const result = await programService.create('tenant-1', 1, {
            clientId: 5,
            name: 'Nuovo Programma',
            weeks: 8,
            daysPerWeek: 4
        });

        expect(result.id).toBe(10);
    });
});

describe('ProgramService.addWorkout', () => {
    test('adds workout to program', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 20 });

        const result = await programService.addWorkout(1, {
            templateId: 5,
            weekNumber: 1,
            dayOfWeek: 1
        });

        expect(result.id).toBe(20);
    });
});

describe('ProgramService.updateStatus', () => {
    test('updates program status', async () => {
        mockQuery
            .mockResolvedValueOnce([]) // UPDATE status
            // getById called internally:
            .mockResolvedValueOnce([{ id: 1, name: 'Test', status: 'completed' }]) // SELECT program
            .mockResolvedValueOnce([]); // SELECT workouts

        const result = await programService.updateStatus(1, 'tenant-1', 'completed');
        expect(result).toBeDefined();
    });
});

describe('ProgramService.delete', () => {
    test('deletes program', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        await programService.delete(1, 'tenant-1');
        expect(mockQuery.mock.calls[0][0]).toContain('DELETE');
    });
});
