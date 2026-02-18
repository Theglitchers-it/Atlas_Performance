/**
 * Payment Service
 * Gestione pagamenti, abbonamenti e fatturazione
 * Integrazione Stripe
 */

const { query, transaction } = require('../config/database');

class PaymentService {
    // ============================================
    // ABBONAMENTI CLIENTI
    // ============================================

    /**
     * Crea abbonamento cliente
     */
    async createSubscription(tenantId, data) {
        const {
            clientId, planType, amount, currency, billingCycle,
            startDate, endDate, notes
        } = data;

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            throw { status: 400, message: 'Importo abbonamento deve essere maggiore di zero' };
        }
        if (parsedAmount > 999999.99) {
            throw { status: 400, message: 'Importo abbonamento troppo elevato' };
        }

        const result = await query(`
            INSERT INTO client_subscriptions
            (tenant_id, client_id, plan_type, amount, currency, billing_cycle,
             start_date, end_date, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `, [
            tenantId, clientId, planType || 'monthly', parsedAmount,
            currency || 'EUR', billingCycle || 'monthly',
            startDate || new Date().toISOString().split('T')[0],
            endDate || null, notes || null
        ]);

        return { id: result.insertId };
    }

    /**
     * Ottieni abbonamenti per tenant
     */
    async getSubscriptions(tenantId, options = {}) {
        const { page = 1, limit = 20, status, clientId } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT cs.*, c.first_name, c.last_name, c.email,
                   u.first_name as user_first, u.last_name as user_last
            FROM client_subscriptions cs
            LEFT JOIN clients c ON cs.client_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE cs.tenant_id = ?
        `;
        const params = [tenantId];

        if (status) {
            sql += ' AND cs.status = ?';
            params.push(status);
        }
        if (clientId) {
            sql += ' AND cs.client_id = ?';
            params.push(clientId);
        }

        sql += ' ORDER BY cs.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const subscriptions = await query(sql, params);

        const [countResult] = await query(
            'SELECT COUNT(*) as total FROM client_subscriptions WHERE tenant_id = ?' +
            (status ? ' AND status = ?' : '') +
            (clientId ? ' AND client_id = ?' : ''),
            [tenantId, ...(status ? [status] : []), ...(clientId ? [clientId] : [])]
        );

        return {
            subscriptions,
            pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
        };
    }

    /**
     * Aggiorna stato abbonamento
     */
    async updateSubscriptionStatus(subscriptionId, tenantId, status) {
        await query(
            'UPDATE client_subscriptions SET status = ? WHERE id = ? AND tenant_id = ?',
            [status, subscriptionId, tenantId]
        );
    }

    /**
     * Annulla abbonamento
     */
    async cancelSubscription(subscriptionId, tenantId) {
        await query(
            'UPDATE client_subscriptions SET status = ?, cancelled_at = NOW() WHERE id = ? AND tenant_id = ?',
            ['cancelled', subscriptionId, tenantId]
        );
    }

    // ============================================
    // PAGAMENTI
    // ============================================

    /**
     * Registra pagamento
     */
    async createPayment(tenantId, data) {
        const {
            clientId, subscriptionId, amount, currency, paymentMethod,
            transactionId, status, notes
        } = data;

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            throw { status: 400, message: 'Importo pagamento deve essere maggiore di zero' };
        }
        if (parsedAmount > 999999.99) {
            throw { status: 400, message: 'Importo pagamento troppo elevato' };
        }

        const result = await query(`
            INSERT INTO payments
            (tenant_id, client_id, subscription_id, amount, currency, payment_method,
             transaction_id, status, notes, payment_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            tenantId, clientId, subscriptionId || null, parsedAmount,
            currency || 'EUR', paymentMethod || 'manual',
            transactionId || null, status || 'completed', notes || null
        ]);

        return { id: result.insertId };
    }

    /**
     * Ottieni pagamenti per tenant
     */
    async getPayments(tenantId, options = {}) {
        const { page = 1, limit = 20, clientId, startDate, endDate, status } = options;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT p.*, c.first_name, c.last_name,
                   u.first_name as user_first, u.last_name as user_last
            FROM payments p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE p.tenant_id = ?
        `;
        const params = [tenantId];

        if (clientId) { sql += ' AND p.client_id = ?'; params.push(clientId); }
        if (status) { sql += ' AND p.status = ?'; params.push(status); }
        if (startDate) { sql += ' AND p.payment_date >= ?'; params.push(startDate); }
        if (endDate) { sql += ' AND p.payment_date <= ?'; params.push(endDate); }

        sql += ' ORDER BY p.payment_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const payments = await query(sql, params);

        // Total
        let countSql = 'SELECT COUNT(*) as total FROM payments WHERE tenant_id = ?';
        const countParams = [tenantId];
        if (clientId) { countSql += ' AND client_id = ?'; countParams.push(clientId); }
        if (status) { countSql += ' AND status = ?'; countParams.push(status); }
        if (startDate) { countSql += ' AND payment_date >= ?'; countParams.push(startDate); }
        if (endDate) { countSql += ' AND payment_date <= ?'; countParams.push(endDate); }

        const [countResult] = await query(countSql, countParams);

        return {
            payments,
            pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
        };
    }

    /**
     * Dettaglio pagamento
     */
    async getPaymentById(paymentId, tenantId) {
        const rows = await query(
            'SELECT * FROM payments WHERE id = ? AND tenant_id = ?',
            [paymentId, tenantId]
        );
        return rows[0] || null;
    }

    /**
     * Aggiorna stato pagamento
     */
    async updatePaymentStatus(paymentId, tenantId, status) {
        await query(
            'UPDATE payments SET status = ? WHERE id = ? AND tenant_id = ?',
            [status, paymentId, tenantId]
        );
    }

    // ============================================
    // FATTURAZIONE PIATTAFORMA
    // ============================================

    /**
     * Genera fattura piattaforma per tenant
     */
    async createInvoice(tenantId, data) {
        const {
            amount, currency, periodStart, periodEnd,
            planName, clientCount, stripeInvoiceId, status
        } = data;

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            throw { status: 400, message: 'Importo fattura deve essere maggiore di zero' };
        }

        const result = await query(`
            INSERT INTO platform_invoices
            (tenant_id, amount, currency, period_start, period_end,
             plan_name, client_count, stripe_invoice_id, status, issued_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            tenantId, parsedAmount, currency || 'EUR',
            periodStart, periodEnd, planName,
            clientCount || 0, stripeInvoiceId || null, status || 'pending'
        ]);

        return { id: result.insertId };
    }

    /**
     * Ottieni fatture tenant
     */
    async getInvoices(tenantId, options = {}) {
        const { limit = 12 } = options;
        return await query(
            'SELECT * FROM platform_invoices WHERE tenant_id = ? ORDER BY issued_at DESC LIMIT ?',
            [tenantId, limit]
        );
    }

    // ============================================
    // STATISTICHE REVENUE
    // ============================================

    /**
     * Revenue totale del mese
     */
    async getMonthlyRevenue(tenantId, year, month) {
        const [result] = await query(`
            SELECT COALESCE(SUM(amount), 0) as total_revenue, COUNT(*) as payment_count
            FROM payments
            WHERE tenant_id = ? AND status = 'completed'
            AND YEAR(payment_date) = ? AND MONTH(payment_date) = ?
        `, [tenantId, year, month]);
        return result;
    }

    /**
     * Revenue per mese (ultimi 12 mesi)
     */
    async getRevenueHistory(tenantId) {
        return await query(`
            SELECT
                DATE_FORMAT(payment_date, '%Y-%m') as month,
                SUM(amount) as revenue,
                COUNT(*) as payments_count
            FROM payments
            WHERE tenant_id = ? AND status = 'completed'
            AND payment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
            ORDER BY month ASC
        `, [tenantId]);
    }

    /**
     * Statistiche pagamenti complessive
     */
    async getPaymentStats(tenantId) {
        const [stats] = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as avg_payment
            FROM payments
            WHERE tenant_id = ?
        `, [tenantId]);

        const [subscriptionStats] = await query(`
            SELECT
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
                COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) as mrr
            FROM client_subscriptions
            WHERE tenant_id = ?
        `, [tenantId]);

        return { ...stats, ...subscriptionStats };
    }

    /**
     * Clienti con pagamento in scadenza
     */
    async getExpiringSubscriptions(tenantId, withinDays = 7) {
        return await query(`
            SELECT cs.*, c.first_name, c.last_name, c.email,
                   u.first_name as user_first, u.last_name as user_last
            FROM client_subscriptions cs
            LEFT JOIN clients c ON cs.client_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE cs.tenant_id = ? AND cs.status = 'active'
            AND cs.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
            ORDER BY cs.end_date ASC
        `, [tenantId, withinDays]);
    }
}

module.exports = new PaymentService();
