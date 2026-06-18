/**
 * User Routes
 * Endpoint per gestione utenti
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const userController = require('../controllers/user.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken, requireRole, requireTenantOwner } = require('../middlewares/auth');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');
const { uploadAvatar, handleUploadError } = require('../middlewares/upload');

// Rate limit on file upload (5 uploads / 1 min per IP)
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Troppi upload, riprova tra un minuto'
    }
});

// Rate limit follow/unfollow (30 azioni / 1 min) per ridurre abuso/flood follower-bombing
const followLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        message: 'Troppe richieste di follow, riprova tra un minuto'
    }
});

// Tutte le route richiedono autenticazione
router.use(verifyToken);

// ===== /me routes (PRIMA di /:id per evitare conflitti) =====

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Upload avatar utente corrente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar aggiornato
 */
router.post('/me/avatar', uploadLimiter, uploadAvatar.single('avatar'), handleUploadError, userController.uploadMyAvatar);

/**
 * @swagger
 * /users/me/business:
 *   get:
 *     tags: [Users]
 *     summary: Info business del tenant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Info business
 */
router.get('/me/business', userController.getBusinessInfo);

/**
 * @swagger
 * /users/me/business:
 *   put:
 *     tags: [Users]
 *     summary: Aggiorna info business
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Info aggiornate
 */
router.put('/me/business', userController.updateBusinessInfo);

/**
 * @swagger
 * /users/me/profile:
 *   put:
 *     tags: [Users]
 *     summary: Aggiorna il proprio profilo pubblico (Community)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               bio: { type: string, nullable: true }
 *               city: { type: string, nullable: true }
 *     responses:
 *       200: { description: Profilo aggiornato }
 */
router.put('/me/profile', userController.updateMyProfile);

// ===== Public profile + Follow (per Community) =====

/**
 * @swagger
 * /users/{id}/profile:
 *   get:
 *     tags: [Users]
 *     summary: Profilo pubblico (Community) tenant-scoped
 *     description: Restituisce avatar, bio, città, role, stats (post/follower/following) e isFollowing per il viewer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200: { description: Profilo pubblico }
 *       404: { description: Utente non trovato nel tenant }
 */
router.get('/:id/profile', userController.getPublicProfile);

/**
 * @swagger
 * /users/{id}/follow:
 *   post:
 *     tags: [Users]
 *     summary: Segui utente (idempotente)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201: { description: Follow creato }
 *       400: { description: Non puoi seguire te stesso }
 *       404: { description: Utente non trovato }
 *   delete:
 *     tags: [Users]
 *     summary: Smetti di seguire (idempotente)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Unfollow ok }
 */
router.post('/:id/follow', followLimiter, userController.followUser);
router.delete('/:id/follow', followLimiter, userController.unfollowUser);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lista utenti
 *     description: Restituisce la lista degli utenti del tenant. Solo trainer e admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [tenant_owner, staff, client]
 *         description: Filtra per ruolo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Ricerca per nome o email
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
 *         description: Lista utenti
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/', requireRole('tenant_owner', 'staff', 'super_admin'), userController.getAll);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Dettaglio utente
 *     description: Restituisce i dettagli di un utente specifico. Solo trainer e admin.
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
 *         description: Dettaglio utente
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), userController.getById);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Crea utente
 *     description: Crea un nuovo utente nel tenant. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff, client]
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: Utente creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       409:
 *         description: Email gia in uso
 *       500:
 *         description: Errore server
 */
router.post('/', requireTenantOwner, validate(createUserSchema), userController.create);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Aggiorna utente
 *     description: Aggiorna i dati di un utente. Solo tenant_owner.
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff, client]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Utente aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', requireTenantOwner, validate(updateUserSchema), userController.update);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Elimina utente
 *     description: Elimina un utente dal tenant. Solo tenant_owner.
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
 *         description: Utente eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', requireTenantOwner, userController.delete);

/**
 * @swagger
 * /users/{id}/avatar:
 *   put:
 *     tags: [Users]
 *     summary: Aggiorna avatar utente
 *     description: Aggiorna l'immagine avatar di un utente.
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
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL dell'immagine avatar
 *     responses:
 *       200:
 *         description: Avatar aggiornato
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id/avatar', userController.updateAvatar);

module.exports = router;
