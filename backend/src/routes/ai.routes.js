/**
 * AI Routes
 */

const express = require('express');
const router = express.Router();

const aiController = require('../controllers/ai.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

/**
 * @swagger
 * /ai/status:
 *   get:
 *     tags: [AI]
 *     summary: Stato servizio AI
 *     description: Verifica se il servizio AI (OpenAI) e configurato e disponibile.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stato del servizio AI
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/status', aiController.getStatus.bind(aiController));

/**
 * @swagger
 * /ai/alternative-exercises:
 *   post:
 *     tags: [AI]
 *     summary: Suggerisci esercizi alternativi
 *     description: Utilizza AI per suggerire esercizi alternativi basati su vincoli o preferenze. Solo trainer.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exerciseId]
 *             properties:
 *               exerciseId:
 *                 type: integer
 *                 description: ID dell'esercizio originale
 *               reason:
 *                 type: string
 *                 description: Motivo della sostituzione
 *               clientId:
 *                 type: integer
 *                 description: ID del cliente (opzionale)
 *     responses:
 *       200:
 *         description: Lista esercizi alternativi suggeriti
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/alternative-exercises', requireRole('tenant_owner', 'staff'), aiController.suggestAlternativeExercises.bind(aiController));

/**
 * @swagger
 * /ai/answer-question:
 *   post:
 *     tags: [AI]
 *     summary: Rispondi a domanda cliente
 *     description: Utilizza AI per generare una risposta a una domanda del cliente su fitness e allenamento.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question:
 *                 type: string
 *                 description: Domanda del cliente
 *               context:
 *                 type: string
 *                 description: Contesto aggiuntivo
 *     responses:
 *       200:
 *         description: Risposta generata dall'AI
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/answer-question', aiController.answerClientQuestion.bind(aiController));

/**
 * @swagger
 * /ai/meal-plan:
 *   post:
 *     tags: [AI]
 *     summary: Genera bozza piano alimentare
 *     description: Utilizza AI per generare una bozza di piano alimentare personalizzato. Solo trainer.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId]
 *             properties:
 *               clientId:
 *                 type: integer
 *               goals:
 *                 type: string
 *               restrictions:
 *                 type: string
 *               calories:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Piano alimentare generato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/meal-plan', requireRole('tenant_owner', 'staff'), aiController.generateMealPlan.bind(aiController));

/**
 * @swagger
 * /ai/analyze-progress:
 *   post:
 *     tags: [AI]
 *     summary: Analisi progressi cliente
 *     description: Utilizza AI per analizzare i progressi di un cliente e fornire insights. Solo trainer.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId]
 *             properties:
 *               clientId:
 *                 type: integer
 *               period:
 *                 type: string
 *                 description: Periodo di analisi (es. 30d, 90d)
 *     responses:
 *       200:
 *         description: Analisi progressi generata
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/analyze-progress', requireRole('tenant_owner', 'staff'), aiController.analyzeProgress.bind(aiController));

/**
 * @swagger
 * /ai/suggest-workout:
 *   post:
 *     tags: [AI]
 *     summary: Suggerisci workout per readiness
 *     description: Utilizza AI per suggerire un workout basato sullo score di readiness del cliente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: integer
 *               readinessScore:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Workout suggerito
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/suggest-workout', aiController.suggestWorkout.bind(aiController));

module.exports = router;
