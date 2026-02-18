/**
 * Session Store - Pinia
 * Gestione sessioni allenamento
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { Client, Session, PaginationMeta } from '@/types'

interface ActionResult {
    success: boolean
    message?: string
    id?: number
    session?: Session
    data?: any
}

interface SessionFilters {
    status: string | null
    startDate: string | null
    endDate: string | null
}

interface SessionStats {
    total_sessions: number
    completed_sessions: number
    [key: string]: any
}

interface StatusOption {
    value: string
    label: string
    color: string
}

export const useSessionStore = defineStore('session', () => {
    // State
    const sessions = ref<Session[]>([])
    const clients = ref<Client[]>([])
    const workoutTemplates = ref<any[]>([])
    const selectedClientId = ref<number | null>(null)
    const stats = ref<SessionStats | null>(null)
    const loading = ref<boolean>(false)
    const statsLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // Detail state
    const currentSession = ref<Session | null>(null)
    const detailLoading = ref<boolean>(false)
    const pagination = ref<PaginationMeta>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    })

    // Filters
    const filters = ref<SessionFilters>({
        status: null,
        startDate: null,
        endDate: null
    })

    const statsPeriod = ref<string>('month')

    // Getters
    const hasFilters = computed(() => {
        return filters.value.status ||
               filters.value.startDate ||
               filters.value.endDate
    })

    const statusOptions: StatusOption[] = [
        { value: 'scheduled', label: 'Pianificata', color: 'gray-400' },
        { value: 'in_progress', label: 'In Corso', color: 'habit-cyan' },
        { value: 'completed', label: 'Completata', color: 'habit-success' },
        { value: 'skipped', label: 'Saltata', color: 'red-400' }
    ]

    const completionRate = computed(() => {
        if (!stats.value || !stats.value.total_sessions) return 0
        return Math.round((stats.value.completed_sessions / stats.value.total_sessions) * 100)
    })

    // Actions

    /**
     * Fetch lista clienti per il selettore
     */
    const fetchClients = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/clients', { params: { limit: 200 } })
            clients.value = response.data.data.clients || []
            return { success: true }
        } catch (err: any) {
            console.error('Errore caricamento clienti:', err)
            return { success: false }
        }
    }

    /**
     * Fetch sessioni per cliente selezionato
     */
    const fetchSessions = async (options: Record<string, any> = {}): Promise<ActionResult> => {
        if (!selectedClientId.value) {
            sessions.value = []
            return { success: false, message: 'Nessun cliente selezionato' }
        }

        loading.value = true
        error.value = null

        try {
            const params: Record<string, any> = {
                page: options.page || pagination.value.page,
                limit: options.limit || pagination.value.limit
            }

            if (filters.value.status) params.status = filters.value.status
            if (filters.value.startDate) params.startDate = filters.value.startDate
            if (filters.value.endDate) params.endDate = filters.value.endDate

            const response = await api.get(`/sessions/client/${selectedClientId.value}`, { params })

            sessions.value = response.data.data.sessions || []
            pagination.value = response.data.data.pagination || pagination.value

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento sessioni'
            return { success: false, message: error.value as string }
        } finally {
            loading.value = false
        }
    }

    /**
     * Fetch statistiche per cliente selezionato
     */
    const fetchStats = async (): Promise<ActionResult> => {
        if (!selectedClientId.value) {
            stats.value = null
            return { success: false }
        }

        statsLoading.value = true

        try {
            const response = await api.get(
                `/sessions/client/${selectedClientId.value}/stats`,
                { params: { period: statsPeriod.value } }
            )

            stats.value = response.data.data.stats || {}
            return { success: true }
        } catch (err: any) {
            console.error('Errore caricamento statistiche:', err)
            stats.value = null
            return { success: false }
        } finally {
            statsLoading.value = false
        }
    }

    /**
     * Fetch schede allenamento per modal avvio sessione
     */
    const fetchWorkoutTemplates = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/workouts', { params: { limit: 200 } })
            workoutTemplates.value = response.data.data.workouts || []
            return { success: true }
        } catch (err: any) {
            console.error('Errore caricamento schede:', err)
            return { success: false }
        }
    }

    /**
     * Avvia nuova sessione
     */
    const startSession = async (clientId: number, templateId: number): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post('/sessions', { clientId, templateId })
            const session = response.data.data.session

            // Ricarica lista sessioni
            await fetchSessions()
            await fetchStats()

            return { success: true, session }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'avvio della sessione'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Salta sessione
     */
    const skipSession = async (sessionId: number, reason: string): Promise<ActionResult> => {
        error.value = null

        try {
            await api.post(`/sessions/${sessionId}/skip`, { reason })

            // Ricarica lista sessioni e stats
            await fetchSessions()
            await fetchStats()

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel saltare la sessione'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Seleziona cliente e carica dati
     */
    const setClient = async (clientId: number | string | null): Promise<void> => {
        selectedClientId.value = clientId ? parseInt(String(clientId)) : null
        pagination.value.page = 1

        if (clientId) {
            await Promise.all([fetchSessions(), fetchStats()])
        } else {
            sessions.value = []
            stats.value = null
        }
    }

    /**
     * Imposta filtro e ricarica
     */
    const setFilter = (key: keyof SessionFilters, value: string | null): void => {
        filters.value[key] = value || null
        pagination.value.page = 1
        fetchSessions()
    }

    /**
     * Reset tutti i filtri
     */
    const resetFilters = (): void => {
        filters.value = {
            status: null,
            startDate: null,
            endDate: null
        }
        pagination.value.page = 1
        fetchSessions()
    }

    /**
     * Cambia pagina
     */
    const setPage = (page: number): void => {
        pagination.value.page = page
        fetchSessions({ page })
    }

    /**
     * Cambia periodo statistiche
     */
    const setStatsPeriod = (period: string): void => {
        statsPeriod.value = period
        fetchStats()
    }

    // ==================== DETAIL ACTIONS ====================

    /**
     * Fetch dettaglio sessione per ID
     */
    const fetchSessionById = async (sessionId: number): Promise<ActionResult> => {
        detailLoading.value = true
        error.value = null

        try {
            const response = await api.get(`/sessions/${sessionId}`)
            currentSession.value = response.data.data.session || null
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento della sessione'
            currentSession.value = null
            return { success: false, message: error.value as string }
        } finally {
            detailLoading.value = false
        }
    }

    /**
     * Log singolo set per un esercizio della sessione
     */
    const logSet = async (sessionId: number, setData: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            await api.post(`/sessions/${sessionId}/set`, setData)
            // Ricarica sessione per aggiornare i set loggati
            await fetchSessionById(sessionId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel salvataggio del set'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Completa sessione
     */
    const completeSession = async (sessionId: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post(`/sessions/${sessionId}/complete`, data)
            // Ricarica sessione completata
            await fetchSessionById(sessionId)
            return { success: true, data: response.data.data }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel completamento della sessione'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Reset sessione corrente
     */
    const clearCurrentSession = (): void => {
        currentSession.value = null
        error.value = null
    }

    /**
     * Inizializza store
     */
    const initialize = async (): Promise<void> => {
        await Promise.all([fetchClients(), fetchWorkoutTemplates()])

        // Auto-seleziona primo cliente se disponibile
        if (clients.value.length > 0 && !selectedClientId.value) {
            await setClient(clients.value[0].id)
        }
    }

    return {
        // State
        sessions,
        clients,
        workoutTemplates,
        selectedClientId,
        stats,
        loading,
        statsLoading,
        error,
        pagination,
        filters,
        statsPeriod,
        // Detail state
        currentSession,
        detailLoading,
        // Getters
        hasFilters,
        statusOptions,
        completionRate,
        // Actions
        fetchClients,
        fetchSessions,
        fetchStats,
        fetchWorkoutTemplates,
        startSession,
        skipSession,
        setClient,
        setFilter,
        resetFilters,
        setPage,
        setStatsPeriod,
        initialize,
        // Detail actions
        fetchSessionById,
        logSet,
        completeSession,
        clearCurrentSession
    }
})
