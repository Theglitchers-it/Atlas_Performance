/**
 * Tests for OutlookCalendarService
 * handleCallback, syncAppointment, deleteEvent, isConnected, disconnect
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

// Mock @azure/identity
jest.mock('@azure/identity', () => ({
    ConfidentialClientApplication: jest.fn()
}));

// Mock Microsoft Graph client
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiUpdate = jest.fn();
const mockApiDelete = jest.fn();
const mockApi = jest.fn().mockImplementation(() => ({
    get: mockApiGet,
    post: mockApiPost,
    update: mockApiUpdate,
    delete: mockApiDelete
}));

jest.mock('@microsoft/microsoft-graph-client', () => ({
    Client: {
        init: jest.fn().mockImplementation(() => ({
            api: mockApi
        }))
    }
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock global fetch for token exchange
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Set required env vars
process.env.MICROSOFT_CLIENT_ID = 'test-ms-client-id';
process.env.MICROSOFT_CLIENT_SECRET = 'test-ms-client-secret';
process.env.MICROSOFT_TENANT_ID = 'common';
process.env.MICROSOFT_REDIRECT_URI = 'http://localhost:3000/api/booking/outlook/callback';

const outlookService = require('../src/services/outlookCalendar.service');

beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    outlookService.initialized = false;
});

// =============================================
// handleCallback
// =============================================
describe('OutlookCalendarService.handleCallback', () => {
    test('exchanges code for tokens and saves them in database', async () => {
        mockFetch.mockResolvedValue({
            json: async () => ({
                access_token: 'ms-access-123',
                refresh_token: 'ms-refresh-456',
                expires_in: 3600
            })
        });
        mockQuery.mockResolvedValue({ affectedRows: 1 });

        const result = await outlookService.handleCallback('auth-code-ms', 42);

        expect(result).toEqual({ success: true });
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('oauth2/v2.0/token'),
            expect.objectContaining({ method: 'POST' })
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO user_calendar_tokens'),
            expect.arrayContaining([42, 'ms-access-123', 'ms-refresh-456'])
        );
    });

    test('throws error when token response contains error', async () => {
        mockFetch.mockResolvedValue({
            json: async () => ({
                error: 'invalid_grant',
                error_description: 'Code has expired'
            })
        });

        await expect(
            outlookService.handleCallback('expired-code', 42)
        ).rejects.toThrow('OAuth error');
    });
});

// =============================================
// syncAppointment
// =============================================
describe('OutlookCalendarService.syncAppointment', () => {
    test('creates new Outlook event and saves event ID', async () => {
        // Mock _getGraphClient: user has non-expired tokens
        mockQuery
            .mockResolvedValueOnce([{
                access_token: 'ms-access-tok',
                refresh_token: 'ms-refresh-tok',
                token_expiry: new Date(Date.now() + 3600000) // not expired
            }])
            .mockResolvedValue({ affectedRows: 1 });

        mockApiPost.mockResolvedValue({ id: 'outlook-event-id-123' });

        const appointment = {
            id: 15,
            clientName: 'Mario Rossi',
            notes: 'Upper body',
            startDatetime: '2025-06-01T10:00:00',
            endDatetime: '2025-06-01T11:00:00'
        };

        const result = await outlookService.syncAppointment(1, appointment);

        expect(result).toBe('outlook-event-id-123');
        expect(mockApi).toHaveBeenCalledWith('/me/events');
        expect(mockApiPost).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: 'Appuntamento: Mario Rossi'
            })
        );
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE appointments SET outlook_event_id = ? WHERE id = ?',
            ['outlook-event-id-123', 15]
        );
    });

    test('updates existing Outlook event when outlookEventId is present', async () => {
        mockQuery.mockResolvedValueOnce([{
            access_token: 'ms-access-tok',
            refresh_token: 'ms-refresh-tok',
            token_expiry: new Date(Date.now() + 3600000)
        }]);

        mockApiUpdate.mockResolvedValue({ id: 'existing-outlook-id' });

        const appointment = {
            id: 15,
            outlookEventId: 'existing-outlook-id',
            clientName: 'Luigi Verdi',
            startDatetime: '2025-06-02T09:00:00',
            endDatetime: '2025-06-02T10:00:00'
        };

        const result = await outlookService.syncAppointment(1, appointment);

        expect(result).toBe('existing-outlook-id');
        expect(mockApi).toHaveBeenCalledWith('/me/events/existing-outlook-id');
    });

    test('returns null when user has no stored tokens', async () => {
        mockQuery.mockResolvedValueOnce([]); // no tokens

        const result = await outlookService.syncAppointment(1, { id: 5 });

        expect(result).toBeNull();
    });
});

// =============================================
// deleteEvent
// =============================================
describe('OutlookCalendarService.deleteEvent', () => {
    test('deletes event from Outlook Calendar', async () => {
        mockQuery.mockResolvedValueOnce([{
            access_token: 'ms-access-tok',
            refresh_token: 'ms-refresh-tok',
            token_expiry: new Date(Date.now() + 3600000)
        }]);
        mockApiDelete.mockResolvedValue({});

        await outlookService.deleteEvent(1, 'outlook-event-to-delete');

        expect(mockApi).toHaveBeenCalledWith('/me/events/outlook-event-to-delete');
        expect(mockApiDelete).toHaveBeenCalled();
    });

    test('does nothing when outlookEventId is falsy', async () => {
        // _getGraphClient is called first; return tokens but outlookEventId is null
        mockQuery.mockResolvedValueOnce([{
            access_token: 'ms-access-tok',
            refresh_token: 'ms-refresh-tok',
            token_expiry: new Date(Date.now() + 3600000)
        }]);

        await outlookService.deleteEvent(1, null);

        expect(mockApiDelete).not.toHaveBeenCalled();
    });
});

// =============================================
// isConnected / disconnect
// =============================================
describe('OutlookCalendarService.isConnected', () => {
    test('returns true when user has outlook calendar tokens', async () => {
        mockQuery.mockResolvedValue([{ id: 1 }]);

        const result = await outlookService.isConnected(42);

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('user_calendar_tokens'),
            [42, 'outlook']
        );
    });

    test('returns false when user has no outlook tokens', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await outlookService.isConnected(42);

        expect(result).toBe(false);
    });
});

describe('OutlookCalendarService.disconnect', () => {
    test('deletes outlook calendar tokens for user', async () => {
        mockQuery.mockResolvedValue({ affectedRows: 1 });

        await outlookService.disconnect(42);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM user_calendar_tokens'),
            [42, 'outlook']
        );
    });
});
