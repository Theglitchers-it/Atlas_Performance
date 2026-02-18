/**
 * Tests for usePushNotifications composable
 * Tests push notification registration and unregistration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the API module
vi.mock('@/services/api', () => ({
    default: {
        post: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} })
    }
}))

// Mock the router module
vi.mock('@/router', () => ({
    default: {
        push: vi.fn(),
        back: vi.fn()
    }
}))

let usePushNotifications

describe('usePushNotifications', () => {
    beforeEach(async () => {
        vi.resetModules()
        window.Capacitor = undefined
        vi.clearAllMocks()

        // Re-setup mocks after resetModules
        vi.doMock('@/services/api', () => ({
            default: {
                post: vi.fn().mockResolvedValue({ data: {} }),
                delete: vi.fn().mockResolvedValue({ data: {} })
            }
        }))

        vi.doMock('@/router', () => ({
            default: {
                push: vi.fn(),
                back: vi.fn()
            }
        }))

        const mod = await import('../usePushNotifications.js')
        usePushNotifications = mod.usePushNotifications
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return register, unregister, permissionGranted, and fcmToken', () => {
        const result = usePushNotifications()

        expect(typeof result.register).toBe('function')
        expect(typeof result.unregister).toBe('function')
        expect(result.permissionGranted.value).toBe(false)
        expect(result.fcmToken.value).toBeNull()
    })

    it('should return false from register when not on native platform', async () => {
        const { register } = usePushNotifications()
        const result = await register()

        expect(result).toBe(false)
    })

    it('should not throw on unregister when not on native platform', async () => {
        const { unregister } = usePushNotifications()
        await expect(unregister()).resolves.toBeUndefined()
    })

    describe('native registration', () => {
        let mockPushNotifications
        let listeners

        beforeEach(() => {
            listeners = {}
            mockPushNotifications = {
                requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
                register: vi.fn().mockResolvedValue(undefined),
                addListener: vi.fn((event, callback) => {
                    listeners[event] = callback
                    return { remove: vi.fn() }
                }),
                removeAllListeners: vi.fn()
            }

            window.Capacitor = {
                isNativePlatform: () => true,
                getPlatform: () => 'android'
            }
        })

        it('should register for push notifications on native', async () => {
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            // Re-import to pick up the mock
            vi.resetModules()
            vi.doMock('@/services/api', () => ({
                default: {
                    post: vi.fn().mockResolvedValue({ data: {} }),
                    delete: vi.fn().mockResolvedValue({ data: {} })
                }
            }))
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register, permissionGranted } = mod.usePushNotifications()

            const result = await register()

            expect(result).toBe(true)
            expect(permissionGranted.value).toBe(true)
            expect(mockPushNotifications.requestPermissions).toHaveBeenCalled()
            expect(mockPushNotifications.register).toHaveBeenCalled()
            expect(mockPushNotifications.addListener).toHaveBeenCalledWith('registration', expect.any(Function))
            expect(mockPushNotifications.addListener).toHaveBeenCalledWith('registrationError', expect.any(Function))
            expect(mockPushNotifications.addListener).toHaveBeenCalledWith('pushNotificationReceived', expect.any(Function))
            expect(mockPushNotifications.addListener).toHaveBeenCalledWith('pushNotificationActionPerformed', expect.any(Function))
        })

        it('should return false when permission is denied', async () => {
            mockPushNotifications.requestPermissions.mockResolvedValue({ receive: 'denied' })

            vi.resetModules()
            vi.doMock('@/services/api', () => ({
                default: { post: vi.fn(), delete: vi.fn() }
            }))
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register, permissionGranted } = mod.usePushNotifications()

            const result = await register()

            expect(result).toBe(false)
            expect(permissionGranted.value).toBe(false)
        })

        it('should handle registration errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            mockPushNotifications.requestPermissions.mockRejectedValue(new Error('Plugin error'))

            vi.resetModules()
            vi.doMock('@/services/api', () => ({
                default: { post: vi.fn(), delete: vi.fn() }
            }))
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register } = mod.usePushNotifications()

            const result = await register()

            expect(result).toBe(false)
            expect(consoleSpy).toHaveBeenCalled()
        })

        it('should send token to backend when registration event fires', async () => {
            vi.resetModules()
            const mockApi = { post: vi.fn().mockResolvedValue({ data: {} }), delete: vi.fn() }
            vi.doMock('@/services/api', () => ({ default: mockApi }))
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register, fcmToken } = mod.usePushNotifications()

            await register()

            // Simulate the registration event
            const registrationCallback = listeners['registration']
            expect(registrationCallback).toBeDefined()

            await registrationCallback({ value: 'test-fcm-token-12345678901234567890' })

            expect(fcmToken.value).toBe('test-fcm-token-12345678901234567890')
            expect(mockApi.post).toHaveBeenCalledWith('/notifications/device-token', expect.objectContaining({
                token: 'test-fcm-token-12345678901234567890',
                platform: 'android'
            }))
        })

        it('should navigate on notification action when URL is valid', async () => {
            vi.resetModules()
            const mockRouter = { push: vi.fn(), back: vi.fn() }
            vi.doMock('@/services/api', () => ({
                default: { post: vi.fn().mockResolvedValue({}), delete: vi.fn() }
            }))
            vi.doMock('@/router', () => ({ default: mockRouter }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register } = mod.usePushNotifications()
            await register()

            // Simulate tapping a notification
            const actionCallback = listeners['pushNotificationActionPerformed']
            expect(actionCallback).toBeDefined()

            actionCallback({
                notification: { data: { url: '/workouts/123' } }
            })

            expect(mockRouter.push).toHaveBeenCalledWith('/workouts/123')
        })

        it('should not navigate for invalid URLs', async () => {
            vi.resetModules()
            const mockRouter = { push: vi.fn(), back: vi.fn() }
            vi.doMock('@/services/api', () => ({
                default: { post: vi.fn().mockResolvedValue({}), delete: vi.fn() }
            }))
            vi.doMock('@/router', () => ({ default: mockRouter }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register } = mod.usePushNotifications()
            await register()

            const actionCallback = listeners['pushNotificationActionPerformed']

            // URL with double slashes should be rejected
            actionCallback({
                notification: { data: { url: '//evil.com/hack' } }
            })
            expect(mockRouter.push).not.toHaveBeenCalled()

            // Root URL should be ignored
            actionCallback({
                notification: { data: { url: '/' } }
            })
            expect(mockRouter.push).not.toHaveBeenCalled()
        })

        it('should dispatch CustomEvent on foreground notification', async () => {
            vi.resetModules()
            vi.doMock('@/services/api', () => ({
                default: { post: vi.fn().mockResolvedValue({}), delete: vi.fn() }
            }))
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            const mod = await import('../usePushNotifications.js')
            const { register } = mod.usePushNotifications()
            await register()

            const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
            const receivedCallback = listeners['pushNotificationReceived']

            receivedCallback({ title: 'Test Notification', body: 'Hello' })

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'push-notification-received'
                })
            )
        })
    })

    describe('unregister (native)', () => {
        it('should remove token from backend and clear listeners', async () => {
            const mockPushNotifications = {
                requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
                register: vi.fn().mockResolvedValue(undefined),
                addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
                removeAllListeners: vi.fn()
            }

            vi.resetModules()
            const mockApi = {
                post: vi.fn().mockResolvedValue({ data: {} }),
                delete: vi.fn().mockResolvedValue({ data: {} })
            }
            vi.doMock('@/services/api', () => ({ default: mockApi }))
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/push-notifications', () => ({
                PushNotifications: mockPushNotifications
            }))

            window.Capacitor = {
                isNativePlatform: () => true,
                getPlatform: () => 'android'
            }

            const mod = await import('../usePushNotifications.js')
            const { register, unregister, fcmToken, permissionGranted } = mod.usePushNotifications()

            await register()

            // Manually set token as if registration callback fired
            fcmToken.value = 'some-token'

            await unregister()

            expect(mockApi.delete).toHaveBeenCalledWith('/notifications/device-token', {
                data: { token: 'some-token' }
            })
            expect(mockPushNotifications.removeAllListeners).toHaveBeenCalled()
            expect(fcmToken.value).toBeNull()
            expect(permissionGranted.value).toBe(false)
        })
    })
})
