/**
 * Tests for Class Controller
 * getClasses, getClassById, createClass, updateClass, deleteClass,
 * getSessions, getSessionById, createSession, updateSessionStatus, deleteSession,
 * enrollClient, cancelEnrollment, checkInClient, markNoShow, getMyClasses
 */

// Mock dependencies
jest.mock('../src/services/class.service', () => ({
    getClasses: jest.fn(),
    getClassById: jest.fn(),
    createClass: jest.fn(),
    updateClass: jest.fn(),
    deleteClass: jest.fn(),
    getSessions: jest.fn(),
    getSessionById: jest.fn(),
    createSession: jest.fn(),
    updateSessionStatus: jest.fn(),
    deleteSession: jest.fn(),
    enrollClient: jest.fn(),
    cancelEnrollment: jest.fn(),
    checkInClient: jest.fn(),
    markNoShow: jest.fn(),
    getClientSessions: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const classController = require('../src/controllers/class.controller');
const classService = require('../src/services/class.service');

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

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ClassController', () => {
    // === CLASSI ===

    describe('getClasses', () => {
        test('returns paginated list of classes', async () => {
            const result = { classes: [{ id: 1, name: 'Yoga' }], total: 1 };
            classService.getClasses.mockResolvedValue(result);

            const req = mockReq({ query: { page: '2', limit: '10', activeOnly: 'true', instructorId: '3' } });
            const res = mockRes();

            await classController.getClasses(req, res, mockNext);

            expect(classService.getClasses).toHaveBeenCalledWith('tenant-1', {
                page: 2,
                limit: 10,
                activeOnly: true,
                instructorId: 3
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('uses default pagination when no query params', async () => {
            classService.getClasses.mockResolvedValue({ classes: [], total: 0 });

            const req = mockReq();
            const res = mockRes();

            await classController.getClasses(req, res, mockNext);

            expect(classService.getClasses).toHaveBeenCalledWith('tenant-1', {
                page: 1,
                limit: 20,
                activeOnly: false,
                instructorId: null
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            classService.getClasses.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await classController.getClasses(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getClassById', () => {
        test('returns a single class', async () => {
            const cls = { id: 5, name: 'Pilates' };
            classService.getClassById.mockResolvedValue(cls);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await classController.getClassById(req, res, mockNext);

            expect(classService.getClassById).toHaveBeenCalledWith('tenant-1', '5');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { class: cls } });
        });

        test('returns 404 when class not found', async () => {
            classService.getClassById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await classController.getClassById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Classe non trovata' });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            classService.getClassById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await classController.getClassById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createClass', () => {
        test('returns 201 with created class', async () => {
            const cls = { id: 10, name: 'CrossFit' };
            classService.createClass.mockResolvedValue(cls);

            const req = mockReq({
                body: { name: 'CrossFit', description: 'Intense workout', maxParticipants: 20 }
            });
            const res = mockRes();

            await classController.createClass(req, res, mockNext);

            expect(classService.createClass).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                name: 'CrossFit',
                description: 'Intense workout',
                instructorId: 1,
                maxParticipants: 20
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { class: cls } });
        });

        test('returns 400 when name is missing', async () => {
            const req = mockReq({ body: { description: 'No name' } });
            const res = mockRes();

            await classController.createClass(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Nome obbligatorio' });
            expect(classService.createClass).not.toHaveBeenCalled();
        });

        test('uses provided instructorId instead of user id', async () => {
            classService.createClass.mockResolvedValue({ id: 11 });

            const req = mockReq({
                body: { name: 'Boxing', instructorId: 7 }
            });
            const res = mockRes();

            await classController.createClass(req, res, mockNext);

            expect(classService.createClass).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                instructorId: 7
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Creation failed');
            classService.createClass.mockRejectedValue(error);

            const req = mockReq({ body: { name: 'Test' } });
            const res = mockRes();

            await classController.createClass(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateClass', () => {
        test('returns updated class', async () => {
            const cls = { id: 5, name: 'Updated Yoga' };
            classService.updateClass.mockResolvedValue(cls);

            const req = mockReq({ params: { id: '5' }, body: { name: 'Updated Yoga' } });
            const res = mockRes();

            await classController.updateClass(req, res, mockNext);

            expect(classService.updateClass).toHaveBeenCalledWith('tenant-1', '5', { name: 'Updated Yoga' });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { class: cls } });
        });

        test('returns 404 when class not found', async () => {
            classService.updateClass.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' }, body: { name: 'X' } });
            const res = mockRes();

            await classController.updateClass(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Classe non trovata' });
        });
    });

    describe('deleteClass', () => {
        test('returns success message on deletion', async () => {
            classService.deleteClass.mockResolvedValue(true);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await classController.deleteClass(req, res, mockNext);

            expect(classService.deleteClass).toHaveBeenCalledWith('tenant-1', '5');
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Classe eliminata' });
        });

        test('returns 404 when class not found', async () => {
            classService.deleteClass.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await classController.deleteClass(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Classe non trovata' });
        });
    });

    // === SESSIONI ===

    describe('getSessions', () => {
        test('returns paginated sessions with filters', async () => {
            const result = { sessions: [{ id: 1 }], total: 1 };
            classService.getSessions.mockResolvedValue(result);

            const req = mockReq({
                query: { classId: '3', status: 'scheduled', from: '2025-01-01', to: '2025-12-31', page: '1', limit: '10' }
            });
            const res = mockRes();

            await classController.getSessions(req, res, mockNext);

            expect(classService.getSessions).toHaveBeenCalledWith('tenant-1', {
                classId: 3,
                status: 'scheduled',
                from: '2025-01-01',
                to: '2025-12-31',
                page: 1,
                limit: 10
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            classService.getSessions.mockRejectedValue(error);

            await classController.getSessions(mockReq(), mockRes(), mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getSessionById', () => {
        test('returns a single session', async () => {
            const session = { id: 10, classId: 3 };
            classService.getSessionById.mockResolvedValue(session);

            const req = mockReq({ params: { id: '10' } });
            const res = mockRes();

            await classController.getSessionById(req, res, mockNext);

            expect(classService.getSessionById).toHaveBeenCalledWith('tenant-1', '10');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { session } });
        });

        test('returns 404 when session not found', async () => {
            classService.getSessionById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await classController.getSessionById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Sessione non trovata' });
        });
    });

    describe('createSession', () => {
        test('returns 201 with created session', async () => {
            const session = { id: 20, classId: 3 };
            classService.createSession.mockResolvedValue(session);

            const req = mockReq({
                body: { classId: 3, startDatetime: '2025-06-01T10:00:00', endDatetime: '2025-06-01T11:00:00', notes: 'Morning' }
            });
            const res = mockRes();

            await classController.createSession(req, res, mockNext);

            expect(classService.createSession).toHaveBeenCalledWith('tenant-1', {
                classId: 3,
                startDatetime: '2025-06-01T10:00:00',
                endDatetime: '2025-06-01T11:00:00',
                notes: 'Morning'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { session } });
        });

        test('returns 400 when required fields are missing', async () => {
            const req = mockReq({ body: { classId: 3 } });
            const res = mockRes();

            await classController.createSession(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'classId, startDatetime e endDatetime obbligatori'
            });
            expect(classService.createSession).not.toHaveBeenCalled();
        });

        test('returns 404 when class not found during session creation', async () => {
            classService.createSession.mockResolvedValue(null);

            const req = mockReq({
                body: { classId: 999, startDatetime: '2025-06-01T10:00:00', endDatetime: '2025-06-01T11:00:00' }
            });
            const res = mockRes();

            await classController.createSession(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Classe non trovata' });
        });
    });

    describe('updateSessionStatus', () => {
        test('updates session status successfully', async () => {
            const session = { id: 10, status: 'completed' };
            classService.updateSessionStatus.mockResolvedValue(session);

            const req = mockReq({ params: { id: '10' }, body: { status: 'completed' } });
            const res = mockRes();

            await classController.updateSessionStatus(req, res, mockNext);

            expect(classService.updateSessionStatus).toHaveBeenCalledWith('tenant-1', '10', 'completed');
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { session } });
        });

        test('returns 400 for invalid status', async () => {
            const req = mockReq({ params: { id: '10' }, body: { status: 'invalid_status' } });
            const res = mockRes();

            await classController.updateSessionStatus(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Stato non valido' });
            expect(classService.updateSessionStatus).not.toHaveBeenCalled();
        });

        test('returns 404 when session not found', async () => {
            classService.updateSessionStatus.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' }, body: { status: 'cancelled' } });
            const res = mockRes();

            await classController.updateSessionStatus(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Sessione non trovata' });
        });
    });

    describe('deleteSession', () => {
        test('returns success on deletion', async () => {
            classService.deleteSession.mockResolvedValue(true);

            const req = mockReq({ params: { id: '10' } });
            const res = mockRes();

            await classController.deleteSession(req, res, mockNext);

            expect(classService.deleteSession).toHaveBeenCalledWith('tenant-1', '10');
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Sessione eliminata' });
        });

        test('returns 404 when session not found', async () => {
            classService.deleteSession.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await classController.deleteSession(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    // === ISCRIZIONI ===

    describe('enrollClient', () => {
        test('enrolls a client successfully (trainer providing clientId)', async () => {
            const result = { success: true, enrollment: { id: 1 } };
            classService.enrollClient.mockResolvedValue(result);

            const req = mockReq({ params: { sessionId: '10' }, query: { clientId: '5' } });
            const res = mockRes();

            await classController.enrollClient(req, res, mockNext);

            expect(classService.enrollClient).toHaveBeenCalledWith('tenant-1', '10', 5);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('enrolls a client role user by resolving their clientId', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const result = { success: true };
            classService.enrollClient.mockResolvedValue(result);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                params: { sessionId: '10' }
            });
            const res = mockRes();

            await classController.enrollClient(req, res, mockNext);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM clients'),
                [1, 'tenant-1']
            );
            expect(classService.enrollClient).toHaveBeenCalledWith('tenant-1', '10', 7);
        });

        test('returns 400 when clientId cannot be resolved', async () => {
            const req = mockReq({ params: { sessionId: '10' } });
            const res = mockRes();

            await classController.enrollClient(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Client ID richiesto' });
        });

        test('returns 400 when enrollment fails', async () => {
            const result = { success: false, message: 'Sessione piena' };
            classService.enrollClient.mockResolvedValue(result);

            const req = mockReq({ params: { sessionId: '10' }, query: { clientId: '5' } });
            const res = mockRes();

            await classController.enrollClient(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(result);
        });
    });

    describe('cancelEnrollment', () => {
        test('cancels enrollment successfully', async () => {
            const result = { success: true };
            classService.cancelEnrollment.mockResolvedValue(result);

            const req = mockReq({ params: { sessionId: '10' }, query: { clientId: '5' } });
            const res = mockRes();

            await classController.cancelEnrollment(req, res, mockNext);

            expect(classService.cancelEnrollment).toHaveBeenCalledWith('tenant-1', '10', 5);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('returns 400 when clientId is missing', async () => {
            const req = mockReq({ params: { sessionId: '10' } });
            const res = mockRes();

            await classController.cancelEnrollment(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Client ID richiesto' });
        });
    });

    describe('checkInClient', () => {
        test('checks in a client successfully', async () => {
            const result = { success: true };
            classService.checkInClient.mockResolvedValue(result);

            const req = mockReq({ params: { sessionId: '10' }, body: { clientId: 5 } });
            const res = mockRes();

            await classController.checkInClient(req, res, mockNext);

            expect(classService.checkInClient).toHaveBeenCalledWith('tenant-1', '10', 5);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('returns 400 when clientId is missing from body', async () => {
            const req = mockReq({ params: { sessionId: '10' }, body: {} });
            const res = mockRes();

            await classController.checkInClient(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'clientId obbligatorio' });
        });
    });

    describe('markNoShow', () => {
        test('marks client as no-show successfully', async () => {
            const result = { success: true };
            classService.markNoShow.mockResolvedValue(result);

            const req = mockReq({ params: { sessionId: '10' }, body: { clientId: 5 } });
            const res = mockRes();

            await classController.markNoShow(req, res, mockNext);

            expect(classService.markNoShow).toHaveBeenCalledWith('tenant-1', '10', 5);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('returns 400 when clientId is missing from body', async () => {
            const req = mockReq({ params: { sessionId: '10' }, body: {} });
            const res = mockRes();

            await classController.markNoShow(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'clientId obbligatorio' });
        });
    });

    // === CLIENT SESSIONS ===

    describe('getMyClasses', () => {
        test('returns client sessions for a client-role user', async () => {
            mockQuery.mockResolvedValue([{ id: 7 }]);
            const result = { sessions: [{ id: 1 }], total: 1 };
            classService.getClientSessions.mockResolvedValue(result);

            const req = mockReq({
                user: { id: 1, tenantId: 'tenant-1', role: 'client' },
                query: { status: 'scheduled', page: '1', limit: '10' }
            });
            const res = mockRes();

            await classController.getMyClasses(req, res, mockNext);

            expect(classService.getClientSessions).toHaveBeenCalledWith('tenant-1', 7, {
                status: 'scheduled',
                page: 1,
                limit: 10
            });
            expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
        });

        test('returns empty sessions when clientId cannot be resolved', async () => {
            const req = mockReq({ query: {} });
            const res = mockRes();

            await classController.getMyClasses(req, res, mockNext);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { sessions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
            });
        });
    });
});
