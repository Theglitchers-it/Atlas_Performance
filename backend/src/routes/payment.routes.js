/**
 * Payment Routes
 */

const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const stripeService = require('../services/stripe.service');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('PAYMENT_ROUTES');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createPaymentSchema, updatePaymentStatusSchema, createSubscriptionSchema, stripeCheckoutSchema } = require('../validators/payment.validator');

// ============================================
// STRIPE WEBHOOK (deve essere PRIMA di verifyToken, body raw)
// ============================================

/**
 * @swagger
 * /payments/stripe/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Webhook Stripe per eventi di pagamento
 *     description: Endpoint chiamato da Stripe per notificare eventi. Richiede signature header.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook elaborato
 *       400:
 *         description: Firma non valida
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        const result = await stripeService.handleWebhook(req.body, signature);
        res.json(result);
    } catch (error) {
        logger.error('Stripe Webhook error', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

router.use(verifyToken);

// ============================================
// STATISTICHE (prima delle route parametriche)
// ============================================

/**
 * @swagger
 * /payments/stats:
 *   get:
 *     tags: [Payments]
 *     summary: Statistiche pagamenti
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche pagamenti (totale, media, trend)
 */
router.get('/stats', requireRole('tenant_owner', 'staff'), paymentController.getPaymentStats.bind(paymentController));

/**
 * @swagger
 * /payments/revenue-history:
 *   get:
 *     tags: [Payments]
 *     summary: Storico revenue nel tempo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Dati storico revenue per grafico
 */
router.get('/revenue-history', requireRole('tenant_owner', 'staff'), paymentController.getRevenueHistory.bind(paymentController));

/**
 * @swagger
 * /payments/expiring:
 *   get:
 *     tags: [Payments]
 *     summary: Abbonamenti in scadenza
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista abbonamenti prossimi alla scadenza
 */
router.get('/expiring', requireRole('tenant_owner', 'staff'), paymentController.getExpiringSubscriptions.bind(paymentController));

// ============================================
// ABBONAMENTI
// ============================================

/**
 * @swagger
 * /payments/subscriptions:
 *   get:
 *     tags: [Payments]
 *     summary: Lista abbonamenti
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista abbonamenti attivi e passati
 */
router.get('/subscriptions', requireRole('tenant_owner', 'staff'), paymentController.getSubscriptions.bind(paymentController));

/**
 * @swagger
 * /payments/subscriptions:
 *   post:
 *     tags: [Payments]
 *     summary: Crea nuovo abbonamento
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, planType, amount]
 *             properties:
 *               clientId:
 *                 type: string
 *               planType:
 *                 type: string
 *               amount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Abbonamento creato
 *       400:
 *         description: Dati non validi
 */
router.post('/subscriptions', requireRole('tenant_owner', 'staff'), validate(createSubscriptionSchema), paymentController.createSubscription.bind(paymentController));

/**
 * @swagger
 * /payments/subscriptions/{id}/status:
 *   put:
 *     tags: [Payments]
 *     summary: Aggiorna stato abbonamento
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, paused, cancelled, expired]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 *       404:
 *         description: Abbonamento non trovato
 */
router.put('/subscriptions/:id/status', requireRole('tenant_owner', 'staff'), paymentController.updateSubscriptionStatus.bind(paymentController));

/**
 * @swagger
 * /payments/subscriptions/{id}/cancel:
 *   put:
 *     tags: [Payments]
 *     summary: Annulla abbonamento
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
 *         description: Abbonamento annullato
 *       404:
 *         description: Abbonamento non trovato
 */
router.put('/subscriptions/:id/cancel', requireRole('tenant_owner', 'staff'), paymentController.cancelSubscription.bind(paymentController));

// ============================================
// FATTURE (prima delle route parametriche)
// ============================================

/**
 * @swagger
 * /payments/invoices:
 *   get:
 *     tags: [Payments]
 *     summary: Fatture piattaforma
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista fatture
 */
router.get('/invoices', requireRole('tenant_owner'), paymentController.getInvoices.bind(paymentController));

// ============================================
// PAGAMENTI
// ============================================

/**
 * @swagger
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: Lista pagamenti
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
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *     responses:
 *       200:
 *         description: Lista pagamenti con paginazione
 */
router.get('/', requireRole('tenant_owner', 'staff'), paymentController.getPayments.bind(paymentController));

/**
 * @swagger
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Registra pagamento manuale
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, amount, method]
 *             properties:
 *               clientId:
 *                 type: string
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *                 enum: [cash, card, transfer, stripe]
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Pagamento registrato
 *       400:
 *         description: Dati non validi
 */
router.post('/', requireRole('tenant_owner', 'staff'), validate(createPaymentSchema), paymentController.createPayment.bind(paymentController));

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Dettaglio pagamento
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
 *         description: Dettaglio pagamento
 *       404:
 *         description: Pagamento non trovato
 */
router.get('/:id', requireRole('tenant_owner', 'staff'), paymentController.getPaymentById.bind(paymentController));

/**
 * @swagger
 * /payments/{id}/status:
 *   put:
 *     tags: [Payments]
 *     summary: Aggiorna stato pagamento
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, refunded]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 *       404:
 *         description: Pagamento non trovato
 */
router.put('/:id/status', requireRole('tenant_owner', 'staff'), validate(updatePaymentStatusSchema), paymentController.updatePaymentStatus.bind(paymentController));

// ============================================
// STRIPE CHECKOUT
// ============================================

/**
 * @swagger
 * /payments/stripe/plan-upgrade:
 *   post:
 *     tags: [Payments]
 *     summary: Crea checkout session Stripe per upgrade piano
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [starter, professional, enterprise]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 default: monthly
 *               successUrl:
 *                 type: string
 *               cancelUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session creata con URL
 *       400:
 *         description: Piano non valido
 */
router.post('/stripe/plan-upgrade', requireRole('tenant_owner', 'client'), async (req, res) => {
    try {
        const { plan, billingCycle, successUrl, cancelUrl } = req.body;
        const validPlans = ['starter', 'professional', 'enterprise'];
        if (!plan || !validPlans.includes(plan)) {
            return res.status(400).json({ success: false, message: 'Piano non valido' });
        }
        const result = await stripeService.createPlanCheckoutSession({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            plan,
            billingCycle: billingCycle || 'monthly',
            successUrl,
            cancelUrl
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /payments/stripe/checkout:
 *   post:
 *     tags: [Payments]
 *     summary: Crea checkout session Stripe per pagamento
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemType, itemId]
 *             properties:
 *               itemType:
 *                 type: string
 *               itemId:
 *                 type: string
 *               successUrl:
 *                 type: string
 *               cancelUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session creata con URL
 *       400:
 *         description: Dati non validi
 */
router.post('/stripe/checkout', async (req, res) => {
    try {
        const { error } = stripeCheckoutSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });
        const { itemType, itemId, successUrl, cancelUrl } = req.body;
        const result = await stripeService.createCheckoutSession({
            tenantId: req.user.tenantId,
            userId: req.user.id,
            itemType,
            itemId,
            successUrl,
            cancelUrl
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
