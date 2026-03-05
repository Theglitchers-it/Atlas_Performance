/**
 * useSidebarStats - Composable per stats sidebar profile card
 * Fetch leggero e role-specific con cache localStorage 5 min
 */

import { ref, computed, onMounted, watch, type Ref, type ComputedRef } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useClientStore } from '@/store/client'
import { useNotificationStore } from '@/store/notification'
import { useGamificationStore } from '@/store/gamification'
import { useLocalStorage } from '@vueuse/core'
import api from '@/services/api'

const CACHE_TTL = 5 * 60 * 1000 // 5 minuti

interface StatItem {
    value: number | string
    label: string
    icon: string
    isBadge?: boolean
}

interface StatsState {
    stat1: StatItem
    stat2: StatItem
}

interface QuickAction {
    label: string
    icon: string
    path: string
}

interface StatLinks {
    stat1Link: string | null
    stat2Link: string | null
}

// --- Static lookup tables (module-level, created once) ---

const ROLE_LABELS = {
    tenant_owner: 'Titolare',
    staff: 'Collaboratore',
    client: 'Atleta',
    super_admin: 'Amministratore'
} as const

const AVATAR_GRADIENTS = {
    tenant_owner: 'from-habit-orange to-habit-cyan',
    staff: 'from-blue-500 to-habit-cyan',
    client: 'from-emerald-500 to-habit-cyan',
    super_admin: 'from-purple-500 to-pink-500'
} as const

const STAT2_ACCENTS = {
    tenant_owner: 'text-habit-orange',
    staff: 'text-habit-cyan',
    client: 'text-habit-orange',
    super_admin: 'text-purple-400'
} as const

const STAT_LINKS: Readonly<Record<string, StatLinks>> = {
    super_admin: { stat1Link: '/admin?tab=tenant', stat2Link: '/admin/monitoraggio?tab=audit' },
    tenant_owner: { stat1Link: '/clients', stat2Link: '/settings' },
    staff: { stat1Link: '/clients', stat2Link: '/notifications' },
    client: { stat1Link: '/my-progress', stat2Link: '/insights?tab=gamification' }
}

const DEFAULT_STAT_LINKS: Readonly<StatLinks> = { stat1Link: null, stat2Link: null }

const QUICK_ACTIONS: Readonly<Record<string, readonly QuickAction[]>> = {
    super_admin: [
        { label: 'Pannello Admin', icon: '🛡️', path: '/admin' },
        { label: 'Gestisci Attivita\'', icon: '🏢', path: '/admin?tab=tenant' }
    ],
    tenant_owner: [
        { label: '+ Cliente', icon: '👤', path: '/clients/new' },
        { label: '+ Scheda', icon: '📋', path: '/workouts/builder' }
    ],
    staff: [
        { label: 'Clienti', icon: '👥', path: '/clients' },
        { label: 'Calendario', icon: '📅', path: '/calendar' }
    ],
    client: [
        { label: 'Allenamento', icon: '💪', path: '/my-workout' },
        { label: 'Check-in', icon: '❤️', path: '/checkin' }
    ]
}

interface CachedStatsState {
    data: StatsState | null
    timestamp: number | null
    role: string | null
}

interface UseSidebarStatsReturn {
    stats: Ref<StatsState>
    loading: Ref<boolean>
    error: Ref<string | null>
    userRole: ComputedRef<string | null>
    roleLabel: ComputedRef<string>
    avatarGradient: ComputedRef<string>
    userInitials: ComputedRef<string>
    stat2AccentClass: ComputedRef<string>
    xpProgress: Ref<number>
    statLinks: ComputedRef<StatLinks>
    quickActions: ComputedRef<readonly QuickAction[]>
    refresh: () => Promise<void>
}

export function useSidebarStats(): UseSidebarStatsReturn {
    const authStore = useAuthStore()
    const clientStore = useClientStore()
    const notificationStore = useNotificationStore()
    const gamificationStore = useGamificationStore()

    // State
    const loading = ref<boolean>(false)
    const error = ref<string | null>(null)
    const xpProgress = ref<number>(0)

    // Cache persistente
    const cachedStats = useLocalStorage<CachedStatsState>('sidebar-stats-cache', {
        data: null,
        timestamp: null,
        role: null
    })

    // Stats reattive
    const stats = ref<StatsState>({
        stat1: { value: 0, label: '', icon: '' },
        stat2: { value: 0, label: '', icon: '', isBadge: false }
    })

    // --- Computed ---

    const userRole = computed<string | null>(() => authStore.userRole)

    const roleLabel = computed<string>(() =>
        ROLE_LABELS[authStore.userRole || ''] || 'Utente'
    )

    const avatarGradient = computed<string>(() =>
        AVATAR_GRADIENTS[authStore.userRole || ''] || 'from-habit-orange to-habit-orange'
    )

    const userInitials = computed<string>(() => {
        const first: string = authStore.user?.firstName || ''
        const last: string = authStore.user?.lastName || ''
        return `${first[0] || ''}${last[0] || ''}`.toUpperCase() || 'U'
    })

    const stat2AccentClass = computed<string>(() =>
        STAT2_ACCENTS[authStore.userRole || ''] || 'text-habit-orange'
    )

    const statLinks = computed<StatLinks>(() =>
        STAT_LINKS[authStore.userRole || ''] || DEFAULT_STAT_LINKS
    )

    const quickActions = computed<readonly QuickAction[]>(() =>
        QUICK_ACTIONS[authStore.userRole || ''] || []
    )

    // --- Cache helpers ---

    const isCacheValid = (): boolean => {
        if (!cachedStats.value.data || !cachedStats.value.timestamp) return false
        if (cachedStats.value.role !== authStore.userRole) return false
        return (Date.now() - cachedStats.value.timestamp) < CACHE_TTL
    }

    const saveCache = (): void => {
        cachedStats.value = {
            data: JSON.parse(JSON.stringify(stats.value)),
            timestamp: Date.now(),
            role: authStore.userRole
        }
    }

    // --- Fetch per ruolo ---

    const fetchTenantOwnerStats = async (): Promise<void> => {
        // Riusa clientStore (potrebbe essere gia' inizializzato dalla dashboard)
        if (clientStore.clientCount === 0 && !clientStore.loading) {
            await clientStore.fetchClients({ page: 1 })
        }

        const plan: string = (authStore.user as any)?.subscription_plan || (authStore.user as any)?.subscriptionPlan || 'free'
        const planLabel: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', professional: 'Pro', enterprise: 'Enterprise' }

        stats.value = {
            stat1: { value: clientStore.clientCount, label: 'Clienti', icon: '👥' },
            stat2: { value: planLabel[plan] || plan, label: 'Piano', icon: '💎', isBadge: true }
        }
    }

    const fetchStaffStats = async (): Promise<void> => {
        if (clientStore.clientCount === 0 && !clientStore.loading) {
            await clientStore.fetchClients({ page: 1 })
        }

        stats.value = {
            stat1: { value: clientStore.clientCount, label: 'Clienti', icon: '👥' },
            stat2: { value: notificationStore.unreadCount || 0, label: 'Notifiche', icon: '🔔' }
        }
    }

    const fetchClientStats = async (): Promise<void> => {
        const clientId: string | number | undefined = authStore.user?.clientId

        if (clientId && !gamificationStore.dashboard) {
            await gamificationStore.fetchDashboard(clientId)
        }

        const dashboard = gamificationStore.dashboard
        const streak: number = dashboard?.streak_days || 0
        const level: number = dashboard?.level || 1
        xpProgress.value = dashboard?.xpProgress || 0

        stats.value = {
            stat1: { value: streak, label: 'Streak', icon: '🔥' },
            stat2: { value: `Lv. ${level}`, label: 'Livello', icon: '⭐' }
        }
    }

    const fetchSuperAdminStats = async (): Promise<void> => {
        const response = await api.get('/admin/stats')
        const data: Record<string, any> = response.data.data || {}

        stats.value = {
            stat1: { value: data.totalTenants || 0, label: 'Attivita\'', icon: '🏢' },
            stat2: { value: data.totalUsers || 0, label: 'Utenti', icon: '👥' }
        }
    }

    // --- Main fetch ---

    const fetchStats = async (): Promise<void> => {
        // Usa cache se valida
        if (isCacheValid()) {
            stats.value = cachedStats.value.data as StatsState
            // Per client, ripristina anche xpProgress dalla gamification store
            if (authStore.userRole === 'client') {
                xpProgress.value = gamificationStore.dashboard?.xpProgress || 0
            }
            return
        }

        loading.value = true
        error.value = null

        try {
            const role: string = authStore.userRole || ''
            if (role === 'tenant_owner') await fetchTenantOwnerStats()
            else if (role === 'staff') await fetchStaffStats()
            else if (role === 'client') await fetchClientStats()
            else if (role === 'super_admin') await fetchSuperAdminStats()

            saveCache()
        } catch (err) {
            console.error('useSidebarStats: errore fetch:', err)
            error.value = 'Errore caricamento statistiche'
            // Fallback: mostra stats a zero
            stats.value = {
                stat1: { value: 0, label: '-', icon: '' },
                stat2: { value: 0, label: '-', icon: '' }
            }
        } finally {
            loading.value = false
        }
    }

    // Force refresh (invalida cache)
    const refresh = async (): Promise<void> => {
        cachedStats.value = { data: null, timestamp: null, role: null }
        await fetchStats()
    }

    // Watch per notification count (staff: aggiornamento real-time senza refetch)
    watch(() => notificationStore.unreadCount, (newCount: number) => {
        if (authStore.userRole === 'staff' && stats.value.stat2.label === 'Notifiche') {
            stats.value.stat2.value = newCount
        }
    })

    // Auto-fetch on mount
    onMounted(() => {
        if (authStore.user) {
            fetchStats()
        }
    })

    // Watch per cambio utente (login/logout)
    watch(() => authStore.user, (newUser: any) => {
        if (newUser) {
            fetchStats()
        }
    })

    return {
        stats,
        loading,
        error,
        userRole,
        roleLabel,
        avatarGradient,
        userInitials,
        stat2AccentClass,
        xpProgress,
        statLinks,
        quickActions,
        refresh
    }
}
