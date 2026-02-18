/**
 * User Routes
 * Endpoint per gestione utenti
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken, requireRole, requireTenantOwner } = require('../middlewares/auth');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');
const { uploadAvatar, handleUploadError } = require('../middlewares/upload');

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
router.post('/me/avatar', uploadAvatar.single('avatar'), handleUploadError, userController.uploadMyAvatar);

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
