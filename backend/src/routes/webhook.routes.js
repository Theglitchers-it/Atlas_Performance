/**
 * Webhook Routes
 * CRUD webhook subscriptions + delivery logs
 */

const express = require('express');
const router = express.Router();

const webhookService = require('../services/webhook.service');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Tutte le route richiedono autenticazione e ruolo tenant_owner
router.use(verifyToken);
router.use(requireRole('tenant_owner'));

/**
 * @swagger
 * /webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: Lista webhook del tenant
 *     description: Restituisce tutti i webhook registrati dal tenant. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista webhook
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/', async (req, res) => {
    try {
        const webhooks = await webhookService.list(req.user.tenantId);
        res.json({ success: true, data: webhooks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Registra nuovo webhook
 *     description: Registra un nuovo webhook per ricevere notifiche sugli eventi selezionati. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url, events]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL endpoint del webhook
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista eventi da sottoscrivere
 *     responses:
 *       201:
 *         description: Webhook creato con secret
 *       400:
 *         description: URL o eventi non validi
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.post('/', async (req, res) => {
    try {
        const { url, events } = req.body;

        if (!url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'URL e almeno un evento sono obbligatori'
            });
        }

        // Valida eventi
        const invalidEvents = events.filter(e => !webhookService.constructor.EVENTS.includes(e));
        if (invalidEvents.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Eventi non validi: ${invalidEvents.join(', ')}`,
                validEvents: webhookService.constructor.EVENTS
            });
        }

        const result = await webhookService.create(req.user.tenantId, { url, events });
        res.status(201).json({
            success: true,
            data: result,
            message: 'Webhook creato. Salva il secret, non sarà più visibile.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /webhooks/events:
 *   get:
 *     tags: [Webhooks]
 *     summary: Lista eventi disponibili
 *     description: Restituisce la lista degli eventi disponibili per la sottoscrizione dei webhook.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista eventi disponibili
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 */
router.get('/events', (req, res) => {
    res.json({ success: true, data: webhookService.constructor.EVENTS });
});

/**
 * @swagger
 * /webhooks/{id}:
 *   put:
 *     tags: [Webhooks]
 *     summary: Aggiorna webhook
 *     description: Aggiorna URL, eventi o stato di un webhook. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del webhook
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook aggiornato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Webhook non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', async (req, res) => {
    try {
        const { url, events, isActive } = req.body;
        await webhookService.update(req.params.id, req.user.tenantId, { url, events, isActive });
        res.json({ success: true, message: 'Webhook aggiornato' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Elimina webhook
 *     description: Elimina un webhook e le sue delivery. Solo tenant_owner.
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
 *         description: Webhook eliminato
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Webhook non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', async (req, res) => {
    try {
        await webhookService.delete(req.params.id, req.user.tenantId);
        res.json({ success: true, message: 'Webhook eliminato' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /webhooks/{id}/deliveries:
 *   get:
 *     tags: [Webhooks]
 *     summary: Log delivery webhook
 *     description: Restituisce i log delle delivery (tentativi di invio) di un webhook. Solo tenant_owner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Log delivery
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Webhook non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id/deliveries', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const deliveries = await webhookService.getDeliveries(req.params.id, req.user.tenantId, limit);
        res.json({ success: true, data: deliveries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
