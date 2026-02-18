/**
 * Booking Routes
 * Endpoint per gestione appuntamenti e disponibilita
 */

const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const googleCalendarService = require('../services/googleCalendar.service');
const outlookCalendarService = require('../services/outlookCalendar.service');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createAppointmentSchema, updateAppointmentSchema, updateStatusSchema, setAvailabilitySchema } = require('../validators/booking.validator');

// Tutte le route richiedono autenticazione
router.use(verifyToken);

/**
 * @swagger
 * /booking/today:
 *   get:
 *     tags: [Booking]
 *     summary: Appuntamenti di oggi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista appuntamenti odierni
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 */
router.get('/today', bookingController.getToday);

/**
 * @swagger
 * /booking/slots:
 *   get:
 *     tags: [Booking]
 *     summary: Slot disponibili per prenotazione
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data per cui cercare slot
 *       - in: query
 *         name: trainerId
 *         schema:
 *           type: string
 *         description: ID del trainer
 *     responses:
 *       200:
 *         description: Lista slot disponibili
 *       400:
 *         description: Parametri non validi
 */
router.get('/slots', bookingController.getAvailableSlots);

/**
 * @swagger
 * /booking/appointments:
 *   get:
 *     tags: [Booking]
 *     summary: Lista appuntamenti con filtri
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, completed, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Lista appuntamenti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 */
router.get('/appointments', bookingController.getAppointments);

/**
 * @swagger
 * /booking/appointments/{id}:
 *   get:
 *     tags: [Booking]
 *     summary: Dettaglio appuntamento
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dettaglio appuntamento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appuntamento non trovato
 */
router.get('/appointments/:id', bookingController.getAppointmentById);

/**
 * @swagger
 * /booking/appointments:
 *   post:
 *     tags: [Booking]
 *     summary: Crea nuovo appuntamento
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, date, startTime, endTime]
 *             properties:
 *               clientId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "10:00"
 *               type:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appuntamento creato
 *       400:
 *         description: Dati non validi o slot non disponibile
 */
router.post('/appointments', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createAppointmentSchema), bookingController.createAppointment);

/**
 * @swagger
 * /booking/appointments/{id}:
 *   put:
 *     tags: [Booking]
 *     summary: Aggiorna appuntamento
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appuntamento aggiornato
 *       404:
 *         description: Appuntamento non trovato
 */
router.put('/appointments/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateAppointmentSchema), bookingController.updateAppointment);

/**
 * @swagger
 * /booking/appointments/{id}/status:
 *   put:
 *     tags: [Booking]
 *     summary: Aggiorna stato appuntamento
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 *       404:
 *         description: Appuntamento non trovato
 */
router.put('/appointments/:id/status', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateStatusSchema), bookingController.updateStatus);

/**
 * @swagger
 * /booking/appointments/{id}:
 *   delete:
 *     tags: [Booking]
 *     summary: Elimina appuntamento
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appuntamento eliminato
 *       404:
 *         description: Appuntamento non trovato
 */
router.delete('/appointments/:id', requireRole('tenant_owner', 'staff', 'super_admin'), bookingController.deleteAppointment);

/**
 * @swagger
 * /booking/availability/{userId}:
 *   get:
 *     tags: [Booking]
 *     summary: Disponibilita trainer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del trainer
 *     responses:
 *       200:
 *         description: Disponibilita del trainer
 */
router.get('/availability/:userId', bookingController.getAvailability);

/**
 * @swagger
 * /booking/availability:
 *   post:
 *     tags: [Booking]
 *     summary: Imposta propria disponibilita
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slots]
 *             properties:
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *     responses:
 *       200:
 *         description: Disponibilita aggiornata
 *       400:
 *         description: Dati non validi
 */
router.post('/availability', requireRole('tenant_owner', 'staff', 'super_admin'), validate(setAvailabilitySchema), bookingController.setAvailability);

// ============================================
// GOOGLE CALENDAR SYNC
// ============================================

// GET /api/booking/google/auth - URL autorizzazione Google Calendar
router.get('/google/auth', requireRole('tenant_owner', 'staff'), (req, res) => {
    try {
        const url = googleCalendarService.getAuthUrl(req.user.id);
        res.json({ success: true, data: { url } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/booking/google/callback - Callback OAuth Google
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state: userId } = req.query;
        await googleCalendarService.handleCallback(code, userId);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?calendar=google&status=connected`);
    } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?calendar=google&status=error`);
    }
});

// GET /api/booking/google/status - Stato connessione Google Calendar
router.get('/google/status', async (req, res) => {
    const connected = await googleCalendarService.isConnected(req.user.id);
    res.json({ success: true, data: { connected } });
});

// DELETE /api/booking/google/disconnect - Disconnetti Google Calendar
router.delete('/google/disconnect', requireRole('tenant_owner', 'staff'), async (req, res) => {
    await googleCalendarService.disconnect(req.user.id);
    res.json({ success: true, message: 'Google Calendar disconnesso' });
});

// ============================================
// OUTLOOK CALENDAR SYNC
// ============================================

// GET /api/booking/outlook/auth - URL autorizzazione Outlook Calendar
router.get('/outlook/auth', requireRole('tenant_owner', 'staff'), (req, res) => {
    try {
        const url = outlookCalendarService.getAuthUrl(req.user.id);
        res.json({ success: true, data: { url } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/booking/outlook/callback - Callback OAuth Outlook
router.get('/outlook/callback', async (req, res) => {
    try {
        const { code, state: userId } = req.query;
        await outlookCalendarService.handleCallback(code, userId);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?calendar=outlook&status=connected`);
    } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?calendar=outlook&status=error`);
    }
});

// GET /api/booking/outlook/status - Stato connessione Outlook Calendar
router.get('/outlook/status', async (req, res) => {
    const connected = await outlookCalendarService.isConnected(req.user.id);
    res.json({ success: true, data: { connected } });
});

// DELETE /api/booking/outlook/disconnect - Disconnetti Outlook Calendar
router.delete('/outlook/disconnect', requireRole('tenant_owner', 'staff'), async (req, res) => {
    await outlookCalendarService.disconnect(req.user.id);
    res.json({ success: true, message: 'Outlook Calendar disconnesso' });
});

module.exports = router;
