/**
 * Tests for WebPushService
 * sendToUser, sendToTenant, getPublicKey - Web Push API (VAPID)
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn();
jest.mock('web-push', () => ({
    setVapidDetails: (...args) => mockSetVapidDetails(...args),
    sendNotification: (...args) => mockSendNotification(...args)
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Set VAPID env vars before requiring service
process.env.VAPID_PUBLIC_KEY = 'test-vapid-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';
process.env.VAPID_SUBJECT = 'mailto:test@ptsaas.it';

const webpushService = require('../src/services/webpush.service');

beforeEach(() => {
    jest.clearAllMocks();
    // Reset initialized state so init() runs fresh each test
    webpushService.initialized = false;
});

// =============================================
// sendToUser
// =============================================
describe('WebPushService.sendToUser', () => {
    test('returns zero counts when VAPID is not configured', async () => {
        const originalPublic = process.env.VAPID_PUBLIC_KEY;
        process.env.VAPID_PUBLIC_KEY = '';
        webpushService.initialized = false;

        const result = await webpushService.sendToUser(1, { title: 'Test', message: 'Body' });

        expect(result).toEqual({ sent: 0, failed: 0 });
        process.env.VAPID_PUBLIC_KEY = originalPublic;
    });

    test('returns zero counts when user has no web push tokens', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await webpushService.sendToUser(1, { title: 'Test', message: 'Body' });

        expect(result).toEqual({ sent: 0, failed: 0 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('push_device_tokens'),
            expect.arrayContaining([1, 'web'])
        );
    });

    test('sends notification to all user web devices and returns counts', async () => {
        const subscription = { endpoint: 'https://push.example.com', keys: { p256dh: 'key1', auth: 'key2' } };

        mockQuery.mockResolvedValue([
            { id: 10, token: JSON.stringify(subscription), platform: 'web' },
            { id: 11, token: JSON.stringify(subscription), platform: 'web' }
        ]);
        mockSendNotification.mockResolvedValue({});

        const result = await webpushService.sendToUser(1, {
            title: 'Allenamento',
            message: 'Hai un allenamento tra 30 minuti',
            actionUrl: '/workouts/1',
            type: 'reminder'
        });

        expect(result).toEqual({ sent: 2, failed: 0 });
        expect(mockSendNotification).toHaveBeenCalledTimes(2);

        // Verify notification payload structure
        const callPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
        expect(callPayload.title).toBe('Allenamento');
        expect(callPayload.body).toBe('Hai un allenamento tra 30 minuti');
        expect(callPayload.data.url).toBe('/workouts/1');
        expect(callPayload.data.type).toBe('reminder');
    });

    test('removes expired tokens (410 Gone) and counts failures', async () => {
        const subscription = { endpoint: 'https://push.example.com', keys: { p256dh: 'k', auth: 'a' } };

        mockQuery
            .mockResolvedValueOnce([
                { id: 10, token: JSON.stringify(subscription), platform: 'web' },
                { id: 11, token: JSON.stringify(subscription), platform: 'web' }
            ])
            .mockResolvedValue({ affectedRows: 1 }); // DELETE token

        mockSendNotification
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce({ statusCode: 410, message: 'Gone' });

        const result = await webpushService.sendToUser(1, { title: 'Test', message: 'Body' });

        expect(result).toEqual({ sent: 1, failed: 1 });
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM push_device_tokens WHERE id = ?',
            [11]
        );
    });

    test('removes expired tokens (404 Not Found)', async () => {
        const subscription = { endpoint: 'https://push.example.com', keys: { p256dh: 'k', auth: 'a' } };

        mockQuery
            .mockResolvedValueOnce([
                { id: 10, token: JSON.stringify(subscription), platform: 'web' }
            ])
            .mockResolvedValue({ affectedRows: 1 });

        mockSendNotification.mockRejectedValue({ statusCode: 404, message: 'Not Found' });

        const result = await webpushService.sendToUser(1, { title: 'Test' });

        expect(result).toEqual({ sent: 0, failed: 1 });
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM push_device_tokens WHERE id = ?',
            [10]
        );
    });
});

// =============================================
// sendToTenant
// =============================================
describe('WebPushService.sendToTenant', () => {
    test('queries tokens scoped by tenant_id via user join', async () => {
        const subscription = { endpoint: 'https://push.example.com', keys: { p256dh: 'k', auth: 'a' } };

        mockQuery.mockResolvedValue([
            { id: 20, token: JSON.stringify(subscription), user_id: 5, platform: 'web' }
        ]);
        mockSendNotification.mockResolvedValue({});

        const result = await webpushService.sendToTenant('tenant-1', {
            title: 'Annuncio',
            message: 'Nuovo aggiornamento disponibile'
        });

        expect(result).toEqual({ sent: 1, failed: 0 });
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('u.tenant_id = ?');
        expect(params[0]).toBe('tenant-1');
    });

    test('returns zero counts when VAPID is not configured', async () => {
        const originalPublic = process.env.VAPID_PUBLIC_KEY;
        process.env.VAPID_PUBLIC_KEY = '';
        webpushService.initialized = false;

        const result = await webpushService.sendToTenant('tenant-1', { title: 'Test' });

        expect(result).toEqual({ sent: 0, failed: 0 });
        process.env.VAPID_PUBLIC_KEY = originalPublic;
    });

    test('removes invalid tokens during tenant broadcast', async () => {
        const subscription = { endpoint: 'https://push.example.com', keys: { p256dh: 'k', auth: 'a' } };

        mockQuery
            .mockResolvedValueOnce([
                { id: 20, token: JSON.stringify(subscription), user_id: 5, platform: 'web' },
                { id: 21, token: JSON.stringify(subscription), user_id: 6, platform: 'web' }
            ])
            .mockResolvedValue({ affectedRows: 1 });

        mockSendNotification
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce({ statusCode: 410, message: 'Gone' });

        const result = await webpushService.sendToTenant('tenant-1', { title: 'Test' });

        expect(result).toEqual({ sent: 1, failed: 1 });
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM push_device_tokens WHERE id = ?',
            [21]
        );
    });
});

// =============================================
// getPublicKey
// =============================================
describe('WebPushService.getPublicKey', () => {
    test('returns VAPID public key from env', () => {
        const key = webpushService.getPublicKey();

        expect(key).toBe('test-vapid-public-key');
    });

    test('returns null when VAPID_PUBLIC_KEY is not set', () => {
        const original = process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PUBLIC_KEY;

        const key = webpushService.getPublicKey();

        expect(key).toBeNull();
        process.env.VAPID_PUBLIC_KEY = original;
    });
});
