/**
 * Tests for ClassService
 * Classes CRUD, sessions, enrollments, check-in, waitlist, client sessions
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const classService = require('../src/services/class.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// getClasses
// =============================================
describe('ClassService.getClasses', () => {
    test('returns paginated class list with tenant_id scoping', async () => {
        // COUNT query
        mockQuery.mockResolvedValueOnce([{ total: 2 }]);
        // SELECT query
        mockQuery.mockResolvedValueOnce([
            { id: 1, name: 'Yoga', instructor_first_name: 'Anna', upcoming_sessions: 3 },
            { id: 2, name: 'HIIT', instructor_first_name: 'Marco', upcoming_sessions: 1 }
        ]);

        const result = await classService.getClasses('tenant-1');

        expect(result.classes).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);

        // Verify tenant_id in COUNT query
        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.tenant_id = ?');
        expect(countCall[1][0]).toBe('tenant-1');

        // Verify tenant_id in SELECT query
        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[0]).toContain('c.tenant_id = ?');
    });

    test('filters by activeOnly', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, name: 'Active Class', is_active: 1 }]);

        await classService.getClasses('tenant-1', { activeOnly: true });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.is_active = 1');
    });

    test('filters by instructorId', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, name: 'Instructor Class' }]);

        await classService.getClasses('tenant-1', { instructorId: 5 });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.instructor_id = ?');
        expect(countCall[1]).toContain(5);
    });

    test('pagination works correctly', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 50 }])
            .mockResolvedValueOnce([]);

        const result = await classService.getClasses('tenant-1', { page: 3, limit: 10 });

        expect(result.pagination.page).toBe(3);
        expect(result.pagination.totalPages).toBe(5);

        // Verify offset = (3-1) * 10 = 20
        const selectCall = mockQuery.mock.calls[1];
        expect(selectCall[1]).toContain(20); // offset
        expect(selectCall[1]).toContain(10); // limit
    });

    test('returns empty list when no classes exist', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        const result = await classService.getClasses('tenant-1');

        expect(result.classes).toEqual([]);
        expect(result.pagination.total).toBe(0);
    });
});

// =============================================
// getClassById
// =============================================
describe('ClassService.getClassById', () => {
    test('returns a class by id with tenant_id scoping', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, name: 'Yoga', description: 'Relaxing yoga class', tenant_id: 'tenant-1' }
        ]);

        const result = await classService.getClassById('tenant-1', 1);

        expect(result.name).toBe('Yoga');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('c.tenant_id = ?'),
            [1, 'tenant-1']
        );
    });

    test('returns null when class not found or wrong tenant', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.getClassById('wrong-tenant', 999);

        expect(result).toBeNull();
    });
});

// =============================================
// createClass
// =============================================
describe('ClassService.createClass', () => {
    test('creates a class with tenant_id', async () => {
        // INSERT
        mockQuery.mockResolvedValueOnce({ insertId: 10 });
        // getClassById called internally
        mockQuery.mockResolvedValueOnce([
            { id: 10, name: 'Pilates', tenant_id: 'tenant-1', max_participants: 15 }
        ]);

        const result = await classService.createClass('tenant-1', {
            name: 'Pilates',
            description: 'Core strengthening',
            instructorId: 2,
            maxParticipants: 15,
            durationMin: 45,
            location: 'Studio A'
        });

        expect(result.id).toBe(10);
        expect(result.name).toBe('Pilates');

        // Verify tenant_id in INSERT
        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain('INSERT INTO classes');
        expect(insertCall[1][0]).toBe('tenant-1');
    });

    test('uses defaults for optional fields', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 11 });
        mockQuery.mockResolvedValueOnce([
            { id: 11, name: 'Quick Class', tenant_id: 'tenant-1' }
        ]);

        await classService.createClass('tenant-1', {
            name: 'Quick Class',
            instructorId: 1
        });

        const insertCall = mockQuery.mock.calls[0];
        // maxParticipants default = 10, durationMin default = 60
        expect(insertCall[1]).toContain(10);  // default maxParticipants
        expect(insertCall[1]).toContain(60);  // default durationMin
    });
});

// =============================================
// updateClass
// =============================================
describe('ClassService.updateClass', () => {
    test('updates class fields with tenant_id scoping', async () => {
        // UPDATE
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
        // getClassById after update
        mockQuery.mockResolvedValueOnce([
            { id: 1, name: 'Advanced Yoga', tenant_id: 'tenant-1' }
        ]);

        const result = await classService.updateClass('tenant-1', 1, {
            name: 'Advanced Yoga',
            maxParticipants: 20
        });

        expect(result.name).toBe('Advanced Yoga');

        // Verify tenant_id in UPDATE WHERE clause
        const updateCall = mockQuery.mock.calls[0];
        expect(updateCall[0]).toContain('WHERE id = ? AND tenant_id = ?');
    });

    test('returns unchanged class when no fields provided', async () => {
        // getClassById (no update needed)
        mockQuery.mockResolvedValueOnce([
            { id: 1, name: 'Unchanged', tenant_id: 'tenant-1' }
        ]);

        const result = await classService.updateClass('tenant-1', 1, {});

        expect(result.name).toBe('Unchanged');
        // Only getClassById was called, no UPDATE
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});

// =============================================
// deleteClass
// =============================================
describe('ClassService.deleteClass', () => {
    test('deletes a class with tenant_id scoping', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await classService.deleteClass('tenant-1', 1);

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM classes WHERE id = ? AND tenant_id = ?'),
            [1, 'tenant-1']
        );
    });

    test('returns false when class not found or wrong tenant', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await classService.deleteClass('wrong-tenant', 999);

        expect(result).toBe(false);
    });
});

// =============================================
// getSessions
// =============================================
describe('ClassService.getSessions', () => {
    test('returns paginated sessions with tenant_id scoping', async () => {
        // COUNT
        mockQuery.mockResolvedValueOnce([{ total: 3 }]);
        // SELECT
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', enrolled_count: 5, waitlist_count: 2 },
            { id: 2, class_name: 'Yoga', enrolled_count: 8, waitlist_count: 0 },
            { id: 3, class_name: 'HIIT', enrolled_count: 3, waitlist_count: 0 }
        ]);

        const result = await classService.getSessions('tenant-1');

        expect(result.sessions).toHaveLength(3);
        expect(result.pagination.total).toBe(3);

        // Verify tenant_id in query
        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.tenant_id = ?');
        expect(countCall[1][0]).toBe('tenant-1');
    });

    test('filters by classId and status', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 1, class_name: 'Yoga', status: 'scheduled' }]);

        await classService.getSessions('tenant-1', { classId: 5, status: 'scheduled' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('cs.class_id = ?');
        expect(countCall[0]).toContain('cs.status = ?');
        expect(countCall[1]).toContain(5);
        expect(countCall[1]).toContain('scheduled');
    });

    test('filters by date range', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        await classService.getSessions('tenant-1', {
            from: '2026-02-01',
            to: '2026-02-28'
        });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('cs.start_datetime >= ?');
        expect(countCall[0]).toContain('cs.start_datetime <= ?');
    });
});

// =============================================
// getSessionById
// =============================================
describe('ClassService.getSessionById', () => {
    test('returns session with enrollments and tenant_id scoping', async () => {
        // Session query
        mockQuery.mockResolvedValueOnce([
            {
                id: 1,
                class_name: 'Yoga',
                max_participants: 10,
                enrolled_count: 5,
                waitlist_count: 1,
                status: 'scheduled'
            }
        ]);
        // Enrollments query
        mockQuery.mockResolvedValueOnce([
            { id: 1, client_id: 10, first_name: 'Mario', last_name: 'Rossi', status: 'enrolled' },
            { id: 2, client_id: 11, first_name: 'Luigi', last_name: 'Verdi', status: 'enrolled' }
        ]);

        const result = await classService.getSessionById('tenant-1', 1);

        expect(result.class_name).toBe('Yoga');
        expect(result.enrollments).toHaveLength(2);

        // Verify tenant_id in session query
        expect(mockQuery.mock.calls[0][0]).toContain('c.tenant_id = ?');
        expect(mockQuery.mock.calls[0][1]).toEqual([1, 'tenant-1']);
    });

    test('returns null when session not found', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.getSessionById('tenant-1', 999);

        expect(result).toBeNull();
    });
});

// =============================================
// createSession
// =============================================
describe('ClassService.createSession', () => {
    test('creates a session for a class owned by the tenant', async () => {
        // getClassById (verify ownership)
        mockQuery.mockResolvedValueOnce([
            { id: 5, name: 'Yoga', tenant_id: 'tenant-1' }
        ]);
        // INSERT session
        mockQuery.mockResolvedValueOnce({ insertId: 20 });
        // getSessionById (return created session)
        mockQuery.mockResolvedValueOnce([
            { id: 20, class_name: 'Yoga', start_datetime: '2026-03-01T10:00:00', status: 'scheduled' }
        ]);
        // Enrollments for getSessionById
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.createSession('tenant-1', {
            classId: 5,
            startDatetime: '2026-03-01T10:00:00',
            endDatetime: '2026-03-01T11:00:00',
            notes: 'Bring your mat'
        });

        expect(result.id).toBe(20);
        expect(result.class_name).toBe('Yoga');
    });

    test('returns null when class does not belong to tenant', async () => {
        // getClassById returns null
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.createSession('wrong-tenant', {
            classId: 5,
            startDatetime: '2026-03-01T10:00:00'
        });

        expect(result).toBeNull();
    });
});

// =============================================
// enrollClient
// =============================================
describe('ClassService.enrollClient', () => {
    test('enrolls client when session has capacity', async () => {
        // getSessionById: session query
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, waitlist_count: 0, status: 'scheduled' }
        ]);
        // getSessionById: enrollments
        mockQuery.mockResolvedValueOnce([]);
        // Check existing enrollment
        mockQuery.mockResolvedValueOnce([]);
        // INSERT enrollment
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await classService.enrollClient('tenant-1', 1, 10);

        expect(result.success).toBe(true);
        expect(result.status).toBe('enrolled');
    });

    test('adds client to waitlist when session is full', async () => {
        // getSessionById: session query
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 10, waitlist_count: 2, status: 'scheduled' }
        ]);
        // getSessionById: enrollments
        mockQuery.mockResolvedValueOnce([]);
        // Check existing enrollment
        mockQuery.mockResolvedValueOnce([]);
        // INSERT waitlist enrollment
        mockQuery.mockResolvedValueOnce({ insertId: 2 });

        const result = await classService.enrollClient('tenant-1', 1, 10);

        expect(result.success).toBe(true);
        expect(result.status).toBe('waitlist');
        expect(result.position).toBe(3); // waitlist_count + 1
    });

    test('rejects enrollment when session not found', async () => {
        // getSessionById returns null
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.enrollClient('tenant-1', 999, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('non trovata');
    });

    test('rejects enrollment when session is not scheduled', async () => {
        // getSessionById: completed session
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, waitlist_count: 0, status: 'completed' }
        ]);
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.enrollClient('tenant-1', 1, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('non disponibile');
    });

    test('rejects duplicate enrollment', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, waitlist_count: 0, status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]);
        // Existing enrollment found
        mockQuery.mockResolvedValueOnce([{ id: 1, status: 'enrolled' }]);

        const result = await classService.enrollClient('tenant-1', 1, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('iscritto');
    });
});

// =============================================
// cancelEnrollment
// =============================================
describe('ClassService.cancelEnrollment', () => {
    test('cancels enrollment and promotes first waitlisted client', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 10, waitlist_count: 1, status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]);
        // Find enrollment
        mockQuery.mockResolvedValueOnce([{ id: 5, status: 'enrolled' }]);
        // UPDATE to cancelled
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
        // Find next waitlisted
        mockQuery.mockResolvedValueOnce([{ id: 6, status: 'waitlist', waitlist_position: 1 }]);
        // Promote waitlisted
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await classService.cancelEnrollment('tenant-1', 1, 10);

        expect(result.success).toBe(true);

        // Verify waitlist promotion happened
        const promoteCall = mockQuery.mock.calls[5];
        expect(promoteCall[0]).toContain("status = ?");
        expect(promoteCall[1]).toContain('enrolled');
    });

    test('returns failure when session not found', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.cancelEnrollment('tenant-1', 999, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('non trovata');
    });

    test('returns failure when enrollment not found', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, waitlist_count: 0, status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]);
        // No enrollment found
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.cancelEnrollment('tenant-1', 1, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('non trovata');
    });
});

// =============================================
// checkInClient
// =============================================
describe('ClassService.checkInClient', () => {
    test('checks in an enrolled client', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]);
        // Find enrollment with 'enrolled' status
        mockQuery.mockResolvedValueOnce([{ id: 5, status: 'enrolled' }]);
        // UPDATE to 'attended'
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await classService.checkInClient('tenant-1', 1, 10);

        expect(result.success).toBe(true);

        // Verify the UPDATE sets status to 'attended'
        const updateCall = mockQuery.mock.calls[3];
        expect(updateCall[0]).toContain("status = ?");
        expect(updateCall[1]).toContain('attended');
    });

    test('returns failure when no active enrollment exists', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]);
        // No enrollment found
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.checkInClient('tenant-1', 1, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('non trovata');
    });
});

// =============================================
// markNoShow
// =============================================
describe('ClassService.markNoShow', () => {
    test('marks client as no-show', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', max_participants: 10, enrolled_count: 5, status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]);
        // Find enrollment
        mockQuery.mockResolvedValueOnce([{ id: 5, status: 'enrolled' }]);
        // UPDATE to 'no_show'
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await classService.markNoShow('tenant-1', 1, 10);

        expect(result.success).toBe(true);

        const updateCall = mockQuery.mock.calls[3];
        expect(updateCall[0]).toContain("status = ?");
        expect(updateCall[1]).toContain('no_show');
    });

    test('returns failure when session not found', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await classService.markNoShow('tenant-1', 999, 10);

        expect(result.success).toBe(false);
    });
});

// =============================================
// getClientSessions
// =============================================
describe('ClassService.getClientSessions', () => {
    test('returns paginated sessions for a specific client with tenant_id scoping', async () => {
        // COUNT
        mockQuery.mockResolvedValueOnce([{ total: 5 }]);
        // SELECT
        mockQuery.mockResolvedValueOnce([
            { session_id: 1, class_name: 'Yoga', enrollment_status: 'enrolled' },
            { session_id: 2, class_name: 'HIIT', enrollment_status: 'attended' }
        ]);

        const result = await classService.getClientSessions('tenant-1', 10);

        expect(result.sessions).toHaveLength(2);
        expect(result.pagination.total).toBe(5);

        // Verify tenant_id in query
        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('c.tenant_id = ?');
        expect(countCall[1][0]).toBe('tenant-1');
        // Verify client_id
        expect(countCall[1][1]).toBe(10);
    });

    test('filters client sessions by enrollment status', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 2 }])
            .mockResolvedValueOnce([
                { session_id: 1, class_name: 'Yoga', enrollment_status: 'attended' }
            ]);

        await classService.getClientSessions('tenant-1', 10, { status: 'attended' });

        const countCall = mockQuery.mock.calls[0];
        expect(countCall[0]).toContain('ce.status = ?');
        expect(countCall[1]).toContain('attended');
    });

    test('returns empty result when client has no sessions', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        const result = await classService.getClientSessions('tenant-1', 10);

        expect(result.sessions).toEqual([]);
        expect(result.pagination.total).toBe(0);
    });
});

// =============================================
// deleteSession
// =============================================
describe('ClassService.deleteSession', () => {
    test('deletes a session after verifying tenant ownership', async () => {
        // getSessionById
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]); // enrollments
        // DELETE
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await classService.deleteSession('tenant-1', 1);

        expect(result).toBe(true);
    });

    test('returns false when session not found for tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // getSessionById returns null

        const result = await classService.deleteSession('wrong-tenant', 999);

        expect(result).toBe(false);
    });
});

// =============================================
// updateSessionStatus
// =============================================
describe('ClassService.updateSessionStatus', () => {
    test('updates session status with tenant verification', async () => {
        // getSessionById (verify tenant)
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', status: 'scheduled' }
        ]);
        mockQuery.mockResolvedValueOnce([]); // enrollments
        // UPDATE status
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
        // getSessionById (return updated)
        mockQuery.mockResolvedValueOnce([
            { id: 1, class_name: 'Yoga', status: 'completed' }
        ]);
        mockQuery.mockResolvedValueOnce([]); // enrollments

        const result = await classService.updateSessionStatus('tenant-1', 1, 'completed');

        expect(result.status).toBe('completed');
    });

    test('returns null when session not found for tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // getSessionById returns null

        const result = await classService.updateSessionStatus('wrong-tenant', 999, 'completed');

        expect(result).toBeNull();
    });
});
