/**
 * Program Routes
 * Endpoint per gestione programmi allenamento
 */

const express = require('express');
const router = express.Router();

const programController = require('../controllers/program.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createProgramSchema, updateProgramSchema, updateStatusSchema, addWorkoutSchema } = require('../validators/program.validator');

// Tutte le route richiedono autenticazione
router.use(verifyToken);

/**
 * @swagger
 * /programs:
 *   get:
 *     tags: [Programs]
 *     summary: Lista programmi di allenamento
 *     description: Restituisce tutti i programmi di allenamento del tenant con paginazione e filtri.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *         description: Filtra per cliente
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, completed, archived]
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
 *         description: Lista programmi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', programController.getAll);

/**
 * @swagger
 * /programs/{id}:
 *   get:
 *     tags: [Programs]
 *     summary: Dettaglio programma
 *     description: Restituisce i dettagli completi di un programma con i workout associati.
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
 *         description: Dettaglio programma
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Programma non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', programController.getById);

/**
 * @swagger
 * /programs:
 *   post:
 *     tags: [Programs]
 *     summary: Crea programma di allenamento
 *     description: Crea un nuovo programma di allenamento. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, clientId]
 *             properties:
 *               name:
 *                 type: string
 *               clientId:
 *                 type: integer
 *               description:
 *                 type: string
 *               duration_weeks:
 *                 type: integer
 *               goal:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Programma creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createProgramSchema), programController.create);

/**
 * @swagger
 * /programs/{id}:
 *   put:
 *     tags: [Programs]
 *     summary: Aggiorna programma
 *     description: Aggiorna i dettagli di un programma di allenamento. Solo trainer e admin.
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
 *               duration_weeks:
 *                 type: integer
 *               goal:
 *                 type: string
 *     responses:
 *       200:
 *         description: Programma aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Programma non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateProgramSchema), programController.update);

/**
 * @swagger
 * /programs/{id}:
 *   delete:
 *     tags: [Programs]
 *     summary: Elimina programma
 *     description: Elimina un programma di allenamento. Solo trainer e admin.
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
 *         description: Programma eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Programma non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), programController.delete);

/**
 * @swagger
 * /programs/{id}/status:
 *   put:
 *     tags: [Programs]
 *     summary: Aggiorna stato programma
 *     description: Modifica lo stato di un programma (draft, active, completed, archived). Solo trainer e admin.
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, archived]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 *       400:
 *         description: Stato non valido
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Programma non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id/status', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateStatusSchema), programController.updateStatus);

/**
 * @swagger
 * /programs/{id}/workouts:
 *   post:
 *     tags: [Programs]
 *     summary: Aggiungi workout al programma
 *     description: Associa un workout template a un programma di allenamento. Solo trainer e admin.
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
 *             required: [workoutTemplateId]
 *             properties:
 *               workoutTemplateId:
 *                 type: integer
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Workout aggiunto al programma
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Programma non trovato
 *       500:
 *         description: Errore server
 */
router.post('/:id/workouts', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addWorkoutSchema), programController.addWorkout);

/**
 * @swagger
 * /programs/{id}/workouts/{workoutId}:
 *   delete:
 *     tags: [Programs]
 *     summary: Rimuovi workout dal programma
 *     description: Rimuove un workout da un programma di allenamento. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del programma
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del workout
 *     responses:
 *       200:
 *         description: Workout rimosso dal programma
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Programma o workout non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id/workouts/:workoutId', requireRole('tenant_owner', 'staff', 'super_admin'), programController.removeWorkout);

module.exports = router;
