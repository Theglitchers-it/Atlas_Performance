/**
 * Admin Controller
 * Gestione pannello Super Admin
 */

const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('ADMIN');

/**
 * Log admin action to audit_logs table for accountability and compliance.
 */
const logAdminAction = async (req, action, resourceType, resourceId, details = null) => {
    try {
        await query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                req.user.id,
                action,
                resourceType,
                String(resourceId),
                details ? JSON.stringify(details) : null,
                req.ip || req.headers['x-forwarded-for'] || 'unknown',
                (req.headers['user-agent'] || '').substring(0, 255)
            ]
        );
    } catch (err) {
        logger.error('Failed to write audit log', { action, error: err.message });
    }
};

/**
 * GET /api/admin/stats
 * Statistiche globali piattaforma
 */
const getStats = async (req, res) => {
    try {
        const tenantStats = await query(`
            SELECT
                COUNT(*) AS totalTenants,
                SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) AS activeTenants,
                SUM(CASE WHEN subscription_status = 'trial' THEN 1 ELSE 0 END) AS trialTenants
            FROM tenants
        `);

        const userStats = await query(`
            SELECT COUNT(*) AS totalUsers FROM users
        `);

        const revenueStats = await query(`
            SELECT COALESCE(SUM(amount), 0) AS totalRevenue
            FROM platform_invoices
            WHERE status = 'paid'
        `);

        const monthlyRevenueRows = await query(`
            SELECT COALESCE(SUM(amount), 0) AS monthlyRevenue
            FROM platform_invoices
            WHERE status = 'paid' AND issued_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        res.json({
            success: true,
            data: {
                totalTenants: tenantStats[0]?.totalTenants || 0,
                activeTenants: tenantStats[0]?.activeTenants || 0,
                trialTenants: tenantStats[0]?.trialTenants || 0,
                totalUsers: userStats[0]?.totalUsers || 0,
                totalRevenue: revenueStats[0]?.totalRevenue || 0,
                monthlyRevenue: monthlyRevenueRows[0]?.monthlyRevenue || 0
            }
        });
    } catch (error) {
        logger.error('Error getting admin stats', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nel recupero statistiche' });
    }
};

/**
 * GET /api/admin/tenants
 * Lista tutti i tenant con paginazione e filtri
 */
const getTenants = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, plan, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (search) {
            const sanitizedSearch = search.replace(/[%_]/g, '\\$&');
            whereClause += ' AND (t.business_name LIKE ? OR t.owner_email LIKE ?)';
            params.push(`%${sanitizedSearch}%`, `%${sanitizedSearch}%`);
        }
        if (plan) {
            whereClause += ' AND t.subscription_plan = ?';
            params.push(plan);
        }
        if (status) {
            whereClause += ' AND t.subscription_status = ?';
            params.push(status);
        }

        const countResult = await query(
            `SELECT COUNT(*) AS total FROM tenants t WHERE ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        const tenants = await query(
            `SELECT t.*,
                (SELECT COUNT(*) FROM clients c WHERE c.tenant_id = t.id AND c.status = 'active') AS client_count,
                (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
            FROM tenants t
            WHERE ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: {
                tenants,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting tenants', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nel recupero tenant' });
    }
};

/**
 * PUT /api/admin/tenants/:id/status
 * Aggiorna stato abbonamento tenant
 */
const updateTenantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['trial', 'active', 'paused', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Stato non valido' });
        }

        // Capture old value for audit trail
        const oldRows = await query('SELECT subscription_status FROM tenants WHERE id = ?', [id]);
        const oldStatus = oldRows[0]?.subscription_status || 'unknown';

        await query(
            'UPDATE tenants SET subscription_status = ? WHERE id = ?',
            [status, id]
        );

        // Audit log
        await logAdminAction(req, 'TENANT_STATUS_CHANGE', 'tenant', id, {
            old: oldStatus,
            new: status
        });

        res.json({ success: true, message: 'Stato aggiornato' });
    } catch (error) {
        logger.error('Error updating tenant status', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore aggiornamento stato' });
    }
};

/**
 * PUT /api/admin/tenants/:id/plan
 * Aggiorna piano abbonamento tenant
 */
const updateTenantPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { subscription_plan, max_clients } = req.body;

        const validPlans = ['free', 'starter', 'professional', 'enterprise'];
        if (!validPlans.includes(subscription_plan)) {
            return res.status(400).json({ success: false, message: 'Piano non valido' });
        }

        // Capture old values for audit trail
        const oldRows = await query('SELECT subscription_plan, max_clients FROM tenants WHERE id = ?', [id]);
        const oldPlan = oldRows[0]?.subscription_plan || 'unknown';
        const oldMaxClients = oldRows[0]?.max_clients;

        await query(
            'UPDATE tenants SET subscription_plan = ?, max_clients = ? WHERE id = ?',
            [subscription_plan, max_clients || 5, id]
        );

        // Audit log
        await logAdminAction(req, 'TENANT_PLAN_CHANGE', 'tenant', id, {
            oldPlan, newPlan: subscription_plan,
            oldMaxClients, newMaxClients: max_clients || 5
        });

        res.json({ success: true, message: 'Piano aggiornato' });
    } catch (error) {
        logger.error('Error updating tenant plan', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore aggiornamento piano' });
    }
};

/**
 * GET /api/admin/invoices
 * Lista fatture piattaforma
 */
const getInvoices = async (req, res) => {
    try {
        const safePage = Math.max(1, parseInt(req.query.page) || 1);
        const safeLimit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (safePage - 1) * safeLimit;
        const { status } = req.query;

        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('pi.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const countResult = await query(
            `SELECT COUNT(*) AS total FROM platform_invoices pi ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        const invoices = await query(
            `SELECT pi.*, t.business_name
            FROM platform_invoices pi
            LEFT JOIN tenants t ON t.id = pi.tenant_id
            ${whereClause}
            ORDER BY pi.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, safeLimit, offset]
        );

        res.json({
            success: true,
            data: {
                invoices,
                pagination: {
                    total,
                    page: safePage,
                    limit: safeLimit,
                    totalPages: Math.ceil(total / safeLimit)
                }
            }
        });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
            return res.json({ success: true, data: { invoices: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } } });
        }
        logger.error('Error getting invoices', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nel recupero fatture' });
    }
};

/**
 * GET /api/admin/billing/stats
 * Statistiche fatturazione
 */
const getBillingStats = async (req, res) => {
    try {
        const monthlyRevenueRows = await query(`
            SELECT COALESCE(SUM(amount), 0) AS monthlyRevenue
            FROM platform_invoices
            WHERE status = 'paid' AND issued_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const yearlyRevenueRows = await query(`
            SELECT COALESCE(SUM(amount), 0) AS yearlyRevenue
            FROM platform_invoices
            WHERE status = 'paid' AND issued_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)
        `);

        const pendingRows = await query(`
            SELECT COUNT(*) AS pendingPayments
            FROM platform_invoices
            WHERE status = 'open'
        `);

        const activeSubsRows = await query(`
            SELECT COUNT(*) AS activeSubscriptions
            FROM tenants
            WHERE subscription_status = 'active'
        `);

        res.json({
            success: true,
            data: {
                monthlyRevenue: monthlyRevenueRows[0]?.monthlyRevenue || 0,
                yearlyRevenue: yearlyRevenueRows[0]?.yearlyRevenue || 0,
                pendingPayments: pendingRows[0]?.pendingPayments || 0,
                activeSubscriptions: activeSubsRows[0]?.activeSubscriptions || 0
            }
        });
    } catch (error) {
        logger.error('Error getting billing stats', { error: error.message });
        res.status(500).json({ success: false, message: 'Errore nel recupero statistiche fatturazione' });
    }
};

module.exports = {
    getStats,
    getTenants,
    updateTenantStatus,
    updateTenantPlan,
    getInvoices,
    getBillingStats
};
