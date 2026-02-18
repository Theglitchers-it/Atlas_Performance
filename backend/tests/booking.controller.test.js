/**
 * Tests for Booking Controller
 * getAppointments, getAppointmentById, createAppointment, updateAppointment, deleteAppointment, updateStatus
 */

// Mock dependencies
jest.mock('../src/services/booking.service', () => ({
    getAppointments: jest.fn(),
    getAppointmentById: jest.fn(),
    createAppointment: jest.fn(),
    updateAppointment: jest.fn(),
    updateAppointmentStatus: jest.fn(),
    deleteAppointment: jest.fn(),
    getAvailability: jest.fn(),
    setAvailability: jest.fn(),
    getAvailableSlots: jest.fn(),
    getTodayAppointments: jest.fn()
}));

const bookingController = require('../src/controllers/booking.controller');
const bookingService = require('../src/services/booking.service');

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

describe('BookingController', () => {
    describe('getAppointments', () => {
        test('returns list of appointments', async () => {
            const result = {
                appointments: [{ id: 1, status: 'confirmed' }],
                total: 1
            };
            bookingService.getAppointments.mockResolvedValue(result);

            const req = mockReq({ query: { status: 'confirmed', trainerId: '2' } });
            const res = mockRes();

            await bookingController.getAppointments(req, res, mockNext);

            expect(bookingService.getAppointments).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                status: 'confirmed',
                trainerId: '2'
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            bookingService.getAppointments.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await bookingController.getAppointments(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAppointmentById', () => {
        test('returns a single appointment', async () => {
            const appointment = { id: 3, clientId: 5, status: 'confirmed' };
            bookingService.getAppointmentById.mockResolvedValue(appointment);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await bookingController.getAppointmentById(req, res, mockNext);

            expect(bookingService.getAppointmentById).toHaveBeenCalledWith('3', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { appointment }
            });
        });

        test('returns 404 when appointment not found', async () => {
            bookingService.getAppointmentById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await bookingController.getAppointmentById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Appuntamento non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            bookingService.getAppointmentById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await bookingController.getAppointmentById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('createAppointment', () => {
        test('returns 201 with new appointment id', async () => {
            bookingService.createAppointment.mockResolvedValue(42);

            const req = mockReq({
                body: {
                    clientId: 5,
                    trainerId: 2,
                    startDatetime: '2025-06-01T10:00:00',
                    endDatetime: '2025-06-01T11:00:00',
                    appointmentType: 'training',
                    location: 'Gym A',
                    notes: 'First session'
                }
            });
            const res = mockRes();

            await bookingController.createAppointment(req, res, mockNext);

            expect(bookingService.createAppointment).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                clientId: 5,
                trainerId: 2,
                startDatetime: '2025-06-01T10:00:00',
                endDatetime: '2025-06-01T11:00:00'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { id: 42 }
            });
        });

        test('returns 400 when required fields are missing', async () => {
            const req = mockReq({
                body: { clientId: 5 } // missing trainerId, startDatetime, endDatetime
            });
            const res = mockRes();

            await bookingController.createAppointment(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Campi obbligatori mancanti'
            });
            expect(bookingService.createAppointment).not.toHaveBeenCalled();
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Conflict');
            bookingService.createAppointment.mockRejectedValue(error);

            const req = mockReq({
                body: {
                    clientId: 5,
                    trainerId: 2,
                    startDatetime: '2025-06-01T10:00:00',
                    endDatetime: '2025-06-01T11:00:00'
                }
            });
            const res = mockRes();

            await bookingController.createAppointment(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateAppointment', () => {
        test('returns success message on update', async () => {
            bookingService.updateAppointment.mockResolvedValue();

            const req = mockReq({
                params: { id: '3' },
                body: { notes: 'Updated notes' }
            });
            const res = mockRes();

            await bookingController.updateAppointment(req, res, mockNext);

            expect(bookingService.updateAppointment).toHaveBeenCalledWith('3', 'tenant-1', { notes: 'Updated notes' });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Appuntamento aggiornato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Not found');
            bookingService.updateAppointment.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' }, body: {} });
            const res = mockRes();

            await bookingController.updateAppointment(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateStatus', () => {
        test('updates appointment status', async () => {
            bookingService.updateAppointmentStatus.mockResolvedValue();

            const req = mockReq({
                params: { id: '3' },
                body: { status: 'cancelled' }
            });
            const res = mockRes();

            await bookingController.updateStatus(req, res, mockNext);

            expect(bookingService.updateAppointmentStatus).toHaveBeenCalledWith('3', 'tenant-1', 'cancelled');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Stato aggiornato'
            });
        });

        test('returns 400 when status is missing', async () => {
            const req = mockReq({
                params: { id: '3' },
                body: {}
            });
            const res = mockRes();

            await bookingController.updateStatus(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Stato richiesto'
            });
        });
    });

    describe('deleteAppointment', () => {
        test('returns success message on deletion', async () => {
            bookingService.deleteAppointment.mockResolvedValue();

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await bookingController.deleteAppointment(req, res, mockNext);

            expect(bookingService.deleteAppointment).toHaveBeenCalledWith('3', 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Appuntamento eliminato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('Cannot delete');
            bookingService.deleteAppointment.mockRejectedValue(error);

            const req = mockReq({ params: { id: '3' } });
            const res = mockRes();

            await bookingController.deleteAppointment(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAvailableSlots', () => {
        test('returns available slots for trainer and date', async () => {
            const slots = ['09:00', '10:00', '11:00'];
            bookingService.getAvailableSlots.mockResolvedValue(slots);

            const req = mockReq({ query: { trainerId: '2', date: '2025-06-01' } });
            const res = mockRes();

            await bookingController.getAvailableSlots(req, res, mockNext);

            expect(bookingService.getAvailableSlots).toHaveBeenCalledWith('tenant-1', '2', '2025-06-01');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { slots }
            });
        });

        test('returns 400 when trainerId or date missing', async () => {
            const req = mockReq({ query: { trainerId: '2' } }); // missing date
            const res = mockRes();

            await bookingController.getAvailableSlots(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'trainerId e date richiesti'
            });
        });
    });

    describe('getToday', () => {
        test('returns today appointments', async () => {
            const appointments = [{ id: 1, status: 'confirmed' }];
            bookingService.getTodayAppointments.mockResolvedValue(appointments);

            const req = mockReq({ query: { trainerId: '2' } });
            const res = mockRes();

            await bookingController.getToday(req, res, mockNext);

            expect(bookingService.getTodayAppointments).toHaveBeenCalledWith('tenant-1', '2');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { appointments }
            });
        });
    });
});
