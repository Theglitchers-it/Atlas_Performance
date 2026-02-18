/**
 * Workout Store - Pinia
 * Gestione workout templates e assegnazioni
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

interface ActionResult {
    success: boolean
    message?: string
    id?: number
}

interface WorkoutFilters {
    search: string
    category: string | null
    difficulty: string | null
}

interface WorkoutPagination {
    page: number
    limit: number
    hasMore: boolean
}

interface DifficultyOption {
    value: string
    label: string
    color: string
}

export const useWorkoutStore = defineStore('workout', () => {
    // State
    const templates = ref<any[]>([])
    const currentTemplate = ref<any | null>(null)
    const loading = ref<boolean>(false)
    const detailLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // Filters
    const filters = ref<WorkoutFilters>({
        search: '',
        category: null,
        difficulty: null
    })

    // Pagination
    const pagination = ref<WorkoutPagination>({
        page: 1,
        limit: 20,
        hasMore: true
    })

    // Getters
    const templateCount = computed(() => templates.value.length)

    const difficultyOptions: DifficultyOption[] = [
        { value: 'beginner', label: 'Principiante', color: 'emerald-400' },
        { value: 'intermediate', label: 'Intermedio', color: 'habit-orange' },
        { value: 'advanced', label: 'Avanzato', color: 'red-400' }
    ]

    // Actions

    /**
     * Fetch workout templates
     */
    const fetchTemplates = async (options: Record<string, any> = {}): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const page = options.page || pagination.value.page
            const limit = pagination.value.limit
            const offset = (page - 1) * limit

            const params: Record<string, any> = { limit, offset }
            if (filters.value.search) params.search = filters.value.search
            if (filters.value.category) params.category = filters.value.category
            if (filters.value.difficulty) params.difficulty = filters.value.difficulty

            const response = await api.get('/workouts', { params })

            templates.value = response.data.data.templates || response.data.data.workouts || []
            pagination.value.hasMore = templates.value.length >= limit

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento workout'
            return { success: false, message: error.value as string }
        } finally {
            loading.value = false
        }
    }

    /**
     * Fetch singolo template
     */
    const fetchTemplateById = async (templateId: number): Promise<ActionResult> => {
        detailLoading.value = true
        error.value = null

        try {
            const response = await api.get(`/workouts/${templateId}`)
            currentTemplate.value = response.data.data.template || response.data.data
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento del workout'
            currentTemplate.value = null
            return { success: false, message: error.value as string }
        } finally {
            detailLoading.value = false
        }
    }

    /**
     * Crea workout template
     */
    const createTemplate = async (data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            const response = await api.post('/workouts', data)
            await fetchTemplates()
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nella creazione del workout'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiorna workout template
     */
    const updateTemplate = async (templateId: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null

        try {
            await api.put(`/workouts/${templateId}`, data)
            if (currentTemplate.value?.id === templateId) {
                await fetchTemplateById(templateId)
            }
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento del workout'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Elimina workout template
     */
    const deleteTemplate = async (templateId: number): Promise<ActionResult> => {
        error.value = null

        try {
            await api.delete(`/workouts/${templateId}`)
            await fetchTemplates()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione del workout'
            return { success: false, message: error.value as string }
        }
    }

    /**
     * Aggiungi esercizio al template
     */
    const addExerciseToTemplate = async (templateId: number, exerciseData: Record<string, any>): Promise<ActionResult> => {
        try {
            const response = await api.post(`/workouts/${templateId}/exercises`, exerciseData)
            if (currentTemplate.value?.id === templateId) {
                await fetchTemplateById(templateId)
            }
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore aggiunta esercizio' }
        }
    }

    /**
     * Aggiorna esercizio nel template
     */
    const updateExerciseInTemplate = async (templateId: number, exerciseId: number, data: Record<string, any>): Promise<ActionResult> => {
        try {
            await api.put(`/workouts/${templateId}/exercises/${exerciseId}`, data)
            if (currentTemplate.value?.id === templateId) {
                await fetchTemplateById(templateId)
            }
            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore aggiornamento esercizio' }
        }
    }

    /**
     * Rimuovi esercizio dal template
     */
    const removeExerciseFromTemplate = async (templateId: number, exerciseId: number): Promise<ActionResult> => {
        try {
            await api.delete(`/workouts/${templateId}/exercises/${exerciseId}`)
            if (currentTemplate.value?.id === templateId) {
                await fetchTemplateById(templateId)
            }
            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore rimozione esercizio' }
        }
    }

    /**
     * Riordina esercizi nel template
     */
    const reorderExercises = async (templateId: number, exerciseOrder: number[]): Promise<ActionResult> => {
        try {
            await api.put(`/workouts/${templateId}/exercises/reorder`, { order: exerciseOrder })
            if (currentTemplate.value?.id === templateId) {
                await fetchTemplateById(templateId)
            }
            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore riordino esercizi' }
        }
    }

    /**
     * Duplica template
     */
    const duplicateTemplate = async (templateId: number): Promise<ActionResult> => {
        try {
            const response = await api.post(`/workouts/${templateId}/duplicate`)
            await fetchTemplates()
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore duplicazione workout' }
        }
    }

    /**
     * Filtri
     */
    const setFilter = (key: keyof WorkoutFilters, value: string | null): void => {
        if (key === 'search') {
            filters.value.search = value || ''
        } else {
            (filters.value as Record<string, string | null>)[key] = value || null
        }
        pagination.value.page = 1
        fetchTemplates()
    }

    const resetFilters = (): void => {
        filters.value = { search: '', category: null, difficulty: null }
        pagination.value.page = 1
        fetchTemplates()
    }

    const setPage = (page: number): void => {
        pagination.value.page = page
        fetchTemplates({ page })
    }

    const clearCurrentTemplate = (): void => {
        currentTemplate.value = null
        error.value = null
    }

    const initialize = async (): Promise<void> => {
        await fetchTemplates()
    }

    return {
        // State
        templates, currentTemplate, loading, detailLoading, error, filters, pagination,
        // Getters
        templateCount, difficultyOptions,
        // Actions
        fetchTemplates, fetchTemplateById, createTemplate, updateTemplate, deleteTemplate,
        addExerciseToTemplate, updateExerciseInTemplate, removeExerciseFromTemplate,
        reorderExercises, duplicateTemplate,
        setFilter, resetFilters, setPage, clearCurrentTemplate, initialize
    }
})
