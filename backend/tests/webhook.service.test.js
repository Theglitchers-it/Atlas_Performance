/**
 * Tests for WebhookService
 * create, list, update, delete, trigger, _deliver, getDeliveries
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock global fetch for webhook delivery
const mockFetch = jest.fn();
global.fetch = mockFetch;

const webhookService = require('../src/services/webhook.service');

beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
});

// =============================================
// create
// =============================================
describe('WebhookService.create', () => {
    test('creates webhook with tenant_id scoping and returns id + secret', async () => {
        mockQuery.mockResolvedValue({ insertId: 7 });

        const result = await webhookService.create('tenant-1', {
            url: 'https://example.com/webhook',
            events: ['client.created', 'payment.completed']
        });

        expect(result.id).toBe(7);
        expect(result.secret).toMatch(/^whsec_/);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO webhooks');
        expect(params[0]).toBe('tenant-1');
        expect(params[1]).toBe('https://example.com/webhook');
        expect(JSON.parse(params[2])).toEqual(['client.created', 'payment.completed']);
    });
});

// =============================================
// list
// =============================================
describe('WebhookService.list', () => {
    test('returns webhooks scoped by tenant_id', async () => {
        const mockWebhooks = [
            { id: 1, url: 'https://hook1.com', events: '["client.created"]', is_active: true },
            { id: 2, url: 'https://hook2.com', events: '["payment.completed"]', is_active: false }
        ];
        mockQuery.mockResolvedValue(mockWebhooks);

        const result = await webhookService.list('tenant-1');

        expect(result).toHaveLength(2);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE tenant_id = ?'),
            ['tenant-1']
        );
    });
});

// =============================================
// trigger
// =============================================
describe('WebhookService.trigger', () => {
    test('sends webhook only to subscribed active webhooks for the tenant', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, url: 'https://hook1.com', events: '["client.created"]', secret: 'whsec_abc123' },
            { id: 2, url: 'https://hook2.com', events: '["payment.completed"]', secret: 'whsec_def456' }
        ]);

        // Mock _deliver to avoid real fetch calls
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => 'OK'
        });
        mockQuery.mockResolvedValue({}); // For INSERT delivery log + UPDATE webhook stats

        await webhookService.trigger('tenant-1', 'client.created', { clientId: 5 });

        // Should query active webhooks for the tenant
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('tenant_id = ? AND is_active = TRUE'),
            ['tenant-1']
        );
    });

    test('skips webhooks not subscribed to the event type', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 1, url: 'https://hook.com', events: '["payment.completed"]', secret: 'whsec_abc' }
        ]);

        await webhookService.trigger('tenant-1', 'client.created', { clientId: 5 });

        // fetch should not be called since webhook doesn't subscribe to client.created
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// =============================================
// _deliver
// =============================================
describe('WebhookService._deliver', () => {
    test('delivers webhook with HMAC signature and logs success', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => 'OK'
        });
        mockQuery.mockResolvedValue({});

        const webhook = { id: 1, url: 'https://hook.com', secret: 'whsec_testsecret' };

        const result = await webhookService._deliver(webhook, 'client.created', { clientId: 5 });

        expect(result.success).toBe(true);
        expect(result.status).toBe(200);

        // Verify HMAC signature header
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[1].headers['X-Webhook-Signature']).toMatch(/^sha256=/);
        expect(fetchCall[1].headers['X-Webhook-Event']).toBe('client.created');

        // Verify delivery log was saved
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO webhook_deliveries'),
            expect.arrayContaining([1, 'client.created'])
        );

        // Verify webhook stats updated (success resets failure_count)
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('failure_count = 0'),
            [1]
        );
    });

    test('increments failure_count on delivery failure', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error'
        });
        mockQuery.mockResolvedValue({});

        const webhook = { id: 2, url: 'https://bad-hook.com', secret: 'whsec_test' };

        const result = await webhookService._deliver(webhook, 'payment.failed', { paymentId: 3 });

        expect(result.success).toBe(false);
        expect(result.status).toBe(500);

        // Verify failure_count incremented
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('failure_count = failure_count + 1'),
            [2]
        );

        // Verify auto-disable check after 10 failures
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('is_active = FALSE'),
            [2]
        );
    });

    test('handles network errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
        mockQuery.mockResolvedValue({});

        const webhook = { id: 3, url: 'https://unreachable.com', secret: 'whsec_test' };

        const result = await webhookService._deliver(webhook, 'client.created', {});

        expect(result.success).toBe(false);
        expect(result.status).toBeNull();
    });
});

// =============================================
// getDeliveries
// =============================================
describe('WebhookService.getDeliveries', () => {
    test('returns delivery logs scoped by tenant_id ownership', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1 }]) // Webhook ownership check
            .mockResolvedValueOnce([
                { id: 100, event_type: 'client.created', response_status: 200, success: true, attempted_at: '2025-06-01' }
            ]);

        const result = await webhookService.getDeliveries(1, 'tenant-1');

        expect(result).toHaveLength(1);
        expect(result[0].event_type).toBe('client.created');

        // Verify tenant ownership check
        const ownershipQuery = mockQuery.mock.calls[0];
        expect(ownershipQuery[0]).toContain('tenant_id = ?');
        expect(ownershipQuery[1]).toContain('tenant-1');
    });

    test('returns empty array when webhook does not belong to tenant', async () => {
        mockQuery.mockResolvedValueOnce([]); // No matching webhook for this tenant

        const result = await webhookService.getDeliveries(999, 'tenant-1');

        expect(result).toEqual([]);
    });
});

// =============================================
// delete
// =============================================
describe('WebhookService.delete', () => {
    test('deletes webhook scoped by tenant_id', async () => {
        mockQuery.mockResolvedValue({ affectedRows: 1 });

        await webhookService.delete(5, 'tenant-1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM webhooks WHERE id = ? AND tenant_id = ?'),
            [5, 'tenant-1']
        );
    });
});
