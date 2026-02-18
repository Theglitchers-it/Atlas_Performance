/**
 * Readiness Routes
 */

const express = require('express');
const router = express.Router();

const readinessController = require('../controllers/readiness.controller');
const { verifyToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { checkinSchema } = require('../validators/readiness.validator');

router.use(verifyToken);

/**
 * @swagger
 * /readiness/{clientId}/today:
 *   get:
 *     tags: [Readiness]
 *     summary: Check-in odierno del cliente
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
 *         description: Check-in di oggi (o null se non compilato)
 *       404:
 *         description: Cliente non trovato
 */
router.get('/:clientId/today', readinessController.getToday);

/**
 * @swagger
 * /readiness/{clientId}/history:
 *   get:
 *     tags: [Readiness]
 *     summary: Storico check-in readiness
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Numero di giorni di storico
 *     responses:
 *       200:
 *         description: Storico check-in readiness
 */
router.get('/:clientId/history', readinessController.getHistory);

/**
 * @swagger
 * /readiness/{clientId}/average:
 *   get:
 *     tags: [Readiness]
 *     summary: Media readiness del cliente
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
 *         description: Media punteggio readiness
 */
router.get('/:clientId/average', readinessController.getAverage);

/**
 * @swagger
 * /readiness/{clientId}:
 *   post:
 *     tags: [Readiness]
 *     summary: Salva check-in readiness giornaliero
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sleep, energy, stress, soreness, mood]
 *             properties:
 *               sleep:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               energy:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               stress:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               soreness:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               mood:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Check-in salvato
 *       400:
 *         description: Dati non validi o check-in gia compilato oggi
 */
router.post('/:clientId', validate(checkinSchema), readinessController.saveCheckin);

module.exports = router;
