/**
 * Analytics Store - Pinia
 * Gestione statistiche e reportistica
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { AnalyticsOverview, SessionTrendPoint, TopClient } from '@/types'

interface ActionResult {
    success: boolean
}

interface AppointmentDistribution {
    type: string
    count: number
}

interface ReadinessTrendPoint {
    date: string
    readiness_score: number
}

interface ProgramCompletionData {
    name: string
    completion_rate: number
}

interface QuickStats {
    [key: string]: number | string
}

export const useAnalyticsStore = defineStore('analytics', () => {
    // State
    const overview = ref<AnalyticsOverview | null>(null)
    const quickStats = ref<QuickStats | null>(null)
    const sessionTrend = ref<SessionTrendPoint[]>([])
    const topClients = ref<TopClient[]>([])
    const appointmentDistribution = ref<AppointmentDistribution[]>([])
    const readinessTrend = ref<ReadinessTrendPoint[]>([])
    const programCompletion = ref<ProgramCompletionData[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const trendGroupBy = ref<'day' | 'week' | 'month'>('week')

    // Actions
    const fetchOverview = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/overview')
            overview.value = response.data.data
            return { success: true }
        } catch (err) {
            console.error('Errore overview:', err)
            return { success: false }
        }
    }

    const fetchQuickStats = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/quick-stats')
            quickStats.value = response.data.data.stats
            return { success: true }
        } catch (err) {
            console.error('Errore quick stats:', err)
            return { success: false }
        }
    }

    const fetchSessionTrend = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/sessions-trend', { params: { groupBy: trendGroupBy.value } })
            sessionTrend.value = response.data.data.trend || []
            return { success: true }
        } catch (err) {
            console.error('Errore session trend:', err)
            return { success: false }
        }
    }

    const fetchTopClients = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/top-clients', { params: { limit: 10 } })
            topClients.value = response.data.data.clients || []
            return { success: true }
        } catch (err) {
            console.error('Errore top clients:', err)
            return { success: false }
        }
    }

    const fetchAppointmentDistribution = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/appointments-distribution')
            appointmentDistribution.value = response.data.data.distribution || []
            return { success: true }
        } catch (err) {
            console.error('Errore appointment distribution:', err)
            return { success: false }
        }
    }

    const fetchReadinessTrend = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/readiness-trend')
            readinessTrend.value = response.data.data.trend || []
            return { success: true }
        } catch (err) {
            console.error('Errore readiness trend:', err)
            return { success: false }
        }
    }

    const fetchProgramCompletion = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/analytics/program-completion')
            programCompletion.value = response.data.data.completion || []
            return { success: true }
        } catch (err) {
            console.error('Errore program completion:', err)
            return { success: false }
        }
    }

    const setTrendGroupBy = (value: 'day' | 'week' | 'month'): void => {
        trendGroupBy.value = value
        fetchSessionTrend()
    }

    const initialize = async (): Promise<void> => {
        loading.value = true
        error.value = null
        try {
            await Promise.all([
                fetchOverview(),
                fetchQuickStats(),
                fetchSessionTrend(),
                fetchTopClients(),
                fetchAppointmentDistribution(),
                fetchReadinessTrend(),
                fetchProgramCompletion()
            ])
        } catch (err) {
            error.value = 'Errore nel caricamento analytics'
        } finally {
            loading.value = false
        }
    }

    return {
        overview, quickStats, sessionTrend, topClients,
        appointmentDistribution, readinessTrend, programCompletion,
        loading, error, trendGroupBy,
        fetchOverview, fetchQuickStats, fetchSessionTrend, fetchTopClients,
        fetchAppointmentDistribution, fetchReadinessTrend, fetchProgramCompletion,
        setTrendGroupBy, initialize
    }
})
