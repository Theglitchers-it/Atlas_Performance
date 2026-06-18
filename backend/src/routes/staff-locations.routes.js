/**
 * Staff-Locations Routes (Fase 3 multi-sede)
 */

const express = require('express');
const router = express.Router();

const svc = require('../services/staff-locations.service');
const { verifyToken, requireGymAdmin } = require('../middlewares/auth');

router.use(verifyToken);

// Le mie sedi
router.get('/staff-locations/me', async (req, res, next) => {
    try {
        const data = await svc.getMyLocations(req.user.id, req.user.tenantId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// Tutti gli staff di una location
router.get('/locations/:id/staff', async (req, res, next) => {
    try {
        const data = await svc.getLocationStaff(parseInt(req.params.id, 10), req.user.tenantId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// Albero location (parent + filiali)
router.get('/locations/tree', async (req, res, next) => {
    try {
        const data = await svc.getLocationTree(req.user.tenantId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// Assegna staff a location
router.post('/locations/:locationId/staff', requireGymAdmin, async (req, res, next) => {
    try {
        const { userId, roleAtLocation, schedule, isPrimary } = req.body;
        await svc.assignStaffToLocation({
            tenantId: req.user.tenantId,
            userId: parseInt(userId, 10),
            locationId: parseInt(req.params.locationId, 10),
            roleAtLocation: roleAtLocation || 'trainer',
            schedule: schedule || null,
            isPrimary: !!isPrimary
        });
        res.status(201).json({ success: true });
    } catch (err) { next(err); }
});

// Rimuovi staff da location
router.delete('/locations/:locationId/staff/:userId', requireGymAdmin, async (req, res, next) => {
    try {
        const result = await svc.removeStaffFromLocation({
            tenantId: req.user.tenantId,
            userId: parseInt(req.params.userId, 10),
            locationId: parseInt(req.params.locationId, 10)
        });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
});

// Imposta location primaria per il trainer corrente
router.put('/staff-locations/me/primary/:locationId', async (req, res, next) => {
    try {
        await svc.setPrimaryLocation({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            locationId: parseInt(req.params.locationId, 10)
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
