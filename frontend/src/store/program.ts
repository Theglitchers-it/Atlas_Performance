/**
 * Program Store - Pinia
 * Gestione programmi di allenamento
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Client, PaginationMeta, WorkoutTemplate } from '@/types'

interface ProgramItem {
    id: number
    name: string
    description?: string
    client_id?: number
    duration_weeks?: number
    difficulty?: string
    status?: string
    workouts?: WorkoutTemplate[]
    created_at?: string
    [key: string]: any
}

interface ActionResult {
    success: boolean
    message?: string | null
    id?: number
}

export const useProgramStore = defineStore('program', () => {
    // State
    const clients = ref<Client[]>([])
    const programs = ref<ProgramItem[]>([])
    const currentProgram = ref<ProgramItem | null>(null)
    const workoutTemplates = ref<WorkoutTemplate[]>([])
    const loading = ref(false)
    const detailLoading = ref(false)
    const error = ref<string | null>(null)
    const pagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const filters = ref<{ clientId: number | null; status: string | null }>({ clientId: null, status: null })

    // Actions

    const fetchClients = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/clients', { params: { limit: 200 } })
            clients.value = response.data.data.clients || []
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento clienti:', err)
            return { success: false }
        }
    }

    const fetchPrograms = async (): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const params: Record<string, any> = {
                page: pagination.value.page,
                limit: pagination.value.limit
            }
            if (filters.value.clientId) params.clientId = filters.value.clientId
            if (filters.value.status) params.status = filters.value.status

            const response = await api.get('/programs', { params })
            programs.value = response.data.data.programs || []
            pagination.value = response.data.data.pagination || pagination.value
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento programmi'
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    const fetchProgramById = async (id: number): Promise<ActionResult> => {
        detailLoading.value = true
        error.value = null

        try {
            const response = await api.get(`/programs/${id}`)
            currentProgram.value = response.data.data.program || null
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento programma'
            return { success: false }
        } finally {
            detailLoading.value = false
        }
    }

    const createProgram = async (data: Partial<ProgramItem>): Promise<ActionResult> => {
        error.value = null
        try {
            const response = await api.post('/programs', data)
            await fetchPrograms()
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nella creazione del programma'
            return { success: false, message: error.value }
        }
    }

    const updateProgram = async (id: number, data: Partial<ProgramItem>): Promise<ActionResult> => {
        error.value = null
        try {
            await api.put(`/programs/${id}`, data)
            if (currentProgram.value?.id === id) await fetchProgramById(id)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento del programma'
            return { success: false, message: error.value }
        }
    }

    const deleteProgram = async (id: number): Promise<ActionResult> => {
        error.value = null
        try {
            await api.delete(`/programs/${id}`)
            await fetchPrograms()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione del programma'
            return { success: false, message: error.value }
        }
    }

    const updateStatus = async (id: number, status: string): Promise<ActionResult> => {
        error.value = null
        try {
            await api.put(`/programs/${id}/status`, { status })
            await fetchPrograms()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento dello stato'
            return { success: false, message: error.value }
        }
    }

    const fetchWorkoutTemplates = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/workouts', { params: { limit: 100 } })
            workoutTemplates.value = response.data.data.workouts || []
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento schede:', err)
            return { success: false }
        }
    }

    const addWorkout = async (programId: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null
        try {
            await api.post(`/programs/${programId}/workouts`, data)
            await fetchProgramById(programId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiunta del workout'
            return { success: false, message: error.value }
        }
    }

    const removeWorkout = async (programId: number, workoutId: number): Promise<ActionResult> => {
        error.value = null
        try {
            await api.delete(`/programs/${programId}/workouts/${workoutId}`)
            await fetchProgramById(programId)
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nella rimozione del workout'
            return { success: false, message: error.value }
        }
    }

    const setFilter = (key: 'clientId' | 'status', value: any): void => {
        filters.value[key] = value
        pagination.value.page = 1
        fetchPrograms()
    }

    const resetFilters = (): void => {
        filters.value = { clientId: null, status: null }
        pagination.value.page = 1
        fetchPrograms()
    }

    const setPage = (page: number): void => {
        pagination.value.page = page
        fetchPrograms()
    }

    const clearCurrentProgram = (): void => {
        currentProgram.value = null
    }

    const initialize = async (): Promise<void> => {
        await fetchClients()
        await fetchPrograms()
    }

    return {
        clients, programs, currentProgram, workoutTemplates,
        loading, detailLoading, error, pagination, filters,
        fetchClients, fetchPrograms, fetchProgramById, createProgram,
        updateProgram, deleteProgram, updateStatus, fetchWorkoutTemplates,
        addWorkout, removeWorkout,
        setFilter, resetFilters, setPage, clearCurrentProgram, initialize
    }
})
