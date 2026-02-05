/**
 * Vue Router Configuration
 * Routing con guards per autenticazione e ruoli
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

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

// 404
const NotFoundView = () => import('@/views/NotFoundView.vue')

const routes = [
    // Public routes
    {
        path: '/home',
        name: 'Home',
        component: LandingPage,
        meta: { requiresGuest: true }
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: { requiresGuest: true }
    },
    {
        path: '/register',
        name: 'Register',
        component: RegisterView,
        meta: { requiresGuest: true }
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: ForgotPasswordView,
        meta: { requiresGuest: true }
    },

    // Protected routes - Dashboard
    {
        path: '/',
        name: 'Dashboard',
        component: DashboardView,
        meta: { requiresAuth: true }
    },

    // Trainer routes
    {
        path: '/clients',
        name: 'Clients',
        component: ClientsListView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/clients/new',
        name: 'ClientCreate',
        component: ClientCreateView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/clients/:id',
        name: 'ClientDetail',
        component: ClientDetailView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },

    // Workouts
    {
        path: '/workouts',
        name: 'Workouts',
        component: WorkoutsView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/workouts/builder',
        name: 'WorkoutBuilder',
        component: WorkoutBuilderView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/workouts/builder/:id',
        name: 'WorkoutEdit',
        component: WorkoutBuilderView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/exercises',
        name: 'Exercises',
        component: ExerciseLibraryView,
        meta: { requiresAuth: true }
    },

    // Programs
    {
        path: '/programs',
        name: 'Programs',
        component: ProgramsView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/programs/:id',
        name: 'ProgramDetail',
        component: ProgramDetailView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },

    // Nutrition
    {
        path: '/nutrition',
        name: 'Nutrition',
        component: NutritionView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },
    {
        path: '/nutrition/planner/:clientId?',
        name: 'MealPlanner',
        component: MealPlannerView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },

    // Chat
    {
        path: '/chat',
        name: 'Chat',
        component: ChatView,
        meta: { requiresAuth: true }
    },
    {
        path: '/chat/:conversationId',
        name: 'ChatConversation',
        component: ChatView,
        meta: { requiresAuth: true }
    },

    // Community
    {
        path: '/community',
        name: 'Community',
        component: CommunityView,
        meta: { requiresAuth: true }
    },

    // Booking
    {
        path: '/calendar',
        name: 'Calendar',
        component: CalendarView,
        meta: { requiresAuth: true }
    },
    {
        path: '/classes',
        name: 'Classes',
        component: ClassesView,
        meta: { requiresAuth: true }
    },

    // Videos
    {
        path: '/videos',
        name: 'Videos',
        component: VideoLibraryView,
        meta: { requiresAuth: true }
    },
    {
        path: '/courses/:id',
        name: 'CourseDetail',
        component: CourseDetailView,
        meta: { requiresAuth: true }
    },

    // Gamification
    {
        path: '/gamification',
        name: 'Gamification',
        component: GamificationView,
        meta: { requiresAuth: true }
    },
    {
        path: '/leaderboard',
        name: 'Leaderboard',
        component: LeaderboardView,
        meta: { requiresAuth: true }
    },
    {
        path: '/challenges',
        name: 'Challenges',
        component: ChallengesView,
        meta: { requiresAuth: true }
    },
    {
        path: '/titles',
        name: 'Titles',
        component: TitlesView,
        meta: { requiresAuth: true }
    },

    // Analytics
    {
        path: '/analytics',
        name: 'Analytics',
        component: AnalyticsView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },

    // Readiness
    {
        path: '/readiness',
        name: 'Readiness',
        component: ReadinessView,
        meta: { requiresAuth: true, roles: ['tenant_owner', 'staff', 'super_admin'] }
    },

    // Measurements
    {
        path: '/measurements',
        name: 'Measurements',
        component: MeasurementsView,
        meta: { requiresAuth: true }
    },

    // Settings
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView,
        meta: { requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: ProfileView,
        meta: { requiresAuth: true }
    },

    // Client-specific routes
    {
        path: '/my-dashboard',
        name: 'ClientDashboard',
        component: ClientDashboardView,
        meta: { requiresAuth: true, roles: ['client'] }
    },
    {
        path: '/my-workout',
        name: 'ClientWorkout',
        component: ClientWorkoutView,
        meta: { requiresAuth: true, roles: ['client'] }
    },
    {
        path: '/my-progress',
        name: 'ClientProgress',
        component: ClientProgressView,
        meta: { requiresAuth: true, roles: ['client'] }
    },
    {
        path: '/checkin',
        name: 'ClientCheckin',
        component: ClientCheckinView,
        meta: { requiresAuth: true, roles: ['client'] }
    },

    // 404
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFoundView
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Wait for auth check on first load
    if (!authStore.isAuthenticated && localStorage.getItem('token')) {
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
    if (to.meta.roles && !to.meta.roles.includes(userRole)) {
        // Redirect clients to their dashboard
        if (userRole === 'client') {
            return next({ name: 'ClientDashboard' })
        }
        // Redirect others to main dashboard
        return next({ name: 'Dashboard' })
    }

    next()
})

export default router
