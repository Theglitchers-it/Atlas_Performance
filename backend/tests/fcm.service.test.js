/**
 * Tests for FCMService
 * sendToUser, sendToTenant - Firebase Cloud Messaging push notifications
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const mockSend = jest.fn();
const mockGetMessaging = jest.fn();
jest.mock('../src/config/firebase', () => ({
    getMessaging: () => mockGetMessaging()
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

const fcmService = require('../src/services/fcm.service');

beforeEach(() => {
    jest.clearAllMocks();
    mockGetMessaging.mockReturnValue({ send: mockSend });
});

// =============================================
// sendToUser
// =============================================
describe('FCMService.sendToUser', () => {
    test('returns zero counts when messaging is not available', async () => {
        mockGetMessaging.mockReturnValue(null);

        const result = await fcmService.sendToUser(1, { title: 'Test', message: 'Hello' });

        expect(result).toEqual({ sent: 0, failed: 0 });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('returns zero counts when user has no device tokens', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await fcmService.sendToUser(1, { title: 'Test', message: 'Hello' });

        expect(result).toEqual({ sent: 0, failed: 0 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('push_device_tokens'),
            expect.arrayContaining([1, 'android', 'ios'])
        );
    });

    test('sends notification to all user devices and returns counts', async () => {
        mockQuery.mockResolvedValue([
            { id: 10, token: 'fcm-token-android', platform: 'android' },
            { id: 11, token: 'fcm-token-ios', platform: 'ios' }
        ]);
        mockSend.mockResolvedValue({ messageId: 'msg-1' });

        const result = await fcmService.sendToUser(1, {
            title: 'Allenamento',
            message: 'Il tuo allenamento inizia tra 30 minuti',
            actionUrl: '/workouts/1',
            type: 'reminder'
        });

        expect(result).toEqual({ sent: 2, failed: 0 });
        expect(mockSend).toHaveBeenCalledTimes(2);

        // Verify Android-specific config
        const androidCall = mockSend.mock.calls[0][0];
        expect(androidCall.token).toBe('fcm-token-android');
        expect(androidCall.android).toBeDefined();
        expect(androidCall.android.priority).toBe('high');

        // Verify iOS-specific config
        const iosCall = mockSend.mock.calls[1][0];
        expect(iosCall.token).toBe('fcm-token-ios');
        expect(iosCall.apns).toBeDefined();
        expect(iosCall.apns.payload.aps.sound).toBe('default');
    });

    test('removes invalid tokens and counts failures', async () => {
        mockQuery
            .mockResolvedValueOnce([
                { id: 10, token: 'valid-token', platform: 'android' },
                { id: 11, token: 'invalid-token', platform: 'android' }
            ])
            .mockResolvedValue({ affectedRows: 1 }); // DELETE query

        mockSend
            .mockResolvedValueOnce({ messageId: 'msg-1' })
            .mockRejectedValueOnce({ code: 'messaging/registration-token-not-registered' });

        const result = await fcmService.sendToUser(1, { title: 'Test', message: 'Body' });

        expect(result).toEqual({ sent: 1, failed: 1 });
        // Verify invalid token was deleted
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM push_device_tokens WHERE id = ?',
            [11]
        );
    });
});

// =============================================
// sendToTenant
// =============================================
describe('FCMService.sendToTenant', () => {
    test('returns zero counts when messaging is not available', async () => {
        mockGetMessaging.mockReturnValue(null);

        const result = await fcmService.sendToTenant('tenant-1', { title: 'News', message: 'Update' });

        expect(result).toEqual({ sent: 0, failed: 0 });
    });

    test('queries tokens scoped by tenant_id via user join', async () => {
        mockQuery.mockResolvedValue([
            { id: 20, token: 'tok-a', user_id: 5, platform: 'android' }
        ]);
        mockSend.mockResolvedValue({ messageId: 'msg-2' });

        const result = await fcmService.sendToTenant('tenant-1', {
            title: 'Annuncio',
            message: 'Nuova funzionalita disponibile'
        });

        expect(result).toEqual({ sent: 1, failed: 0 });
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('u.tenant_id = ?');
        expect(params[0]).toBe('tenant-1');
    });

    test('removes invalid tokens during tenant broadcast', async () => {
        mockQuery
            .mockResolvedValueOnce([
                { id: 20, token: 'tok-ok', user_id: 5, platform: 'ios' },
                { id: 21, token: 'tok-bad', user_id: 6, platform: 'android' }
            ])
            .mockResolvedValue({ affectedRows: 1 });

        mockSend
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce({ code: 'messaging/invalid-registration-token' });

        const result = await fcmService.sendToTenant('tenant-1', { title: 'Test' });

        expect(result).toEqual({ sent: 1, failed: 1 });
        expect(mockQuery).toHaveBeenCalledWith(
            'DELETE FROM push_device_tokens WHERE id = ?',
            [21]
        );
    });
});
