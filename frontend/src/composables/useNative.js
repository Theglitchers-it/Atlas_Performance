/**
 * useNative Composable
 * Rileva ambiente nativo (Capacitor) e gestisce feature native
 */

import { ref, computed, onMounted } from 'vue'

export function useNative() {
    const isNativeApp = ref(false)
    const platform = ref('web')
    const isMobile = ref(false)

    // Check if running in Capacitor
    const checkNative = () => {
        try {
            // Dynamic import to avoid errors on web
            if (window.Capacitor) {
                isNativeApp.value = window.Capacitor.isNativePlatform()
                platform.value = window.Capacitor.getPlatform()
            }
        } catch (e) {
            isNativeApp.value = false
            platform.value = 'web'
        }

        // Check mobile viewport
        isMobile.value = window.innerWidth < 768
    }

    // Check on resize
    const handleResize = () => {
        isMobile.value = window.innerWidth < 768
    }

    onMounted(() => {
        checkNative()
        window.addEventListener('resize', handleResize)
    })

    // Computed
    const isIOS = computed(() => platform.value === 'ios')
    const isAndroid = computed(() => platform.value === 'android')
    const isWeb = computed(() => platform.value === 'web')

    // Haptic feedback (if available)
    const hapticFeedback = async (type = 'light') => {
        if (!isNativeApp.value) return

        try {
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
            const styles = {
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
    const setStatusBarStyle = async (style = 'dark') => {
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
    const hideKeyboard = async () => {
        if (!isNativeApp.value) return

        try {
            const { Keyboard } = await import('@capacitor/keyboard')
            await Keyboard.hide()
        } catch (e) {
            console.log('Keyboard plugin not available')
        }
    }

    return {
        isNativeApp,
        isNative: isNativeApp, // Alias
        platform,
        isMobile,
        isIOS,
        isAndroid,
        isWeb,
        hapticFeedback,
        setStatusBarStyle,
        hideKeyboard
    }
}
