/**
 * Workout Routes
 */

const express = require('express');
const router = express.Router();

const workoutController = require('../controllers/workout.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createWorkoutSchema, updateWorkoutSchema } = require('../validators/workout.validator');

router.use(verifyToken);

/**
 * @swagger
 * /workouts:
 *   get:
 *     tags: [Workouts]
 *     summary: Lista template workout
 *     description: Restituisce tutti i template workout del tenant. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Ricerca per nome
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista template workout
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.getAll);

/**
 * @swagger
 * /workouts/{id}:
 *   get:
 *     tags: [Workouts]
 *     summary: Dettaglio template workout
 *     description: Restituisce i dettagli completi di un template workout con esercizi e set.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dettaglio template workout
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Template non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.getById);

/**
 * @swagger
 * /workouts:
 *   post:
 *     tags: [Workouts]
 *     summary: Crea template workout
 *     description: Crea un nuovo template di workout con esercizi. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [strength, cardio, flexibility, hiit, custom]
 *               exercises:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     exerciseId:
 *                       type: integer
 *                     sets:
 *                       type: integer
 *                     reps:
 *                       type: integer
 *                     rest_seconds:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Template workout creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createWorkoutSchema), workoutController.create);

/**
 * @swagger
 * /workouts/{id}:
 *   put:
 *     tags: [Workouts]
 *     summary: Aggiorna template workout
 *     description: Aggiorna i dettagli di un template workout. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [strength, cardio, flexibility, hiit, custom]
 *               exercises:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     exerciseId:
 *                       type: integer
 *                     sets:
 *                       type: integer
 *                     reps:
 *                       type: integer
 *                     rest_seconds:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Template aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Template non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateWorkoutSchema), workoutController.update);

/**
 * @swagger
 * /workouts/{id}:
 *   delete:
 *     tags: [Workouts]
 *     summary: Elimina template workout
 *     description: Elimina un template workout. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Template eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Template non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.delete);

/**
 * @swagger
 * /workouts/{id}/duplicate:
 *   post:
 *     tags: [Workouts]
 *     summary: Duplica template workout
 *     description: Crea una copia di un template workout esistente. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Template duplicato con successo
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Template non trovato
 *       500:
 *         description: Errore server
 */
router.post('/:id/duplicate', requireRole('tenant_owner', 'staff', 'super_admin'), workoutController.duplicate);

module.exports = router;
