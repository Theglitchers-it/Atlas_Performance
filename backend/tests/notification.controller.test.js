/**
 * Tests for Notification Controller
 * getNotifications, getUnreadCount, markAsRead, markAllAsRead,
 * deleteNotification, registerDeviceToken, removeDeviceToken,
 * getPreferences, updatePreferences
 */

// Mock dependencies
jest.mock('../src/services/notification.service', () => ({
    getByUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    delete: jest.fn(),
    registerDeviceToken: jest.fn(),
    removeDeviceToken: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn()
}));

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

const notificationController = require('../src/controllers/notification.controller');
const notificationService = require('../src/services/notification.service');

// Test helpers
const mockReq = (overrides = {}) => ({
    user: { id: 1, tenantId: 'tenant-1', role: 'tenant_owner' },
    params: {},
    query: {},
    body: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('NotificationController', () => {
    describe('getNotifications', () => {
        test('returns paginated notifications with default options', async () => {
            const result = {
                notifications: [{ id: 1, title: 'Welcome', read: false }],
                total: 1
            };
            notificationService.getByUser.mockResolvedValue(result);

            const req = mockReq();
            const res = mockRes();

            await notificationController.getNotifications(req, res, mockNext);

            expect(notificationService.getByUser).toHaveBeenCalledWith(1, 'tenant-1', {
                page: 1,
                limit: 20,
                unreadOnly: false
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: result
            });
        });

        test('parses pagination and unreadOnly from query', async () => {
            notificationService.getByUser.mockResolvedValue({ notifications: [], total: 0 });

            const req = mockReq({ query: { page: '3', limit: '10', unreadOnly: 'true' } });
            const res = mockRes();

            await notificationController.getNotifications(req, res, mockNext);

            expect(notificationService.getByUser).toHaveBeenCalledWith(1, 'tenant-1', {
                page: 3,
                limit: 10,
                unreadOnly: true
            });
        });

        test('calls next(error) on service failure', async () => {
            const error = new Error('DB error');
            notificationService.getByUser.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await notificationController.getNotifications(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getUnreadCount', () => {
        test('returns unread notification count', async () => {
            notificationService.getUnreadCount.mockResolvedValue(7);

            const req = mockReq();
            const res = mockRes();

            await notificationController.getUnreadCount(req, res, mockNext);

            expect(notificationService.getUnreadCount).toHaveBeenCalledWith(1, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { count: 7 }
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Count failed');
            notificationService.getUnreadCount.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await notificationController.getUnreadCount(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('markAsRead', () => {
        test('marks a single notification as read', async () => {
            notificationService.markAsRead.mockResolvedValue();

            const req = mockReq({ params: { id: '15' } });
            const res = mockRes();

            await notificationController.markAsRead(req, res, mockNext);

            expect(notificationService.markAsRead).toHaveBeenCalledWith(15, 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Notifica letta'
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Mark failed');
            notificationService.markAsRead.mockRejectedValue(error);

            const req = mockReq({ params: { id: '15' } });
            const res = mockRes();

            await notificationController.markAsRead(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('markAllAsRead', () => {
        test('marks all notifications as read', async () => {
            const result = { markedCount: 5 };
            notificationService.markAllAsRead.mockResolvedValue(result);

            const req = mockReq();
            const res = mockRes();

            await notificationController.markAllAsRead(req, res, mockNext);

            expect(notificationService.markAllAsRead).toHaveBeenCalledWith(1, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Tutte le notifiche segnate come lette',
                data: result
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Mark all failed');
            notificationService.markAllAsRead.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await notificationController.markAllAsRead(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('deleteNotification', () => {
        test('deletes a notification successfully', async () => {
            notificationService.delete.mockResolvedValue(true);

            const req = mockReq({ params: { id: '15' } });
            const res = mockRes();

            await notificationController.deleteNotification(req, res, mockNext);

            expect(notificationService.delete).toHaveBeenCalledWith(15, 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Notifica eliminata'
            });
        });

        test('returns 404 when notification not found', async () => {
            notificationService.delete.mockResolvedValue(false);

            const req = mockReq({ params: { id: '999' } });
            const res = mockRes();

            await notificationController.deleteNotification(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Notifica non trovata'
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Delete failed');
            notificationService.delete.mockRejectedValue(error);

            const req = mockReq({ params: { id: '15' } });
            const res = mockRes();

            await notificationController.deleteNotification(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('registerDeviceToken', () => {
        test('registers a device token successfully', async () => {
            notificationService.registerDeviceToken.mockResolvedValue();

            const req = mockReq({
                body: { token: 'firebase-token-123', platform: 'android' }
            });
            const res = mockRes();

            await notificationController.registerDeviceToken(req, res, mockNext);

            expect(notificationService.registerDeviceToken).toHaveBeenCalledWith(1, 'tenant-1', {
                token: 'firebase-token-123',
                platform: 'android'
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Device registrato'
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Registration failed');
            notificationService.registerDeviceToken.mockRejectedValue(error);

            const req = mockReq({ body: { token: 'token-123' } });
            const res = mockRes();

            await notificationController.registerDeviceToken(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('removeDeviceToken', () => {
        test('removes a device token successfully', async () => {
            notificationService.removeDeviceToken.mockResolvedValue();

            const req = mockReq({ body: { token: 'firebase-token-123' } });
            const res = mockRes();

            await notificationController.removeDeviceToken(req, res, mockNext);

            expect(notificationService.removeDeviceToken).toHaveBeenCalledWith(1, 'firebase-token-123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Device rimosso'
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Remove failed');
            notificationService.removeDeviceToken.mockRejectedValue(error);

            const req = mockReq({ body: { token: 'token-123' } });
            const res = mockRes();

            await notificationController.removeDeviceToken(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getPreferences', () => {
        test('returns notification preferences', async () => {
            const preferences = { email: true, push: true, sms: false };
            notificationService.getPreferences.mockResolvedValue(preferences);

            const req = mockReq();
            const res = mockRes();

            await notificationController.getPreferences(req, res, mockNext);

            expect(notificationService.getPreferences).toHaveBeenCalledWith(1, 'tenant-1');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { preferences }
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Preferences fetch failed');
            notificationService.getPreferences.mockRejectedValue(error);

            const req = mockReq();
            const res = mockRes();

            await notificationController.getPreferences(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updatePreferences', () => {
        test('updates notification preferences', async () => {
            notificationService.updatePreferences.mockResolvedValue();

            const req = mockReq({
                body: { email: false, push: true, sms: false }
            });
            const res = mockRes();

            await notificationController.updatePreferences(req, res, mockNext);

            expect(notificationService.updatePreferences).toHaveBeenCalledWith(1, 'tenant-1', {
                email: false,
                push: true,
                sms: false
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Preferenze aggiornate'
            });
        });

        test('calls next(error) on failure', async () => {
            const error = new Error('Update failed');
            notificationService.updatePreferences.mockRejectedValue(error);

            const req = mockReq({ body: {} });
            const res = mockRes();

            await notificationController.updatePreferences(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
