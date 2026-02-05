<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import {
    HomeIcon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    VideoCameraIcon,
    ChartBarIcon,
    TrophyIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon,
    HeartIcon,
    ScaleIcon,
    SparklesIcon,
    UsersIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)
const isTrainer = computed(() => authStore.isTrainer)
const user = computed(() => authStore.user)

// Menu items per trainer
const trainerMenu = [
    { name: 'Dashboard', path: '/', icon: HomeIcon, badge: null },
    { name: 'Clienti', path: '/clients', icon: UserGroupIcon, badge: '12' },
    { name: 'Schede', path: '/workouts', icon: ClipboardDocumentListIcon, badge: null },
    { name: 'Esercizi', path: '/exercises', icon: SparklesIcon, badge: null },
    { name: 'Programmi', path: '/programs', icon: CalendarIcon, badge: null },
    { name: 'Nutrizione', path: '/nutrition', icon: HeartIcon, badge: null },
    { name: 'Chat', path: '/chat', icon: ChatBubbleLeftRightIcon, badge: '3' },
    { name: 'Community', path: '/community', icon: UsersIcon, badge: null },
    { name: 'Calendario', path: '/calendar', icon: CalendarIcon, badge: null },
    { name: 'Classi', path: '/classes', icon: UserGroupIcon, badge: null },
    { name: 'Video', path: '/videos', icon: VideoCameraIcon, badge: null },
    { name: 'Readiness', path: '/readiness', icon: HeartIcon, badge: null },
    { name: 'Misurazioni', path: '/measurements', icon: ScaleIcon, badge: null },
    { name: 'Gamification', path: '/gamification', icon: TrophyIcon, badge: null },
    { name: 'Analytics', path: '/analytics', icon: ChartBarIcon, badge: null },
]

// Menu items per client
const clientMenu = [
    { name: 'Home', path: '/my-dashboard', icon: HomeIcon, badge: null },
    { name: 'Allenamento', path: '/my-workout', icon: ClipboardDocumentListIcon, badge: null },
    { name: 'Progressi', path: '/my-progress', icon: ChartBarIcon, badge: null },
    { name: 'Check-in', path: '/checkin', icon: HeartIcon, badge: null },
    { name: 'Chat', path: '/chat', icon: ChatBubbleLeftRightIcon, badge: '1' },
    { name: 'Community', path: '/community', icon: UsersIcon, badge: null },
    { name: 'Calendario', path: '/calendar', icon: CalendarIcon, badge: null },
    { name: 'Video', path: '/videos', icon: VideoCameraIcon, badge: null },
    { name: 'Badge', path: '/gamification', icon: TrophyIcon, badge: null },
]

const menuItems = computed(() => isTrainer.value ? trainerMenu : clientMenu)

const isActive = (path) => {
    if (path === '/') return route.path === '/'
    return route.path.startsWith(path)
}

const handleLogout = () => {
    authStore.logout()
}

const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
}
</script>

<template>
    <aside
        class="fixed left-0 top-16 bottom-0 bg-white dark:bg-habit-bg border-r border-gray-200 dark:border-habit-border overflow-y-auto hidden lg:block transition-all duration-300 z-30"
        :class="isCollapsed ? 'w-20' : 'w-64'"
    >
        <!-- Collapse Toggle -->
        <button
            @click="toggleCollapse"
            class="absolute -right-3 top-6 w-6 h-6 bg-habit-card border border-habit-border rounded-full flex items-center justify-center text-habit-text-muted hover:text-white hover:bg-habit-orange transition-all duration-200 z-10"
        >
            <ChevronLeftIcon v-if="!isCollapsed" class="w-4 h-4" />
            <ChevronRightIcon v-else class="w-4 h-4" />
        </button>

        <nav class="p-4">
            <!-- User Quick Info (collapsed state) -->
            <div v-if="isCollapsed" class="mb-6 flex justify-center">
                <div class="w-10 h-10 rounded-xl bg-habit-orange flex items-center justify-center">
                    <span class="text-white font-semibold text-sm">
                        {{ user?.firstName?.[0] || 'U' }}
                    </span>
                </div>
            </div>

            <!-- User Stats Card (expanded state) -->
            <div v-if="!isCollapsed" class="mb-6 p-4 bg-habit-card rounded-2xl border border-habit-border">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-xl bg-habit-orange flex items-center justify-center">
                        <span class="text-white font-bold">
                            {{ user?.firstName?.[0] || 'U' }}
                        </span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-white font-semibold truncate">{{ user?.firstName }} {{ user?.lastName }}</p>
                        <p class="text-habit-text-subtle text-sm">{{ isTrainer ? 'Personal Trainer' : 'Cliente' }}</p>
                    </div>
                </div>
                <!-- Quick Stats -->
                <div class="grid grid-cols-2 gap-2 text-center">
                    <div class="p-2 bg-habit-bg-light rounded-xl">
                        <p class="text-white font-bold">12</p>
                        <p class="text-habit-text-subtle text-xs">{{ isTrainer ? 'Clienti' : 'Giorni' }}</p>
                    </div>
                    <div class="p-2 bg-habit-bg-light rounded-xl">
                        <p class="text-habit-orange font-bold">7 🔥</p>
                        <p class="text-habit-text-subtle text-xs">Streak</p>
                    </div>
                </div>
            </div>

            <!-- Menu items -->
            <ul class="space-y-1">
                <li v-for="item in menuItems" :key="item.path">
                    <router-link
                        :to="item.path"
                        class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
                        :class="{
                            'bg-habit-orange text-white shadow-habit-glow': isActive(item.path),
                            'text-habit-text-muted hover:bg-habit-card hover:text-white': !isActive(item.path),
                            'justify-center': isCollapsed
                        }"
                        :title="isCollapsed ? item.name : ''"
                    >
                        <component
                            :is="item.icon"
                            class="w-5 h-5 flex-shrink-0"
                            :class="{ 'text-white': isActive(item.path) }"
                        />
                        <span v-if="!isCollapsed" class="font-medium">{{ item.name }}</span>

                        <!-- Badge -->
                        <span
                            v-if="item.badge && !isCollapsed"
                            class="ml-auto px-2 py-0.5 text-xs font-medium rounded-full"
                            :class="isActive(item.path) ? 'bg-white/20 text-white' : 'bg-habit-orange/20 text-habit-orange'"
                        >
                            {{ item.badge }}
                        </span>

                        <!-- Collapsed badge -->
                        <span
                            v-if="item.badge && isCollapsed"
                            class="absolute -top-1 -right-1 w-5 h-5 bg-habit-orange text-white text-xs font-medium rounded-full flex items-center justify-center"
                        >
                            {{ item.badge }}
                        </span>

                        <!-- Tooltip for collapsed state -->
                        <div
                            v-if="isCollapsed"
                            class="absolute left-full ml-2 px-3 py-1.5 bg-habit-card border border-habit-border rounded-lg text-white text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50"
                        >
                            {{ item.name }}
                        </div>
                    </router-link>
                </li>
            </ul>

            <!-- Divider -->
            <div class="my-4 divider"></div>

            <!-- Bottom menu -->
            <ul class="space-y-1">
                <li>
                    <router-link
                        to="/settings"
                        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-habit-text-muted hover:bg-habit-card hover:text-white transition-all duration-200 group relative"
                        :class="{ 'justify-center': isCollapsed }"
                        :title="isCollapsed ? 'Impostazioni' : ''"
                    >
                        <Cog6ToothIcon class="w-5 h-5" />
                        <span v-if="!isCollapsed" class="font-medium">Impostazioni</span>

                        <!-- Tooltip -->
                        <div
                            v-if="isCollapsed"
                            class="absolute left-full ml-2 px-3 py-1.5 bg-habit-card border border-habit-border rounded-lg text-white text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50"
                        >
                            Impostazioni
                        </div>
                    </router-link>
                </li>
                <li>
                    <button
                        @click="handleLogout"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-habit-red hover:bg-habit-red/10 transition-all duration-200 group relative"
                        :class="{ 'justify-center': isCollapsed }"
                        :title="isCollapsed ? 'Esci' : ''"
                    >
                        <ArrowLeftOnRectangleIcon class="w-5 h-5" />
                        <span v-if="!isCollapsed" class="font-medium">Esci</span>

                        <!-- Tooltip -->
                        <div
                            v-if="isCollapsed"
                            class="absolute left-full ml-2 px-3 py-1.5 bg-habit-card border border-habit-border rounded-lg text-white text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50"
                        >
                            Esci
                        </div>
                    </button>
                </li>
            </ul>

            <!-- Pro Upgrade Card (expanded only) -->
            <div v-if="!isCollapsed && !isTrainer" class="mt-6 p-4 bg-gradient-to-br from-habit-orange/20 to-habit-purple/20 rounded-2xl border border-habit-orange/30">
                <div class="text-2xl mb-2">⭐</div>
                <h4 class="text-white font-semibold mb-1">Passa a Pro</h4>
                <p class="text-habit-text-muted text-sm mb-3">Sblocca tutte le funzionalità premium</p>
                <button class="w-full btn-primary btn-sm">
                    Scopri di più
                </button>
            </div>
        </nav>
    </aside>
</template>
