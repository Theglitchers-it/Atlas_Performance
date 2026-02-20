/**
 * useNetwork Composable
 * Monitora stato connettivita con supporto nativo Capacitor
 *
 * Nota: NON usa onMounted/onUnmounted perche puo essere chiamato
 * da contesti non-component (store Pinia, altri composable).
 * Usare init() esplicitamente e cleanup() quando serve.
 */

import { ref, type Ref } from 'vue'

interface NetworkListener {
    remove: () => void
}

interface NetworkReturn {
    isOnline: Ref<boolean>
    connectionType: Ref<string>
    init: () => Promise<void>
    cleanup: () => void
}

// Stato condiviso (singleton) - cosi tutti i consumatori vedono lo stesso stato
const isOnline = ref<boolean>(navigator.onLine)
const connectionType = ref<string>('unknown')

let networkListener: NetworkListener | null = null
let initialized = false

const init = async (): Promise<void> => {
    if (initialized) return
    initialized = true

    // Prova Capacitor Network plugin (piu affidabile su native)
    if ((window as any).Capacitor?.isNativePlatform()) {
        try {
            const { Network } = await import('@capacitor/network' as any)

            // Stato iniziale
            const status = await Network.getStatus()
            isOnline.value = status.connected
            connectionType.value = status.connectionType

            // Ascolta cambiamenti
            networkListener = await Network.addListener('networkStatusChange', (status: any) => {
                isOnline.value = status.connected
                connectionType.value = status.connectionType

                // Dispatch eventi globali per compatibilita con codice esistente
                window.dispatchEvent(new CustomEvent(
                    status.connected ? 'app-online' : 'app-offline'
                ))
            })

            return
        } catch (e) {
            if (import.meta.env.DEV) console.log('[NETWORK] Capacitor Network non disponibile, fallback a browser API')
        }
    }

    // Fallback: browser events
    const handleOnline = (): void => {
        isOnline.value = true
        connectionType.value = 'unknown'
    }
    const handleOffline = (): void => {
        isOnline.value = false
        connectionType.value = 'none'
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup per browser
    networkListener = {
        remove: () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }
}

const cleanup = (): void => {
    if (networkListener?.remove) {
        networkListener.remove()
        networkListener = null
    }
    initialized = false
}

export function useNetwork(): NetworkReturn {
    return {
        isOnline,
        connectionType,
        init,
        cleanup
    }
}
