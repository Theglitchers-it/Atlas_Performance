/**
 * Client Store - Pinia
 * Gestione clienti del Personal Trainer
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { Client, PaginationMeta } from '@/types'

interface ActionResult {
    success: boolean
    message?: string
    id?: number
}

interface ClientFilters {
    search: string
    status: string | null
    goalType: string | null
}

interface StatusOption {
    value: string
    label: string
    color: string
}

export const useClientStore = defineStore('client', () => {
    // State
    const clients = ref<Client[]>([])
    const currentClient = ref<Client | null>(null)
    const loading = ref<boolean>(false)
    const detailLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // Filters
    const filters = ref<ClientFilters>({
        search: '',
        status: null,
        goalType: null
    })

    // Pagination
    const pagination = ref<PaginationMeta>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    })

    // Getters
    const activeClients = computed(() => clients.value.filter(c => c.status === 'active'))
    const clientCount = computed(() => pagination.value.total)
    const hasFilters = computed(() => filters.value.search || filters.value.status || filters.value.goalType)

    const statusOptions: StatusOption[] = [
        { value: 'active', label: 'Attivo', color: 'emerald-400' },
        { value: 'inactive', label: 'Inattivo', color: 'gray-400' },
        { value: 'paused', label: 'In Pausa', color: 'habit-orange' },
        { value: 'cancelled', label: 'Cancellato', color: 'red-400' }
    ]

    // Actions

    /**
     * Fetch lista clienti con filtri e paginazione
     */
    const fetchClients = async (options: Record<string, any> = {}): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const page = options.page || pagination.value.page
            const limit = pagination.value.limit
            const offset = (page - 1) * limit

            const params: Record<string, any> = { limit, offset }
            if (filters.value.search) params.search = filters.value.search
            if (filters.value.status) params.status = filters.value.status
            if (filters.value.goalType) params.goalType = filters.value.goalType

            const response = await api.get('/clients', { params })

            clients.value = response.data.data.clients || []
            if (response.data.data.pagination) {
                pagination.value = { ...pagination.value, ...response.data.data.pagination }
            }
            pagination.value.page = page

            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nel caricamento clienti'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
            return { success: false, message: error.value as string }
        } finally {
            loading.value = false
        }
    }

    /**
     * Fetch singolo cliente per dettaglio
     */
    const fetchClientById = async (clientId: number): Promise<ActionResult> => {
        detailLoading.value = true
        error.value = null

        try {
            const response = await api.get(`/clients/${clientId}`)
            currentClient.value = response.data.data.client || response.data.data
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nel caricamento del cliente'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
            currentClient.value = null
            return { success: false, message: error.value as string }
        } finally {
            detailLoading.value = false
        }
    }

    /**
     * Crea nuovo cliente
     */
    const createClient = async (data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post('/clients', data)
            await fetchClients()
            return { success: true, id: response.data.data.clientId || response.data.data.id }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nella creazione del cliente'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna cliente
     */
    const updateClient = async (clientId: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/clients/${clientId}`, data)
            if (currentClient.value && currentClient.value.id === clientId) {
                await fetchClientById(clientId)
            }
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nell\'aggiornamento del cliente'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Elimina cliente
     */
    const deleteClient = async (clientId: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.delete(`/clients/${clientId}`)
            await fetchClients()
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nell\'eliminazione del cliente'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna status cliente
     */
    const updateClientStatus = async (clientId: number, status: string): Promise<ActionResult> => {
        return await updateClient(clientId, { status })
    }

    /**
     * Gestione obiettivi cliente
     */
    const addGoal = async (clientId: number, goalData: Record<string, any>): Promise<ActionResult> => {
        try {
            const response = await api.post(`/clients/${clientId}/goals`, goalData)
            if (currentClient.value?.id === clientId) await fetchClientById(clientId)
            return { success: true, id: response.data.data.id }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore aggiunta obiettivo'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            return { success: false, message: axiosErr.response?.data?.message || message }
        }
    }

    const updateGoal = async (clientId: number, goalId: number, data: Record<string, any>): Promise<ActionResult> => {
        try {
            await api.put(`/clients/${clientId}/goals/${goalId}`, data)
            if (currentClient.value?.id === clientId) await fetchClientById(clientId)
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore aggiornamento obiettivo'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            return { success: false, message: axiosErr.response?.data?.message || message }
        }
    }

    const deleteGoal = async (clientId: number, goalId: number): Promise<ActionResult> => {
        try {
            await api.delete(`/clients/${clientId}/goals/${goalId}`)
            if (currentClient.value?.id === clientId) await fetchClientById(clientId)
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore eliminazione obiettivo'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            return { success: false, message: axiosErr.response?.data?.message || message }
        }
    }

    /**
     * Gestione infortuni cliente
     */
    const addInjury = async (clientId: number, injuryData: Record<string, any>): Promise<ActionResult> => {
        try {
            const response = await api.post(`/clients/${clientId}/injuries`, injuryData)
            if (currentClient.value?.id === clientId) await fetchClientById(clientId)
            return { success: true, id: response.data.data.id }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore aggiunta infortunio'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            return { success: false, message: axiosErr.response?.data?.message || message }
        }
    }

    const updateInjury = async (clientId: number, injuryId: number, data: Record<string, any>): Promise<ActionResult> => {
        try {
            await api.put(`/clients/${clientId}/injuries/${injuryId}`, data)
            if (currentClient.value?.id === clientId) await fetchClientById(clientId)
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore aggiornamento infortunio'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            return { success: false, message: axiosErr.response?.data?.message || message }
        }
    }

    /**
     * Filtri
     */
    const setFilter = (key: keyof ClientFilters, value: string | null): void => {
        if (key === 'search') {
            filters.value.search = value || ''
        } else {
            (filters.value as Record<string, string | null>)[key] = value || null
        }
        pagination.value.page = 1
        fetchClients()
    }

    const setSearch = (search: string): void => {
        filters.value.search = search
        pagination.value.page = 1
        fetchClients()
    }

    const resetFilters = (): void => {
        filters.value = { search: '', status: null, goalType: null }
        pagination.value.page = 1
        fetchClients()
    }

    const setPage = (page: number): void => {
        pagination.value.page = page
        fetchClients({ page })
    }

    const clearCurrentClient = (): void => {
        currentClient.value = null
        error.value = null
    }

    const initialize = async (): Promise<void> => {
        await fetchClients()
    }

    return {
        // State
        clients, currentClient, loading, detailLoading, error, filters, pagination,
        // Getters
        activeClients, clientCount, hasFilters, statusOptions,
        // Actions
        fetchClients, fetchClientById, createClient, updateClient, deleteClient,
        updateClientStatus, addGoal, updateGoal, deleteGoal,
        addInjury, updateInjury,
        setFilter, setSearch, resetFilters, setPage,
        clearCurrentClient, initialize
    }
})
