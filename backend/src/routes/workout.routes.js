/**
 * Workout Routes
 */

const express = require('express');
const router = express.Router();

const workoutController = require('../controllers/workout.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

// GET /api/workouts - Lista template workout
router.get('/', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.getAll);

// GET /api/workouts/:id - Dettaglio template
router.get('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.getById);

// POST /api/workouts - Crea template
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.create);

// PUT /api/workouts/:id - Aggiorna template
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.update);

// DELETE /api/workouts/:id - Elimina template
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.delete);

// POST /api/workouts/:id/duplicate - Duplica template
router.post('/:id/duplicate', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.duplicate);

module.exports = router;
