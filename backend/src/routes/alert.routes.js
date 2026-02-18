/**
 * Alert Routes
 * Smart Training Alerts
 */

const express = require('express');
const router = express.Router();

const alertController = require('../controllers/alert.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

/**
 * @swagger
 * /alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Lista alert attivi
 *     description: Restituisce tutti gli alert attivi per il trainer corrente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista alert attivi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', alertController.getAlerts.bind(alertController));

/**
 * @swagger
 * /alerts/{clientId}/check:
 *   post:
 *     tags: [Alerts]
 *     summary: Esegui check alert per un cliente
 *     description: Esegue i controlli automatici e genera eventuali alert per il cliente specificato.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Check eseguito con successo
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/check', alertController.runChecks.bind(alertController));

/**
 * @swagger
 * /alerts/{alertId}/dismiss:
 *   put:
 *     tags: [Alerts]
 *     summary: Dismissa un alert
 *     description: Segna un alert specifico come dismesso/letto.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dell'alert
 *     responses:
 *       200:
 *         description: Alert dismesso
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Alert non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:alertId/dismiss', alertController.dismiss.bind(alertController));

/**
 * @swagger
 * /alerts/client/{clientId}/dismiss-all:
 *   put:
 *     tags: [Alerts]
 *     summary: Dismissa tutti gli alert di un cliente
 *     description: Segna tutti gli alert di un cliente come dismessi.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Tutti gli alert dismessi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.put('/client/:clientId/dismiss-all', alertController.dismissAll.bind(alertController));

module.exports = router;
