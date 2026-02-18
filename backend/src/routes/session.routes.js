/**
 * Session Routes
 */

const express = require('express');
const router = express.Router();

const sessionController = require('../controllers/session.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { startSessionSchema, logSetSchema, completeSessionSchema } = require('../validators/session.validator');

router.use(verifyToken);

/**
 * @swagger
 * /sessions/client/{clientId}:
 *   get:
 *     tags: [Sessions]
 *     summary: Sessioni per cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Lista sessioni del cliente
 *       404:
 *         description: Cliente non trovato
 */
router.get('/client/:clientId', sessionController.getByClient);

/**
 * @swagger
 * /sessions/client/{clientId}/stats:
 *   get:
 *     tags: [Sessions]
 *     summary: Statistiche sessioni cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistiche sessioni
 *       404:
 *         description: Cliente non trovato
 */
router.get('/client/:clientId/stats', sessionController.getStats);

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     tags: [Sessions]
 *     summary: Dettaglio sessione
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dettaglio sessione con set e esercizi
 *       404:
 *         description: Sessione non trovata
 */
router.get('/:id', sessionController.getById);

/**
 * @swagger
 * /sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Inizia nuova sessione di allenamento
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, workoutTemplateId]
 *             properties:
 *               clientId:
 *                 type: string
 *               workoutTemplateId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sessione avviata
 *       400:
 *         description: Dati non validi
 */
router.post('/', validate(startSessionSchema), sessionController.start);

/**
 * @swagger
 * /sessions/{id}/set:
 *   post:
 *     tags: [Sessions]
 *     summary: Registra un set nella sessione
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exerciseId, reps, weight]
 *             properties:
 *               exerciseId:
 *                 type: string
 *               reps:
 *                 type: integer
 *               weight:
 *                 type: number
 *               rpe:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Set registrato
 *       404:
 *         description: Sessione non trovata
 */
router.post('/:id/set', validate(logSetSchema), sessionController.logSet);

/**
 * @swagger
 * /sessions/{id}/complete:
 *   post:
 *     tags: [Sessions]
 *     summary: Completa sessione di allenamento
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Sessione completata
 *       404:
 *         description: Sessione non trovata
 */
router.post('/:id/complete', validate(completeSessionSchema), sessionController.complete);

/**
 * @swagger
 * /sessions/{id}/skip:
 *   post:
 *     tags: [Sessions]
 *     summary: Salta sessione
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sessione saltata
 *       404:
 *         description: Sessione non trovata
 */
router.post('/:id/skip', sessionController.skip);

module.exports = router;
