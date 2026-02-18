/**
 * Client Routes
 * Endpoint per gestione clienti
 */

const express = require('express');
const router = express.Router();

const clientController = require('../controllers/client.controller');
const { validate } = require('../middlewares/validate');
const { verifyToken, requireRole } = require('../middlewares/auth');
const {
    createClientSchema,
    updateClientSchema,
    addGoalSchema,
    addInjurySchema
} = require('../validators/client.validator');

// Tutte le route richiedono autenticazione
router.use(verifyToken);

/**
 * @swagger
 * /clients/me:
 *   get:
 *     tags: [Clients]
 *     summary: Profilo del client corrente
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profilo client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       401:
 *         description: Non autenticato
 */
router.get('/me', requireRole('client'), clientController.getMyProfile);

/**
 * @swagger
 * /clients:
 *   get:
 *     tags: [Clients]
 *     summary: Lista clienti con paginazione
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Ricerca per nome o email
 *     responses:
 *       200:
 *         description: Lista clienti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.getAll);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     tags: [Clients]
 *     summary: Dettaglio cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Dettaglio cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       404:
 *         description: Cliente non trovato
 */
router.get('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.getById);

/**
 * @swagger
 * /clients:
 *   post:
 *     tags: [Clients]
 *     summary: Crea nuovo cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente creato
 *       400:
 *         description: Dati non validi
 */
router.post('/', requireRole('tenant_owner', 'staff', 'super_admin'), validate(createClientSchema), clientController.create);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     tags: [Clients]
 *     summary: Aggiorna cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente aggiornato
 *       404:
 *         description: Cliente non trovato
 */
router.put('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), validate(updateClientSchema), clientController.update);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     tags: [Clients]
 *     summary: Elimina cliente
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
 *         description: Cliente eliminato
 *       404:
 *         description: Cliente non trovato
 */
router.delete('/:id', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.delete);

/**
 * @swagger
 * /clients/{id}/stats:
 *   get:
 *     tags: [Clients]
 *     summary: Statistiche cliente
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
 *         description: Statistiche del cliente
 *       404:
 *         description: Cliente non trovato
 */
router.get('/:id/stats', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.getStats);

/**
 * @swagger
 * /clients/{id}/goals:
 *   post:
 *     tags: [Clients]
 *     summary: Aggiungi obiettivo al cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description:
 *                 type: string
 *               targetDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Obiettivo aggiunto
 *       404:
 *         description: Cliente non trovato
 */
router.post('/:id/goals', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addGoalSchema), clientController.addGoal);

/**
 * @swagger
 * /clients/{id}/injuries:
 *   post:
 *     tags: [Clients]
 *     summary: Aggiungi infortunio al cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [active, recovered]
 *     responses:
 *       201:
 *         description: Infortunio aggiunto
 *       404:
 *         description: Cliente non trovato
 */
router.post('/:id/injuries', requireRole('tenant_owner', 'staff', 'super_admin'), validate(addInjurySchema), clientController.addInjury);

/**
 * @swagger
 * /clients/{id}/xp:
 *   post:
 *     tags: [Clients]
 *     summary: Aggiungi XP al cliente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: XP aggiunto
 *       404:
 *         description: Cliente non trovato
 */
router.post('/:id/xp', requireRole('tenant_owner', 'staff', 'super_admin'), clientController.addXP);

module.exports = router;
