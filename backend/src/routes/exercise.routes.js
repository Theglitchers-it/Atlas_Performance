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

/**
 * @swagger
 * /exercises/muscle-groups:
 *   get:
 *     tags: [Exercises]
 *     summary: Lista gruppi muscolari
 *     description: Restituisce tutti i gruppi muscolari disponibili per la categorizzazione degli esercizi.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista gruppi muscolari
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/muscle-groups', exerciseController.getMuscleGroups);

/**
 * @swagger
 * /exercises/categories:
 *   get:
 *     tags: [Exercises]
 *     summary: Lista categorie esercizi
 *     description: Restituisce tutte le categorie di esercizi disponibili.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista categorie
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/categories', exerciseController.getCategories);

/**
 * @swagger
 * /exercises:
 *   get:
 *     tags: [Exercises]
 *     summary: Lista esercizi con filtri
 *     description: Restituisce la lista degli esercizi con filtri per gruppo muscolare, categoria e ricerca.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: muscleGroup
 *         schema:
 *           type: string
 *         description: Filtra per gruppo muscolare
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtra per categoria
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
 *         description: Lista esercizi con paginazione
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', validate(exerciseQuerySchema, 'query'), exerciseController.getAll);

/**
 * @swagger
 * /exercises/{id}:
 *   get:
 *     tags: [Exercises]
 *     summary: Dettaglio esercizio
 *     description: Restituisce i dettagli completi di un esercizio inclusi video e istruzioni.
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
 *         description: Dettaglio esercizio
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Esercizio non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', exerciseController.getById);

/**
 * @swagger
 * /exercises:
 *   post:
 *     tags: [Exercises]
 *     summary: Crea esercizio
 *     description: Crea un nuovo esercizio nella libreria. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, muscle_group_id]
 *             properties:
 *               name:
 *                 type: string
 *               muscle_group_id:
 *                 type: integer
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               video_url:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               equipment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Esercizio creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post(
    '/',
    requireRole('tenant_owner', 'staff', 'super_admin'),
    validate(createExerciseSchema),
    exerciseController.create
);

/**
 * @swagger
 * /exercises/{id}:
 *   put:
 *     tags: [Exercises]
 *     summary: Aggiorna esercizio
 *     description: Aggiorna i dettagli di un esercizio. Solo trainer e admin.
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
 *               muscle_group_id:
 *                 type: integer
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               video_url:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               equipment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Esercizio aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Esercizio non trovato
 *       500:
 *         description: Errore server
 */
router.put(
    '/:id',
    requireRole('tenant_owner', 'staff', 'super_admin'),
    validate(updateExerciseSchema),
    exerciseController.update
);

/**
 * @swagger
 * /exercises/{id}:
 *   delete:
 *     tags: [Exercises]
 *     summary: Elimina esercizio
 *     description: Elimina un esercizio dalla libreria. Solo trainer e admin.
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
 *         description: Esercizio eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Esercizio non trovato
 *       500:
 *         description: Errore server
 */
router.delete(
    '/:id',
    requireRole('tenant_owner', 'staff', 'super_admin'),
    exerciseController.delete
);

module.exports = router;
