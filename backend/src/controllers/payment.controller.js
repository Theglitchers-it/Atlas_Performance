/**
 * Payment Controller
 */

const paymentService = require('../services/payment.service');

class PaymentController {
    // Abbonamenti
    async createSubscription(req, res, next) {
        try {
            const result = await paymentService.createSubscription(req.user.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Abbonamento creato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getSubscriptions(req, res, next) {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                status: req.query.status,
                clientId: req.query.clientId ? parseInt(req.query.clientId) : null
            };
            const result = await paymentService.getSubscriptions(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async cancelSubscription(req, res, next) {
        try {
            await paymentService.cancelSubscription(parseInt(req.params.id), req.user.tenantId);
            res.json({ success: true, message: 'Abbonamento annullato' });
        } catch (error) {
            next(error);
        }
    }

    async updateSubscriptionStatus(req, res, next) {
        try {
            await paymentService.updateSubscriptionStatus(
                parseInt(req.params.id), req.user.tenantId, req.body.status
            );
            res.json({ success: true, message: 'Stato abbonamento aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    // Pagamenti
    async createPayment(req, res, next) {
        try {
            const result = await paymentService.createPayment(req.user.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Pagamento registrato', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getPayments(req, res, next) {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                clientId: req.query.clientId ? parseInt(req.query.clientId) : null,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                status: req.query.status
            };
            const result = await paymentService.getPayments(req.user.tenantId, options);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getPaymentById(req, res, next) {
        try {
            const payment = await paymentService.getPaymentById(parseInt(req.params.id), req.user.tenantId);
            if (!payment) {
                return res.status(404).json({ success: false, message: 'Pagamento non trovato' });
            }
            res.json({ success: true, data: { payment } });
        } catch (error) {
            next(error);
        }
    }

    async updatePaymentStatus(req, res, next) {
        try {
            await paymentService.updatePaymentStatus(parseInt(req.params.id), req.user.tenantId, req.body.status);
            res.json({ success: true, message: 'Stato pagamento aggiornato' });
        } catch (error) {
            next(error);
        }
    }

    // Fatture
    async getInvoices(req, res, next) {
        try {
            const invoices = await paymentService.getInvoices(req.user.tenantId);
            res.json({ success: true, data: { invoices } });
        } catch (error) {
            next(error);
        }
    }

    // Statistiche
    async getPaymentStats(req, res, next) {
        try {
            const stats = await paymentService.getPaymentStats(req.user.tenantId);
            res.json({ success: true, data: { stats } });
        } catch (error) {
            next(error);
        }
    }

    async getRevenueHistory(req, res, next) {
        try {
            const history = await paymentService.getRevenueHistory(req.user.tenantId);
            res.json({ success: true, data: { history } });
        } catch (error) {
            next(error);
        }
    }

    async getExpiringSubscriptions(req, res, next) {
        try {
            const withinDays = parseInt(req.query.days) || 7;
            const subscriptions = await paymentService.getExpiringSubscriptions(req.user.tenantId, withinDays);
            res.json({ success: true, data: { subscriptions } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PaymentController();
