/**
 * API Key Routes
 * Endpoint per gestione API keys
 */

const express = require('express');
const router = express.Router();

const apiKeyController = require('../controllers/apiKey.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Tutte le route richiedono autenticazione e ruolo tenant_owner
router.use(verifyToken);
router.use(requireRole('tenant_owner'));

/**
 * @swagger
 * /api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Genera una nuova API key
 *     description: Crea una nuova API key per il tenant. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome descrittivo della API key
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista permessi associati
 *     responses:
 *       201:
 *         description: API key generata con successo
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/', apiKeyController.generate);

/**
 * @swagger
 * /api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: Lista tutte le API keys del tenant
 *     description: Restituisce tutte le API keys create dal tenant. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista API keys
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/', apiKeyController.list);

/**
 * @swagger
 * /api-keys/usage:
 *   get:
 *     tags: [API Keys]
 *     summary: Statistiche di utilizzo API keys
 *     description: Restituisce le statistiche di utilizzo delle API keys del tenant.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche utilizzo
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/usage', apiKeyController.getUsageStats);

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoca una API key
 *     description: Revoca (disabilita) una API key specifica. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della API key
 *     responses:
 *       200:
 *         description: API key revocata
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: API key non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/:id', apiKeyController.revoke);

/**
 * @swagger
 * /api-keys/validate:
 *   post:
 *     tags: [API Keys]
 *     summary: Valida una API key
 *     description: Verifica se una API key e valida e restituisce le informazioni associate.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apiKey, apiSecret]
 *             properties:
 *               apiKey:
 *                 type: string
 *               apiSecret:
 *                 type: string
 *     responses:
 *       200:
 *         description: API key valida
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: API key non valida
 *       500:
 *         description: Errore server
 */
router.post('/validate', apiKeyController.validate);

module.exports = router;
