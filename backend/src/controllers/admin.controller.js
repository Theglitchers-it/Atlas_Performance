/**
 * Admin Controller
 * Gestione pannello Super Admin
 */

const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('ADMIN');

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

        await query(
            'UPDATE tenants SET subscription_status = ? WHERE id = ?',
            [status, id]
        );

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

        await query(
            'UPDATE tenants SET subscription_plan = ?, max_clients = ? WHERE id = ?',
            [subscription_plan, max_clients || 5, id]
        );

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
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ' AND pi.status = ?';
            params.push(status);
        }

        const countResult = await query(
            `SELECT COUNT(*) AS total FROM platform_invoices pi WHERE ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        const invoices = await query(
            `SELECT pi.*, t.business_name
            FROM platform_invoices pi
            LEFT JOIN tenants t ON t.id = pi.tenant_id
            WHERE ${whereClause}
            ORDER BY pi.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: {
                invoices,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
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
