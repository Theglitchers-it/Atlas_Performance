/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const webpushService = require('../services/webpush.service');
const { verifyToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { registerDeviceTokenSchema, updatePreferencesSchema } = require('../validators/notification.validator');

/**
 * @swagger
 * /notifications/vapid-key:
 *   get:
 *     tags: [Notifications]
 *     summary: Ottieni VAPID public key per web push
 *     responses:
 *       200:
 *         description: VAPID public key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     publicKey:
 *                       type: string
 */
router.get('/vapid-key', (req, res) => {
    const publicKey = webpushService.getPublicKey();
    res.json({ success: true, data: { publicKey } });
});

router.use(verifyToken);

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Lista notifiche utente
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Lista notifiche con paginazione
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', notificationController.getNotifications.bind(notificationController));

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Conta notifiche non lette
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Numero notifiche non lette
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 */
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Segna tutte le notifiche come lette
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutte le notifiche segnate come lette
 */
router.put('/read-all', notificationController.markAllAsRead.bind(notificationController));

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Segna notifica come letta
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
 *         description: Notifica segnata come letta
 *       404:
 *         description: Notifica non trovata
 */
router.put('/:id/read', notificationController.markAsRead.bind(notificationController));

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Elimina notifica
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
 *         description: Notifica eliminata
 *       404:
 *         description: Notifica non trovata
 */
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

/**
 * @swagger
 * /notifications/device-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Registra device token per push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [web, android, ios]
 *     responses:
 *       200:
 *         description: Device registrato
 *       400:
 *         description: Token non valido
 */
router.post('/device-token', validate(registerDeviceTokenSchema), notificationController.registerDeviceToken.bind(notificationController));

/**
 * @swagger
 * /notifications/device-token:
 *   delete:
 *     tags: [Notifications]
 *     summary: Rimuovi device token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Device rimosso
 */
router.delete('/device-token', notificationController.removeDeviceToken.bind(notificationController));

/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Preferenze notifiche utente
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferenze notifiche
 */
router.get('/preferences', notificationController.getPreferences.bind(notificationController));

/**
 * @swagger
 * /notifications/preferences:
 *   put:
 *     tags: [Notifications]
 *     summary: Aggiorna preferenze notifiche
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *               push:
 *                 type: boolean
 *               sms:
 *                 type: boolean
 *               types:
 *                 type: object
 *                 description: Preferenze per tipo di notifica
 *     responses:
 *       200:
 *         description: Preferenze aggiornate
 *       400:
 *         description: Dati non validi
 */
router.put('/preferences', validate(updatePreferencesSchema), notificationController.updatePreferences.bind(notificationController));

module.exports = router;
