/**
 * Tests for useAppLifecycle composable
 * Tests app lifecycle management: foreground/background, back button, deep links
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the router module
vi.mock('@/router', () => ({
    default: {
        push: vi.fn(),
        back: vi.fn()
    }
}))

let useAppLifecycle

describe('useAppLifecycle', () => {
    beforeEach(async () => {
        vi.resetModules()
        window.Capacitor = undefined
        vi.clearAllMocks()

        vi.doMock('@/router', () => ({
            default: {
                push: vi.fn(),
                back: vi.fn()
            }
        }))

        const mod = await import('../useAppLifecycle.js')
        useAppLifecycle = mod.useAppLifecycle
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return isAppActive, init, and cleanup', () => {
        const result = useAppLifecycle()

        expect(result).toHaveProperty('isAppActive')
        expect(result).toHaveProperty('init')
        expect(result).toHaveProperty('cleanup')
        expect(result.isAppActive.value).toBe(true)
    })

    it('should do nothing on init when not on native platform', async () => {
        const { init, isAppActive } = useAppLifecycle()
        await init()

        expect(isAppActive.value).toBe(true)
    })

    describe('native lifecycle', () => {
        let mockApp
        let listeners

        beforeEach(() => {
            listeners = {}
            mockApp = {
                addListener: vi.fn((event, callback) => {
                    listeners[event] = callback
                    return Promise.resolve({ remove: vi.fn() })
                }),
                exitApp: vi.fn()
            }

            window.Capacitor = {
                isNativePlatform: () => true,
                getPlatform: () => 'android'
            }
        })

        it('should register all lifecycle listeners on init', async () => {
            vi.resetModules()
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init()

            expect(mockApp.addListener).toHaveBeenCalledWith('appStateChange', expect.any(Function))
            expect(mockApp.addListener).toHaveBeenCalledWith('backButton', expect.any(Function))
            expect(mockApp.addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function))
        })

        it('should update isAppActive on appStateChange', async () => {
            vi.resetModules()
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init, isAppActive } = mod.useAppLifecycle()
            await init()

            const stateCallback = listeners['appStateChange']

            // Going to background
            stateCallback({ isActive: false })
            expect(isAppActive.value).toBe(false)

            // Coming back to foreground
            stateCallback({ isActive: true })
            expect(isAppActive.value).toBe(true)
        })

        it('should call onResume callback when app returns to foreground', async () => {
            vi.resetModules()
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const onResume = vi.fn()
            const onPause = vi.fn()

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init({ onResume, onPause })

            const stateCallback = listeners['appStateChange']

            stateCallback({ isActive: true })
            expect(onResume).toHaveBeenCalled()
            expect(onPause).not.toHaveBeenCalled()
        })

        it('should call onPause callback when app goes to background', async () => {
            vi.resetModules()
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const onResume = vi.fn()
            const onPause = vi.fn()

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init({ onResume, onPause })

            const stateCallback = listeners['appStateChange']

            stateCallback({ isActive: false })
            expect(onPause).toHaveBeenCalled()
            expect(onResume).not.toHaveBeenCalled()
        })

        it('should navigate back on back button when canGoBack is true', async () => {
            vi.resetModules()
            const mockRouter = { push: vi.fn(), back: vi.fn() }
            vi.doMock('@/router', () => ({ default: mockRouter }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init()

            const backCallback = listeners['backButton']
            backCallback({ canGoBack: true })

            expect(mockRouter.back).toHaveBeenCalled()
        })

        it('should exit app on back button when canGoBack is false', async () => {
            vi.resetModules()
            const mockRouter = { push: vi.fn(), back: vi.fn() }
            vi.doMock('@/router', () => ({ default: mockRouter }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init()

            const backCallback = listeners['backButton']
            backCallback({ canGoBack: false })

            expect(mockApp.exitApp).toHaveBeenCalled()
        })

        it('should handle deep links by navigating to the path', async () => {
            vi.resetModules()
            const mockRouter = { push: vi.fn(), back: vi.fn() }
            vi.doMock('@/router', () => ({ default: mockRouter }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init()

            const urlCallback = listeners['appUrlOpen']
            urlCallback({ url: 'https://atlas.example.com/workouts/123' })

            expect(mockRouter.push).toHaveBeenCalledWith('/workouts/123')
        })

        it('should handle malformed deep links gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            vi.resetModules()
            const mockRouter = { push: vi.fn(), back: vi.fn() }
            vi.doMock('@/router', () => ({ default: mockRouter }))
            vi.doMock('@capacitor/app', () => ({
                App: mockApp
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()
            await init()

            const urlCallback = listeners['appUrlOpen']
            // This should fail URL parsing
            urlCallback({ url: '' })

            expect(consoleSpy).toHaveBeenCalled()
        })

        it('should clean up all listeners on cleanup', async () => {
            const removeFns = [vi.fn(), vi.fn(), vi.fn()]
            let callIdx = 0
            const mockAppWithRemove = {
                ...mockApp,
                addListener: vi.fn((event, callback) => {
                    listeners[event] = callback
                    return Promise.resolve({ remove: removeFns[callIdx++] })
                })
            }

            vi.resetModules()
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/app', () => ({
                App: mockAppWithRemove
            }))

            const mod = await import('../useAppLifecycle.js')
            const { init, cleanup } = mod.useAppLifecycle()
            await init()

            cleanup()

            removeFns.forEach(fn => {
                expect(fn).toHaveBeenCalled()
            })
        })

        it('should handle App plugin not available gracefully', async () => {
            vi.resetModules()
            vi.doMock('@/router', () => ({
                default: { push: vi.fn(), back: vi.fn() }
            }))
            vi.doMock('@capacitor/app', () => {
                throw new Error('Plugin not installed')
            })

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            const mod = await import('../useAppLifecycle.js')
            const { init } = mod.useAppLifecycle()

            await expect(init()).resolves.toBeUndefined()
            expect(consoleSpy).toHaveBeenCalled()
        })
    })
})
