/**
 * Title Routes
 * Titoli gamification e badge
 */

const express = require('express');
const router = express.Router();
const titleController = require('../controllers/title.controller');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Tutte le routes richiedono autenticazione
router.use(verifyToken);

// === Client & Trainer: lettura titoli ===

/**
 * @swagger
 * /titles:
 *   get:
 *     tags: [Titles]
 *     summary: Lista titoli utente
 *     description: Restituisce tutti i titoli sbloccati e disponibili per l'utente corrente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista titoli
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/', titleController.getTitles.bind(titleController));

/**
 * @swagger
 * /titles/displayed:
 *   get:
 *     tags: [Titles]
 *     summary: Titolo attualmente visualizzato
 *     description: Restituisce il titolo attualmente visualizzato nel profilo dell'utente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Titolo visualizzato
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.get('/displayed', titleController.getDisplayedTitle.bind(titleController));

/**
 * @swagger
 * /titles/displayed:
 *   put:
 *     tags: [Titles]
 *     summary: Imposta titolo visualizzato
 *     description: Imposta quale titolo visualizzare nel profilo dell'utente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titleId]
 *             properties:
 *               titleId:
 *                 type: integer
 *                 description: ID del titolo da visualizzare
 *     responses:
 *       200:
 *         description: Titolo impostato
 *       400:
 *         description: Titolo non sbloccato
 *       401:
 *         description: Non autenticato
 *       500:
 *         description: Errore server
 */
router.put('/displayed', titleController.setDisplayedTitle.bind(titleController));

// === Trainer: gestione titoli custom (CRUD) ===
// NOTA: queste routes devono stare PRIMA di /:id per evitare conflitto

/**
 * @swagger
 * /titles/manage:
 *   get:
 *     tags: [Titles]
 *     summary: Lista titoli gestibili
 *     description: Restituisce i titoli creati dal trainer per la gestione. Solo tenant_owner e staff.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista titoli gestibili
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/manage', requireRole('tenant_owner', 'staff'), titleController.getManageableTitles.bind(titleController));

/**
 * @swagger
 * /titles/manage:
 *   post:
 *     tags: [Titles]
 *     summary: Crea titolo custom
 *     description: Crea un nuovo titolo personalizzato. Solo tenant_owner e staff.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, condition_type, condition_value]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               color:
 *                 type: string
 *               condition_type:
 *                 type: string
 *               condition_value:
 *                 type: number
 *               rarity:
 *                 type: string
 *                 enum: [common, rare, epic, legendary]
 *     responses:
 *       201:
 *         description: Titolo creato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/manage', requireRole('tenant_owner', 'staff'), titleController.createTitle.bind(titleController));

/**
 * @swagger
 * /titles/manage/{id}:
 *   put:
 *     tags: [Titles]
 *     summary: Aggiorna titolo custom
 *     description: Aggiorna un titolo personalizzato. Solo tenant_owner e staff.
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               color:
 *                 type: string
 *               condition_type:
 *                 type: string
 *               condition_value:
 *                 type: number
 *               rarity:
 *                 type: string
 *                 enum: [common, rare, epic, legendary]
 *     responses:
 *       200:
 *         description: Titolo aggiornato
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Titolo non trovato
 *       500:
 *         description: Errore server
 */
router.put('/manage/:id', requireRole('tenant_owner', 'staff'), titleController.updateTitle.bind(titleController));

/**
 * @swagger
 * /titles/manage/{id}:
 *   delete:
 *     tags: [Titles]
 *     summary: Elimina titolo custom
 *     description: Elimina un titolo personalizzato. Solo tenant_owner e staff.
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
 *         description: Titolo eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Titolo non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/manage/:id', requireRole('tenant_owner', 'staff'), titleController.deleteTitle.bind(titleController));

// === Dettaglio titolo (deve stare dopo /manage) ===

/**
 * @swagger
 * /titles/{id}:
 *   get:
 *     tags: [Titles]
 *     summary: Dettaglio titolo
 *     description: Restituisce i dettagli completi di un titolo specifico.
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
 *         description: Dettaglio titolo
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Titolo non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', titleController.getTitleById.bind(titleController));

module.exports = router;
