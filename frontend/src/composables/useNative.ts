/**
 * useNative Composable
 * Rileva ambiente nativo (Capacitor) e gestisce feature native
 *
 * L'inizializzazione Capacitor e viewport e sincrona (non aspetta onMounted).
 * Il resize listener viene aggiunto via onMounted solo se siamo in un component.
 */

import { ref, computed, onMounted, getCurrentInstance, type Ref, type ComputedRef } from 'vue'

type HapticType = 'light' | 'medium' | 'heavy'
type StatusBarStyle = 'dark' | 'light'
type PlatformType = 'ios' | 'android' | 'web'

// Inizializzazione sincrona - eseguita una sola volta al primo import
const _isNativeApp = ((): boolean => {
    try {
        return window.Capacitor?.isNativePlatform() || false
    } catch { return false }
})()

const _platform = ((): PlatformType => {
    try {
        return (window.Capacitor?.getPlatform() as PlatformType) || 'web'
    } catch { return 'web' }
})()

// Allineato con Tailwind `lg:` breakpoint (1024px) — la sidebar usa `hidden lg:block`
const _isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false

// Stato condiviso
const isNativeApp = ref<boolean>(_isNativeApp)
const platform = ref<PlatformType>(_platform)
const isMobile = ref<boolean>(_isMobile)

// Resize listener (aggiunto una sola volta)
let resizeListenerAdded = false
const handleResize = (): void => {
    isMobile.value = window.innerWidth < 1024
}

interface UseNativeReturn {
    isNativeApp: Ref<boolean>
    isNative: Ref<boolean>
    platform: Ref<PlatformType>
    isMobile: Ref<boolean>
    isIOS: ComputedRef<boolean>
    isAndroid: ComputedRef<boolean>
    isWeb: ComputedRef<boolean>
    hapticFeedback: (type?: HapticType) => Promise<void>
    hapticTap: () => Promise<void>
    hapticSuccess: () => Promise<void>
    hapticError: () => Promise<void>
    setStatusBarStyle: (style?: StatusBarStyle) => Promise<void>
    hideKeyboard: () => Promise<void>
}

export function useNative(): UseNativeReturn {
    // Aggiungi resize listener solo se siamo in un component setup e non gia aggiunto
    if (!resizeListenerAdded && getCurrentInstance()) {
        onMounted(() => {
            if (!resizeListenerAdded) {
                resizeListenerAdded = true
                window.addEventListener('resize', handleResize)
            }
        })
    }

    // Computed
    const isIOS = computed<boolean>(() => platform.value === 'ios')
    const isAndroid = computed<boolean>(() => platform.value === 'android')
    const isWeb = computed<boolean>(() => platform.value === 'web')

    // Haptic feedback (if available)
    const hapticFeedback = async (type: HapticType = 'light'): Promise<void> => {
        if (!isNativeApp.value) return

        try {
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
            const styles: Record<HapticType, any> = {
                light: ImpactStyle.Light,
                medium: ImpactStyle.Medium,
                heavy: ImpactStyle.Heavy
            }
            await Haptics.impact({ style: styles[type] || ImpactStyle.Light })
        } catch (e) {
            console.log('Haptics not available')
        }
    }

    // Status bar control
    const setStatusBarStyle = async (style: StatusBarStyle = 'dark'): Promise<void> => {
        if (!isNativeApp.value) return

        try {
            const { StatusBar, Style } = await import('@capacitor/status-bar')
            await StatusBar.setStyle({
                style: style === 'dark' ? Style.Dark : Style.Light
            })
        } catch (e) {
            console.log('StatusBar not available')
        }
    }

    // Keyboard info
    const hideKeyboard = async (): Promise<void> => {
        if (!isNativeApp.value) return

        try {
            const { Keyboard } = await import('@capacitor/keyboard')
            await Keyboard.hide()
        } catch (e) {
            console.log('Keyboard plugin not available')
        }
    }

    // Haptic shortcuts per azioni comuni
    const hapticTap = (): Promise<void> => hapticFeedback('light')
    const hapticSuccess = (): Promise<void> => hapticFeedback('medium')
    const hapticError = (): Promise<void> => hapticFeedback('heavy')

    return {
        isNativeApp,
        isNative: isNativeApp, // Alias
        platform,
        isMobile,
        isIOS,
        isAndroid,
        isWeb,
        hapticFeedback,
        hapticTap,
        hapticSuccess,
        hapticError,
        setStatusBarStyle,
        hideKeyboard
    }
}
