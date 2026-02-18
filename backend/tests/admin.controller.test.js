/**
 * Unit Tests - Admin Controller
 * Test per updateTenantPlan, updateTenantStatus, getStats
 */

jest.mock('../src/config/database', () => ({
    query: jest.fn()
}));

const { query } = require('../src/config/database');
const {
    updateTenantPlan,
    updateTenantStatus,
    getStats,
    getTenants,
    getBillingStats
} = require('../src/controllers/admin.controller');

// Helper per creare mock req/res
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

// =============================================
// updateTenantPlan
// =============================================
describe('Admin - updateTenantPlan', () => {

    test('aggiorna piano a professional con max_clients', async () => {
        query.mockResolvedValue({ affectedRows: 1 });
        const req = {
            params: { id: 'tenant-uuid-1' },
            body: { subscription_plan: 'professional', max_clients: 50 }
        };
        const res = mockRes();

        await updateTenantPlan(req, res);

        expect(query).toHaveBeenCalledWith(
            'UPDATE tenants SET subscription_plan = ?, max_clients = ? WHERE id = ?',
            ['professional', 50, 'tenant-uuid-1']
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });

    test('aggiorna piano a starter con max_clients default', async () => {
        query.mockResolvedValue({ affectedRows: 1 });
        const req = {
            params: { id: 'tenant-uuid-2' },
            body: { subscription_plan: 'starter' }
        };
        const res = mockRes();

        await updateTenantPlan(req, res);

        expect(query).toHaveBeenCalledWith(
            'UPDATE tenants SET subscription_plan = ?, max_clients = ? WHERE id = ?',
            ['starter', 5, 'tenant-uuid-2']
        );
    });

    test('aggiorna piano a enterprise', async () => {
        query.mockResolvedValue({ affectedRows: 1 });
        const req = {
            params: { id: 'tenant-1' },
            body: { subscription_plan: 'enterprise', max_clients: 999 }
        };
        const res = mockRes();

        await updateTenantPlan(req, res);

        expect(query).toHaveBeenCalledWith(
            expect.any(String),
            ['enterprise', 999, 'tenant-1']
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('rifiuta piano non valido', async () => {
        const req = {
            params: { id: 'tenant-uuid-3' },
            body: { subscription_plan: 'platinum', max_clients: 100 }
        };
        const res = mockRes();

        await updateTenantPlan(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Piano non valido'
            })
        );
        expect(query).not.toHaveBeenCalled();
    });

    test('rifiuta piano vuoto', async () => {
        const req = {
            params: { id: 'tenant-uuid-4' },
            body: { subscription_plan: '', max_clients: 10 }
        };
        const res = mockRes();

        await updateTenantPlan(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('gestisce errore database', async () => {
        query.mockRejectedValue(new Error('DB connection failed'));
        const req = {
            params: { id: 'tenant-1' },
            body: { subscription_plan: 'professional', max_clients: 50 }
        };
        const res = mockRes();

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        await updateTenantPlan(req, res);
        consoleSpy.mockRestore();

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// =============================================
// updateTenantStatus
// =============================================
describe('Admin - updateTenantStatus', () => {

    test('aggiorna stato a active', async () => {
        query.mockResolvedValue({ affectedRows: 1 });
        const req = {
            params: { id: 'tenant-uuid-1' },
            body: { status: 'active' }
        };
        const res = mockRes();

        await updateTenantStatus(req, res);

        expect(query).toHaveBeenCalledWith(
            'UPDATE tenants SET subscription_status = ? WHERE id = ?',
            ['active', 'tenant-uuid-1']
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });

    test('aggiorna stato a cancelled', async () => {
        query.mockResolvedValue({ affectedRows: 1 });
        const req = {
            params: { id: 'tenant-1' },
            body: { status: 'cancelled' }
        };
        const res = mockRes();

        await updateTenantStatus(req, res);

        expect(query).toHaveBeenCalledWith(
            expect.any(String),
            ['cancelled', 'tenant-1']
        );
    });

    test('rifiuta stato non valido', async () => {
        const req = {
            params: { id: 'tenant-uuid-2' },
            body: { status: 'invalid_status' }
        };
        const res = mockRes();

        await updateTenantStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
        expect(query).not.toHaveBeenCalled();
    });

    test('gestisce errore database', async () => {
        query.mockRejectedValue(new Error('DB error'));
        const req = {
            params: { id: 'tenant-1' },
            body: { status: 'active' }
        };
        const res = mockRes();

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        await updateTenantStatus(req, res);
        consoleSpy.mockRestore();

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// =============================================
// getStats
// =============================================
describe('Admin - getStats', () => {

    test('restituisce statistiche globali', async () => {
        query
            .mockResolvedValueOnce([{ totalTenants: 10, activeTenants: 7, trialTenants: 3 }])
            .mockResolvedValueOnce([{ totalUsers: 150 }])
            .mockResolvedValueOnce([{ totalRevenue: 5000 }])
            .mockResolvedValueOnce([{ monthlyRevenue: 1200 }]);

        const req = {};
        const res = mockRes();

        await getStats(req, res);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                totalTenants: 10,
                activeTenants: 7,
                trialTenants: 3,
                totalUsers: 150,
                totalRevenue: 5000,
                monthlyRevenue: 1200
            }
        });
    });

    test('restituisce zero per valori nulli', async () => {
        query
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const req = {};
        const res = mockRes();

        await getStats(req, res);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                totalTenants: 0,
                activeTenants: 0,
                trialTenants: 0,
                totalUsers: 0,
                totalRevenue: 0,
                monthlyRevenue: 0
            }
        });
    });

    test('gestisce errore database', async () => {
        query.mockRejectedValue(new Error('DB error'));
        const req = {};
        const res = mockRes();

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        await getStats(req, res);
        consoleSpy.mockRestore();

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// =============================================
// getTenants
// =============================================
describe('Admin - getTenants', () => {

    test('lista tenant con paginazione', async () => {
        query
            .mockResolvedValueOnce([{ total: 2 }])
            .mockResolvedValueOnce([
                { id: 'tenant-1', business_name: 'Gym A', subscription_plan: 'free' },
                { id: 'tenant-2', business_name: 'Gym B', subscription_plan: 'professional' }
            ]);

        const req = { query: { page: 1, limit: 20 } };
        const res = mockRes();

        await getTenants(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    tenants: expect.any(Array),
                    pagination: expect.objectContaining({
                        total: 2,
                        page: 1
                    })
                })
            })
        );
    });

    test('filtra tenant per piano', async () => {
        query
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([{ id: 'tenant-2', subscription_plan: 'professional' }]);

        const req = { query: { page: 1, limit: 20, plan: 'professional' } };
        const res = mockRes();

        await getTenants(req, res);

        // Verifica che il filtro piano sia stato applicato
        const countCall = query.mock.calls[0][0];
        expect(countCall).toContain('subscription_plan');
    });
});

// =============================================
// getBillingStats
// =============================================
describe('Admin - getBillingStats', () => {

    test('restituisce statistiche fatturazione', async () => {
        query
            .mockResolvedValueOnce([{ monthlyRevenue: 1500 }])
            .mockResolvedValueOnce([{ yearlyRevenue: 18000 }])
            .mockResolvedValueOnce([{ pendingPayments: 3 }])
            .mockResolvedValueOnce([{ activeSubscriptions: 8 }]);

        const req = {};
        const res = mockRes();

        await getBillingStats(req, res);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                monthlyRevenue: 1500,
                yearlyRevenue: 18000,
                pendingPayments: 3,
                activeSubscriptions: 8
            }
        });
    });
});
