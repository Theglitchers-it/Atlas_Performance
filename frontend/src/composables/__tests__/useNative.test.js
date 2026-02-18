/**
 * Tests for useNative composable
 * Tests platform detection, mobile detection, and native feature wrappers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let useNative

describe('useNative', () => {
    beforeEach(async () => {
        vi.resetModules()
        window.Capacitor = undefined

        // Default to desktop width
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 })

        const mod = await import('../useNative.js')
        useNative = mod.useNative
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return all expected properties and methods', () => {
        const result = useNative()

        expect(result).toHaveProperty('isNativeApp')
        expect(result).toHaveProperty('isNative')
        expect(result).toHaveProperty('platform')
        expect(result).toHaveProperty('isMobile')
        expect(result).toHaveProperty('isIOS')
        expect(result).toHaveProperty('isAndroid')
        expect(result).toHaveProperty('isWeb')
        expect(result).toHaveProperty('hapticFeedback')
        expect(result).toHaveProperty('hapticTap')
        expect(result).toHaveProperty('hapticSuccess')
        expect(result).toHaveProperty('hapticError')
        expect(result).toHaveProperty('setStatusBarStyle')
        expect(result).toHaveProperty('hideKeyboard')
    })

    it('should detect web platform when Capacitor is not present', () => {
        const { isNativeApp, platform, isWeb } = useNative()

        expect(isNativeApp.value).toBe(false)
        expect(platform.value).toBe('web')
        expect(isWeb.value).toBe(true)
    })

    it('should detect non-mobile on wide viewport', () => {
        const { isMobile } = useNative()
        expect(isMobile.value).toBe(false)
    })

    it('should detect mobile on narrow viewport', async () => {
        vi.resetModules()
        window.Capacitor = undefined
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 })

        const mod = await import('../useNative.js')
        const { isMobile } = mod.useNative()
        expect(isMobile.value).toBe(true)
    })

    it('should report isIOS false and isAndroid false on web', () => {
        const { isIOS, isAndroid } = useNative()
        expect(isIOS.value).toBe(false)
        expect(isAndroid.value).toBe(false)
    })

    it('should not trigger haptic feedback on web', async () => {
        const { hapticFeedback } = useNative()
        // Should not throw, just return silently
        await expect(hapticFeedback('light')).resolves.toBeUndefined()
    })

    it('should not throw on setStatusBarStyle in web mode', async () => {
        const { setStatusBarStyle } = useNative()
        await expect(setStatusBarStyle('dark')).resolves.toBeUndefined()
    })

    it('should not throw on hideKeyboard in web mode', async () => {
        const { hideKeyboard } = useNative()
        await expect(hideKeyboard()).resolves.toBeUndefined()
    })

    it('should have isNative as alias for isNativeApp', () => {
        const { isNative, isNativeApp } = useNative()
        expect(isNative).toBe(isNativeApp)
    })

    it('hapticTap, hapticSuccess, hapticError should be functions', () => {
        const { hapticTap, hapticSuccess, hapticError } = useNative()
        expect(typeof hapticTap).toBe('function')
        expect(typeof hapticSuccess).toBe('function')
        expect(typeof hapticError).toBe('function')
    })

    describe('native platform detection', () => {
        it('should detect Android native platform', async () => {
            vi.resetModules()
            Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 })
            window.Capacitor = {
                isNativePlatform: () => true,
                getPlatform: () => 'android'
            }

            const mod = await import('../useNative.js')
            const { isNativeApp, platform, isAndroid, isIOS, isWeb } = mod.useNative()

            expect(isNativeApp.value).toBe(true)
            expect(platform.value).toBe('android')
            expect(isAndroid.value).toBe(true)
            expect(isIOS.value).toBe(false)
            expect(isWeb.value).toBe(false)
        })

        it('should detect iOS native platform', async () => {
            vi.resetModules()
            Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 })
            window.Capacitor = {
                isNativePlatform: () => true,
                getPlatform: () => 'ios'
            }

            const mod = await import('../useNative.js')
            const { isNativeApp, platform, isIOS, isAndroid, isWeb } = mod.useNative()

            expect(isNativeApp.value).toBe(true)
            expect(platform.value).toBe('ios')
            expect(isIOS.value).toBe(true)
            expect(isAndroid.value).toBe(false)
            expect(isWeb.value).toBe(false)
        })
    })
})
