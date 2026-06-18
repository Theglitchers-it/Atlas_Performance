/**
 * Pay-per-Active-Client Routes (Fase 2)
 * Mount: app.use('/api', billingActiveRoutes)
 */

const express = require('express');
const router = express.Router();

const controller = require('../controllers/billing-active.controller');
const { verifyToken, requireGymAdmin, requireStaff } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/billing/usage', controller.getUsage);
router.put('/billing/settings', requireGymAdmin, controller.updateSettings);
router.post('/billing/report-usage', requireGymAdmin, controller.reportUsage);

router.post('/clients/:id/activate', requireStaff, controller.activateClient);
router.post('/clients/:id/deactivate', requireStaff, controller.deactivateClient);
router.get('/clients/:id/activation-history', requireStaff, controller.getClientHistory);

module.exports = router;
