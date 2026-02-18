/**
 * Tests for useNetwork composable
 * Tests network connectivity monitoring with browser fallback (non-native mode)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to reset the module-level singleton state between tests
let useNetwork

describe('useNetwork', () => {
    beforeEach(async () => {
        // Reset module state by re-importing fresh
        vi.resetModules()

        // Ensure web mode (no Capacitor)
        window.Capacitor = undefined
        Object.defineProperty(navigator, 'onLine', { writable: true, value: true })

        const mod = await import('../useNetwork.js')
        useNetwork = mod.useNetwork
    })

    afterEach(() => {
        const { cleanup } = useNetwork()
        cleanup()
        vi.restoreAllMocks()
    })

    it('should return initial reactive state', () => {
        const { isOnline, connectionType, init, cleanup } = useNetwork()

        expect(isOnline.value).toBe(true)
        expect(connectionType.value).toBe('unknown')
        expect(typeof init).toBe('function')
        expect(typeof cleanup).toBe('function')
    })

    it('should reflect navigator.onLine initial value', async () => {
        vi.resetModules()
        Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
        window.Capacitor = undefined

        const mod = await import('../useNetwork.js')
        const { isOnline } = mod.useNetwork()

        expect(isOnline.value).toBe(false)
    })

    it('should set up browser event listeners on init (web mode)', async () => {
        const addSpy = vi.spyOn(window, 'addEventListener')

        const { init } = useNetwork()
        await init()

        expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))
        expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should update isOnline when browser fires online/offline events', async () => {
        const { init, isOnline } = useNetwork()
        await init()

        // Simulate going offline
        window.dispatchEvent(new Event('offline'))
        expect(isOnline.value).toBe(false)

        // Simulate going online
        window.dispatchEvent(new Event('online'))
        expect(isOnline.value).toBe(true)
    })

    it('should update connectionType on offline event', async () => {
        const { init, connectionType } = useNetwork()
        await init()

        window.dispatchEvent(new Event('offline'))
        expect(connectionType.value).toBe('none')
    })

    it('should only initialize once (singleton pattern)', async () => {
        const addSpy = vi.spyOn(window, 'addEventListener')

        const { init } = useNetwork()
        await init()
        const callCount = addSpy.mock.calls.length

        await init()
        expect(addSpy.mock.calls.length).toBe(callCount)
    })

    it('should remove event listeners on cleanup', async () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener')

        const { init, cleanup } = useNetwork()
        await init()
        cleanup()

        expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
        expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should allow re-initialization after cleanup', async () => {
        const addSpy = vi.spyOn(window, 'addEventListener')

        const { init, cleanup } = useNetwork()
        await init()
        cleanup()

        const beforeCount = addSpy.mock.calls.filter(c => c[0] === 'online').length
        await init()
        const afterCount = addSpy.mock.calls.filter(c => c[0] === 'online').length

        expect(afterCount).toBe(beforeCount + 1)
    })

    it('should share state across multiple useNetwork() calls', async () => {
        const instance1 = useNetwork()
        const instance2 = useNetwork()

        await instance1.init()

        window.dispatchEvent(new Event('offline'))
        expect(instance1.isOnline.value).toBe(false)
        expect(instance2.isOnline.value).toBe(false)
    })
})
