/**
 * Auth Routes
 * Endpoint per autenticazione
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const oauthController = require('../controllers/oauth.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken } = require('../middlewares/auth');
const {
    registerSchema,
    loginSchema
} = require('../validators/auth.validator');

// Public routes

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrazione nuovo utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registrazione riuscita
 *       400:
 *         description: Dati non validi
 *       409:
 *         description: Email gia in uso
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login riuscito
 *       401:
 *         description: Credenziali non valide
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Rinnova access token tramite refresh token (cookie httpOnly)
 *     responses:
 *       200:
 *         description: Token rinnovato con successo
 *       401:
 *         description: Refresh token non valido o scaduto
 */
router.post('/refresh-token', authController.refreshToken); // refresh token viene dal cookie httpOnly

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout utente
 *     responses:
 *       200:
 *         description: Logout effettuato
 */
router.post('/logout', authController.logout);

// OAuth routes

/**
 * @swagger
 * /auth/oauth/{provider}:
 *   get:
 *     tags: [Auth]
 *     summary: Ottieni URL di autorizzazione OAuth
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, facebook]
 *         description: Provider OAuth
 *     responses:
 *       200:
 *         description: URL di autorizzazione
 *       400:
 *         description: Provider non supportato
 */
router.get('/oauth/:provider', oauthController.getAuthUrl.bind(oauthController));

/**
 * @swagger
 * /auth/oauth/{provider}/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Callback OAuth dal provider
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Codice di autorizzazione
 *     responses:
 *       302:
 *         description: Redirect al frontend con token
 *       400:
 *         description: Errore di autenticazione
 */
router.get('/oauth/:provider/callback', oauthController.handleCallback.bind(oauthController));

// Protected routes

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Ottieni profilo utente corrente
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dati profilo utente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non autenticato
 */
router.get('/me', verifyToken, authController.me);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Logout da tutti i dispositivi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout da tutti i dispositivi effettuato
 *       401:
 *         description: Non autenticato
 */
router.post('/logout-all', verifyToken, authController.logoutAll);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Cambia password utente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password cambiata con successo
 *       400:
 *         description: Password corrente errata
 *       401:
 *         description: Non autenticato
 */
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
