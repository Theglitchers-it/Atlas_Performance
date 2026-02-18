/**
 * Nutrition Store - Pinia
 * Gestione piani alimentari
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { Client, MealPlan } from '@/types'

interface ActionResult {
    success: boolean
    message?: string
    id?: number
    totals?: any
}

interface NutritionFilters {
    clientId: number | null
    status: string | null
}

interface NutritionPagination {
    page: number
    limit: number
    hasMore: boolean
}

interface StatusOption {
    value: string
    label: string
    color: string
}

export const useNutritionStore = defineStore('nutrition', () => {
    // State
    const plans = ref<MealPlan[]>([])
    const clients = ref<Client[]>([])
    const summary = ref<any | null>(null)
    const loading = ref<boolean>(false)
    const summaryLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // Planner detail state
    const currentPlan = ref<MealPlan | null>(null)
    const planLoading = ref<boolean>(false)
    const dayTotals = ref<Record<number, any>>({})

    // Filters
    const filters = ref<NutritionFilters>({
        clientId: null,
        status: null
    })

    // Pagination (API usa offset, calcoliamo lato frontend)
    const pagination = ref<NutritionPagination>({
        page: 1,
        limit: 20,
        hasMore: true
    })

    // Getters
    const hasFilters = computed(() => {
        return filters.value.clientId || filters.value.status
    })

    const statusOptions: StatusOption[] = [
        { value: 'draft', label: 'Bozza', color: 'gray-400' },
        { value: 'active', label: 'Attivo', color: 'emerald-400' },
        { value: 'completed', label: 'Completato', color: 'cyan-400' },
        { value: 'archived', label: 'Archiviato', color: 'habit-orange' }
    ]

    // Actions

    /**
     * Fetch lista clienti per selettore
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
     * Fetch piani alimentari con filtri
     */
    const fetchPlans = async (options: Record<string, any> = {}): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const page = options.page || pagination.value.page
            const limit = pagination.value.limit
            const offset = (page - 1) * limit

            const params: Record<string, any> = { limit, offset }

            if (filters.value.clientId) params.clientId = filters.value.clientId
            if (filters.value.status) params.status = filters.value.status

            const response = await api.get('/nutrition/plans', { params })

            plans.value = response.data.data.plans || []
            // L'API non ritorna count, determiniamo hasMore dal risultato
            pagination.value.hasMore = plans.value.length >= limit

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento piani alimentari'
            return { success: false, message: error.value as string }
        } finally {
            loading.value = false
        }
    }

    /**
     * Fetch riepilogo nutrizione cliente
     */
    const fetchSummary = async (clientId: number | null): Promise<ActionResult> => {
        if (!clientId) {
            summary.value = null
            return { success: false }
        }

        summaryLoading.value = true

        try {
            const response = await api.get(`/nutrition/clients/${clientId}/summary`)
            summary.value = response.data.data || {}
            return { success: true }
        } catch (err: any) {
            console.error('Errore caricamento riepilogo:', err)
            summary.value = null
            return { success: false }
        } finally {
            summaryLoading.value = false
        }
    }

    /**
     * Crea nuovo piano alimentare
     */
    const createPlan = async (data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post('/nutrition/plans', data)
            // Ricarica lista e summary
            await fetchPlans()
            if (filters.value.clientId) {
                await fetchSummary(filters.value.clientId)
            }
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nella creazione del piano'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna status piano
     */
    const updatePlanStatus = async (planId: number, status: string): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/nutrition/plans/${planId}`, { status })
            // Ricarica lista e summary
            await fetchPlans()
            if (filters.value.clientId) {
                await fetchSummary(filters.value.clientId)
            }
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento del piano'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Elimina piano
     */
    const deletePlan = async (planId: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.delete(`/nutrition/plans/${planId}`)
            // Ricarica lista e summary
            await fetchPlans()
            if (filters.value.clientId) {
                await fetchSummary(filters.value.clientId)
            }
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione del piano'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Imposta filtro cliente e ricarica
     */
    const setClientFilter = async (clientId: number | string | null): Promise<void> => {
        filters.value.clientId = clientId ? parseInt(String(clientId)) : null
        pagination.value.page = 1

        await fetchPlans()
        if (clientId) {
            await fetchSummary(parseInt(String(clientId)))
        } else {
            summary.value = null
        }
    }

    /**
     * Imposta filtro generico e ricarica
     */
    const setFilter = (key: keyof NutritionFilters, value: string | number | null): void => {
        (filters.value as Record<string, string | number | null>)[key] = value || null
        pagination.value.page = 1
        fetchPlans()
    }

    /**
     * Reset tutti i filtri
     */
    const resetFilters = (): void => {
        filters.value = {
            clientId: null,
            status: null
        }
        pagination.value.page = 1
        summary.value = null
        fetchPlans()
    }

    /**
     * Cambia pagina
     */
    const setPage = (page: number): void => {
        pagination.value.page = page
        fetchPlans({ page })
    }

    // ==================== PLANNER ACTIONS ====================

    /**
     * Fetch piano completo con giorni, pasti, alimenti
     */
    const fetchPlanById = async (planId: number): Promise<ActionResult> => {
        planLoading.value = true
        error.value = null

        try {
            const response = await api.get(`/nutrition/plans/${planId}`)
            currentPlan.value = response.data.data.plan || null
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento del piano'
            currentPlan.value = null
            return { success: false, message: error.value as string }
        } finally {
            planLoading.value = false
        }
    }

    /**
     * Aggiorna piano (nome, target, date, status, notes)
     */
    const updatePlan = async (planId: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/nutrition/plans/${planId}`, data)
            await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento del piano'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiungi giorno al piano
     */
    const addDay = async (planId: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post(`/nutrition/plans/${planId}/days`, data)
            await fetchPlanById(planId)
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiunta del giorno'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna giorno
     */
    const updateDay = async (dayId: number, data: Record<string, any>, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/nutrition/days/${dayId}`, data)
            if (planId) await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento del giorno'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Elimina giorno
     */
    const deleteDay = async (dayId: number, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.delete(`/nutrition/days/${dayId}`)
            if (planId) await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione del giorno'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiungi pasto a un giorno
     */
    const addMeal = async (dayId: number, data: Record<string, any>, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post(`/nutrition/days/${dayId}/meals`, data)
            if (planId) await fetchPlanById(planId)
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiunta del pasto'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna pasto
     */
    const updateMeal = async (mealId: number, data: Record<string, any>, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/nutrition/meals/${mealId}`, data)
            if (planId) await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento del pasto'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Elimina pasto
     */
    const deleteMeal = async (mealId: number, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.delete(`/nutrition/meals/${mealId}`)
            if (planId) await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione del pasto'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiungi alimento a un pasto
     */
    const addMealItem = async (mealId: number, data: Record<string, any>, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post(`/nutrition/meals/${mealId}/items`, data)
            if (planId) await fetchPlanById(planId)
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiunta dell\'alimento'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna alimento
     */
    const updateMealItem = async (itemId: number, data: Record<string, any>, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/nutrition/items/${itemId}`, data)
            if (planId) await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento dell\'alimento'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Elimina alimento
     */
    const deleteMealItem = async (itemId: number, planId?: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.delete(`/nutrition/items/${itemId}`)
            if (planId) await fetchPlanById(planId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione dell\'alimento'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Calcola totali nutrizionali di un giorno
     */
    const fetchDayTotals = async (dayId: number): Promise<ActionResult> => {
        try {
            const response = await api.get(`/nutrition/days/${dayId}/totals`)
            dayTotals.value[dayId] = response.data.data.totals || {}
            return { success: true, totals: dayTotals.value[dayId] }
        } catch (err: any) {
            console.error('Errore calcolo totali giorno:', err)
            return { success: false }
        }
    }

    /**
     * Reset piano corrente
     */
    const clearCurrentPlan = (): void => {
        currentPlan.value = null
        dayTotals.value = {}
        error.value = null
    }

    /**
     * Inizializza store
     */
    const initialize = async (): Promise<void> => {
        await Promise.all([fetchClients(), fetchPlans()])
    }

    return {
        // State
        plans,
        clients,
        summary,
        loading,
        summaryLoading,
        error,
        filters,
        pagination,
        // Planner state
        currentPlan,
        planLoading,
        dayTotals,
        // Getters
        hasFilters,
        statusOptions,
        // Actions
        fetchClients,
        fetchPlans,
        fetchSummary,
        createPlan,
        updatePlanStatus,
        deletePlan,
        setClientFilter,
        setFilter,
        resetFilters,
        setPage,
        initialize,
        // Planner actions
        fetchPlanById,
        updatePlan,
        addDay,
        updateDay,
        deleteDay,
        addMeal,
        updateMeal,
        deleteMeal,
        addMealItem,
        updateMealItem,
        deleteMealItem,
        fetchDayTotals,
        clearCurrentPlan
    }
})
