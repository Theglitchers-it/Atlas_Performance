/**
 * GPS Check-in Routes (Fase 4)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const svc = require('../services/checkin.service');
const { verifyToken, requireStaff } = require('../middlewares/auth');

router.use(verifyToken);

// Anti-abuse: max 30 check-in/ora per IP (qualcuno potrebbe spammare)
const checkinLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Troppi check-in. Riprova tra un\'ora.' }
});

// Source enums per cui lat/lng sono opzionali (check-in manuale)
const MANUAL_SOURCES = ['manual_qr', 'staff_override'];

// POST /api/checkins — crea un check-in (con o senza GPS)
router.post('/checkins', checkinLimiter, async (req, res, next) => {
    try {
        const { locationId, lat, lng, accuracy, appointmentId, source, notes, clientId } = req.body;
        const resolvedSource = source || 'mobile_native';
        const isManual = MANUAL_SOURCES.includes(resolvedSource);

        if (locationId == null) {
            return res.status(400).json({ success: false, message: 'locationId richiesto' });
        }
        if (!isManual && (lat == null || lng == null)) {
            return res.status(400).json({ success: false, message: 'lat e lng richiesti per check-in GPS' });
        }

        const result = await svc.createCheckin({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            user: req.user,
            clientId: clientId ? parseInt(clientId, 10) : null,
            locationId: parseInt(locationId, 10),
            deviceLat: lat != null ? parseFloat(lat) : null,
            deviceLng: lng != null ? parseFloat(lng) : null,
            deviceAccuracyM: accuracy != null ? parseFloat(accuracy) : null,
            appointmentId: appointmentId ? parseInt(appointmentId, 10) : null,
            source: resolvedSource,
            notes: notes || null
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// PATCH /api/checkins/:id/checkout
router.patch('/checkins/:id/checkout', async (req, res, next) => {
    try {
        await svc.checkout({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            checkinId: parseInt(req.params.id, 10)
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// GET /api/checkins/me
router.get('/checkins/me', async (req, res, next) => {
    try {
        const data = await svc.getMyCheckins(req.user.id, req.user.tenantId, {
            limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
            offset: parseInt(req.query.offset, 10) || 0
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/checkins/me/stats — aggregati per sede dell'utente corrente
router.get('/checkins/me/stats', async (req, res, next) => {
    try {
        const data = await svc.getMyCheckinStatsByLocation(req.user.id, req.user.tenantId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/locations/:id/live-presence  (gym admin)
router.get('/locations/:id/live-presence',
    requireStaff,
    async (req, res, next) => {
        try {
            const data = await svc.getLocationLivePresence(parseInt(req.params.id, 10), req.user.tenantId);
            res.json({ success: true, data, count: data.length });
        } catch (err) { next(err); }
    }
);

module.exports = router;
