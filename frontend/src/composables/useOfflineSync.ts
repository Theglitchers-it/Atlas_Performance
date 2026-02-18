/**
 * useOfflineSync Composable
 * Engine per queue e sync azioni offline
 * Salva azioni in Preferences (native) o localStorage (web) e le replay quando online
 */

import { ref, watch, type Ref } from 'vue'
import api from '@/services/api'
import { useNetwork } from './useNetwork'

const STORAGE_KEY = 'offline_sync_queue'

export interface OfflineAction {
    type: string
    endpoint: string
    method: string
    data?: Record<string, any>
    description?: string
}

interface OfflineQueueEntry extends OfflineAction {
    id: string
    timestamp: string
    retries: number
    nextRetryAt?: number
}

interface UseOfflineSyncReturn {
    pendingActions: Ref<OfflineQueueEntry[]>
    isSyncing: Ref<boolean>
    init: () => Promise<void>
    queueAction: (action: OfflineAction) => Promise<OfflineQueueEntry>
    syncQueue: () => Promise<void>
    removeAction: (actionId: string) => Promise<void>
    clearQueue: () => Promise<void>
}

// Stato condiviso tra tutte le istanze
const pendingActions = ref<OfflineQueueEntry[]>([])
const isSyncing = ref<boolean>(false)

let initialized = false

export function useOfflineSync(): UseOfflineSyncReturn {
    const { isOnline } = useNetwork()

    /**
     * Inizializza: carica queue da storage
     */
    const init = async (): Promise<void> => {
        if (initialized) return
        initialized = true

        // Inizializza network monitoring (safe da chiamare anche fuori da component)
        const { init: initNetwork } = useNetwork()
        await initNetwork()

        await loadQueue()

        // Auto-sync quando torna online
        watch(isOnline, (online: boolean) => {
            if (online && pendingActions.value.length > 0) {
                syncQueue()
            }
        })
    }

    /**
     * Carica queue da storage persistente
     */
    const loadQueue = async (): Promise<void> => {
        try {
            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                const { value } = await Preferences.get({ key: STORAGE_KEY })
                pendingActions.value = value ? JSON.parse(value) : []
            } else {
                const stored = localStorage.getItem(STORAGE_KEY)
                pendingActions.value = stored ? JSON.parse(stored) : []
            }
        } catch (e) {
            console.error('[OFFLINE] Errore caricamento queue:', e)
            pendingActions.value = []
        }
    }

    /**
     * Salva queue in storage persistente
     */
    const persistQueue = async (): Promise<void> => {
        try {
            const data = JSON.stringify(pendingActions.value)
            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                await Preferences.set({ key: STORAGE_KEY, value: data })
            } else {
                localStorage.setItem(STORAGE_KEY, data)
            }
        } catch (e) {
            console.error('[OFFLINE] Errore salvataggio queue:', e)
        }
    }

    /**
     * Aggiungi azione alla queue offline
     * @param action
     * @param action.type - Tipo azione (es. 'checkin', 'message', 'workout-log')
     * @param action.endpoint - Endpoint API (es. '/readiness')
     * @param action.method - Metodo HTTP ('POST', 'PUT', etc.)
     * @param action.data - Dati da inviare
     * @param action.description - Descrizione leggibile
     */
    const queueAction = async (action: OfflineAction): Promise<OfflineQueueEntry> => {
        const entry: OfflineQueueEntry = {
            ...action,
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            retries: 0
        }
        pendingActions.value.push(entry)
        await persistQueue()
        console.log(`[OFFLINE] Azione in coda: ${action.type} -> ${action.endpoint}`)
        return entry
    }

    /**
     * Sincronizza queue - replay azioni in ordine
     */
    const syncQueue = async (): Promise<void> => {
        if (isSyncing.value || pendingActions.value.length === 0) return
        isSyncing.value = true

        console.log(`[OFFLINE] Sync avviato: ${pendingActions.value.length} azioni in coda`)

        const toProcess = [...pendingActions.value]
        const completed: string[] = []

        const RETRY_DELAYS_MS = [0, 5000, 15000, 60000, 300000] // immediate, 5s, 15s, 1m, 5m
        const now = Date.now()

        for (const action of toProcess) {
            // Exponential backoff: skip if not ready for retry
            if (action.nextRetryAt && now < action.nextRetryAt) {
                if (import.meta.env.DEV) console.log(`[OFFLINE] Skip ${action.type}: retry tra ${Math.ceil((action.nextRetryAt - now) / 1000)}s`)
                continue
            }

            try {
                const method = (action.method || 'POST').toLowerCase() as string
                await (api as any)[method](action.endpoint, action.data)
                completed.push(action.id)
                if (import.meta.env.DEV) console.log(`[OFFLINE] Sync riuscito: ${action.type}`)
            } catch (err) {
                action.retries = (action.retries || 0) + 1

                // Se ha fallito troppe volte, rimuovilo
                if (action.retries >= 5) {
                    completed.push(action.id)
                    if (import.meta.env.DEV) console.error(`[OFFLINE] Azione rimossa dopo 5 tentativi: ${action.type}`)
                } else {
                    const delayMs = RETRY_DELAYS_MS[Math.min(action.retries, RETRY_DELAYS_MS.length - 1)]
                    action.nextRetryAt = Date.now() + delayMs
                    if (import.meta.env.DEV) console.warn(`[OFFLINE] Sync fallito (tentativo ${action.retries}), retry tra ${delayMs / 1000}s: ${action.type}`)
                }
            }
        }

        // Rimuovi azioni completate
        pendingActions.value = pendingActions.value.filter(a => !completed.includes(a.id))
        await persistQueue()

        isSyncing.value = false
        console.log(`[OFFLINE] Sync completato. Rimanenti: ${pendingActions.value.length}`)
    }

    /**
     * Rimuovi una specifica azione dalla queue
     */
    const removeAction = async (actionId: string): Promise<void> => {
        pendingActions.value = pendingActions.value.filter(a => a.id !== actionId)
        await persistQueue()
    }

    /**
     * Svuota tutta la queue
     */
    const clearQueue = async (): Promise<void> => {
        pendingActions.value = []
        await persistQueue()
    }

    return {
        pendingActions,
        isSyncing,
        init,
        queueAction,
        syncQueue,
        removeAction,
        clearQueue
    }
}
