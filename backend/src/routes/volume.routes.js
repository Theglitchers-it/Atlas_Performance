/**
 * Volume Analytics Routes
 * Tracking volume per gruppo muscolare e priorita
 */

const express = require('express');
const router = express.Router();

const volumeController = require('../controllers/volume.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

/**
 * @swagger
 * /volume/{clientId}:
 *   get:
 *     tags: [Volume]
 *     summary: Volume analytics per cliente
 *     description: Restituisce l'analisi del volume di allenamento per gruppo muscolare del cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 4
 *         description: Numero di settimane da analizzare
 *     responses:
 *       200:
 *         description: Volume analytics
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId', volumeController.getVolume.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/calculate:
 *   post:
 *     tags: [Volume]
 *     summary: Calcola volume settimanale
 *     description: Calcola e salva il volume settimanale di allenamento per gruppo muscolare del cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Volume calcolato
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/calculate', volumeController.calculateWeekly.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/mesocycle/{programId}:
 *   get:
 *     tags: [Volume]
 *     summary: Riassunto mesociclo
 *     description: Restituisce il riassunto del volume di un mesociclo (programma) per il cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Riassunto mesociclo
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente o programma non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/mesocycle/:programId', volumeController.getMesocycleSummary.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/compare:
 *   get:
 *     tags: [Volume]
 *     summary: Confronto mesocicli
 *     description: Confronta il volume tra due mesocicli (programmi) del cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: programId1
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: programId2
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Confronto mesocicli
 *       401:
 *         description: Non autenticato
 *       400:
 *         description: Parametri mancanti
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/compare', volumeController.compareMesocycles.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/plateau:
 *   get:
 *     tags: [Volume]
 *     summary: Rileva plateau
 *     description: Analizza i dati del cliente per rilevare eventuali plateau nel volume di allenamento.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Analisi plateau
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/plateau', volumeController.detectPlateau.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/priorities:
 *   get:
 *     tags: [Volume]
 *     summary: Priorita muscolari
 *     description: Restituisce le priorita muscolari impostate per il cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista priorita muscolari
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/:clientId/priorities', volumeController.getPriorities.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/priorities:
 *   post:
 *     tags: [Volume]
 *     summary: Imposta priorita muscolare
 *     description: Imposta una priorita per un gruppo muscolare del cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [muscleGroupId, priority]
 *             properties:
 *               muscleGroupId:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               targetSets:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Priorita impostata
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/:clientId/priorities', volumeController.setPriority.bind(volumeController));

/**
 * @swagger
 * /volume/{clientId}/priorities/{muscleGroupId}:
 *   delete:
 *     tags: [Volume]
 *     summary: Rimuovi priorita muscolare
 *     description: Rimuove una priorita muscolare per il cliente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: muscleGroupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Priorita rimossa
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Priorita non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/:clientId/priorities/:muscleGroupId', volumeController.deletePriority.bind(volumeController));

module.exports = router;
