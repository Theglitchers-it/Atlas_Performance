/**
 * Chat Routes
 * Messaggistica real-time e conversazioni
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { verifyToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createConversationSchema, sendMessageSchema } = require('../validators/chat.validator');

// Tutte le routes richiedono autenticazione
router.use(verifyToken);

/**
 * @swagger
 * /chat/users:
 *   get:
 *     tags: [Chat]
 *     summary: Utenti disponibili per nuove conversazioni
 *     description: Restituisce la lista degli utenti con cui e possibile avviare una conversazione.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista utenti disponibili
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/users', chatController.getAvailableUsers.bind(chatController));

/**
 * @swagger
 * /chat/online-users:
 *   get:
 *     tags: [Chat]
 *     summary: Utenti attualmente online
 *     description: Restituisce la lista degli utenti connessi in tempo reale.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista utenti online
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/online-users', chatController.getOnlineUsers.bind(chatController));

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Lista conversazioni
 *     description: Restituisce tutte le conversazioni dell'utente corrente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista conversazioni
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/conversations', chatController.getConversations.bind(chatController));

/**
 * @swagger
 * /chat/conversations/{id}:
 *   get:
 *     tags: [Chat]
 *     summary: Dettaglio conversazione
 *     description: Restituisce i dettagli di una conversazione specifica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della conversazione
 *     responses:
 *       200:
 *         description: Dettaglio conversazione
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Conversazione non trovata
 *       500:
 *         description: Errore server
 */
router.get('/conversations/:id', chatController.getConversationById.bind(chatController));

/**
 * @swagger
 * /chat/conversations:
 *   post:
 *     tags: [Chat]
 *     summary: Crea nuova conversazione
 *     description: Avvia una nuova conversazione con uno o piu utenti.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [participantIds]
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: ID degli utenti partecipanti
 *               type:
 *                 type: string
 *                 enum: [direct, group]
 *     responses:
 *       201:
 *         description: Conversazione creata
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/conversations', validate(createConversationSchema), chatController.createConversation.bind(chatController));

/**
 * @swagger
 * /chat/conversations/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Messaggi di una conversazione
 *     description: Restituisce i messaggi di una conversazione con paginazione.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista messaggi
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Conversazione non trovata
 *       500:
 *         description: Errore server
 */
router.get('/conversations/:id/messages', chatController.getMessages.bind(chatController));

/**
 * @swagger
 * /chat/conversations/{id}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Invia messaggio
 *     description: Invia un nuovo messaggio in una conversazione.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Contenuto del messaggio
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *     responses:
 *       201:
 *         description: Messaggio inviato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Conversazione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/conversations/:id/messages', validate(sendMessageSchema), chatController.sendMessage.bind(chatController));

/**
 * @swagger
 * /chat/conversations/{id}/read:
 *   post:
 *     tags: [Chat]
 *     summary: Segna conversazione come letta
 *     description: Segna tutti i messaggi della conversazione come letti dall'utente corrente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conversazione segnata come letta
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Conversazione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/conversations/:id/read', chatController.markAsRead.bind(chatController));

/**
 * @swagger
 * /chat/conversations/{id}/mute:
 *   post:
 *     tags: [Chat]
 *     summary: Muta/Smuta conversazione
 *     description: Attiva o disattiva le notifiche per una conversazione.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stato mute aggiornato
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Conversazione non trovata
 *       500:
 *         description: Errore server
 */
router.post('/conversations/:id/mute', chatController.toggleMute.bind(chatController));

module.exports = router;
