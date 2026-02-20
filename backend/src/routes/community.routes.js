/**
 * Community Routes
 * Endpoint per post, commenti e like
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const communityController = require('../controllers/community.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createPostSchema, updatePostSchema, addCommentSchema } = require('../validators/community.validator');
const { uploadImage, handleUploadError } = require('../middlewares/upload');

// Rate limit on community post creation with image (5 posts / 1 min per IP)
const postUploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Troppi post, riprova tra un minuto'
    }
});

// Tutte le route richiedono autenticazione
router.use(verifyToken);

/**
 * @swagger
 * /community/posts:
 *   get:
 *     tags: [Community]
 *     summary: Feed post community
 *     description: Restituisce il feed dei post della community con paginazione.
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
 *         description: Feed post
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/posts', communityController.getPosts);

/**
 * @swagger
 * /community/posts/{id}:
 *   get:
 *     tags: [Community]
 *     summary: Dettaglio post con commenti
 *     description: Restituisce il dettaglio di un post con tutti i commenti.
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
 *         description: Dettaglio post
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.get('/posts/:id', communityController.getPostById);

/**
 * @swagger
 * /community/posts:
 *   post:
 *     tags: [Community]
 *     summary: Crea post
 *     description: Crea un nuovo post nella community con upload immagine opzionale.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [post, announcement, achievement]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.post('/posts', postUploadLimiter, uploadImage.single('image'), handleUploadError, validate(createPostSchema), communityController.createPost);

/**
 * @swagger
 * /community/posts/{id}:
 *   put:
 *     tags: [Community]
 *     summary: Aggiorna post
 *     description: Aggiorna un post esistente. Solo l'autore puo modificarlo.
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
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Non autorizzato a modificare
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.put('/posts/:id', validate(updatePostSchema), communityController.updatePost);

/**
 * @swagger
 * /community/posts/{id}:
 *   delete:
 *     tags: [Community]
 *     summary: Elimina post
 *     description: Elimina un post dalla community. Solo trainer e admin.
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
 *         description: Post eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/posts/:id', requireRole('tenant_owner', 'staff', 'super_admin'), communityController.deletePost);

/**
 * @swagger
 * /community/posts/{id}/pin:
 *   put:
 *     tags: [Community]
 *     summary: Pin/Unpin post
 *     description: Fissa o rimuove un post dalla cima del feed. Solo trainer e admin.
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
 *         description: Stato pin aggiornato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.put('/posts/:id/pin', requireRole('tenant_owner', 'staff', 'super_admin'), communityController.togglePin);

/**
 * @swagger
 * /community/posts/{id}/like:
 *   post:
 *     tags: [Community]
 *     summary: Like a un post
 *     description: Aggiunge un like al post specificato.
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
 *         description: Like aggiunto
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.post('/posts/:id/like', communityController.likePost);

/**
 * @swagger
 * /community/posts/{id}/like:
 *   delete:
 *     tags: [Community]
 *     summary: Rimuovi like da un post
 *     description: Rimuove il like dal post specificato.
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
 *         description: Like rimosso
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/posts/:id/like', communityController.unlikePost);

/**
 * @swagger
 * /community/posts/{id}/comments:
 *   post:
 *     tags: [Community]
 *     summary: Aggiungi commento a un post
 *     description: Aggiunge un commento al post specificato.
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
 *     responses:
 *       201:
 *         description: Commento aggiunto
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Post non trovato
 *       500:
 *         description: Errore server
 */
router.post('/posts/:id/comments', validate(addCommentSchema), communityController.addComment);

/**
 * @swagger
 * /community/comments/{commentId}:
 *   delete:
 *     tags: [Community]
 *     summary: Elimina commento
 *     description: Elimina un commento specifico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commento eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Commento non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/comments/:commentId', communityController.deleteComment);

module.exports = router;
