/**
 * Admin Routes (Super Admin only)
 * Gestione piattaforma, tenant e fatturazione
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('ADMIN_ROUTES');
const { verifyToken, requireRole } = require('../middlewares/auth');

// Tutti gli endpoint richiedono autenticazione + ruolo super_admin
router.use(verifyToken);
router.use(requireRole('super_admin'));

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Statistiche globali piattaforma
 *     description: Restituisce statistiche aggregate della piattaforma (tenant, utenti, revenue). Solo super_admin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche globali
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato - richiede ruolo super_admin
 *       500:
 *         description: Errore server
 */
router.get('/stats', adminController.getStats);

/**
 * @swagger
 * /admin/tenants:
 *   get:
 *     tags: [Admin]
 *     summary: Lista tenant con filtri e paginazione
 *     description: Restituisce la lista di tutti i tenant della piattaforma con filtri e paginazione. Solo super_admin.
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtra per stato abbonamento
 *     responses:
 *       200:
 *         description: Lista tenant con paginazione
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/tenants', adminController.getTenants);

/**
 * @swagger
 * /admin/tenants/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Aggiorna stato abbonamento tenant
 *     description: Modifica lo stato dell'abbonamento di un tenant. Solo super_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del tenant
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
 *                 enum: [active, suspended, cancelled]
 *     responses:
 *       200:
 *         description: Stato aggiornato
 *       400:
 *         description: Stato non valido
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Tenant non trovato
 *       500:
 *         description: Errore server
 */
router.put('/tenants/:id/status', adminController.updateTenantStatus);

/**
 * @swagger
 * /admin/tenants/{id}/plan:
 *   put:
 *     tags: [Admin]
 *     summary: Aggiorna piano abbonamento tenant
 *     description: Modifica il piano di abbonamento di un tenant. Solo super_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del tenant
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
 *                 enum: [free, starter, professional, enterprise]
 *     responses:
 *       200:
 *         description: Piano aggiornato
 *       400:
 *         description: Piano non valido
 *       401:
 *         description: Non autenticato
 *       404:
 *         description: Tenant non trovato
 *       500:
 *         description: Errore server
 */
router.put('/tenants/:id/plan', adminController.updateTenantPlan);

/**
 * @swagger
 * /admin/invoices:
 *   get:
 *     tags: [Admin]
 *     summary: Lista fatture piattaforma
 *     description: Restituisce la lista di tutte le fatture della piattaforma. Solo super_admin.
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
 *         description: Lista fatture con paginazione
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/invoices', adminController.getInvoices);

/**
 * @swagger
 * /admin/billing/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Statistiche fatturazione
 *     description: Restituisce statistiche aggregate sulla fatturazione (MRR, churn, revenue). Solo super_admin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche fatturazione
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/billing/stats', adminController.getBillingStats);

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Audit log piattaforma
 *     description: Restituisce i log di audit della piattaforma con filtri e paginazione. Solo super_admin.
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
 *           default: 30
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtra per tipo di azione
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Ricerca per email o nome utente
 *     responses:
 *       200:
 *         description: Lista audit log con paginazione
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Accesso negato
 *       500:
 *         description: Errore server
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const safePage = Math.max(1, parseInt(req.query.page) || 1);
        const safeLimit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
        const offset = (safePage - 1) * safeLimit;
        const { action, search } = req.query;

        const conditions = [];
        const params = [];

        if (action) {
            conditions.push('al.action = ?');
            params.push(action);
        }
        if (search) {
            conditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const countResult = await query(
            `SELECT COUNT(*) AS total FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        const logs = await query(
            `SELECT al.*, u.email AS user_email, CONCAT(u.first_name, ' ', u.last_name) AS user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, safeLimit, offset]
        );

        res.json({
            success: true,
            data: {
                logs,
                pagination: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) }
            }
        });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
            return res.json({ success: true, data: { logs: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 0 } } });
        }
        logger.error('Error getting audit logs', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nel recupero audit log' });
    }
});

module.exports = router;
