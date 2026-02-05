/**
 * Exercise Routes
 */

const express = require('express');
const router = express.Router();

const exerciseController = require('../controllers/exercise.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
    exerciseQuerySchema,
    createExerciseSchema,
    updateExerciseSchema
} = require('../validators/exercise.validator');

router.use(verifyToken);

// GET /api/exercises/muscle-groups - Lista gruppi muscolari
router.get('/muscle-groups', exerciseController.getMuscleGroups);

// GET /api/exercises/categories - Lista categorie
router.get('/categories', exerciseController.getCategories);

// GET /api/exercises - Lista esercizi con filtri
router.get('/', validate(exerciseQuerySchema, 'query'), exerciseController.getAll);

// GET /api/exercises/:id - Dettaglio esercizio
router.get('/:id', exerciseController.getById);

// POST /api/exercises - Crea esercizio (solo trainer)
router.post(
    '/',
    requireRole('tenant_owner', 'staff', 'super_admin'),
    validate(createExerciseSchema),
    exerciseController.create
);

// PUT /api/exercises/:id - Aggiorna esercizio
router.put(
    '/:id',
    requireRole('tenant_owner', 'staff', 'super_admin'),
    validate(updateExerciseSchema),
    exerciseController.update
);

// DELETE /api/exercises/:id - Elimina esercizio
router.delete(
    '/:id',
    requireRole('tenant_owner', 'staff', 'super_admin'),
    exerciseController.delete
);

module.exports = router;
