/**
 * useAppLifecycle Composable
 * Gestisce lifecycle app nativa: foreground/background, back button, deep links
 *
 * Nota: usa import diretto del router invece di useRouter()
 * per poter essere chiamato da qualsiasi contesto.
 */

import { ref, type Ref } from 'vue'
import router from '@/router'

interface AppLifecycleOptions {
    onResume?: () => void
    onPause?: () => void
}

interface PluginListener {
    remove: () => Promise<void> | void
}

interface UseAppLifecycleReturn {
    isAppActive: Ref<boolean>
    init: (options?: AppLifecycleOptions) => Promise<void>
    cleanup: () => void
}

export function useAppLifecycle(): UseAppLifecycleReturn {
    const isAppActive = ref<boolean>(true)
    const listeners: PluginListener[] = []

    /**
     * Inizializza gestione lifecycle
     * @param options
     * @param options.onResume - Callback quando app torna in foreground
     * @param options.onPause - Callback quando app va in background
     */
    const init = async (options: AppLifecycleOptions = {}): Promise<void> => {
        if (!window.Capacitor?.isNativePlatform()) return

        try {
            const { App } = await import('@capacitor/app')

            // Cambio stato app (foreground/background)
            const stateListener = await App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
                isAppActive.value = isActive

                if (isActive) {
                    // App tornata in foreground: sync dati, refresh notifiche
                    console.log('[LIFECYCLE] App tornata in foreground')
                    if (options.onResume) options.onResume()
                } else {
                    // App andata in background
                    console.log('[LIFECYCLE] App andata in background')
                    if (options.onPause) options.onPause()
                }
            })
            listeners.push(stateListener)

            // Back button (Android)
            const backListener = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                if (canGoBack) {
                    router.back()
                } else {
                    App.exitApp()
                }
            })
            listeners.push(backListener)

            // Deep links (atlas://workout/123)
            const urlListener = await App.addListener('appUrlOpen', ({ url }: { url: string }) => {
                console.log('[LIFECYCLE] Deep link:', url)
                try {
                    const urlObj = new URL(url)
                    const path = urlObj.pathname || urlObj.hash?.replace('#', '') || '/'
                    if (path && path !== '/') {
                        router.push(path)
                    }
                } catch (e) {
                    console.error('[LIFECYCLE] Errore parsing deep link:', e)
                }
            })
            listeners.push(urlListener)

        } catch (error) {
            console.log('[LIFECYCLE] Plugin App non disponibile:', (error as Error).message)
        }
    }

    const cleanup = (): void => {
        listeners.forEach(l => l?.remove?.())
        listeners.length = 0
    }

    return {
        isAppActive,
        init,
        cleanup
    }
}
