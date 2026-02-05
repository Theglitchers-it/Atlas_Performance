/**
 * Readiness Routes
 */

const express = require('express');
const router = express.Router();

const readinessController = require('../controllers/readiness.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// GET /api/readiness/:clientId/today - Check-in odierno
router.get('/:clientId/today', readinessController.getToday);

// GET /api/readiness/:clientId/history - Storico check-in
router.get('/:clientId/history', readinessController.getHistory);

// GET /api/readiness/:clientId/average - Media readiness
router.get('/:clientId/average', readinessController.getAverage);

// POST /api/readiness/:clientId - Salva check-in
router.post('/:clientId', readinessController.saveCheckin);

module.exports = router;
