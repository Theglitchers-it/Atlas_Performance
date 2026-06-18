/**
 * Gamification Store - Pinia
 * Gestione achievements, XP, livelli, sfide, classifiche e titoli
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type {
  GamificationDashboard,
  XPTransaction,
  Challenge,
  Title,
  Client,
  PaginationMeta,
  XPSparkPoint,
  StreakHeatmapDay,
  NextAchievement,
  RankingInfo,
  WeeklyRecap,
  WeeklyGoal,
  WeeklyGoalType
} from '@/types'

interface ActionResult {
  success: boolean
  message?: string
  id?: number
  data?: any
}

export const useGamificationStore = defineStore('gamification', () => {
  // State
  const dashboard = ref<GamificationDashboard | null>(null)
  const recentAchievements = ref<any[]>([])
  const achievementsByCategory = ref<any[]>([])
  const allAchievements = ref<any[]>([])
  const recentXPActivity = ref<XPTransaction[]>([])
  const activeChallengesPreview = ref<Challenge[]>([])
  const leaderboard = ref<any[]>([])
  const leaderboardPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const challenges = ref<Challenge[]>([])
  const challengesPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const currentChallenge = ref<Challenge | null>(null)
  const xpHistory = ref<XPTransaction[]>([])
  const xpHistoryPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const titles = ref<Title[]>([])
  const displayedTitle = ref<Title | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const selectedClientId = ref<number | null>(null)
  const isTrainerMode = ref<boolean>(false)
  const clients = ref<Client[]>([])
  const manageableTitles = ref<Title[]>([])

  // Nuove feature
  const xpSparkline = ref<XPSparkPoint[]>([])
  const streakHeatmap = ref<StreakHeatmapDay[]>([])
  const streakHeatmapYear = ref<number>(new Date().getFullYear())
  const nextAchievement = ref<NextAchievement | null>(null)
  const ranking = ref<RankingInfo | null>(null)
  const weeklyRecap = ref<WeeklyRecap | null>(null)
  const weeklyGoals = ref<WeeklyGoal[]>([])
  const weeklyGoalsWeekStart = ref<string | null>(null)

  // Getters
  const levelProgress = computed<number>(() => dashboard.value?.xpProgress || 0)
  const unlockedAchievements = computed<any[]>(() => allAchievements.value.filter((a: any) => a.unlocked))

  // === ACTIONS ===

  const fetchClients = async (): Promise<void> => {
    try {
      const response = await api.get('/clients', { params: { limit: 500 } })
      clients.value = response.data.data.clients || []
    } catch (err: any) {
      console.error('Errore fetchClients:', err)
    }
  }

  const fetchDashboard = async (clientId: number | null = null): Promise<void> => {
    try {
      const params: Record<string, any> = {}
      if (clientId) params.clientId = clientId
      const response = await api.get('/gamification/dashboard', { params })
      dashboard.value = response.data.data.dashboard
    } catch (err: any) {
      console.error('Errore fetchDashboard:', err)
    }
  }

  const fetchRecentAchievements = async (limit: number = 5): Promise<void> => {
    try {
      const response = await api.get('/gamification/achievements/recent', { params: { limit } })
      recentAchievements.value = response.data.data.achievements || []
    } catch (err: any) {
      console.error('Errore fetchRecentAchievements:', err)
    }
  }

  const fetchAchievementsByCategory = async (): Promise<void> => {
    try {
      const response = await api.get('/gamification/achievements/categories')
      achievementsByCategory.value = response.data.data.categories || []
    } catch (err: any) {
      console.error('Errore fetchAchievementsByCategory:', err)
    }
  }

  const fetchAllAchievements = async (filters: Record<string, any> = {}): Promise<void> => {
    try {
      const response = await api.get('/gamification/achievements', { params: filters })
      allAchievements.value = response.data.data.achievements || []
    } catch (err: any) {
      console.error('Errore fetchAllAchievements:', err)
    }
  }

  const fetchRecentXPActivity = async (limit: number = 10): Promise<void> => {
    try {
      const params: Record<string, any> = { limit }
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/gamification/xp/recent', { params })
      recentXPActivity.value = response.data.data.activity || []
    } catch (err: any) {
      console.error('Errore fetchRecentXPActivity:', err)
    }
  }

  const fetchXPHistory = async (page: number = 1): Promise<void> => {
    try {
      const params: Record<string, any> = { page, limit: xpHistoryPagination.value.limit }
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/gamification/xp/history', { params })
      xpHistory.value = response.data.data.transactions || []
      xpHistoryPagination.value = response.data.data.pagination || xpHistoryPagination.value
    } catch (err: any) {
      console.error('Errore fetchXPHistory:', err)
    }
  }

  const fetchActiveChallengesPreview = async (): Promise<void> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/gamification/challenges/active', { params })
      activeChallengesPreview.value = response.data.data.challenges || []
    } catch (err: any) {
      console.error('Errore fetchActiveChallengesPreview:', err)
    }
  }

  const fetchLeaderboard = async (page: number = 1, locationId: number | null = null): Promise<void> => {
    try {
      const params: Record<string, any> = { page, limit: leaderboardPagination.value.limit }
      if (locationId) params.locationId = locationId
      const response = await api.get('/gamification/leaderboard', { params })
      leaderboard.value = response.data.data.leaderboard || []
      leaderboardPagination.value = response.data.data.pagination || leaderboardPagination.value
    } catch (err: any) {
      console.error('Errore fetchLeaderboard:', err)
    }
  }

  const fetchChallenges = async (options: Record<string, any> = {}): Promise<void> => {
    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        limit: challengesPagination.value.limit,
        status: options.status || ''
      }
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/gamification/challenges', { params })
      challenges.value = response.data.data.challenges || []
      challengesPagination.value = response.data.data.pagination || challengesPagination.value
    } catch (err: any) {
      console.error('Errore fetchChallenges:', err)
    }
  }

  const fetchChallengeById = async (id: number): Promise<void> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get(`/gamification/challenges/${id}`, { params })
      currentChallenge.value = response.data.data.challenge
    } catch (err: any) {
      console.error('Errore fetchChallengeById:', err)
    }
  }

  const joinChallenge = async (id: number): Promise<ActionResult> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      await api.post(`/gamification/challenges/${id}/join`, {}, { params })
      return { success: true }
    } catch (err: any) {
      console.error('Errore joinChallenge:', err)
      return { success: false, message: err.response?.data?.message || 'Errore iscrizione' }
    }
  }

  const withdrawFromChallenge = async (id: number): Promise<ActionResult> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      await api.post(`/gamification/challenges/${id}/withdraw`, {}, { params })
      return { success: true }
    } catch (err: any) {
      console.error('Errore withdrawFromChallenge:', err)
      return { success: false }
    }
  }

  const fetchTitles = async (options: Record<string, any> = {}): Promise<void> => {
    try {
      const params: Record<string, any> = { ...options }
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/titles', { params })
      titles.value = response.data.data.titles || []
    } catch (err: any) {
      console.error('Errore fetchTitles:', err)
    }
  }

  const fetchDisplayedTitle = async (): Promise<void> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/titles/displayed', { params })
      displayedTitle.value = response.data.data.title
    } catch (err: any) {
      console.error('Errore fetchDisplayedTitle:', err)
    }
  }

  const setDisplayedTitle = async (titleId: number): Promise<ActionResult> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      await api.put('/titles/displayed', { titleId }, { params })
      await fetchDisplayedTitle()
      return { success: true }
    } catch (err: any) {
      console.error('Errore setDisplayedTitle:', err)
      return { success: false }
    }
  }

  const setClient = async (clientId: number | null): Promise<void> => {
    selectedClientId.value = clientId
    await loadDashboardData()
  }

  const loadDashboardData = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      // Se trainer senza client selezionato, non fare chiamate
      if (isTrainerMode.value && !selectedClientId.value) {
        dashboard.value = null
        recentXPActivity.value = []
        activeChallengesPreview.value = []
        loading.value = false
        return
      }
      await Promise.all([
        fetchDashboard(selectedClientId.value),
        fetchRecentAchievements(),
        fetchAchievementsByCategory(),
        fetchRecentXPActivity(),
        fetchActiveChallengesPreview()
      ])
    } catch (err: any) {
      error.value = 'Errore nel caricamento dati gamification'
      console.error('Errore loadDashboardData:', err)
    } finally {
      loading.value = false
    }
  }

  const initialize = async (isTrainer: boolean = false): Promise<void> => {
    isTrainerMode.value = isTrainer
    if (isTrainer) {
      await fetchClients()
    }
    await loadDashboardData()
  }

  // === Title Management (Trainer CRUD) ===

  const fetchManageableTitles = async (): Promise<void> => {
    try {
      const response = await api.get('/titles/manage')
      manageableTitles.value = response.data.data.titles || []
    } catch (err: any) {
      console.error('Errore fetchManageableTitles:', err)
    }
  }

  const createTitle = async (data: Record<string, any>): Promise<ActionResult> => {
    try {
      await api.post('/titles/manage', data)
      await fetchManageableTitles()
      return { success: true }
    } catch (err: any) {
      console.error('Errore createTitle:', err)
      return { success: false, message: err.response?.data?.message || 'Errore creazione titolo' }
    }
  }

  const updateTitle = async (titleId: number, data: Record<string, any>): Promise<ActionResult> => {
    try {
      await api.put(`/titles/manage/${titleId}`, data)
      await fetchManageableTitles()
      return { success: true }
    } catch (err: any) {
      console.error('Errore updateTitle:', err)
      return { success: false, message: err.response?.data?.message || 'Errore aggiornamento titolo' }
    }
  }

  const deleteTitle = async (titleId: number): Promise<ActionResult> => {
    try {
      await api.delete(`/titles/manage/${titleId}`)
      await fetchManageableTitles()
      return { success: true }
    } catch (err: any) {
      console.error('Errore deleteTitle:', err)
      return { success: false, message: err.response?.data?.message || 'Errore eliminazione titolo' }
    }
  }

  // === Nuove feature: sparkline / heatmap / next / ranking / weekly ===

  const clientParams = (clientId: number | null): Record<string, any> => clientId ? { clientId } : {}

  const fetchXPSparkline = async (days: number = 30, clientId: number | null = null): Promise<void> => {
    try {
      const response = await api.get('/gamification/xp-sparkline', { params: { days, ...clientParams(clientId) } })
      xpSparkline.value = response.data.data.sparkline || []
    } catch (err: any) {
      console.error('Errore fetchXPSparkline:', err)
    }
  }

  const fetchStreakHeatmap = async (year?: number, clientId: number | null = null): Promise<void> => {
    try {
      const y = year || new Date().getFullYear()
      const response = await api.get('/gamification/streak-heatmap', { params: { year: y, ...clientParams(clientId) } })
      streakHeatmap.value = response.data.data.heatmap || []
      streakHeatmapYear.value = response.data.data.year || y
    } catch (err: any) {
      console.error('Errore fetchStreakHeatmap:', err)
    }
  }

  const fetchNextAchievement = async (clientId: number | null = null): Promise<void> => {
    try {
      const response = await api.get('/gamification/next-achievement', { params: clientParams(clientId) })
      nextAchievement.value = response.data.data.next
    } catch (err: any) {
      console.error('Errore fetchNextAchievement:', err)
    }
  }

  const fetchRanking = async (clientId: number | null = null): Promise<void> => {
    try {
      const response = await api.get('/gamification/ranking', { params: clientParams(clientId) })
      ranking.value = response.data.data.ranking
    } catch (err: any) {
      console.error('Errore fetchRanking:', err)
    }
  }

  const fetchWeeklyRecap = async (clientId: number | null = null): Promise<void> => {
    try {
      const response = await api.get('/gamification/weekly-recap', { params: clientParams(clientId) })
      weeklyRecap.value = response.data.data.recap
    } catch (err: any) {
      console.error('Errore fetchWeeklyRecap:', err)
    }
  }

  const fetchWeeklyGoals = async (clientId: number | null = null): Promise<void> => {
    try {
      const response = await api.get('/gamification/weekly-goals', { params: clientParams(clientId) })
      weeklyGoals.value = response.data.data.goals || []
      weeklyGoalsWeekStart.value = response.data.data.week_start || null
    } catch (err: any) {
      console.error('Errore fetchWeeklyGoals:', err)
    }
  }

  const upsertWeeklyGoal = async (
    goalType: WeeklyGoalType,
    targetValue: number,
    clientId: number | null = null
  ): Promise<ActionResult> => {
    try {
      await api.post('/gamification/weekly-goals', { goal_type: goalType, target_value: targetValue }, { params: clientParams(clientId) })
      await fetchWeeklyGoals(clientId)
      return { success: true }
    } catch (err: any) {
      console.error('Errore upsertWeeklyGoal:', err)
      return { success: false, message: err.response?.data?.message || 'Errore salvataggio goal' }
    }
  }

  const deleteWeeklyGoal = async (goalId: number, clientId: number | null = null): Promise<ActionResult> => {
    try {
      await api.delete(`/gamification/weekly-goals/${goalId}`, { params: clientParams(clientId) })
      await fetchWeeklyGoals(clientId)
      return { success: true }
    } catch (err: any) {
      console.error('Errore deleteWeeklyGoal:', err)
      return { success: false, message: err.response?.data?.message || 'Errore eliminazione goal' }
    }
  }

  return {
    // State
    dashboard, recentAchievements, achievementsByCategory, allAchievements,
    recentXPActivity, activeChallengesPreview, leaderboard, leaderboardPagination,
    challenges, challengesPagination, currentChallenge,
    xpHistory, xpHistoryPagination, titles, displayedTitle,
    loading, error, selectedClientId, clients, manageableTitles,
    xpSparkline, streakHeatmap, streakHeatmapYear, nextAchievement,
    ranking, weeklyRecap, weeklyGoals, weeklyGoalsWeekStart,
    // Getters
    levelProgress, unlockedAchievements,
    // Actions
    fetchClients, fetchDashboard, fetchRecentAchievements,
    fetchAchievementsByCategory, fetchAllAchievements, fetchRecentXPActivity,
    fetchXPHistory, fetchActiveChallengesPreview,
    fetchLeaderboard, fetchChallenges, fetchChallengeById,
    joinChallenge, withdrawFromChallenge,
    fetchTitles, fetchDisplayedTitle, setDisplayedTitle,
    fetchManageableTitles, createTitle, updateTitle, deleteTitle,
    setClient, loadDashboardData, initialize,
    fetchXPSparkline, fetchStreakHeatmap, fetchNextAchievement,
    fetchRanking, fetchWeeklyRecap, fetchWeeklyGoals,
    upsertWeeklyGoal, deleteWeeklyGoal
  }
})
