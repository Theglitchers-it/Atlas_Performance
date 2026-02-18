/**
 * Tests for Notification Service
 * create, createBulk, getByUser, markAsRead, markAllAsRead, delete, templates, preferences
 */

const mockQuery = jest.fn();
jest.mock('../src/config/database', () => ({
    query: (...args) => mockQuery(...args)
}));

// Mock webpush service
jest.mock('../src/services/webpush.service', () => ({
    sendToUser: jest.fn().mockResolvedValue(null)
}));

// Mock fcm service
jest.mock('../src/services/fcm.service', () => ({
    sendToUser: jest.fn().mockResolvedValue(null)
}));

const notificationService = require('../src/services/notification.service');

beforeEach(() => {
    mockQuery.mockReset();
    notificationService.setIO(null);
});

describe('NotificationService - create', () => {
    test('creates notification and returns id', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await notificationService.create({
            tenantId: 'tenant-1',
            userId: 10,
            type: 'workout',
            title: 'Nuovo allenamento',
            message: 'Hai un nuovo allenamento assegnato',
            actionUrl: '/workouts/1'
        });

        expect(result).toEqual({ id: 1 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO notifications'),
            expect.any(Array)
        );
    });

    test('emits socket event when io is set', async () => {
        const mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };
        notificationService.setIO(mockIo);
        mockQuery.mockResolvedValueOnce({ insertId: 5 });

        await notificationService.create({
            tenantId: 'tenant-1',
            userId: 10,
            type: 'info',
            title: 'Test',
            message: 'Test message'
        });

        expect(mockIo.to).toHaveBeenCalledWith('user_10');
        expect(mockIo.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
            id: 5,
            title: 'Test'
        }));
    });

    test('works without socket io', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await notificationService.create({
            tenantId: 'tenant-1',
            userId: 10,
            type: 'info',
            title: 'Test',
            message: 'Test message'
        });

        expect(result).toEqual({ id: 1 });
    });

    test('defaults type to info and priority to normal', async () => {
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        await notificationService.create({
            tenantId: 'tenant-1',
            userId: 10,
            title: 'Test',
            message: 'Test message'
        });

        // Check the params passed to query include 'info' and 'normal'
        const params = mockQuery.mock.calls[0][1];
        expect(params).toContain('info');
        expect(params).toContain('normal');
    });
});

describe('NotificationService - createBulk', () => {
    test('creates bulk notifications for multiple users', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 3 });

        const result = await notificationService.createBulk('tenant-1', {
            type: 'announcement',
            title: 'Annuncio',
            message: 'Nuovo orario palestra',
            userIds: [1, 2, 3]
        });

        expect(result.count).toBe(3);
    });

    test('returns 0 for empty userIds', async () => {
        const result = await notificationService.createBulk('tenant-1', {
            type: 'info',
            title: 'Test',
            message: 'Test',
            userIds: []
        });

        expect(result.count).toBe(0);
    });
});

describe('NotificationService - getByUser', () => {
    test('returns paginated notifications', async () => {
        mockQuery
            .mockResolvedValueOnce([
                { id: 1, title: 'Notifica 1', is_read: false },
                { id: 2, title: 'Notifica 2', is_read: true }
            ])
            .mockResolvedValueOnce([{ total: 2 }]);

        const result = await notificationService.getByUser(10, 'tenant-1', { page: 1, limit: 20 });

        expect(result.notifications).toHaveLength(2);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBe(2);
    });

    test('filters unread only', async () => {
        mockQuery
            .mockResolvedValueOnce([{ id: 1, title: 'Unread', is_read: false }])
            .mockResolvedValueOnce([{ total: 1 }]);

        await notificationService.getByUser(10, 'tenant-1', { unreadOnly: true });

        // Both queries should contain the unread filter
        expect(mockQuery.mock.calls[0][0]).toContain('is_read = FALSE');
        expect(mockQuery.mock.calls[1][0]).toContain('is_read = FALSE');
    });
});

describe('NotificationService - getUnreadCount', () => {
    test('returns unread count', async () => {
        mockQuery.mockResolvedValueOnce([{ count: 5 }]);

        const count = await notificationService.getUnreadCount(10, 'tenant-1');

        expect(count).toBe(5);
    });

    test('returns 0 when no unread', async () => {
        mockQuery.mockResolvedValueOnce([{ count: 0 }]);

        const count = await notificationService.getUnreadCount(10, 'tenant-1');

        expect(count).toBe(0);
    });
});

describe('NotificationService - markAsRead', () => {
    test('marks notification as read', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        await notificationService.markAsRead(1, 10);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('is_read = TRUE'),
            expect.arrayContaining([1, 10])
        );
    });
});

describe('NotificationService - markAllAsRead', () => {
    test('marks all notifications as read', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 5 });

        const result = await notificationService.markAllAsRead(10, 'tenant-1');

        expect(result.count).toBe(5);
    });
});

describe('NotificationService - delete', () => {
    test('deletes notification', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        const result = await notificationService.delete(1, 10);

        expect(result).toBe(true);
    });

    test('returns false if not found', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        const result = await notificationService.delete(999, 10);

        expect(result).toBe(false);
    });
});

describe('NotificationService - deleteOld', () => {
    test('deletes old notifications', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 10 });

        const result = await notificationService.deleteOld('tenant-1', 90);

        expect(result.deleted).toBe(10);
    });

    test('defaults to 90 days', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 0 });

        await notificationService.deleteOld('tenant-1');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            ['tenant-1', 90]
        );
    });
});

describe('NotificationService - sendFromTemplate', () => {
    test('renders template variables and creates notification', async () => {
        // getTemplate: query returns array, [0] is used
        mockQuery.mockResolvedValueOnce([{
            type: 'workout',
            title: 'Ciao {{name}}!',
            message: 'Il tuo allenamento {{workout}} è pronto',
            action_url: '/workouts/{{workoutId}}',
            priority: 'high'
        }]);
        // create: INSERT query returns result object
        mockQuery.mockResolvedValueOnce({ insertId: 1 });

        const result = await notificationService.sendFromTemplate(
            'workout_ready',
            10,
            'tenant-1',
            { name: 'Mario', workout: 'Push Day', workoutId: 42 }
        );

        expect(result).toEqual({ id: 1 });
    });

    test('returns null if template not found', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await notificationService.sendFromTemplate('nonexistent', 10, 'tenant-1', {});

        expect(result).toBeNull();
    });
});

describe('NotificationService - preferences', () => {
    test('getPreferences returns stored preferences', async () => {
        mockQuery.mockResolvedValueOnce([{
            email_enabled: true,
            push_enabled: false,
            in_app_enabled: true
        }]);

        const prefs = await notificationService.getPreferences(10, 'tenant-1');

        expect(prefs).toBeDefined();
        expect(prefs.email_enabled).toBe(true);
    });

    test('getPreferences returns defaults if not found', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const prefs = await notificationService.getPreferences(10, 'tenant-1');

        expect(prefs).toBeDefined();
        expect(prefs.email_enabled).toBe(true); // Default
    });

    test('updatePreferences upserts', async () => {
        mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

        await notificationService.updatePreferences(10, 'tenant-1', {
            emailEnabled: true,
            pushEnabled: false
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO'),
            expect.any(Array)
        );
    });
});
