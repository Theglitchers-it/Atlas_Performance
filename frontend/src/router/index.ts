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

// Workouts
const WorkoutsView = () => import('@/views/workouts/WorkoutsView.vue')
const WorkoutBuilderView = () => import('@/views/workouts/WorkoutBuilderView.vue')
const ExerciseLibraryView = () => import('@/views/workouts/ExerciseLibraryView.vue')

// Sessions
const SessionsView = () => import('@/views/sessions/SessionsView.vue')
const SessionDetailView = () => import('@/views/sessions/SessionDetailView.vue')

// Programs
const ProgramsView = () => import('@/views/programs/ProgramsView.vue')
const ProgramDetailView = () => import('@/views/programs/ProgramDetailView.vue')

// Nutrition
const NutritionView = () => import('@/views/nutrition/NutritionView.vue')
const MealPlannerView = () => import('@/views/nutrition/MealPlannerView.vue')

// Chat
const ChatView = () => import('@/views/chat/ChatView.vue')

// Community
const CommunityView = () => import('@/views/community/CommunityView.vue')

// Booking
const CalendarView = () => import('@/views/booking/CalendarView.vue')
const ClassesView = () => import('@/views/booking/ClassesView.vue')

// Videos
const VideoLibraryView = () => import('@/views/videos/VideoLibraryView.vue')
const CourseDetailView = () => import('@/views/videos/CourseDetailView.vue')

// Gamification
const GamificationView = () => import('@/views/gamification/GamificationView.vue')
const LeaderboardView = () => import('@/views/gamification/LeaderboardView.vue')
const ChallengesView = () => import('@/views/gamification/ChallengesView.vue')
const TitlesView = () => import('@/views/gamification/TitlesView.vue')

// Analytics
const AnalyticsView = () => import('@/views/analytics/AnalyticsView.vue')

// Readiness
const ReadinessView = () => import('@/views/readiness/ReadinessView.vue')

// Measurements
const MeasurementsView = () => import('@/views/measurements/MeasurementsView.vue')

// Settings
const SettingsView = () => import('@/views/settings/SettingsView.vue')
const ProfileView = () => import('@/views/settings/ProfileView.vue')

// Client-specific views
const ClientDashboardView = () => import('@/views/client/ClientDashboardView.vue')
const ClientWorkoutView = () => import('@/views/client/ClientWorkoutView.vue')
const ClientProgressView = () => import('@/views/client/ClientProgressView.vue')
const ClientCheckinView = () => import('@/views/client/ClientCheckinView.vue')

// Referral
const ReferralView = () => import('@/views/referral/ReferralView.vue')

// Locations (Multi-Sede)
const LocationsView = () => import('@/views/locations/LocationsView.vue')

// Volume Analytics
const VolumeAnalyticsView = () => import('@/views/volume/VolumeAnalyticsView.vue')

// Staff Permissions
const StaffPermissionsView = () => import('@/views/settings/StaffPermissionsView.vue')

// Admin (Super Admin)
const AdminDashboardView = () => import('@/views/admin/AdminDashboardView.vue')
const AdminTenantsView = () => import('@/views/admin/AdminTenantsView.vue')
const AdminBillingView = () => import('@/views/admin/AdminBillingView.vue')
const AdminAuditView = () => import('@/views/admin/AdminAuditView.vue')

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
        meta: { requiresAuth: true, title: 'Dashboard - Atlas', breadcrumb: [{ label: 'Dashboard' }] }
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
        path: '/clients/:id',
        name: 'ClientDetail',
        component: ClientDetailView,
        meta: { requiresAuth: true, title: 'Dettaglio Cliente - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Clienti', to: '/clients' }, { label: 'Dettaglio' }] }
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

    // Sessioni
    {
        path: '/sessions',
        name: 'Sessions',
        component: SessionsView,
        meta: { requiresAuth: true, title: 'Sessioni - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Sessioni' }] }
    },
    {
        path: '/sessions/:id',
        name: 'SessionDetail',
        component: SessionDetailView,
        meta: { requiresAuth: true, title: 'Dettaglio Sessione - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Sessioni', to: '/sessions' }, { label: 'Dettaglio' }] }
    },

    // Programmi
    {
        path: '/programs',
        name: 'Programs',
        component: ProgramsView,
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

    // Gamification
    {
        path: '/gamification',
        name: 'Gamification',
        component: GamificationView,
        meta: { requiresAuth: true, title: 'Gamification - Atlas', breadcrumb: [{ label: 'Gamification' }] }
    },
    {
        path: '/leaderboard',
        name: 'Leaderboard',
        component: LeaderboardView,
        meta: { requiresAuth: true, title: 'Classifica - Atlas', breadcrumb: [{ label: 'Gamification', to: '/gamification' }, { label: 'Classifica' }] }
    },
    {
        path: '/challenges',
        name: 'Challenges',
        component: ChallengesView,
        meta: { requiresAuth: true, title: 'Sfide - Atlas', breadcrumb: [{ label: 'Gamification', to: '/gamification' }, { label: 'Sfide' }] }
    },
    {
        path: '/titles',
        name: 'Titles',
        component: TitlesView,
        meta: { requiresAuth: true, title: 'Titoli - Atlas', breadcrumb: [{ label: 'Gamification', to: '/gamification' }, { label: 'Titoli' }] }
    },

    // Analytics
    {
        path: '/analytics',
        name: 'Analytics',
        component: AnalyticsView,
        meta: { requiresAuth: true, title: 'Analytics - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Analytics' }] }
    },

    // Readiness
    {
        path: '/readiness',
        name: 'Readiness',
        component: ReadinessView,
        meta: { requiresAuth: true, title: 'Readiness - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Readiness' }] }
    },

    // Misurazioni
    {
        path: '/measurements',
        name: 'Measurements',
        component: MeasurementsView,
        meta: { requiresAuth: true, title: 'Misurazioni - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Misurazioni' }] }
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
        name: 'Profile',
        component: ProfileView,
        meta: { requiresAuth: true, title: 'Profilo - Atlas', breadcrumb: [{ label: 'Impostazioni', to: '/settings' }, { label: 'Profilo' }] }
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
        path: '/my-progress',
        name: 'ClientProgress',
        component: ClientProgressView,
        meta: { requiresAuth: true, title: 'Progressi - Atlas', roles: ['client'], breadcrumb: [{ label: 'Progressi' }] }
    },
    {
        path: '/checkin',
        name: 'ClientCheckin',
        component: ClientCheckinView,
        meta: { requiresAuth: true, title: 'Check-in - Atlas', roles: ['client'], breadcrumb: [{ label: 'Check-in' }] }
    },

    // Super Admin routes
    {
        path: '/admin',
        name: 'AdminDashboard',
        component: AdminDashboardView,
        meta: { requiresAuth: true, title: 'Admin - Atlas', roles: ['super_admin'], breadcrumb: [{ label: 'Admin' }] }
    },
    {
        path: '/admin/tenants',
        name: 'AdminTenants',
        component: AdminTenantsView,
        meta: { requiresAuth: true, title: 'Tenant - Atlas', roles: ['super_admin'], breadcrumb: [{ label: 'Admin', to: '/admin' }, { label: 'Tenant' }] }
    },
    {
        path: '/admin/billing',
        name: 'AdminBilling',
        component: AdminBillingView,
        meta: { requiresAuth: true, title: 'Fatturazione - Atlas', roles: ['super_admin'], breadcrumb: [{ label: 'Admin', to: '/admin' }, { label: 'Fatturazione' }] }
    },
    {
        path: '/admin/audit',
        name: 'AdminAudit',
        component: AdminAuditView,
        meta: { requiresAuth: true, title: 'Audit Log - Atlas', roles: ['super_admin'], breadcrumb: [{ label: 'Admin', to: '/admin' }, { label: 'Audit Log' }] }
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
        meta: { requiresAuth: true, title: 'Sedi - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Sedi' }] }
    },

    // Volume Analytics
    {
        path: '/volume',
        name: 'VolumeAnalytics',
        component: VolumeAnalyticsView,
        meta: { requiresAuth: true, title: 'Volume - Atlas', roles: ['tenant_owner', 'staff', 'super_admin'], breadcrumb: [{ label: 'Volume' }] }
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
        return next({ name: 'Dashboard' })
    }

    // Protected routes
    if (to.meta.requiresAuth && !isAuthenticated) {
        return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    // Role-based access
    if (to.meta.roles && userRole && !to.meta.roles.includes(userRole)) {
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
