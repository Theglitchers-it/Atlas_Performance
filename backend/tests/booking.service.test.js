/**
 * Tests for BookingService
 * Appointments CRUD, availability, slot generation, tenant isolation
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const bookingService = require('../src/services/booking.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// getAppointments
// =============================================
describe('BookingService.getAppointments', () => {
    test('returns paginated appointments with defaults', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }]) // COUNT
            .mockResolvedValueOnce([
                { id: 1, client_first_name: 'Mario', trainer_first_name: 'Luca', status: 'scheduled' },
                { id: 2, client_first_name: 'Luigi', trainer_first_name: 'Luca', status: 'completed' }
            ]);

        const result = await bookingService.getAppointments('tenant-1');

        expect(result.appointments).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(50);
    });

    test('always includes tenant_id in query', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await bookingService.getAppointments('tenant-1');

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('a.tenant_id = ?');
        expect(countCall[1][0]).toBe('tenant-1');

        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[0]).toContain('a.tenant_id = ?');
        expect(selectCall[1][0]).toBe('tenant-1');
    });

    test('filters by clientId', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, client_id: 5 }]);

        await bookingService.getAppointments('tenant-1', { clientId: 5 });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('a.client_id = ?');
        expect(countCall[1]).toContain(5);
    });

    test('filters by trainerId', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, trainer_id: 3 }]);

        await bookingService.getAppointments('tenant-1', { trainerId: 3 });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('a.trainer_id = ?');
        expect(countCall[1]).toContain(3);
    });

    test('filters by status', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, status: 'scheduled' }]);

        await bookingService.getAppointments('tenant-1', { status: 'scheduled' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('a.status = ?');
        expect(countCall[1]).toContain('scheduled');
    });

    test('filters by date range', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1 }]);

        await bookingService.getAppointments('tenant-1', {
            startDate: '2026-03-01',
            endDate: '2026-03-31'
        });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('a.start_datetime >= ?');
        expect(countCall[0]).toContain('a.end_datetime <= ?');
        expect(countCall[1]).toContain('2026-03-01');
        expect(countCall[1]).toContain('2026-03-31');
    });

    test('pagination calculates offset correctly', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 120 }])
            .mockResolvedValueOnce([]);

        const result = await bookingService.getAppointments('tenant-1', { page: 3, limit: 20 });

        expect(result.pagination.page).toBe(3);
        expect(result.pagination.totalPages).toBe(6);
        // offset = (3-1) * 20 = 40
        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[1]).toContain(40); // offset
    });
});

// =============================================
// getAppointmentById
// =============================================
describe('BookingService.getAppointmentById', () => {
    test('returns appointment with client and trainer details', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', client_id: 5, trainer_id: 2,
            client_first_name: 'Mario', client_last_name: 'Rossi',
            trainer_first_name: 'Luca', trainer_last_name: 'Bianchi',
            status: 'scheduled'
        }]);

        const result = await bookingService.getAppointmentById(1, 'tenant-1');

        expect(result.id).toBe(1);
        expect(result.client_first_name).toBe('Mario');
        expect(result.trainer_first_name).toBe('Luca');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('a.tenant_id = ?'),
            [1, 'tenant-1']
        );
    });

    test('returns null for non-existent appointment', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await bookingService.getAppointmentById(999, 'tenant-1');

        expect(result).toBeNull();
    });

    test('enforces tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await bookingService.getAppointmentById(1, 'wrong-tenant');

        expect(result).toBeNull();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('a.tenant_id = ?'),
            [1, 'wrong-tenant']
        );
    });
});

// =============================================
// createAppointment
// =============================================
describe('BookingService.createAppointment', () => {
    test('creates appointment and returns insertId', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 42 });

        const result = await bookingService.createAppointment('tenant-1', {
            clientId: 5,
            trainerId: 2,
            startDatetime: '2026-03-15 10:00:00',
            endDatetime: '2026-03-15 11:00:00',
            appointmentType: 'training',
            location: 'Sala A',
            notes: 'First session'
        });

        expect(result).toBe(42);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id'),
            expect.arrayContaining(['tenant-1', 5, 2])
        );
    });

    test('defaults appointmentType to training and status to scheduled', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 43 });

        await bookingService.createAppointment('tenant-1', {
            clientId: 5,
            trainerId: 2,
            startDatetime: '2026-03-15 10:00:00',
            endDatetime: '2026-03-15 11:00:00'
        });

        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain("'scheduled'");
        expect(insertCall[1]).toContain('training');
    });

    test('includes tenant_id in the INSERT', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 44 });

        await bookingService.createAppointment('tenant-1', {
            clientId: 1,
            trainerId: 1,
            startDatetime: '2026-03-15 09:00:00',
            endDatetime: '2026-03-15 10:00:00'
        });

        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain('tenant_id');
        expect(insertCall[1][0]).toBe('tenant-1');
    });
});

// =============================================
// updateAppointment
// =============================================
describe('BookingService.updateAppointment', () => {
    test('updates appointment with COALESCE for partial updates', async () => {
        mockQuery.mockResolvedValueOnce({});

        await bookingService.updateAppointment(1, 'tenant-1', {
            startDatetime: '2026-03-16 14:00:00',
            endDatetime: '2026-03-16 15:00:00',
            notes: 'Rescheduled'
        });

        const updateCall = mockQuery.mock.calls[0];
        expect(updateCall[0]).toContain('COALESCE');
        expect(updateCall[0]).toContain('tenant_id = ?');
        expect(updateCall[1]).toContain(1); // appointmentId
        expect(updateCall[1]).toContain('tenant-1');
    });

    test('enforces tenant_id in WHERE clause', async () => {
        mockQuery.mockResolvedValueOnce({});

        await bookingService.updateAppointment(5, 'tenant-1', { notes: 'Updated' });

        const updateCall = mockQuery.mock.calls[0];
        expect(updateCall[0]).toContain('WHERE id = ? AND tenant_id = ?');
    });
});

// =============================================
// updateAppointmentStatus
// =============================================
describe('BookingService.updateAppointmentStatus', () => {
    test('updates status with tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce({});

        await bookingService.updateAppointmentStatus(1, 'tenant-1', 'completed');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['completed', 1, 'tenant-1']
        );
    });
});

// =============================================
// deleteAppointment
// =============================================
describe('BookingService.deleteAppointment', () => {
    test('deletes appointment with tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce({});

        await bookingService.deleteAppointment(1, 'tenant-1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM appointments WHERE id = ? AND tenant_id = ?'),
            [1, 'tenant-1']
        );
    });
});

// =============================================
// getAvailability
// =============================================
describe('BookingService.getAvailability', () => {
    test('returns active availability slots for a trainer', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, day_of_week: 1, start_time: '09:00', end_time: '17:00', is_active: true },
            { id: 2, day_of_week: 3, start_time: '10:00', end_time: '18:00', is_active: true }
        ]);

        const result = await bookingService.getAvailability('tenant-1', 2);

        expect(result).toHaveLength(2);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1', 2]
        );
        expect(mockQuery.mock.calls[0][0]).toContain('is_active = TRUE');
    });
});

// =============================================
// setAvailability
// =============================================
describe('BookingService.setAvailability', () => {
    test('deletes old slots and inserts new ones', async () => {
        mockQuery
            .mockResolvedValueOnce({}) // DELETE old slots
            .mockResolvedValueOnce({}); // INSERT new slots

        await bookingService.setAvailability('tenant-1', 2, [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMin: 60 },
            { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' }
        ]);

        // First call: DELETE
        expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM availability_slots');
        expect(mockQuery.mock.calls[0][1]).toEqual(['tenant-1', 2]);

        // Second call: INSERT with batch values
        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO availability_slots');
    });

    test('only deletes when no slots provided', async () => {
        mockQuery.mockResolvedValueOnce({});

        await bookingService.setAvailability('tenant-1', 2, []);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('DELETE');
    });
});

// =============================================
// getAvailableSlots
// =============================================
describe('BookingService.getAvailableSlots', () => {
    test('returns available time slots excluding booked ones', async () => {
        // Availability pattern: 09:00-12:00 with 60 min slots
        mockQuery.mockResolvedValueOnce([
            { start_time: '09:00', end_time: '12:00', slot_duration_min: 60, is_active: true }
        ]);
        // Booked: 10:00-11:00
        mockQuery.mockResolvedValueOnce([
            {
                start_datetime: new Date('2026-03-17T10:00:00Z'),
                end_datetime: new Date('2026-03-17T11:00:00Z')
            }
        ]);

        const result = await bookingService.getAvailableSlots('tenant-1', 2, '2026-03-17');

        // Should have 09:00-10:00 and 11:00-12:00 (10:00-11:00 is booked)
        expect(result).toHaveLength(2);
        expect(result[0].startTime).toBe('09:00');
        expect(result[0].endTime).toBe('10:00');
        expect(result[1].startTime).toBe('11:00');
        expect(result[1].endTime).toBe('12:00');
    });

    test('returns all slots when nothing is booked', async () => {
        mockQuery.mockResolvedValueOnce([
            { start_time: '14:00', end_time: '16:00', slot_duration_min: 60, is_active: true }
        ]);
        mockQuery.mockResolvedValueOnce([]); // No bookings

        const result = await bookingService.getAvailableSlots('tenant-1', 2, '2026-03-17');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ startTime: '14:00', endTime: '15:00', duration: 60 });
        expect(result[1]).toEqual({ startTime: '15:00', endTime: '16:00', duration: 60 });
    });

    test('returns empty when no availability defined', async () => {
        mockQuery.mockResolvedValueOnce([]); // No availability slots
        mockQuery.mockResolvedValueOnce([]);

        const result = await bookingService.getAvailableSlots('tenant-1', 2, '2026-03-17');

        expect(result).toHaveLength(0);
    });

    test('queries enforce tenant_id for both availability and bookings', async () => {
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([]);

        await bookingService.getAvailableSlots('tenant-1', 2, '2026-03-17');

        // Availability query
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1][0]).toBe('tenant-1');

        // Bookings query
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1][0]).toBe('tenant-1');
    });

    test('excludes cancelled appointments from conflict check', async () => {
        mockQuery.mockResolvedValueOnce([
            { start_time: '09:00', end_time: '10:00', slot_duration_min: 60, is_active: true }
        ]);
        mockQuery.mockResolvedValueOnce([]);

        await bookingService.getAvailableSlots('tenant-1', 2, '2026-03-17');

        const bookingQuery = mockQuery.mock.calls[1][0];
        expect(bookingQuery).toContain("NOT IN ('cancelled')");
    });
});

// =============================================
// getTodayAppointments
// =============================================
describe('BookingService.getTodayAppointments', () => {
    test('returns today appointments for all trainers', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, client_first_name: 'Mario', status: 'scheduled' },
            { id: 2, client_first_name: 'Luigi', status: 'scheduled' }
        ]);

        const result = await bookingService.getTodayAppointments('tenant-1');

        expect(result).toHaveLength(2);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('a.tenant_id = ?'),
            ['tenant-1']
        );
    });

    test('filters by trainerId when provided', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, client_first_name: 'Mario', trainer_id: 3, status: 'scheduled' }
        ]);

        await bookingService.getTodayAppointments('tenant-1', 3);

        const queryCall = mockQuery.mock.calls[0];
        expect(queryCall[0]).toContain('a.trainer_id = ?');
        expect(queryCall[1]).toContain(3);
    });

    test('excludes cancelled appointments', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await bookingService.getTodayAppointments('tenant-1');

        const queryCall = mockQuery.mock.calls[0];
        expect(queryCall[0]).toContain("NOT IN ('cancelled')");
    });
});
