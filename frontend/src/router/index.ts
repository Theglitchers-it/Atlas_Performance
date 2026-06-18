/**
 * Vue Router Configuration
 * Routing con guards per autenticazione e ruoli
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import type { User } from '@/types'

// Extend RouteMeta for this app
declare module 'vue-router' {
    interface RouteMeta {
        requiresAuth?: boolean
        requiresGuest?: boolean
        roles?: User['role'][]
        title?: string
        breadcrumb?: { label: string; to?: string }[]
    }
}

// Lazy load views
const LandingPage = () => import('@/views/LandingPage.vue')
const LoginView = () => import('@/views/auth/LoginView.vue')
const RegisterView = () => import('@/views/auth/RegisterView.vue')
const ForgotPasswordView = () => import('@/views/auth/ForgotPasswordView.vue')

const DashboardView = () => import('@/views/DashboardView.vue')

// Clients
const ClientsListView = () => import('@/views/clients/ClientsListView.vue')
const ClientDetailView = () => import('@/views/clients/ClientDetailView.vue')
const ClientCreateView = () => import('@/views/clients/ClientCreateView.vue')
const ImportClientsCSVView = () => import('@/views/clients/ImportClientsCSVView.vue')

// Workouts
const WorkoutsView = () => import('@/views/workouts/WorkoutsView.vue')
const WorkoutBuilderView = () => import('@/views/workouts/WorkoutBuilderView.vue')
const ExerciseLibraryView = () => import('@/views/workouts/ExerciseLibraryView.vue')

// Sessions
const SessionDetailView = () => import('@/views/sessions/SessionDetailView.vue')

// Programs (Unified)
const UnifiedProgramsView = () => import('@/views/programs/UnifiedProgramsView.vue')
const ProgramDetailView = () => import('@/views/programs/ProgramDetailView.vue')

// Nutrition
const NutritionView = () => import('@/views/nutrition/NutritionView.vue')
const MealPlannerView = () => import('@/views/nutrition/MealPlannerView.vue')

// Chat
const ChatView = () => import('@/views/chat/ChatView.vue')

// Community
const CommunityView = () => import('@/views/community/CommunityView.vue')
const PublicProfileView = () => import('@/views/community/PublicProfileView.vue')

// Booking
const CalendarView = () => import('@/views/booking/CalendarView.vue')
const ClassesView = () => import('@/views/booking/ClassesView.vue')

// Videos
const VideoLibraryView = () => import('@/views/videos/VideoLibraryView.vue')
const CourseDetailView = () => import('@/views/videos/CourseDetailView.vue')

// Gamification views: importate da GamificationView.vue come componenti embedded.
// Le route /leaderboard, /challenges, /titles redirigono al sub-tab corrispondente.

// Analytics (Unified)
const UnifiedAnalyticsView = () => import('@/views/analytics/UnifiedAnalyticsView.vue')

// Readiness
const ReadinessView = () => import('@/views/readiness/ReadinessView.vue')

// Settings
const SettingsView = () => import('@/views/settings/SettingsView.vue')

// Client-specific views
const ClientDashboardView = () => import('@/views/client/ClientDashboardView.vue')
const ClientWorkoutView = () => import('@/views/client/ClientWorkoutView.vue')
const ClientProgressView = () => import('@/views/client/ClientProgressView.vue')
const ClientProgramDetailView = () => import('@/views/client/ClientProgramDetailView.vue')
const ClientSessionView = () => import('@/views/client/ClientSessionView.vue')

// Referral
const ReferralView = () => import('@/views/referral/ReferralView.vue')

// Locations (Multi-Sede)
const LocationsView = () => import('@/views/locations/LocationsView.vue')

// Volume Analytics — now embedded in UnifiedAnalyticsView

// Staff Permissions
const StaffPermissionsView = () => import('@/views/settings/StaffPermissionsView.vue')

// Admin (Unified)
const UnifiedAdminView = () => import('@/views/admin/UnifiedAdminView.vue')
const UnifiedMonitoringView = () => import('@/views/admin/UnifiedMonitoringView.vue')

// Notifications
const NotificationsView = () => import('@/views/notifications/NotificationsView.vue')

// 404
const NotFoundView = () => import('@/views/NotFoundView.vue')

const routes: RouteRecordRaw[] = [
    // Public routes (no breadcrumb)
    {
        path: '/home',
        name: 'Home',
        component: LandingPage,
        meta: { requiresGuest: true, title: 'Home - Atlas' }
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: { requiresGuest: true, title: 'Accedi - Atlas' }
    },
    {
        path: '/register',
        name: 'Register',
        component: RegisterView,
        meta: { requiresGuest: true, title: 'Registrati - Atlas' }
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: ForgotPasswordView,
        meta: { requiresGuest: true, title: 'Password Dimenticata - Atlas' }
    },

    // Protected routes - Dashboard
    {
        path: '/',
        name: 'Dashboard',
        component: DashboardView,
        meta: { requiresAuth: true, title: 'Dashboard - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Dashboard' }] }
    },

    // Trainer routes — Clienti
    {
        path: '/clients',
        name: 'Clients',
        component: ClientsListView,
        meta: { requiresAuth: true, title: 'Clienti - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Clienti' }] }
    },
    {
        path: '/clients/new',
        name: 'ClientCreate',
        component: ClientCreateView,
        meta: { requiresAuth: true, title: 'Nuovo Cliente - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Clienti', to: '/clients' }, { label: 'Nuovo Cliente' }] }
    },
    {
        path: '/clients/import',
        name: 'ImportClients',
        component: ImportClientsCSVView,
        meta: { requiresAuth: true, title: 'Importa Clienti CSV - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Clienti', to: '/clients' }, { label: 'Importa CSV' }] }
    },
    {
        path: '/clients/:id',
        name: 'ClientDetail',
        component: ClientDetailView,
        meta: { requiresAuth: true, title: 'Dettaglio Cliente - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Clienti', to: '/clients' }, { label: 'Dettaglio' }] }
    },
    {
        path: '/scadenze',
        redirect: '/clients?filter=with_actions'
    },

    // Schede (Workouts)
    {
        path: '/workouts',
        name: 'Workouts',
        component: WorkoutsView,
        meta: { requiresAuth: true, title: 'Schede - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Schede' }] }
    },
    {
        path: '/workouts/builder',
        name: 'WorkoutBuilder',
        component: WorkoutBuilderView,
        meta: { requiresAuth: true, title: 'Nuova Scheda - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Schede', to: '/workouts' }, { label: 'Nuova Scheda' }] }
    },
    {
        path: '/workouts/builder/:id',
        name: 'WorkoutEdit',
        component: WorkoutBuilderView,
        meta: { requiresAuth: true, title: 'Modifica Scheda - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Schede', to: '/workouts' }, { label: 'Modifica Scheda' }] }
    },
    {
        path: '/exercises',
        name: 'Exercises',
        component: ExerciseLibraryView,
        meta: { requiresAuth: true, title: 'Esercizi - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Esercizi' }] }
    },

    // Sessioni — redirect to unified Programs view
    {
        path: '/sessions',
        name: 'Sessions',
        redirect: '/programs?tab=sessioni'
    },
    {
        path: '/sessions/:id',
        name: 'SessionDetail',
        component: SessionDetailView,
        meta: { requiresAuth: true, title: 'Dettaglio Sessione - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Programmi', to: '/programs' }, { label: 'Sessioni', to: '/programs?tab=sessioni' }, { label: 'Dettaglio' }] }
    },

    // Programmi (Unified — Programmi + Sessioni)
    {
        path: '/programs',
        name: 'Programs',
        component: UnifiedProgramsView,
        meta: { requiresAuth: true, title: 'Programmi - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Programmi' }] }
    },
    {
        path: '/programs/:id',
        name: 'ProgramDetail',
        component: ProgramDetailView,
        meta: { requiresAuth: true, title: 'Dettaglio Programma - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Programmi', to: '/programs' }, { label: 'Dettaglio' }] }
    },

    // Nutrizione
    {
        path: '/nutrition',
        name: 'Nutrition',
        component: NutritionView,
        meta: { requiresAuth: true, title: 'Nutrizione - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Nutrizione' }] }
    },
    {
        path: '/nutrition/planner/:planId',
        name: 'MealPlanner',
        component: MealPlannerView,
        meta: { requiresAuth: true, title: 'Meal Planner - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Nutrizione', to: '/nutrition' }, { label: 'Meal Planner' }] }
    },

    // Chat
    {
        path: '/chat',
        name: 'Chat',
        component: ChatView,
        meta: { requiresAuth: true, title: 'Chat - Atlas', breadcrumb: [{ label: 'Chat' }] }
    },
    {
        path: '/chat/:conversationId',
        name: 'ChatConversation',
        component: ChatView,
        meta: { requiresAuth: true, title: 'Conversazione - Atlas', breadcrumb: [{ label: 'Chat', to: '/chat' }, { label: 'Conversazione' }] }
    },

    // Community
    {
        path: '/community',
        name: 'Community',
        component: CommunityView,
        meta: { requiresAuth: true, title: 'Community - Atlas', breadcrumb: [{ label: 'Community' }] }
    },
    {
        path: '/community/users/:id',
        name: 'PublicProfile',
        component: PublicProfileView,
        meta: { requiresAuth: true, title: 'Profilo - Atlas', breadcrumb: [{ label: 'Community', to: '/community' }, { label: 'Profilo' }] }
    },

    // Booking
    {
        path: '/calendar',
        name: 'Calendar',
        component: CalendarView,
        meta: { requiresAuth: true, title: 'Calendario - Atlas', breadcrumb: [{ label: 'Calendario' }] }
    },
    {
        path: '/classes',
        name: 'Classes',
        component: ClassesView,
        meta: { requiresAuth: true, title: 'Classi - Atlas', breadcrumb: [{ label: 'Classi' }] }
    },

    // Video
    {
        path: '/videos',
        name: 'Videos',
        component: VideoLibraryView,
        meta: { requiresAuth: true, title: 'Video - Atlas', breadcrumb: [{ label: 'Video' }] }
    },
    {
        path: '/courses/:id',
        name: 'CourseDetail',
        component: CourseDetailView,
        meta: { requiresAuth: true, title: 'Corso - Atlas', breadcrumb: [{ label: 'Video', to: '/videos' }, { label: 'Corso' }] }
    },

    // Gamification — redirect to unified Insights view
    {
        path: '/gamification',
        name: 'Gamification',
        redirect: '/insights?tab=gamification'
    },
    // Le pagine standalone redirigono al sub-tab corrispondente di Gamification.
    // Le view sono ancora montate internamente da GamificationView.vue come componenti.
    {
        path: '/leaderboard',
        name: 'Leaderboard',
        redirect: '/insights?tab=gamification&sub=leaderboard'
    },
    {
        path: '/challenges',
        name: 'Challenges',
        redirect: '/insights?tab=gamification&sub=challenges'
    },
    {
        path: '/titles',
        name: 'Titles',
        redirect: '/insights?tab=gamification&sub=titles'
    },

    // Insights (Unified — Panoramica + Volume + Gamification)
    {
        path: '/insights',
        name: 'Insights',
        component: UnifiedAnalyticsView,
        // client: ammesso ma vede solo il tab Gamification (filtrato in UnifiedAnalyticsView)
        meta: { requiresAuth: true, title: 'Insights - Atlas', roles: ['tenant_owner', 'staff', 'super_admin', 'client'], breadcrumb: [{ label: 'Insights' }] }
    },

    // Legacy /analytics redirect
    {
        path: '/analytics',
        redirect: '/insights'
    },

    // Readiness
    {
        path: '/readiness',
        name: 'Readiness',
        component: ReadinessView,
        meta: { requiresAuth: true, title: 'Readiness - Atlas', roles: ['tenant_owner', 'staff', 'super_admin', 'client'], breadcrumb: [{ label: 'Readiness' }] }
    },

    // Impostazioni
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView,
        meta: { requiresAuth: true, title: 'Impostazioni - Atlas', breadcrumb: [{ label: 'Impostazioni' }] }
    },
    {
        path: '/profile',
        redirect: '/settings',
        meta: { requiresAuth: true, title: 'Profilo - Atlas', breadcrumb: [{ label: 'Impostazioni', to: '/settings' }, { label: 'Profilo' }] }
    },

    // Fase 3 - Multi-sede: tree filiali + staff assignment
    {
        path: '/locations/tree',
        name: 'LocationsTree',
        component: () => import('@/views/locations/LocationsTreeView.vue'),
        meta: {
            requiresAuth: true,
            roles: ['tenant_owner', 'staff', 'super_admin'],
            title: 'Sedi & Filiali - Atlas',
            breadcrumb: [{ label: 'Sedi' }]
        }
    },

    // Fase 6 - Proof-of-Lift upload/storico
    {
        path: '/proof-of-lift/upload',
        name: 'UploadPRVideo',
        component: () => import('@/views/proof-of-lift/UploadPRVideoView.vue'),
        meta: {
            requiresAuth: true,
            title: 'Carica Proof-of-Lift - Atlas',
            breadcrumb: [{ label: 'Proof-of-Lift' }, { label: 'Carica' }]
        }
    },
    {
        path: '/proof-of-lift/me',
        name: 'MyPRs',
        component: () => import('@/views/proof-of-lift/MyPRsView.vue'),
        meta: {
            requiresAuth: true,
            title: 'I miei PR - Atlas',
            breadcrumb: [{ label: 'Proof-of-Lift' }, { label: 'I miei PR' }]
        }
    },

    // Fase 6 - World Leaderboard + Privacy
    {
        path: '/leaderboard/world',
        name: 'WorldLeaderboard',
        component: () => import('@/views/leaderboard/WorldLeaderboardView.vue'),
        meta: {
            requiresAuth: true,
            title: 'World Leaderboard - Atlas',
            breadcrumb: [{ label: 'World Leaderboard' }]
        }
    },
    {
        path: '/settings/world-leaderboard',
        name: 'WorldLeaderboardPrivacy',
        component: () => import('@/views/settings/WorldLeaderboardPrivacyView.vue'),
        meta: {
            requiresAuth: true,
            title: 'Privacy World Leaderboard - Atlas',
            breadcrumb: [{ label: 'Impostazioni', to: '/settings' }, { label: 'World Leaderboard' }]
        }
    },

    // Fase 5 - Community moderation & rules
    {
        path: '/community/moderation',
        name: 'CommunityModeration',
        component: () => import('@/views/community/ModerationPanelView.vue'),
        meta: {
            requiresAuth: true,
            roles: ['tenant_owner', 'staff', 'super_admin'],
            title: 'Moderazione Community - Atlas',
            breadcrumb: [{ label: 'Community', to: '/community' }, { label: 'Moderazione' }]
        }
    },
    {
        path: '/community/rules',
        name: 'CommunityRules',
        component: () => import('@/views/community/CommunityRulesView.vue'),
        meta: {
            requiresAuth: true,
            title: 'Regole Community - Atlas',
            breadcrumb: [{ label: 'Community', to: '/community' }, { label: 'Regole' }]
        }
    },

    // Fase 4 - GPS Check-in
    {
        path: '/checkin',
        name: 'GpsCheckin',
        component: () => import('@/views/checkin/CheckinView.vue'),
        meta: {
            requiresAuth: true,
            title: 'Check-in palestra - Atlas',
            breadcrumb: [{ label: 'Check-in' }]
        }
    },

    // Fase 2 - Pay per active client billing
    {
        path: '/billing/active',
        name: 'BillingActive',
        component: () => import('@/views/billing/BillingActiveDashboardView.vue'),
        meta: {
            requiresAuth: true,
            roles: ['tenant_owner', 'super_admin', 'staff'],
            title: 'Fatturazione - Atlas',
            breadcrumb: [{ label: 'Fatturazione' }]
        }
    },

    // Fase 1 - Account multi-livello: Team & Qualifiche
    {
        path: '/team',
        name: 'MyTeam',
        component: () => import('@/views/team/MyTeamView.vue'),
        meta: {
            requiresAuth: true,
            roles: ['tenant_owner', 'staff', 'super_admin'],
            title: 'Il mio Team - Atlas',
            breadcrumb: [{ label: 'Team' }]
        }
    },
    {
        path: '/profile/qualifications',
        name: 'Qualifications',
        component: () => import('@/views/profile/QualificationsView.vue'),
        meta: {
            requiresAuth: true,
            title: 'Qualifiche - Atlas',
            breadcrumb: [{ label: 'Profilo', to: '/profile' }, { label: 'Qualifiche' }]
        }
    },

    // Client-specific routes
    {
        path: '/my-dashboard',
        name: 'ClientDashboard',
        component: ClientDashboardView,
        meta: { requiresAuth: true, title: 'Home - Atlas', roles: ['client'], breadcrumb: [{ label: 'Home' }] }
    },
    {
        path: '/my-workout',
        name: 'ClientWorkout',
        component: ClientWorkoutView,
        meta: { requiresAuth: true, title: 'Allenamento - Atlas', roles: ['client'], breadcrumb: [{ label: 'Allenamento' }] }
    },
    {
        path: '/my-workout/program/:id',
        name: 'ClientProgramDetail',
        component: ClientProgramDetailView,
        meta: { requiresAuth: true, title: 'Dettaglio Programma - Atlas', roles: ['client'], breadcrumb: [{ label: 'Allenamento', to: '/my-workout' }, { label: 'Programma' }] }
    },
    {
        path: '/my-session/:id',
        name: 'ClientSession',
        component: ClientSessionView,
        meta: { requiresAuth: true, title: 'Sessione di Allenamento - Atlas', roles: ['client'], breadcrumb: [{ label: 'Allenamento', to: '/my-workout' }, { label: 'Sessione in corso' }] }
    },
    {
        path: '/my-progress',
        name: 'ClientProgress',
        component: ClientProgressView,
        meta: { requiresAuth: true, title: 'Progressi - Atlas', roles: ['client'], breadcrumb: [{ label: 'Progressi' }] }
    },
    // NOTA: route ClientCheckin rimossa (era duplicata con GpsCheckin path: '/checkin').
    // Il check-in benessere/readiness del cliente ora vive su /readiness (ReadinessView role-aware).

    // Admin (Unified)
    {
        path: '/admin',
        name: 'UnifiedAdmin',
        component: UnifiedAdminView,
        meta: { requiresAuth: true, title: 'Admin - Atlas', roles: ['super_admin'], breadcrumb: [{ label: 'Admin' }] }
    },
    {
        path: '/admin/monitoraggio',
        name: 'UnifiedMonitoring',
        component: UnifiedMonitoringView,
        meta: { requiresAuth: true, title: 'Monitoraggio - Atlas', roles: ['super_admin'], breadcrumb: [{ label: 'Admin', to: '/admin' }, { label: 'Monitoraggio' }] }
    },
    // Legacy redirects
    {
        path: '/admin/tenants',
        redirect: '/admin?tab=tenant'
    },
    {
        path: '/admin/billing',
        redirect: '/admin/monitoraggio'
    },
    {
        path: '/admin/audit',
        redirect: '/admin/monitoraggio?tab=audit'
    },

    // Referral
    {
        path: '/referral',
        name: 'Referral',
        component: ReferralView,
        meta: { requiresAuth: true, title: 'Referral - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Referral' }] }
    },

    // Sedi (Multi-Sede)
    {
        path: '/locations',
        name: 'Locations',
        component: LocationsView,
        meta: { requiresAuth: true, title: 'Sedi - Atlas', roles: ['tenant_owner', 'staff', 'super_admin', 'client'], breadcrumb: [{ label: 'Sedi' }] }
    },

    // Volume Analytics — redirect to unified Analytics view
    {
        path: '/volume',
        name: 'VolumeAnalytics',
        redirect: '/insights?tab=volume'
    },

    // Staff Permissions
    {
        path: '/settings/staff-permissions',
        name: 'StaffPermissions',
        component: StaffPermissionsView,
        meta: { requiresAuth: true, title: 'Permessi Staff - Atlas', roles: ['tenant_owner', 'super_admin'], breadcrumb: [{ label: 'Impostazioni', to: '/settings' }, { label: 'Permessi Staff' }] }
    },

    // Notifiche
    {
        path: '/notifications',
        name: 'Notifications',
        component: NotificationsView,
        meta: { requiresAuth: true, title: 'Notifiche - Atlas', breadcrumb: [{ label: 'Notifiche' }] }
    },

    // 404
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFoundView,
        meta: { title: 'Pagina Non Trovata - Atlas' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        }
        return { top: 0, behavior: 'smooth' }
    }
})

// Page loading state for route transitions
import { usePageLoading } from '@/composables/usePageLoading'
const { startLoading, stopLoading } = usePageLoading()

// Navigation guards
router.beforeEach(async (to, _from, next) => {
    startLoading()
    const authStore = useAuthStore()

    // Wait for auth check on first load (cookies httpOnly — non possiamo leggerli da JS)
    if (!authStore.initialAuthChecked) {
        await authStore.checkAuth()
    }

    const isAuthenticated = authStore.isAuthenticated
    const userRole = authStore.userRole

    // Guest-only routes (login, register) - but allow landing page
    if (to.meta.requiresGuest && isAuthenticated && to.name !== 'Home') {
        if (userRole === 'client') return next({ name: 'ClientDashboard' })
        return next({ name: 'Dashboard' })
    }

    // Protected routes
    if (to.meta.requiresAuth && !isAuthenticated) {
        return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    // Role-based access (array-aware: considera ruolo primario + roles[] mappati a legacy,
    // coerente con userHasAnyRole del backend — un gym_admin/community_moderator definito
    // solo in roles[] non viene più bloccato erroneamente).
    if (to.meta.roles && isAuthenticated && !authStore.canAccessRoles(to.meta.roles)) {
        if (userRole === 'client') {
            return next({ name: 'ClientDashboard' })
        }
        return next({ name: 'Dashboard' })
    }

    next()
})

// Aggiorna document.title ad ogni navigazione (accessibilita screen reader)
router.afterEach((to) => {
    stopLoading()
    document.title = (to.meta.title as string) || 'Atlas - Piattaforma Personal Trainer'
})

export default router
