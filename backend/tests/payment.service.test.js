/**
 * Tests for PaymentService
 * Subscriptions, payments, invoices, revenue stats, tenant isolation
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args),
    transaction: (fn) => mockTransaction(fn)
}));

const paymentService = require('../src/services/payment.service');

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// createSubscription
// =============================================
describe('PaymentService.createSubscription', () => {
    test('creates subscription successfully', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await paymentService.createSubscription('tenant-1', {
            clientId: 5,
            planType: 'premium',
            amount: 49.99,
            currency: 'EUR',
            billingCycle: 'monthly',
            startDate: '2026-03-01',
            endDate: '2026-04-01',
            notes: 'First subscription'
        });

        expect(result.id).toBe(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id'),
            expect.arrayContaining(['tenant-1', 5])
        );
    });

    test('includes tenant_id in INSERT', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 2 });

        await paymentService.createSubscription('tenant-1', {
            clientId: 3,
            amount: 30,
            planType: 'basic'
        });

        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[0]).toContain('tenant_id');
        expect(insertCall[1][0]).toBe('tenant-1');
    });

    test('rejects zero or negative amount', async () => {
        await expect(
            paymentService.createSubscription('tenant-1', {
                clientId: 5,
                amount: 0
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('maggiore di zero')
        }));

        await expect(
            paymentService.createSubscription('tenant-1', {
                clientId: 5,
                amount: -10
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400
        }));

        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('rejects excessively large amount', async () => {
        await expect(
            paymentService.createSubscription('tenant-1', {
                clientId: 5,
                amount: 1000000
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('troppo elevato')
        }));
    });

    test('defaults billing_cycle and currency', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 3 });

        await paymentService.createSubscription('tenant-1', {
            clientId: 5,
            amount: 25
        });

        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[1]).toContain('EUR');
        expect(insertCall[1]).toContain('monthly');
    });
});

// =============================================
// getSubscriptions
// =============================================
describe('PaymentService.getSubscriptions', () => {
    test('returns paginated subscriptions', async () => {
        mockQuery
            .mockResolvedValueOnce([
                { id: 1, plan_type: 'premium', amount: 49.99, status: 'active', first_name: 'Mario' },
                { id: 2, plan_type: 'basic', amount: 29.99, status: 'active', first_name: 'Luigi' }
            ])
            .mockResolvedValueOnce([{ total: 2 }]);

        const result = await paymentService.getSubscriptions('tenant-1');

        expect(result.subscriptions).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);
    });

    test('always includes tenant_id in queries', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ total: 0 }]);

        await paymentService.getSubscriptions('tenant-1');

        // SELECT query
        expect(mockQuery.mock.calls[0][0]).toContain('cs.tenant_id = ?');
        expect(mockQuery.mock.calls[0][1][0]).toBe('tenant-1');

        // COUNT query
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1][0]).toBe('tenant-1');
    });

    test('filters by status', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, status: 'active' }])
            .mockResolvedValueOnce([{ total: 1 }]);

        await paymentService.getSubscriptions('tenant-1', { status: 'active' });

        const selectCall = mockQuery.mock.calls[0];
        expect(selectCall[0]).toContain('cs.status = ?');
        expect(selectCall[1]).toContain('active');
    });

    test('filters by clientId', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, client_id: 5 }])
            .mockResolvedValueOnce([{ total: 1 }]);

        await paymentService.getSubscriptions('tenant-1', { clientId: 5 });

        const selectCall = mockQuery.mock.calls[0];
        expect(selectCall[0]).toContain('cs.client_id = ?');
        expect(selectCall[1]).toContain(5);
    });
});

// =============================================
// updateSubscriptionStatus
// =============================================
describe('PaymentService.updateSubscriptionStatus', () => {
    test('updates status with tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce({});

        await paymentService.updateSubscriptionStatus(1, 'tenant-1', 'paused');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['paused', 1, 'tenant-1']
        );
    });
});

// =============================================
// cancelSubscription
// =============================================
describe('PaymentService.cancelSubscription', () => {
    test('cancels subscription and sets cancelled_at timestamp', async () => {
        mockQuery.mockResolvedValueOnce({});

        await paymentService.cancelSubscription(1, 'tenant-1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("status = ?"),
            ['cancelled', 1, 'tenant-1']
        );
        expect(mockQuery.mock.calls[0][0]).toContain('cancelled_at = NOW()');
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
    });
});

// =============================================
// createPayment
// =============================================
describe('PaymentService.createPayment', () => {
    test('records payment successfully', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 100 });

        const result = await paymentService.createPayment('tenant-1', {
            clientId: 5,
            amount: 50,
            currency: 'EUR',
            paymentMethod: 'cash',
            status: 'completed',
            notes: 'Monthly payment'
        });

        expect(result.id).toBe(100);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id'),
            expect.arrayContaining(['tenant-1', 5])
        );
    });

    test('rejects zero or negative amount', async () => {
        await expect(
            paymentService.createPayment('tenant-1', {
                clientId: 5,
                amount: 0
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('maggiore di zero')
        }));

        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('rejects excessively large amount', async () => {
        await expect(
            paymentService.createPayment('tenant-1', {
                clientId: 5,
                amount: 1000000
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('troppo elevato')
        }));
    });

    test('defaults payment method to manual', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 101 });

        await paymentService.createPayment('tenant-1', {
            clientId: 5,
            amount: 25
        });

        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[1]).toContain('manual');
    });
});

// =============================================
// getPayments
// =============================================
describe('PaymentService.getPayments', () => {
    test('returns paginated payments', async () => {
        mockQuery
            .mockResolvedValueOnce([
                { id: 1, amount: 50, status: 'completed', first_name: 'Mario' },
                { id: 2, amount: 30, status: 'pending', first_name: 'Luigi' }
            ])
            .mockResolvedValueOnce([{ total: 2 }]);

        const result = await paymentService.getPayments('tenant-1');

        expect(result.payments).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
    });

    test('always scopes to tenant_id', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ total: 0 }]);

        await paymentService.getPayments('tenant-1');

        // SELECT query
        expect(mockQuery.mock.calls[0][0]).toContain('p.tenant_id = ?');
        expect(mockQuery.mock.calls[0][1][0]).toBe('tenant-1');

        // COUNT query
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1][0]).toBe('tenant-1');
    });

    test('filters by clientId, status, and date range', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1 }])
            .mockResolvedValueOnce([{ total: 1 }]);

        await paymentService.getPayments('tenant-1', {
            clientId: 5,
            status: 'completed',
            startDate: '2026-01-01',
            endDate: '2026-12-31'
        });

        const selectCall = mockQuery.mock.calls[0];
        expect(selectCall[0]).toContain('p.client_id = ?');
        expect(selectCall[0]).toContain('p.status = ?');
        expect(selectCall[0]).toContain('p.payment_date >= ?');
        expect(selectCall[0]).toContain('p.payment_date <= ?');
    });

    test('pagination offset is calculated correctly', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ total: 50 }]);

        const result = await paymentService.getPayments('tenant-1', { page: 3, limit: 10 });

        expect(result.pagination.page).toBe(3);
        expect(result.pagination.totalPages).toBe(5);
        // offset = (3-1) * 10 = 20
        const selectCall = mockQuery.mock.calls[0];
        expect(selectCall[1]).toContain(20); // offset
        expect(selectCall[1]).toContain(10); // limit
    });
});

// =============================================
// getPaymentById
// =============================================
describe('PaymentService.getPaymentById', () => {
    test('returns payment by id with tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce([{
            id: 1, tenant_id: 'tenant-1', amount: 50, status: 'completed'
        }]);

        const result = await paymentService.getPaymentById(1, 'tenant-1');

        expect(result.id).toBe(1);
        expect(result.amount).toBe(50);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            [1, 'tenant-1']
        );
    });

    test('returns null for non-existent payment', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await paymentService.getPaymentById(999, 'tenant-1');

        expect(result).toBeNull();
    });
});

// =============================================
// updatePaymentStatus
// =============================================
describe('PaymentService.updatePaymentStatus', () => {
    test('updates payment status with tenant isolation', async () => {
        mockQuery.mockResolvedValueOnce({});

        await paymentService.updatePaymentStatus(1, 'tenant-1', 'refunded');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['refunded', 1, 'tenant-1']
        );
    });
});

// =============================================
// createInvoice
// =============================================
describe('PaymentService.createInvoice', () => {
    test('creates platform invoice', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 10 });

        const result = await paymentService.createInvoice('tenant-1', {
            amount: 39,
            currency: 'EUR',
            periodStart: '2026-03-01',
            periodEnd: '2026-03-31',
            planName: 'professional',
            clientCount: 25,
            status: 'paid'
        });

        expect(result.id).toBe(10);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id'),
            expect.arrayContaining(['tenant-1'])
        );
    });

    test('rejects zero or negative invoice amount', async () => {
        await expect(
            paymentService.createInvoice('tenant-1', {
                amount: 0,
                periodStart: '2026-03-01',
                periodEnd: '2026-03-31',
                planName: 'free'
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            message: expect.stringContaining('maggiore di zero')
        }));

        expect(mockQuery).not.toHaveBeenCalled();
    });
});

// =============================================
// getInvoices
// =============================================
describe('PaymentService.getInvoices', () => {
    test('returns invoices ordered by most recent', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 3, amount: 39, plan_name: 'professional', issued_at: '2026-03-01' },
            { id: 2, amount: 39, plan_name: 'professional', issued_at: '2026-02-01' },
            { id: 1, amount: 19, plan_name: 'starter', issued_at: '2026-01-01' }
        ]);

        const result = await paymentService.getInvoices('tenant-1');

        expect(result).toHaveLength(3);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1', 12] // default limit 12
        );
    });

    test('respects custom limit', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await paymentService.getInvoices('tenant-1', { limit: 6 });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('LIMIT ?'),
            ['tenant-1', 6]
        );
    });
});

// =============================================
// getMonthlyRevenue
// =============================================
describe('PaymentService.getMonthlyRevenue', () => {
    test('returns monthly revenue and payment count', async () => {
        mockQuery.mockResolvedValueOnce([{ total_revenue: 1500.50, payment_count: 12 }]);

        const result = await paymentService.getMonthlyRevenue('tenant-1', 2026, 3);

        expect(result.total_revenue).toBe(1500.50);
        expect(result.payment_count).toBe(12);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1', 2026, 3]
        );
    });

    test('only counts completed payments', async () => {
        mockQuery.mockResolvedValueOnce([{ total_revenue: 0, payment_count: 0 }]);

        await paymentService.getMonthlyRevenue('tenant-1', 2026, 1);

        const queryCall = mockQuery.mock.calls[0];
        expect(queryCall[0]).toContain("status = 'completed'");
    });
});

// =============================================
// getRevenueHistory
// =============================================
describe('PaymentService.getRevenueHistory', () => {
    test('returns last 12 months revenue grouped by month', async () => {
        mockQuery.mockResolvedValueOnce([
            { month: '2025-04', revenue: 500, payments_count: 5 },
            { month: '2025-05', revenue: 750, payments_count: 8 }
        ]);

        const result = await paymentService.getRevenueHistory('tenant-1');

        expect(result).toHaveLength(2);
        expect(result[0].month).toBe('2025-04');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1']
        );
    });

    test('only includes completed payments', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await paymentService.getRevenueHistory('tenant-1');

        const queryCall = mockQuery.mock.calls[0];
        expect(queryCall[0]).toContain("status = 'completed'");
    });
});

// =============================================
// getPaymentStats
// =============================================
describe('PaymentService.getPaymentStats', () => {
    test('returns combined payment and subscription stats', async () => {
        mockQuery
            .mockResolvedValueOnce([{
                total_revenue: 5000,
                completed_payments: 50,
                pending_payments: 3,
                failed_payments: 1,
                avg_payment: 100
            }])
            .mockResolvedValueOnce([{
                active_subscriptions: 20,
                cancelled_subscriptions: 5,
                mrr: 2000
            }]);

        const result = await paymentService.getPaymentStats('tenant-1');

        expect(result.total_revenue).toBe(5000);
        expect(result.completed_payments).toBe(50);
        expect(result.pending_payments).toBe(3);
        expect(result.failed_payments).toBe(1);
        expect(result.active_subscriptions).toBe(20);
        expect(result.cancelled_subscriptions).toBe(5);
        expect(result.mrr).toBe(2000);
    });

    test('both queries scope to tenant_id', async () => {
        mockQuery
            .mockResolvedValueOnce([{ total_revenue: 0, completed_payments: 0, pending_payments: 0, failed_payments: 0, avg_payment: 0 }])
            .mockResolvedValueOnce([{ active_subscriptions: 0, cancelled_subscriptions: 0, mrr: 0 }]);

        await paymentService.getPaymentStats('tenant-1');

        // Payments stats query
        expect(mockQuery.mock.calls[0][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[0][1][0]).toBe('tenant-1');

        // Subscription stats query
        expect(mockQuery.mock.calls[1][0]).toContain('tenant_id = ?');
        expect(mockQuery.mock.calls[1][1][0]).toBe('tenant-1');
    });
});

// =============================================
// getExpiringSubscriptions
// =============================================
describe('PaymentService.getExpiringSubscriptions', () => {
    test('returns subscriptions expiring within given days', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, first_name: 'Mario', last_name: 'Rossi', end_date: '2026-03-20', status: 'active' },
            { id: 2, first_name: 'Luigi', last_name: 'Verdi', end_date: '2026-03-22', status: 'active' }
        ]);

        const result = await paymentService.getExpiringSubscriptions('tenant-1', 7);

        expect(result).toHaveLength(2);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ?'),
            ['tenant-1', 7]
        );
    });

    test('only includes active subscriptions', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await paymentService.getExpiringSubscriptions('tenant-1');

        const queryCall = mockQuery.mock.calls[0];
        expect(queryCall[0]).toContain("cs.status = 'active'");
    });

    test('defaults to 7 days when withinDays not specified', async () => {
        mockQuery.mockResolvedValueOnce([]);

        await paymentService.getExpiringSubscriptions('tenant-1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INTERVAL ? DAY'),
            ['tenant-1', 7]
        );
    });
});
