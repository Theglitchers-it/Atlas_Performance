const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamification.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { addBonusXPSchema, createChallengeSchema } = require('../validators/gamification.validator');

// Tutte le routes richiedono autenticazione
router.use(verifyToken);

// Dashboard

/**
 * @swagger
 * /gamification/dashboard:
 *   get:
 *     tags: [Gamification]
 *     summary: Dashboard gamification utente
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dati dashboard (livello, XP, achievements, streak)
 */
router.get('/dashboard', gamificationController.getDashboard.bind(gamificationController));

// Achievements

/**
 * @swagger
 * /gamification/achievements:
 *   get:
 *     tags: [Gamification]
 *     summary: Lista tutti gli achievements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista achievements con stato di completamento
 */
router.get('/achievements', gamificationController.getAchievements.bind(gamificationController));

/**
 * @swagger
 * /gamification/achievements/categories:
 *   get:
 *     tags: [Gamification]
 *     summary: Achievements raggruppati per categoria
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievements organizzati per categoria
 */
router.get('/achievements/categories', gamificationController.getAchievementsByCategory.bind(gamificationController));

/**
 * @swagger
 * /gamification/achievements/recent:
 *   get:
 *     tags: [Gamification]
 *     summary: Achievements recenti sbloccati
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista ultimi achievements sbloccati
 */
router.get('/achievements/recent', gamificationController.getRecentAchievements.bind(gamificationController));

// XP

/**
 * @swagger
 * /gamification/xp/recent:
 *   get:
 *     tags: [Gamification]
 *     summary: Attivita XP recenti
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista attivita XP recenti
 */
router.get('/xp/recent', gamificationController.getRecentXPActivity.bind(gamificationController));

/**
 * @swagger
 * /gamification/xp/history:
 *   get:
 *     tags: [Gamification]
 *     summary: Storico XP
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storico completo XP
 */
router.get('/xp/history', gamificationController.getXPHistory.bind(gamificationController));

/**
 * @swagger
 * /gamification/xp/bonus:
 *   post:
 *     tags: [Gamification]
 *     summary: Assegna XP bonus a un cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, amount, reason]
 *             properties:
 *               clientId:
 *                 type: string
 *               amount:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: XP bonus assegnato
 *       400:
 *         description: Dati non validi
 */
router.post('/xp/bonus', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addBonusXPSchema), gamificationController.addBonusXP.bind(gamificationController));

// Leaderboard

/**
 * @swagger
 * /gamification/leaderboard:
 *   get:
 *     tags: [Gamification]
 *     summary: Classifica utenti per XP
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, allTime]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Classifica utenti
 */
router.get('/leaderboard', gamificationController.getLeaderboard.bind(gamificationController));

// Challenges

/**
 * @swagger
 * /gamification/challenges:
 *   get:
 *     tags: [Gamification]
 *     summary: Lista sfide disponibili
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista sfide
 */
router.get('/challenges', gamificationController.getChallenges.bind(gamificationController));

/**
 * @swagger
 * /gamification/challenges/active:
 *   get:
 *     tags: [Gamification]
 *     summary: Anteprima sfide attive
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sfide attualmente in corso
 */
router.get('/challenges/active', gamificationController.getActiveChallengesPreview.bind(gamificationController));

/**
 * @swagger
 * /gamification/challenges/{id}:
 *   get:
 *     tags: [Gamification]
 *     summary: Dettaglio sfida
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
 *         description: Dettaglio sfida con partecipanti e progresso
 *       404:
 *         description: Sfida non trovata
 */
router.get('/challenges/:id', gamificationController.getChallengeById.bind(gamificationController));

/**
 * @swagger
 * /gamification/challenges:
 *   post:
 *     tags: [Gamification]
 *     summary: Crea nuova sfida
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, target, startDate, endDate]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               target:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               xpReward:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Sfida creata
 *       400:
 *         description: Dati non validi
 */
router.post('/challenges', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createChallengeSchema), gamificationController.createChallenge.bind(gamificationController));

/**
 * @swagger
 * /gamification/challenges/{id}/join:
 *   post:
 *     tags: [Gamification]
 *     summary: Partecipa a una sfida
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
 *         description: Iscrizione alla sfida avvenuta
 *       404:
 *         description: Sfida non trovata
 *       409:
 *         description: Gia iscritto alla sfida
 */
router.post('/challenges/:id/join', gamificationController.joinChallenge.bind(gamificationController));

/**
 * @swagger
 * /gamification/challenges/{id}/withdraw:
 *   post:
 *     tags: [Gamification]
 *     summary: Ritirati da una sfida
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
 *         description: Ritiro dalla sfida avvenuto
 *       404:
 *         description: Sfida non trovata
 */
router.post('/challenges/:id/withdraw', gamificationController.withdrawFromChallenge.bind(gamificationController));

module.exports = router;
