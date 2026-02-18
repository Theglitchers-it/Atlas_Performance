/**
 * Referral Routes
 * Endpoint per programma referral
 */

const express = require('express');
const router = express.Router();

const referralController = require('../controllers/referral.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Tutte le route richiedono autenticazione
router.use(verifyToken);

/**
 * @swagger
 * /referrals/codes:
 *   post:
 *     tags: [Referrals]
 *     summary: Genera codice referral
 *     description: Genera un nuovo codice referral per l'utente corrente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Codice referral generato
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/codes', referralController.generateCode);

/**
 * @swagger
 * /referrals/apply:
 *   post:
 *     tags: [Referrals]
 *     summary: Applica codice referral
 *     description: Applica un codice referral per ottenere i benefici associati.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Codice referral da applicare
 *     responses:
 *       200:
 *         description: Codice applicato con successo
 *       400:
 *         description: Codice non valido o gia utilizzato
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/apply', referralController.applyCode);

/**
 * @swagger
 * /referrals/stats:
 *   get:
 *     tags: [Referrals]
 *     summary: Statistiche referral personali
 *     description: Restituisce le statistiche del programma referral dell'utente corrente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche referral
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/stats', referralController.getStats);

/**
 * @swagger
 * /referrals/codes:
 *   get:
 *     tags: [Referrals]
 *     summary: Lista codici referral
 *     description: Restituisce tutti i codici referral dell'utente corrente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista codici referral
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/codes', referralController.listCodes);

/**
 * @swagger
 * /referrals/conversions:
 *   get:
 *     tags: [Referrals]
 *     summary: Lista conversioni referral
 *     description: Restituisce tutte le conversioni generate dai codici referral dell'utente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista conversioni
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/conversions', referralController.listConversions);

/**
 * @swagger
 * /referrals/conversions/{id}/complete:
 *   put:
 *     tags: [Referrals]
 *     summary: Completa conversione referral
 *     description: Segna una conversione referral come completata. Solo tenant_owner e super_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della conversione
 *     responses:
 *       200:
 *         description: Conversione completata
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Conversione non trovata
 *       500:
 *         description: Errore server
 */
router.put('/conversions/:id/complete', requireRole('tenant_owner', 'super_admin'), referralController.completeConversion);

module.exports = router;
