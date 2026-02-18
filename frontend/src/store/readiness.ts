/**
 * Readiness Store - Pinia
 * Gestione check-in giornaliero readiness
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Client, ReadinessCheckin } from '@/types'

interface ReadinessAverages {
    sleep_quality: number
    energy_level: number
    muscle_soreness: number
    stress_level: number
    readiness_score: number
}

interface ActionResult {
    success: boolean
    message?: string | null
}

interface CheckinData {
    sleep_quality: number
    energy_level: number
    muscle_soreness: number
    stress_level: number
    notes?: string
}

export const useReadinessStore = defineStore('readiness', () => {
    // State
    const clients = ref<Client[]>([])
    const selectedClientId = ref<number | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Readiness data
    const todayCheckin = ref<ReadinessCheckin | null>(null)
    const history = ref<ReadinessCheckin[]>([])
    const averages = ref<ReadinessAverages | null>(null)

    // Active tab
    const activeTab = ref<string>('today')

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

    const fetchTodayCheckin = async (): Promise<ActionResult> => {
        if (!selectedClientId.value) return { success: false }
        loading.value = true
        error.value = null

        try {
            const response = await api.get(`/readiness/${selectedClientId.value}/today`)
            todayCheckin.value = response.data.data.checkin || null
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento check-in odierno'
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    const fetchAverages = async (days = 7): Promise<ActionResult> => {
        if (!selectedClientId.value) return { success: false }
        try {
            const response = await api.get(`/readiness/${selectedClientId.value}/average`, { params: { days } })
            averages.value = response.data.data.average || null
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento medie:', err)
            return { success: false }
        }
    }

    const fetchHistory = async (options: { limit?: number; startDate?: string; endDate?: string } = {}): Promise<ActionResult> => {
        if (!selectedClientId.value) return { success: false }
        loading.value = true
        error.value = null

        try {
            const params: Record<string, any> = { limit: options.limit || 30 }
            if (options.startDate) params.startDate = options.startDate
            if (options.endDate) params.endDate = options.endDate
            const response = await api.get(`/readiness/${selectedClientId.value}/history`, { params })
            history.value = response.data.data.checkins || []
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento storico'
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    const saveCheckin = async (data: CheckinData): Promise<ActionResult> => {
        error.value = null
        try {
            const response = await api.post(`/readiness/${selectedClientId.value}`, data)
            todayCheckin.value = response.data.data.checkin
            await fetchAverages()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel salvataggio del check-in'
            return { success: false, message: error.value }
        }
    }

    const setClient = async (clientId: number | string | null): Promise<void> => {
        selectedClientId.value = clientId ? parseInt(String(clientId)) : null

        if (clientId) {
            await Promise.all([fetchTodayCheckin(), fetchAverages()])
        } else {
            todayCheckin.value = null
            history.value = []
            averages.value = null
        }
    }

    const initialize = async (): Promise<void> => {
        await fetchClients()
        if (clients.value.length > 0 && !selectedClientId.value) {
            await setClient(clients.value[0].id)
        }
    }

    return {
        clients,
        selectedClientId,
        loading,
        error,
        todayCheckin,
        history,
        averages,
        activeTab,
        fetchClients,
        fetchTodayCheckin,
        fetchAverages,
        fetchHistory,
        saveCheckin,
        setClient,
        initialize
    }
})
