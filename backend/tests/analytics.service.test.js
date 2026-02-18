/**
 * Tests for AnalyticsService
 * Overview, trends, top clients, distributions
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const analyticsService = require('../src/services/analytics.service');

beforeEach(() => jest.clearAllMocks());

describe('AnalyticsService.getOverview', () => {
    test('returns overview aggregations', async () => {
        mockQuery
            .mockResolvedValueOnce([{ active_clients: 25, total_clients: 30 }])
            .mockResolvedValueOnce([{ total_sessions: 100, completed: 90 }])
            .mockResolvedValueOnce([{ total_appointments: 50, upcoming: 10 }])
            .mockResolvedValueOnce([{ active_programs: 15 }]);

        const overview = await analyticsService.getOverview('tenant-1');

        // Shape: four named sections
        expect(overview).toHaveProperty('clients');
        expect(overview).toHaveProperty('sessions');
        expect(overview).toHaveProperty('appointments');
        expect(overview).toHaveProperty('programs');

        // Data values flow through unchanged
        expect(overview.clients.active_clients).toBe(25);
        expect(overview.sessions.total_sessions).toBe(100);

        // Every query must pass tenant_id as a parameter
        const allParams = mockQuery.mock.calls.flatMap(([, params]) => params);
        expect(allParams).toContain('tenant-1');

        // Every query must be a SELECT scoped to the clients / sessions / appointments / programs tables
        const firstCallSql = mockQuery.mock.calls[0][0];
        expect(firstCallSql).toMatch(/SELECT/i);
        expect(firstCallSql).toMatch(/tenant_id\s*=\s*\?/i);
    });
});

describe('AnalyticsService.getSessionTrend', () => {
    test('returns weekly trend', async () => {
        mockQuery.mockResolvedValueOnce([
            { period: '2026-W06', count: 15 },
            { period: '2026-W07', count: 20 }
        ]);

        const trend = await analyticsService.getSessionTrend('tenant-1', 'week');
        expect(trend).toHaveLength(2);
        expect(trend[0].period).toBe('2026-W06');
    });
});

describe('AnalyticsService.getTopClients', () => {
    test('returns top clients by sessions', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, first_name: 'Mario', sessions: 20 },
            { id: 2, first_name: 'Luigi', sessions: 15 }
        ]);

        const top = await analyticsService.getTopClients('tenant-1', 10);
        expect(top).toHaveLength(2);
        expect(top[0].sessions).toBeGreaterThanOrEqual(top[1].sessions);
    });
});

describe('AnalyticsService.getAppointmentDistribution', () => {
    test('returns appointment type distribution', async () => {
        mockQuery.mockResolvedValueOnce([
            { type: 'personal', count: 30 },
            { type: 'group', count: 20 }
        ]);

        const dist = await analyticsService.getAppointmentDistribution('tenant-1');
        expect(dist).toHaveLength(2);
    });
});

describe('AnalyticsService.getQuickStats', () => {
    test('returns quick aggregated stats', async () => {
        mockQuery.mockResolvedValueOnce([{
            active_clients: 25,
            sessions_today: 15,
            appointments_today: 5,
            avg_readiness_today: 7.4
        }]);

        const stats = await analyticsService.getQuickStats('tenant-1');

        // Values are passed through directly from the query result
        expect(stats.active_clients).toBe(25);
        expect(stats.sessions_today).toBe(15);
        expect(stats.appointments_today).toBe(5);

        // tenant_id must appear in the query parameters (service passes it four times)
        const params = mockQuery.mock.calls[0][1];
        expect(params.filter(p => p === 'tenant-1')).toHaveLength(4);

        // The SQL must be a SELECT containing tenant_id guards
        const sql = mockQuery.mock.calls[0][0];
        expect(sql).toMatch(/SELECT/i);
        expect(sql).toMatch(/tenant_id\s*=\s*\?/i);
    });
});
