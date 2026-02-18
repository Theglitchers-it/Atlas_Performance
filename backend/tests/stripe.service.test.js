/**
 * Unit Tests - StripeService
 * Test per createPlanCheckoutSession, _handleCheckoutCompleted (plan_upgrade + video),
 * createCheckoutSession, handleWebhook, createRefund
 */

// Mock database - stabile per tutto il file
const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: mockQuery
}));

// Stripe mock - stabile per tutto il file
const mockSessionsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();
const mockRefundsCreate = jest.fn();

jest.mock('stripe', () => {
    return jest.fn(() => ({
        checkout: {
            sessions: { create: mockSessionsCreate }
        },
        webhooks: { constructEvent: mockWebhooksConstructEvent },
        refunds: { create: mockRefundsCreate }
    }));
});

const stripeService = require('../src/services/stripe.service');

beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    // Reset stato interno per forzare reinizializzazione
    stripeService.initialized = false;
    stripeService.stripe = null;
});

// =============================================
// createPlanCheckoutSession
// =============================================
describe('StripeService.createPlanCheckoutSession', () => {

    test('crea checkout session per piano starter mensile', async () => {
        mockSessionsCreate.mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
        });

        const result = await stripeService.createPlanCheckoutSession({
            tenantId: 'tenant-uuid-1',
            userId: 42,
            plan: 'starter',
            billingCycle: 'monthly'
        });

        expect(result).toEqual({
            sessionId: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
        });

        expect(mockSessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'subscription',
                line_items: [expect.objectContaining({
                    price_data: expect.objectContaining({
                        unit_amount: 1900,
                        currency: 'eur',
                        recurring: { interval: 'month' }
                    })
                })],
                metadata: expect.objectContaining({
                    tenant_id: 'tenant-uuid-1',
                    user_id: '42',
                    item_type: 'plan_upgrade',
                    plan: 'starter',
                    max_clients: '15'
                })
            })
        );
    });

    test('crea checkout session per piano professional annuale', async () => {
        mockSessionsCreate.mockResolvedValue({
            id: 'cs_test_456',
            url: 'https://checkout.stripe.com/pay/cs_test_456'
        });

        const result = await stripeService.createPlanCheckoutSession({
            tenantId: 'tenant-uuid-2',
            userId: 10,
            plan: 'professional',
            billingCycle: 'yearly'
        });

        expect(result.sessionId).toBe('cs_test_456');

        expect(mockSessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [expect.objectContaining({
                    price_data: expect.objectContaining({
                        unit_amount: 39000,
                        recurring: { interval: 'year' }
                    })
                })]
            })
        );
    });

    test('crea checkout session per piano enterprise', async () => {
        mockSessionsCreate.mockResolvedValue({
            id: 'cs_test_ent',
            url: 'https://checkout.stripe.com/pay/cs_test_ent'
        });

        await stripeService.createPlanCheckoutSession({
            tenantId: 'tenant-uuid-3',
            userId: 5,
            plan: 'enterprise',
            billingCycle: 'monthly'
        });

        expect(mockSessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [expect.objectContaining({
                    price_data: expect.objectContaining({
                        unit_amount: 7900,
                        product_data: expect.objectContaining({
                            name: 'Piano Enterprise'
                        })
                    })
                })],
                metadata: expect.objectContaining({
                    max_clients: '999'
                })
            })
        );
    });

    test('errore per piano non valido', async () => {
        await expect(
            stripeService.createPlanCheckoutSession({
                tenantId: 'tenant-uuid-1',
                userId: 1,
                plan: 'invalid_plan',
                billingCycle: 'monthly'
            })
        ).rejects.toThrow('Piano non valido');
    });

    test('errore se Stripe non configurato', async () => {
        delete process.env.STRIPE_SECRET_KEY;
        stripeService.initialized = false;
        stripeService.stripe = null;

        await expect(
            stripeService.createPlanCheckoutSession({
                tenantId: 'tenant-1',
                userId: 1,
                plan: 'starter',
                billingCycle: 'monthly'
            })
        ).rejects.toThrow('Stripe non configurato');
    });

    test('usa successUrl e cancelUrl custom se forniti', async () => {
        mockSessionsCreate.mockResolvedValue({
            id: 'cs_test_custom',
            url: 'https://checkout.stripe.com/pay/cs_test_custom'
        });

        await stripeService.createPlanCheckoutSession({
            tenantId: 'tenant-uuid-1',
            userId: 1,
            plan: 'starter',
            billingCycle: 'monthly',
            successUrl: 'https://myapp.com/success',
            cancelUrl: 'https://myapp.com/cancel'
        });

        expect(mockSessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                success_url: 'https://myapp.com/success',
                cancel_url: 'https://myapp.com/cancel'
            })
        );
    });

    test('default billingCycle monthly usa intervallo month', async () => {
        mockSessionsCreate.mockResolvedValue({ id: 'cs_1', url: 'url' });

        await stripeService.createPlanCheckoutSession({
            tenantId: 't1', userId: 1, plan: 'starter', billingCycle: 'monthly'
        });

        const callArg = mockSessionsCreate.mock.calls[0][0];
        expect(callArg.line_items[0].price_data.recurring.interval).toBe('month');
    });
});

// =============================================
// _handleCheckoutCompleted - plan_upgrade
// =============================================
describe('StripeService._handleCheckoutCompleted - plan_upgrade', () => {

    test('aggiorna tenant e crea fattura per plan_upgrade', async () => {
        mockQuery.mockResolvedValue([]);

        const session = {
            metadata: {
                tenant_id: 'tenant-uuid-1',
                user_id: '42',
                item_type: 'plan_upgrade',
                plan: 'professional',
                max_clients: '50'
            },
            amount_total: 3900,
            subscription: 'sub_test_123'
        };

        await stripeService._handleCheckoutCompleted(session);

        // Verifica UPDATE tenants
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE tenants SET subscription_plan = ?, subscription_status = ?, max_clients = ? WHERE id = ?',
            ['professional', 'active', 50, 'tenant-uuid-1']
        );

        // Verifica INSERT platform_invoices
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO platform_invoices'),
            expect.arrayContaining([
                'tenant-uuid-1',
                39, // 3900 / 100
                'professional',
                'sub_test_123'
            ])
        );
    });

    test('plan_upgrade usa session.id come fallback per stripe_invoice_id', async () => {
        mockQuery.mockResolvedValue([]);

        const session = {
            metadata: {
                tenant_id: 'tenant-1',
                user_id: '1',
                item_type: 'plan_upgrade',
                plan: 'starter',
                max_clients: '15'
            },
            amount_total: 1900,
            id: 'cs_session_id_fallback',
            subscription: null // nessun subscription
        };

        await stripeService._handleCheckoutCompleted(session);

        // Il 4° parametro della 2a query dovrebbe essere session.id (fallback)
        const invoiceCall = mockQuery.mock.calls[1];
        expect(invoiceCall[1][3]).toBe('cs_session_id_fallback');
    });

    test('plan_upgrade non esegue insert video_purchases', async () => {
        mockQuery.mockResolvedValue([]);

        const session = {
            metadata: {
                tenant_id: 'tenant-1',
                user_id: '1',
                item_type: 'plan_upgrade',
                plan: 'professional',
                max_clients: '50'
            },
            amount_total: 3900,
            subscription: 'sub_1'
        };

        await stripeService._handleCheckoutCompleted(session);

        // Solo 2 chiamate: UPDATE tenants + INSERT platform_invoices
        expect(mockQuery).toHaveBeenCalledTimes(2);
        // Nessuna chiamata video_purchases
        const calls = mockQuery.mock.calls.map(c => c[0]);
        expect(calls.some(c => c.includes('video_purchases'))).toBe(false);
    });
});

// =============================================
// _handleCheckoutCompleted - video/course purchase
// =============================================
describe('StripeService._handleCheckoutCompleted - video/course', () => {

    test('registra acquisto video nel DB', async () => {
        mockQuery.mockResolvedValue([]);

        const session = {
            metadata: {
                tenant_id: 'tenant-1',
                user_id: '10',
                item_type: 'video',
                item_id: '55'
            },
            amount_total: 2990,
            currency: 'eur',
            id: 'cs_video_123',
            payment_intent: 'pi_video_123'
        };

        await stripeService._handleCheckoutCompleted(session);

        // INSERT video_purchases
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO video_purchases'),
            expect.arrayContaining(['tenant-1', '10', 'video', '55', 29.9, 'EUR', 'cs_video_123'])
        );

        // INSERT payments
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO payments'),
            expect.arrayContaining(['tenant-1', '10', 'tenant-1', 29.9, 'EUR', 'pi_video_123'])
        );
    });

    test('registra acquisto corso nel DB', async () => {
        mockQuery.mockResolvedValue([]);

        const session = {
            metadata: {
                tenant_id: 'tenant-2',
                user_id: '20',
                item_type: 'course',
                item_id: '33'
            },
            amount_total: 4990,
            currency: 'usd',
            id: 'cs_course_456',
            payment_intent: 'pi_course_456'
        };

        await stripeService._handleCheckoutCompleted(session);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO video_purchases'),
            expect.arrayContaining(['course', '33', 49.9, 'USD'])
        );
    });
});

// =============================================
// createCheckoutSession (video/corso)
// =============================================
describe('StripeService.createCheckoutSession', () => {

    test('crea checkout session per un corso', async () => {
        mockQuery.mockResolvedValue([{ id: 1, title: 'Corso Fitness', price: 29.90, currency: 'EUR' }]);
        mockSessionsCreate.mockResolvedValue({
            id: 'cs_course_test',
            url: 'https://checkout.stripe.com/course'
        });

        const result = await stripeService.createCheckoutSession({
            tenantId: 'tenant-1',
            userId: 5,
            itemType: 'course',
            itemId: 1,
            successUrl: 'http://localhost/success',
            cancelUrl: 'http://localhost/cancel'
        });

        expect(result.sessionId).toBe('cs_course_test');
        expect(mockSessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'payment',
                line_items: [expect.objectContaining({
                    price_data: expect.objectContaining({
                        unit_amount: 2990
                    })
                })]
            })
        );
    });

    test('errore per elemento non trovato', async () => {
        mockQuery.mockResolvedValue([]);

        await expect(
            stripeService.createCheckoutSession({
                tenantId: 'tenant-1',
                userId: 5,
                itemType: 'course',
                itemId: 999
            })
        ).rejects.toThrow('Elemento non trovato');
    });

    test('errore per elemento gratuito', async () => {
        mockQuery.mockResolvedValue([{ id: 1, title: 'Free Video', price: 0, currency: 'EUR' }]);

        await expect(
            stripeService.createCheckoutSession({
                tenantId: 'tenant-1',
                userId: 5,
                itemType: 'video',
                itemId: 1
            })
        ).rejects.toThrow('Elemento gratuito');
    });
});

// =============================================
// handleWebhook
// =============================================
describe('StripeService.handleWebhook', () => {
    test('gestisce checkout.session.completed', async () => {
        mockQuery.mockResolvedValue([]);

        const fakeEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: {
                        tenant_id: 'tenant-1',
                        user_id: '1',
                        item_type: 'plan_upgrade',
                        plan: 'starter',
                        max_clients: '15'
                    },
                    amount_total: 1900,
                    subscription: 'sub_1'
                }
            }
        };

        mockWebhooksConstructEvent.mockReturnValue(fakeEvent);

        const result = await stripeService.handleWebhook('rawBody', 'sig_header');

        expect(result).toEqual({ received: true, type: 'checkout.session.completed' });
        expect(mockQuery).toHaveBeenCalled();
    });

    test('gestisce payment_intent.payment_failed', async () => {
        const fakeEvent = {
            type: 'payment_intent.payment_failed',
            data: {
                object: {
                    id: 'pi_failed_1',
                    last_payment_error: { message: 'Carta rifiutata' }
                }
            }
        };

        mockWebhooksConstructEvent.mockReturnValue(fakeEvent);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const result = await stripeService.handleWebhook('rawBody', 'sig');
        consoleSpy.mockRestore();

        expect(result).toEqual({ received: true, type: 'payment_intent.payment_failed' });
    });

    test('errore se webhook secret mancante', async () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;

        await expect(
            stripeService.handleWebhook('body', 'sig')
        ).rejects.toThrow('STRIPE_WEBHOOK_SECRET mancante');
    });
});

// =============================================
// createRefund
// =============================================
describe('StripeService.createRefund', () => {

    test('crea rimborso totale', async () => {
        mockRefundsCreate.mockResolvedValue({
            id: 're_test_1',
            amount: 3900,
            status: 'succeeded'
        });

        const result = await stripeService.createRefund('pi_test_123');

        expect(result).toEqual({
            id: 're_test_1',
            amount: 39,
            status: 'succeeded'
        });

        expect(mockRefundsCreate).toHaveBeenCalledWith({
            payment_intent: 'pi_test_123'
        });
    });

    test('crea rimborso parziale', async () => {
        mockRefundsCreate.mockResolvedValue({
            id: 're_test_2',
            amount: 1500,
            status: 'succeeded'
        });

        const result = await stripeService.createRefund('pi_test_456', 15);

        expect(result.amount).toBe(15);

        expect(mockRefundsCreate).toHaveBeenCalledWith({
            payment_intent: 'pi_test_456',
            amount: 1500
        });
    });
});

// =============================================
// init()
// =============================================
describe('StripeService.init', () => {

    test('non reinizializza se gia inizializzato', () => {
        stripeService.init(); // prima volta
        const stripe1 = stripeService.stripe;
        stripeService.init(); // seconda volta - dovrebbe essere no-op
        expect(stripeService.stripe).toBe(stripe1);
    });

    test('non inizializza senza STRIPE_SECRET_KEY', () => {
        stripeService.initialized = false;
        stripeService.stripe = null;
        delete process.env.STRIPE_SECRET_KEY;

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        stripeService.init();
        consoleSpy.mockRestore();

        expect(stripeService.stripe).toBeNull();
    });
});
