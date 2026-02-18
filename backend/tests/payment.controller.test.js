/**
 * Tests for Payment Controller
 * createSubscription, getSubscriptions, cancelSubscription, updateSubscriptionStatus,
 * createPayment, getPayments, getPaymentById, updatePaymentStatus,
 * getInvoices, getPaymentStats, getRevenueHistory, getExpiringSubscriptions
 */

// Mock dependencies
jest.mock('../src/services/payment.service', () => ({
    createSubscription: jest.fn(),
    getSubscriptions: jest.fn(),
    cancelSubscription: jest.fn(),
    updateSubscriptionStatus: jest.fn(),
    createPayment: jest.fn(),
    getPayments: jest.fn(),
    getPaymentById: jest.fn(),
    updatePaymentStatus: jest.fn(),
    getInvoices: jest.fn(),
    getPaymentStats: jest.fn(),
    getRevenueHistory: jest.fn(),
    getExpiringSubscriptions: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const paymentController = require('../src/controllers/payment.controller');
const paymentService = require('../src/services/payment.service');

// Test helpers
const mockReq = (overrides = {}) => ({
    user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
    params: {},
    query: {},
    body: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('PaymentController', () => {
    // ==================== SUBSCRIPTIONS ====================

    describe('createSubscription', () => {
        test('returns 201 with created subscription', async () => {
            const result = { subscriptionId: 10, planType: 'monthly' };
            paymentService.createSubscription.mockResolvedValue(result);

            const req = mockReq({
                body: { clientId: 5, planType: 'monthly', amount: 50, currency: 'EUR' }
            });
            const res = mockRes();

            await paymentController.createSubscription(req, res, mockNext);

            expect(paymentService.createSubscription).toHaveBeenCalledWith('tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Abbonamento creato',
                data: result
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Invalid amount');
            paymentService.createSubscription.mockRejectedValue(error);

            const req = mockReq({ body: { amount: -10 } });
            const res = mockRes();

            await paymentController.createSubscription(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getSubscriptions', () => {
        test('returns paginated list of subscriptions', async () => {
            const result = {
                subscriptions: [{ id: 1, planType: 'monthly' }],
                total: 1,
                page: 1,
                limit: 20
            };
            paymentService.getSubscriptions.mockResolvedValue(result);

            const req = mockReq({ query: { page: '1', limit: '20' } });
            const res = mockRes();

            await paymentController.getSubscriptions(req, res, mockNext);

            expect(paymentService.getSubscriptions).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 1,
                limit: 20
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes filter options including clientId as integer', async () => {
            paymentService.getSubscriptions.mockResolvedValue({ subscriptions: [], total: 0 });

            const req = mockReq({
                query: { status: 'active', clientId: '5' }
            });
            const res = mockRes();

            await paymentController.getSubscriptions(req, res, mockNext);

            expect(paymentService.getSubscriptions).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                status: 'active',
                clientId: 5
            }));
        });

        test('passes clientId as null when not provided', async () => {
            paymentService.getSubscriptions.mockResolvedValue({ subscriptions: [], total: 0 });

            const req = mockReq({ query: {} });
            const res = mockRes();

            await paymentController.getSubscriptions(req, res, mockNext);

            expect(paymentService.getSubscriptions).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                clientId: null
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getSubscriptions.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getSubscriptions(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('cancelSubscription', () => {
        test('returns success message on cancellation', async () => {
            paymentService.cancelSubscription.mockResolvedValue();

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await paymentController.cancelSubscription(req, res, mockNext);

            expect(paymentService.cancelSubscription).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Abbonamento annullato'
            });
        });

        test('calls next(error) when cancellation fails', async () => {
            const error = new Error('Subscription not found');
            paymentService.cancelSubscription.mockRejectedValue(error);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await paymentController.cancelSubscription(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateSubscriptionStatus', () => {
        test('returns success message on status update', async () => {
            paymentService.updateSubscriptionStatus.mockResolvedValue();

            const req = mockReq({
                params: { id: '5' },
                body: { status: 'paused' }
            });
            const res = mockRes();

            await paymentController.updateSubscriptionStatus(req, res, mockNext);

            expect(paymentService.updateSubscriptionStatus).toHaveBeenCalledWith(5, 'tenant-1', 'paused');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Stato abbonamento aggiornato'
            });
        });

        test('calls next(error) when status update fails', async () => {
            const error = new Error('Invalid status');
            paymentService.updateSubscriptionStatus.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, body: { status: 'invalid' } });
            const res = mockRes();

            await paymentController.updateSubscriptionStatus(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ==================== PAYMENTS ====================

    describe('createPayment', () => {
        test('returns 201 with created payment', async () => {
            const result = { paymentId: 20, amount: 100 };
            paymentService.createPayment.mockResolvedValue(result);

            const req = mockReq({
                body: { clientId: 5, amount: 100, method: 'cash' }
            });
            const res = mockRes();

            await paymentController.createPayment(req, res, mockNext);

            expect(paymentService.createPayment).toHaveBeenCalledWith('tenant-1', req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Pagamento registrato',
                data: result
            });
        });

        test('calls next(error) when creation fails', async () => {
            const error = new Error('Validation error');
            paymentService.createPayment.mockRejectedValue(error);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await paymentController.createPayment(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getPayments', () => {
        test('returns paginated list of payments', async () => {
            const result = {
                payments: [{ id: 1, amount: 100 }],
                total: 1,
                page: 1,
                limit: 20
            };
            paymentService.getPayments.mockResolvedValue(result);

            const req = mockReq({ query: { page: '2', limit: '10' } });
            const res = mockRes();

            await paymentController.getPayments(req, res, mockNext);

            expect(paymentService.getPayments).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                page: 2,
                limit: 10
            }));
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('passes date range and status filters', async () => {
            paymentService.getPayments.mockResolvedValue({ payments: [], total: 0 });

            const req = mockReq({
                query: { startDate: '2025-01-01', endDate: '2025-12-31', status: 'completed', clientId: '5' }
            });
            const res = mockRes();

            await paymentController.getPayments(req, res, mockNext);

            expect(paymentService.getPayments).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                status: 'completed',
                clientId: 5
            }));
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getPayments.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getPayments(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getPaymentById', () => {
        test('returns a single payment', async () => {
            const payment = { id: 5, amount: 100, status: 'completed' };
            paymentService.getPaymentById.mockResolvedValue(payment);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await paymentController.getPaymentById(req, res, mockNext);

            expect(paymentService.getPaymentById).toHaveBeenCalledWith(5, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { payment }
            });
        });

        test('returns 404 when payment not found', async () => {
            paymentService.getPaymentById.mockResolvedValue(null);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await paymentController.getPaymentById(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Pagamento non trovato'
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getPaymentById.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' } });
            const res = mockRes();

            await paymentController.getPaymentById(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updatePaymentStatus', () => {
        test('returns success message on status update', async () => {
            paymentService.updatePaymentStatus.mockResolvedValue();

            const req = mockReq({
                params: { id: '5' },
                body: { status: 'refunded' }
            });
            const res = mockRes();

            await paymentController.updatePaymentStatus(req, res, mockNext);

            expect(paymentService.updatePaymentStatus).toHaveBeenCalledWith(5, 'tenant-1', 'refunded');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Stato pagamento aggiornato'
            });
        });

        test('calls next(error) when update fails', async () => {
            const error = new Error('Invalid status');
            paymentService.updatePaymentStatus.mockRejectedValue(error);

            const req = mockReq({ params: { id: '5' }, body: { status: 'invalid' } });
            const res = mockRes();

            await paymentController.updatePaymentStatus(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ==================== INVOICES ====================

    describe('getInvoices', () => {
        test('returns list of invoices', async () => {
            const invoices = [{ id: 1, number: 'INV-001', amount: 200 }];
            paymentService.getInvoices.mockResolvedValue(invoices);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getInvoices(req, res, mockNext);

            expect(paymentService.getInvoices).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { invoices }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getInvoices.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getInvoices(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ==================== STATS ====================

    describe('getPaymentStats', () => {
        test('returns payment statistics', async () => {
            const stats = { totalRevenue: 5000, activeSubscriptions: 20 };
            paymentService.getPaymentStats.mockResolvedValue(stats);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getPaymentStats(req, res, mockNext);

            expect(paymentService.getPaymentStats).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { stats }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getPaymentStats.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getPaymentStats(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getRevenueHistory', () => {
        test('returns revenue history', async () => {
            const history = [{ month: '2025-01', revenue: 2500 }];
            paymentService.getRevenueHistory.mockResolvedValue(history);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getRevenueHistory(req, res, mockNext);

            expect(paymentService.getRevenueHistory).toHaveBeenCalledWith('tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { history }
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getRevenueHistory.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getRevenueHistory(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getExpiringSubscriptions', () => {
        test('returns expiring subscriptions with default days', async () => {
            const subscriptions = [{ id: 1, clientName: 'Mario', expiresAt: '2025-01-15' }];
            paymentService.getExpiringSubscriptions.mockResolvedValue(subscriptions);

            const req = mockReq({ query: {} });
            const res = mockRes();

            await paymentController.getExpiringSubscriptions(req, res, mockNext);

            expect(paymentService.getExpiringSubscriptions).toHaveBeenCalledWith('tenant-1', 7);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { subscriptions }
            });
        });

        test('passes custom days parameter', async () => {
            paymentService.getExpiringSubscriptions.mockResolvedValue([]);

            const req = mockReq({ query: { days: '30' } });
            const res = mockRes();

            await paymentController.getExpiringSubscriptions(req, res, mockNext);

            expect(paymentService.getExpiringSubscriptions).toHaveBeenCalledWith('tenant-1', 30);
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            paymentService.getExpiringSubscriptions.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await paymentController.getExpiringSubscriptions(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
