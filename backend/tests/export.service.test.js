/**
 * Tests for ExportService
 * CSV/Excel exports for payments, clients, analytics, workout sessions, measurements
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

// Mock ExcelJS for Excel export tests
const mockAddWorksheet = jest.fn();
const mockWriteBuffer = jest.fn().mockResolvedValue(Buffer.from('fake-xlsx'));
jest.mock('exceljs', () => {
    const MockWorkbook = jest.fn().mockImplementation(() => ({
        creator: '',
        created: null,
        addWorksheet: mockAddWorksheet.mockReturnValue({
            columns: [],
            getRow: jest.fn().mockReturnValue({
                font: {},
                fill: {}
            }),
            addRow: jest.fn()
        }),
        xlsx: {
            writeBuffer: mockWriteBuffer
        }
    }));
    return { Workbook: MockWorkbook };
});

const exportService = require('../src/services/export.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// _arrayToCSV (internal helper)
// =============================================
describe('ExportService._arrayToCSV', () => {
    test('returns only headers when data is empty', () => {
        const headers = { name: 'Nome', email: 'Email' };
        const result = exportService._arrayToCSV([], headers);

        expect(result).toBe('Nome,Email');
    });

    test('converts data array to proper CSV format', () => {
        const headers = { name: 'Nome', email: 'Email' };
        const data = [
            { name: 'Mario Rossi', email: 'mario@test.com' },
            { name: 'Luigi Verdi', email: 'luigi@test.com' }
        ];

        const result = exportService._arrayToCSV(data, headers);
        const lines = result.split('\n');

        expect(lines).toHaveLength(3); // header + 2 rows
        expect(lines[0]).toBe('Nome,Email');
        expect(lines[1]).toBe('Mario Rossi,mario@test.com');
    });

    test('escapes commas and quotes in values', () => {
        const headers = { notes: 'Note' };
        const data = [
            { notes: 'Contains, comma' },
            { notes: 'Contains "quotes"' }
        ];

        const result = exportService._arrayToCSV(data, headers);
        const lines = result.split('\n');

        expect(lines[1]).toBe('"Contains, comma"');
        expect(lines[2]).toBe('"Contains ""quotes"""');
    });

    test('handles null/undefined values', () => {
        const headers = { name: 'Nome', phone: 'Telefono' };
        const data = [{ name: 'Test', phone: null }];

        const result = exportService._arrayToCSV(data, headers);
        const lines = result.split('\n');

        expect(lines[1]).toBe('Test,');
    });

    test('replaces dots with commas in numbers (Italian format)', () => {
        const headers = { amount: 'Importo' };
        const data = [{ amount: 99.50 }];

        const result = exportService._arrayToCSV(data, headers);
        const lines = result.split('\n');

        expect(lines[1]).toBe('"99,5"');
    });
});

// =============================================
// exportPaymentsCSV
// =============================================
describe('ExportService.exportPaymentsCSV', () => {
    test('exports payments with tenant scoping and Italian headers', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1, payment_date: '2025-03-01', client_name: 'Mario Rossi',
                client_email: 'mario@test.com', amount: 100, currency: 'EUR',
                status: 'completed', payment_method: 'stripe',
                transaction_id: 'txn_123', notes: null
            }
        ]);

        const result = await exportService.exportPaymentsCSV('tenant-1');

        expect(result.content).toContain('Data Pagamento');
        expect(result.content).toContain('Nome Cliente');
        expect(result.content).toContain('Completato'); // Italian status mapping
        expect(result.filename).toContain('pagamenti');
        expect(result.filename).toContain('.csv');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });

    test('applies date and status filters', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await exportService.exportPaymentsCSV('tenant-1', {
            startDate: '2025-01-01',
            endDate: '2025-03-31',
            status: 'completed'
        });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('p.payment_date >=');
        expect(call[0]).toContain('p.payment_date <=');
        expect(call[0]).toContain('p.status');
        expect(call[1]).toContain('2025-01-01');
        expect(call[1]).toContain('2025-03-31');
        expect(call[1]).toContain('completed');
    });

    test('maps all payment statuses to Italian', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, payment_date: '2025-03-01', amount: 50, status: 'pending', currency: 'EUR' },
            { id: 2, payment_date: '2025-03-02', amount: 75, status: 'failed', currency: 'EUR' },
            { id: 3, payment_date: '2025-03-03', amount: 100, status: 'cancelled', currency: 'EUR' }
        ]);

        const result = await exportService.exportPaymentsCSV('tenant-1');

        expect(result.content).toContain('In Attesa');
        expect(result.content).toContain('Fallito');
        expect(result.content).toContain('Annullato');
    });
});

// =============================================
// exportClientsCSV
// =============================================
describe('ExportService.exportClientsCSV', () => {
    test('exports client list with Italian enum mappings', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1, first_name: 'Mario', last_name: 'Rossi', email: 'mario@test.com',
                phone: '+39123456', status: 'active', fitness_level: 'intermediate',
                gender: 'male', training_location: 'in_person', level: 5,
                xp_points: 1200, streak_days: 14, assigned_trainer: 'Coach Marco'
            }
        ]);

        const result = await exportService.exportClientsCSV('tenant-1');

        expect(result.content).toContain('Attivo');          // status
        expect(result.content).toContain('Intermedio');       // fitness_level
        expect(result.content).toContain('Maschio');          // gender
        expect(result.content).toContain('Di Persona');       // training_location
        expect(result.filename).toContain('clienti');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('c.tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });

    test('applies status and fitnessLevel filters', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await exportService.exportClientsCSV('tenant-1', {
            status: 'active',
            fitnessLevel: 'advanced',
            assignedTo: 3
        });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('c.status = ?');
        expect(call[0]).toContain('c.fitness_level = ?');
        expect(call[0]).toContain('c.assigned_to = ?');
    });
});

// =============================================
// exportAnalyticsCSV
// =============================================
describe('ExportService.exportAnalyticsCSV', () => {
    test('queries 4 data sources and merges by date', async () => {
        // Sessions
        mockQuery.mockResolvedValueOnce([
            { date: '2025-03-01', total_sessions: 5, completed_sessions: 4, cancelled_sessions: 1, avg_duration: 45 }
        ]);
        // Check-ins
        mockQuery.mockResolvedValueOnce([
            { date: '2025-03-01', total_checkins: 3, avg_readiness: 7.5, avg_sleep: 7.2, avg_stress: 4 }
        ]);
        // Appointments
        mockQuery.mockResolvedValueOnce([
            { date: '2025-03-01', total_appointments: 8, completed_appointments: 7, cancelled_appointments: 1 }
        ]);
        // Payments
        mockQuery.mockResolvedValueOnce([
            { date: '2025-03-01', total_payments: 2, revenue: 200 }
        ]);

        const result = await exportService.exportAnalyticsCSV('tenant-1', '30d');

        expect(result.content).toContain('Sessioni Totali');
        expect(result.content).toContain('Check-in Totali');
        expect(result.content).toContain('Appuntamenti Totali');
        expect(result.content).toContain('Entrate');
        expect(result.filename).toContain('analytics_30d');

        // All 4 queries must use tenant_id
        for (let i = 0; i < 4; i++) {
            expect(mockQuery.mock.calls[i][0]).toContain('tenant_id');
            expect(mockQuery.mock.calls[i][1][0]).toBe('tenant-1');
        }
    });

    test('defaults to 30 days when period is unknown', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        await exportService.exportAnalyticsCSV('tenant-1', 'invalid');

        // Should default to 30 days
        const sessionCall = mockQuery.mock.calls[0];
        expect(sessionCall[1][1]).toBe(30);
    });

    test('handles empty data sets gracefully', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        const result = await exportService.exportAnalyticsCSV('tenant-1');

        // Should return CSV with only headers (no data rows)
        const lines = result.content.split('\n');
        expect(lines).toHaveLength(1); // Only header line
    });
});

// =============================================
// exportWorkoutSessionsCSV
// =============================================
describe('ExportService.exportWorkoutSessionsCSV', () => {
    test('exports workout sessions with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1, date: '2025-03-01', client_name: 'Mario Rossi',
                template_name: 'Push Day', status: 'completed',
                duration_minutes: 60, total_volume_kg: 5000,
                avg_heart_rate: 130, calories_burned: 400, notes: null
            }
        ]);

        const result = await exportService.exportWorkoutSessionsCSV('tenant-1');

        expect(result.content).toContain('Completata'); // status mapped
        expect(result.content).toContain('Push Day');
        expect(result.filename).toContain('sessioni_allenamento');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ws.tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });

    test('applies client and date filters', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await exportService.exportWorkoutSessionsCSV('tenant-1', {
            clientId: 5,
            startDate: '2025-01-01',
            endDate: '2025-03-31',
            status: 'completed'
        });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ws.client_id = ?');
        expect(call[0]).toContain('ws.created_at >=');
        expect(call[0]).toContain('ws.created_at <=');
        expect(call[0]).toContain('ws.status = ?');
    });
});

// =============================================
// exportMeasurementsCSV
// =============================================
describe('ExportService.exportMeasurementsCSV', () => {
    test('exports anthropometric measurements with tenant scoping', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 1, measurement_date: '2025-03-01', client_name: 'Mario Rossi',
                weight_kg: 85, body_fat_percentage: 15, muscle_mass_kg: 65,
                waist_cm: 80, chest_cm: 100, hips_cm: 95, thigh_cm: 55, arm_cm: 35,
                notes: null
            }
        ]);

        const result = await exportService.exportMeasurementsCSV('tenant-1');

        expect(result.content).toContain('Peso (kg)');
        expect(result.content).toContain('Massa Grassa (%)');
        expect(result.filename).toContain('misurazioni');

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ad.tenant_id');
        expect(call[1][0]).toBe('tenant-1');
    });

    test('applies client and date filters', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await exportService.exportMeasurementsCSV('tenant-1', {
            clientId: 5,
            startDate: '2025-01-01',
            endDate: '2025-06-30'
        });

        const call = mockQuery.mock.calls[0];
        expect(call[0]).toContain('ad.client_id = ?');
        expect(call[0]).toContain('ad.measurement_date >=');
        expect(call[0]).toContain('ad.measurement_date <=');
    });
});

// =============================================
// _generateFilename
// =============================================
describe('ExportService._generateFilename', () => {
    test('generates filename with prefix and current date', () => {
        const filename = exportService._generateFilename('test');

        expect(filename).toMatch(/^test_\d{4}-\d{2}-\d{2}\.csv$/);
    });
});

// =============================================
// _parseCSVRows
// =============================================
describe('ExportService._parseCSVRows', () => {
    test('parses CSV content back to row objects', () => {
        const csv = 'Nome,Email\nMario,mario@test.com\nLuigi,luigi@test.com';
        const rows = exportService._parseCSVRows(csv);

        expect(rows).toHaveLength(2);
        expect(rows[0]['Nome']).toBe('Mario');
        expect(rows[0]['Email']).toBe('mario@test.com');
    });

    test('returns empty array for header-only CSV', () => {
        const csv = 'Nome,Email';
        const rows = exportService._parseCSVRows(csv);

        expect(rows).toEqual([]);
    });
});
