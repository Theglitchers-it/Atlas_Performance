/**
 * Measurement Routes
 */

const express = require('express');
const router = express.Router();

const measurementController = require('../controllers/measurement.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

// GET /api/measurements/:clientId - Tutti i progressi
router.get('/:clientId', measurementController.getAllProgress);

// GET /api/measurements/:clientId/weight-change - Variazione peso
router.get('/:clientId/weight-change', measurementController.getWeightChange);

// Body measurements
router.get('/:clientId/body', measurementController.getBodyMeasurements);
router.post('/:clientId/body', requireRole('tenant_owner', 'staff', 'super_admin'), measurementController.addBodyMeasurement);

// Circumferences
router.get('/:clientId/circumferences', measurementController.getCircumferences);
router.post('/:clientId/circumferences', requireRole('tenant_owner', 'staff', 'super_admin'), measurementController.addCircumferences);

// Skinfolds
router.get('/:clientId/skinfolds', measurementController.getSkinfolds);
router.post('/:clientId/skinfolds', requireRole('tenant_owner', 'staff', 'super_admin'), measurementController.addSkinfolds);

// BIA
router.get('/:clientId/bia', measurementController.getBiaMeasurements);
router.post('/:clientId/bia', requireRole('tenant_owner', 'staff', 'super_admin'), measurementController.addBiaMeasurement);

module.exports = router;
