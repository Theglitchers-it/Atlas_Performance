/**
 * Tests for GoogleCalendarService
 * handleCallback, syncAppointment, deleteEvent, isConnected, disconnect
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

// Mock googleapis
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockOn = jest.fn();
const mockGenerateAuthUrl = jest.fn();
const mockEventsInsert = jest.fn();
const mockEventsUpdate = jest.fn();
const mockEventsDelete = jest.fn();

jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                getToken: mockGetToken,
                setCredentials: mockSetCredentials,
                on: mockOn,
                generateAuthUrl: mockGenerateAuthUrl
            }))
        },
        calendar: jest.fn().mockReturnValue({
            events: {
                insert: mockEventsInsert,
                update: mockEventsUpdate,
                delete: mockEventsDelete
            }
        })
    }
}));

jest.mock('../src/config/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Set required env vars before requiring the service
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/booking/google/callback';

const googleCalendarService = require('../src/services/googleCalendar.service');

beforeEach(() => {
    jest.clearAllMocks();
    // Reset init state so init() runs fresh
    googleCalendarService.initialized = false;
    googleCalendarService.oauth2Client = null;
});

// =============================================
// handleCallback
// =============================================
describe('GoogleCalendarService.handleCallback', () => {
    test('exchanges code for tokens and saves them in database', async () => {
        mockGetToken.mockResolvedValue({
            tokens: {
                access_token: 'access-123',
                refresh_token: 'refresh-456',
                expiry_date: Date.now() + 3600000
            }
        });
        mockQuery.mockResolvedValue({ affectedRows: 1 });

        const result = await googleCalendarService.handleCallback('auth-code-abc', 42);

        expect(result).toEqual({ success: true });
        expect(mockGetToken).toHaveBeenCalledWith('auth-code-abc');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO user_calendar_tokens'),
            expect.arrayContaining([42, 'access-123', 'refresh-456'])
        );
    });
});

// =============================================
// syncAppointment
// =============================================
describe('GoogleCalendarService.syncAppointment', () => {
    test('creates new Google Calendar event and saves event ID', async () => {
        // Mock _getAuthClient: user has stored tokens
        mockQuery
            .mockResolvedValueOnce([{
                access_token: 'access-tok',
                refresh_token: 'refresh-tok',
                token_expiry: new Date(Date.now() + 3600000)
            }])
            .mockResolvedValue({ affectedRows: 1 });

        mockEventsInsert.mockResolvedValue({
            data: { id: 'google-event-id-999' }
        });

        const appointment = {
            id: 10,
            clientName: 'Mario Rossi',
            notes: 'Sessione gambe',
            startDatetime: '2025-06-01T10:00:00',
            endDatetime: '2025-06-01T11:00:00'
        };

        const result = await googleCalendarService.syncAppointment(1, appointment);

        expect(result).toBe('google-event-id-999');
        expect(mockEventsInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                calendarId: 'primary',
                resource: expect.objectContaining({
                    summary: 'Appuntamento: Mario Rossi'
                })
            })
        );
        // Should save google_event_id to appointments table
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE appointments SET google_event_id = ? WHERE id = ?',
            ['google-event-id-999', 10]
        );
    });

    test('updates existing Google Calendar event when googleEventId is present', async () => {
        mockQuery.mockResolvedValueOnce([{
            access_token: 'access-tok',
            refresh_token: 'refresh-tok',
            token_expiry: new Date(Date.now() + 3600000)
        }]);

        mockEventsUpdate.mockResolvedValue({
            data: { id: 'existing-event-id' }
        });

        const appointment = {
            id: 10,
            googleEventId: 'existing-event-id',
            clientName: 'Luigi Verdi',
            startDatetime: '2025-06-02T14:00:00',
            endDatetime: '2025-06-02T15:00:00'
        };

        const result = await googleCalendarService.syncAppointment(1, appointment);

        expect(result).toBe('existing-event-id');
        expect(mockEventsUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                calendarId: 'primary',
                eventId: 'existing-event-id'
            })
        );
    });

    test('returns null when user has no stored tokens', async () => {
        mockQuery.mockResolvedValueOnce([]); // no tokens

        const result = await googleCalendarService.syncAppointment(1, { id: 5 });

        expect(result).toBeNull();
    });
});

// =============================================
// deleteEvent
// =============================================
describe('GoogleCalendarService.deleteEvent', () => {
    test('deletes event from Google Calendar', async () => {
        mockQuery.mockResolvedValueOnce([{
            access_token: 'access-tok',
            refresh_token: 'refresh-tok',
            token_expiry: new Date(Date.now() + 3600000)
        }]);
        mockEventsDelete.mockResolvedValue({});

        await googleCalendarService.deleteEvent(1, 'event-to-delete');

        expect(mockEventsDelete).toHaveBeenCalledWith(
            expect.objectContaining({
                calendarId: 'primary',
                eventId: 'event-to-delete'
            })
        );
    });

    test('does nothing when googleEventId is falsy', async () => {
        // _getAuthClient is called first; return tokens but googleEventId is null
        mockQuery.mockResolvedValueOnce([{
            access_token: 'access-tok',
            refresh_token: 'refresh-tok',
            token_expiry: new Date(Date.now() + 3600000)
        }]);

        await googleCalendarService.deleteEvent(1, null);

        expect(mockEventsDelete).not.toHaveBeenCalled();
    });
});

// =============================================
// isConnected / disconnect
// =============================================
describe('GoogleCalendarService.isConnected', () => {
    test('returns true when user has calendar tokens', async () => {
        mockQuery.mockResolvedValue([{ id: 1 }]);

        const result = await googleCalendarService.isConnected(42);

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('user_calendar_tokens'),
            [42, 'google']
        );
    });

    test('returns false when user has no calendar tokens', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await googleCalendarService.isConnected(42);

        expect(result).toBe(false);
    });
});

describe('GoogleCalendarService.disconnect', () => {
    test('deletes google calendar tokens for user', async () => {
        mockQuery.mockResolvedValue({ affectedRows: 1 });

        await googleCalendarService.disconnect(42);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM user_calendar_tokens'),
            [42, 'google']
        );
    });
});
