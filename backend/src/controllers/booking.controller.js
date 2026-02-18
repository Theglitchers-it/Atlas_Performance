/**
 * Booking Controller
 * Gestione HTTP per appuntamenti e disponibilita
 */

const bookingService = require('../services/booking.service');

class BookingController {
    /**
     * GET /api/booking/appointments - Lista appuntamenti
     */
    async getAppointments(req, res, next) {
        try {
            const { clientId, trainerId, status, startDate, endDate, limit, page } = req.query;
            const result = await bookingService.getAppointments(req.user.tenantId, {
                clientId, trainerId, status, startDate, endDate, limit, page
            });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/booking/appointments/:id - Dettaglio appuntamento
     */
    async getAppointmentById(req, res, next) {
        try {
            const appointment = await bookingService.getAppointmentById(req.params.id, req.user.tenantId);
            if (!appointment) return res.status(404).json({ success: false, message: 'Appuntamento non trovato' });
            res.json({ success: true, data: { appointment } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/booking/appointments - Crea appuntamento
     */
    async createAppointment(req, res, next) {
        try {
            const { clientId, trainerId, startDatetime, endDatetime, appointmentType, location, notes } = req.body;
            if (!clientId || !trainerId || !startDatetime || !endDatetime) {
                return res.status(400).json({ success: false, message: 'Campi obbligatori mancanti' });
            }
            const id = await bookingService.createAppointment(req.user.tenantId, {
                clientId, trainerId, startDatetime, endDatetime, appointmentType, location, notes
            });
            res.status(201).json({ success: true, data: { id } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/booking/appointments/:id - Aggiorna appuntamento
     */
    async updateAppointment(req, res, next) {
        try {
            await bookingService.updateAppointment(req.params.id, req.user.tenantId, req.body);
            res.json({ success: true, message: 'Appuntamento aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/booking/appointments/:id/status - Aggiorna stato
     */
    async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            if (!status) return res.status(400).json({ success: false, message: 'Stato richiesto' });
            await bookingService.updateAppointmentStatus(req.params.id, req.user.tenantId, status);
            res.json({ success: true, message: 'Stato aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/booking/appointments/:id - Elimina appuntamento
     */
    async deleteAppointment(req, res, next) {
        try {
            await bookingService.deleteAppointment(req.params.id, req.user.tenantId);
            res.json({ success: true, message: 'Appuntamento eliminato' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/booking/availability/:userId - Disponibilita trainer
     */
    async getAvailability(req, res, next) {
        try {
            const slots = await bookingService.getAvailability(req.user.tenantId, req.params.userId);
            res.json({ success: true, data: { slots } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/booking/availability - Imposta disponibilita
     */
    async setAvailability(req, res, next) {
        try {
            const { slots } = req.body;
            await bookingService.setAvailability(req.user.tenantId, req.user.id, slots || []);
            res.json({ success: true, message: 'Disponibilita aggiornata' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/booking/slots - Slot disponibili per data e trainer
     */
    async getAvailableSlots(req, res, next) {
        try {
            const { trainerId, date } = req.query;
            if (!trainerId || !date) {
                return res.status(400).json({ success: false, message: 'trainerId e date richiesti' });
            }
            const slots = await bookingService.getAvailableSlots(req.user.tenantId, trainerId, date);
            res.json({ success: true, data: { slots } });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/booking/today - Appuntamenti di oggi
     */
    async getToday(req, res, next) {
        try {
            const appointments = await bookingService.getTodayAppointments(req.user.tenantId, req.query.trainerId);
            res.json({ success: true, data: { appointments } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BookingController();
