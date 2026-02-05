/**
 * Session Routes
 */

const express = require('express');
const router = express.Router();

const sessionController = require('../controllers/session.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

// GET /api/sessions/client/:clientId - Sessioni per cliente
router.get('/client/:clientId', sessionController.getByClient);

// GET /api/sessions/client/:clientId/stats - Stats sessioni cliente
router.get('/client/:clientId/stats', sessionController.getStats);

// GET /api/sessions/:id - Dettaglio sessione
router.get('/:id', sessionController.getById);

// POST /api/sessions - Inizia sessione
router.post('/', sessionController.start);

// POST /api/sessions/:id/set - Log set
router.post('/:id/set', sessionController.logSet);

// POST /api/sessions/:id/complete - Completa sessione
router.post('/:id/complete', sessionController.complete);

// POST /api/sessions/:id/skip - Salta sessione
router.post('/:id/skip', sessionController.skip);

module.exports = router;
