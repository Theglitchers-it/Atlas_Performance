<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import {
    Bars3Icon,
    BellIcon,
    MoonIcon,
    SunIcon,
    UserCircleIcon,
    MagnifyingGlassIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const themeStore = useThemeStore()

const user = computed(() => authStore.user)
const isDark = computed(() => themeStore.isDark)

const showSearch = ref(false)
const searchQuery = ref('')
const showNotifications = ref(false)

const emit = defineEmits(['toggle-sidebar'])

const toggleTheme = () => {
    themeStore.toggleTheme()
}

const notifications = ref([
    { id: 1, title: 'Nuovo obiettivo raggiunto!', message: '7 giorni di streak completati', time: '2 min fa', unread: true, icon: '🔥' },
    { id: 2, title: 'Promemoria allenamento', message: 'La tua sessione inizia tra 30 minuti', time: '30 min fa', unread: true, icon: '💪' },
    { id: 3, title: 'Nuovo messaggio', message: 'Marco ti ha inviato un messaggio', time: '1 ora fa', unread: false, icon: '💬' },
])

const unreadCount = computed(() => notifications.value.filter(n => n.unread).length)
</script>

<template>
    <header class="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-habit-bg/90 backdrop-blur-xl border-b border-gray-200 dark:border-habit-border z-40 transition-all duration-300">
        <div class="flex items-center justify-between h-full px-4">
            <!-- Left side -->
            <div class="flex items-center gap-4">
                <!-- Mobile menu toggle -->
                <button
                    @click="$emit('toggle-sidebar')"
                    class="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-habit-card transition-colors"
                >
                    <Bars3Icon class="w-6 h-6 text-gray-600 dark:text-habit-text-muted" />
                </button>

                <!-- Logo -->
                <router-link to="/" class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-habit-orange rounded-xl flex items-center justify-center shadow-habit-glow">
                        <span class="text-white font-bold text-lg">PT</span>
                    </div>
                    <span class="hidden sm:block font-display font-bold text-xl text-gray-900 dark:text-white">
                        Fitness<span class="text-habit-orange">Pro</span>
                    </span>
                </router-link>
            </div>

            <!-- Center - Search (desktop) -->
            <div class="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div class="relative w-full">
                    <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-habit-text-subtle" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cerca clienti, workout, esercizi..."
                        class="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-habit-card border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-habit-text-subtle focus:ring-2 focus:ring-habit-orange/50 transition-all duration-200"
                    />
                </div>
            </div>

            <!-- Right side -->
            <div class="flex items-center gap-2">
                <!-- Mobile search toggle -->
                <button
                    @click="showSearch = !showSearch"
                    class="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-habit-card transition-colors"
                >
                    <MagnifyingGlassIcon class="w-5 h-5 text-gray-600 dark:text-habit-text-muted" />
                </button>

                <!-- Theme toggle -->
                <button
                    @click="toggleTheme"
                    class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-habit-card transition-all duration-200"
                    :title="isDark ? 'Modalita chiara' : 'Modalita scura'"
                >
                    <SunIcon v-if="isDark" class="w-5 h-5 text-habit-orange" />
                    <MoonIcon v-else class="w-5 h-5 text-gray-600" />
                </button>

                <!-- Notifications -->
                <div class="relative">
                    <button
                        @click="showNotifications = !showNotifications"
                        class="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-habit-card transition-colors"
                    >
                        <BellIcon class="w-5 h-5 text-gray-600 dark:text-habit-text-muted" />
                        <!-- Notification badge -->
                        <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-5 h-5 bg-habit-orange rounded-full text-white text-xs flex items-center justify-center font-medium">
                            {{ unreadCount }}
                        </span>
                    </button>

                    <!-- Notifications dropdown -->
                    <Transition
                        enter-active-class="transition ease-out duration-200"
                        enter-from-class="opacity-0 translate-y-2"
                        enter-to-class="opacity-100 translate-y-0"
                        leave-active-class="transition ease-in duration-150"
                        leave-from-class="opacity-100 translate-y-0"
                        leave-to-class="opacity-0 translate-y-2"
                    >
                        <div
                            v-if="showNotifications"
                            class="absolute right-0 mt-2 w-80 bg-white dark:bg-habit-card rounded-2xl shadow-habit-lg border border-gray-200 dark:border-habit-border overflow-hidden"
                        >
                            <div class="p-4 border-b border-gray-200 dark:border-habit-border">
                                <div class="flex items-center justify-between">
                                    <h3 class="font-semibold text-gray-900 dark:text-white">Notifiche</h3>
                                    <span v-if="unreadCount > 0" class="badge-primary">{{ unreadCount }} nuove</span>
                                </div>
                            </div>
                            <div class="max-h-80 overflow-y-auto">
                                <div
                                    v-for="notification in notifications"
                                    :key="notification.id"
                                    class="p-4 hover:bg-gray-50 dark:hover:bg-habit-bg-light transition-colors cursor-pointer"
                                    :class="{ 'bg-habit-orange/5': notification.unread }"
                                >
                                    <div class="flex gap-3">
                                        <span class="text-2xl">{{ notification.icon }}</span>
                                        <div class="flex-1 min-w-0">
                                            <p class="font-medium text-gray-900 dark:text-white text-sm">{{ notification.title }}</p>
                                            <p class="text-gray-500 dark:text-habit-text-muted text-sm truncate">{{ notification.message }}</p>
                                            <p class="text-gray-400 dark:text-habit-text-subtle text-xs mt-1">{{ notification.time }}</p>
                                        </div>
                                        <div v-if="notification.unread" class="w-2 h-2 bg-habit-orange rounded-full mt-2"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="p-3 border-t border-gray-200 dark:border-habit-border">
                                <button class="w-full text-center text-habit-orange text-sm font-medium hover:underline">
                                    Vedi tutte le notifiche
                                </button>
                            </div>
                        </div>
                    </Transition>
                </div>

                <!-- User menu -->
                <router-link
                    to="/profile"
                    class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-habit-card transition-colors"
                >
                    <div v-if="user?.avatar" class="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-habit-orange/30">
                        <img :src="user.avatar" :alt="user.firstName" class="w-full h-full object-cover" />
                    </div>
                    <div v-else class="w-9 h-9 rounded-xl bg-habit-orange flex items-center justify-center">
                        <span class="text-white font-semibold text-sm">
                            {{ user?.firstName?.[0] || 'U' }}
                        </span>
                    </div>
                    <div class="hidden md:block text-left">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ user?.firstName || 'Utente' }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-habit-text-subtle">
                            {{ user?.role === 'trainer' ? 'Personal Trainer' : 'Cliente' }}
                        </p>
                    </div>
                </router-link>
            </div>
        </div>

        <!-- Mobile search bar -->
        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
        >
            <div v-if="showSearch" class="md:hidden absolute top-full left-0 right-0 p-4 bg-white dark:bg-habit-bg border-b border-gray-200 dark:border-habit-border">
                <div class="relative">
                    <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-habit-text-subtle" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cerca..."
                        class="w-full pl-10 pr-10 py-3 bg-gray-100 dark:bg-habit-card border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-habit-text-subtle focus:ring-2 focus:ring-habit-orange/50"
                        autofocus
                    />
                    <button
                        @click="showSearch = false"
                        class="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        <XMarkIcon class="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </div>
        </Transition>
    </header>
</template>
