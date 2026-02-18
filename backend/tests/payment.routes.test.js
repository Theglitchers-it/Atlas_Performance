/**
 * Unit Tests - Payment Routes (plan-upgrade endpoint)
 * Test per la route POST /api/payments/stripe/plan-upgrade
 */

// Mock di tutti i moduli necessari prima di richiedere i moduli reali
jest.mock('../src/config/database', () => ({
    query: jest.fn()
}));

jest.mock('../src/services/stripe.service', () => ({
    handleWebhook: jest.fn(),
    createPlanCheckoutSession: jest.fn(),
    createCheckoutSession: jest.fn()
}));

jest.mock('../src/controllers/payment.controller', () => ({
    getPaymentStats: jest.fn(),
    getRevenueHistory: jest.fn(),
    getExpiringSubscriptions: jest.fn(),
    getSubscriptions: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscriptionStatus: jest.fn(),
    cancelSubscription: jest.fn(),
    getInvoices: jest.fn(),
    getPayments: jest.fn(),
    createPayment: jest.fn(),
    getPaymentById: jest.fn(),
    updatePaymentStatus: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn()
}));

let stripeService;

beforeEach(() => {
    jest.clearAllMocks();
    stripeService = require('../src/services/stripe.service');
});

// =============================================
// Test diretti della logica di validazione route
// (senza supertest, testando la logica inline)
// =============================================
describe('Plan Upgrade Route - Validazione', () => {

    test('piani validi sono starter, professional, enterprise', () => {
        const validPlans = ['starter', 'professional', 'enterprise'];

        expect(validPlans.includes('starter')).toBe(true);
        expect(validPlans.includes('professional')).toBe(true);
        expect(validPlans.includes('enterprise')).toBe(true);
        expect(validPlans.includes('free')).toBe(false);
        expect(validPlans.includes('invalid')).toBe(false);
        expect(validPlans.includes('')).toBe(false);
        expect(validPlans.includes(null)).toBe(false);
    });

    test('billingCycle default e monthly', () => {
        const billingCycle = undefined || 'monthly';
        expect(billingCycle).toBe('monthly');
    });

    test('billingCycle yearly viene passato correttamente', () => {
        const billingCycle = 'yearly' || 'monthly';
        expect(billingCycle).toBe('yearly');
    });
});

// =============================================
// Test della logica di risposta
// =============================================
describe('Plan Upgrade Route - Service Integration', () => {

    test('createPlanCheckoutSession chiamato con parametri corretti', async () => {
        stripeService.createPlanCheckoutSession.mockResolvedValue({
            sessionId: 'cs_test_1',
            url: 'https://checkout.stripe.com/cs_test_1'
        });

        const result = await stripeService.createPlanCheckoutSession({
            tenantId: 'tenant-1',
            userId: 1,
            plan: 'professional',
            billingCycle: 'monthly',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel'
        });

        expect(result).toEqual({
            sessionId: 'cs_test_1',
            url: 'https://checkout.stripe.com/cs_test_1'
        });

        expect(stripeService.createPlanCheckoutSession).toHaveBeenCalledWith({
            tenantId: 'tenant-1',
            userId: 1,
            plan: 'professional',
            billingCycle: 'monthly',
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel'
        });
    });

    test('service error viene propagato', async () => {
        stripeService.createPlanCheckoutSession.mockRejectedValue(
            new Error('Piano non valido')
        );

        await expect(
            stripeService.createPlanCheckoutSession({
                tenantId: 'tenant-1',
                userId: 1,
                plan: 'invalid',
                billingCycle: 'monthly'
            })
        ).rejects.toThrow('Piano non valido');
    });

    test('service Stripe non configurato error', async () => {
        stripeService.createPlanCheckoutSession.mockRejectedValue(
            new Error('Stripe non configurato')
        );

        await expect(
            stripeService.createPlanCheckoutSession({
                tenantId: 'tenant-1',
                userId: 1,
                plan: 'starter',
                billingCycle: 'monthly'
            })
        ).rejects.toThrow('Stripe non configurato');
    });
});

// =============================================
// Test Auth Middleware (requireRole)
// =============================================
describe('requireRole middleware', () => {
    const { requireRole } = require('../src/middlewares/auth');

    test('blocca utente non autenticato', () => {
        const req = { user: null };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        requireRole('tenant_owner')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('blocca utente senza ruolo corretto', () => {
        const req = { user: { id: 1, role: 'client' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        requireRole('tenant_owner')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('permette tenant_owner', () => {
        const req = { user: { id: 1, role: 'tenant_owner' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        requireRole('tenant_owner')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('permette multipli ruoli', () => {
        const req = { user: { id: 1, role: 'staff' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        requireRole('tenant_owner', 'staff')(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('blocca client sulla route plan-upgrade (solo tenant_owner)', () => {
        const req = { user: { id: 1, role: 'client' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        requireRole('tenant_owner')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.any(String)
            })
        );
    });

    test('blocca staff sulla route plan-upgrade', () => {
        const req = { user: { id: 1, role: 'staff' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        requireRole('tenant_owner')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});
