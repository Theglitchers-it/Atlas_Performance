<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import {
    HomeIcon,
    ClipboardDocumentListIcon,
    ChatBubbleLeftRightIcon,
    TrophyIcon,
    UserIcon
} from '@heroicons/vue/24/outline'
import {
    HomeIcon as HomeIconSolid,
    ClipboardDocumentListIcon as ClipboardSolid,
    ChatBubbleLeftRightIcon as ChatSolid,
    TrophyIcon as TrophySolid,
    UserIcon as UserSolid
} from '@heroicons/vue/24/solid'

const route = useRoute()
const authStore = useAuthStore()

const isTrainer = computed(() => authStore.isTrainer)

// Bottom nav items per trainer
const trainerNav = [
    { name: 'Home', path: '/', icon: HomeIcon, iconActive: HomeIconSolid },
    { name: 'Clienti', path: '/clients', icon: ClipboardDocumentListIcon, iconActive: ClipboardSolid },
    { name: 'Chat', path: '/chat', icon: ChatBubbleLeftRightIcon, iconActive: ChatSolid },
    { name: 'Badge', path: '/gamification', icon: TrophyIcon, iconActive: TrophySolid },
    { name: 'Profilo', path: '/profile', icon: UserIcon, iconActive: UserSolid },
]

// Bottom nav items per client
const clientNav = [
    { name: 'Home', path: '/my-dashboard', icon: HomeIcon, iconActive: HomeIconSolid },
    { name: 'Workout', path: '/my-workout', icon: ClipboardDocumentListIcon, iconActive: ClipboardSolid },
    { name: 'Chat', path: '/chat', icon: ChatBubbleLeftRightIcon, iconActive: ChatSolid },
    { name: 'Badge', path: '/gamification', icon: TrophyIcon, iconActive: TrophySolid },
    { name: 'Profilo', path: '/profile', icon: UserIcon, iconActive: UserSolid },
]

const navItems = computed(() => isTrainer.value ? trainerNav : clientNav)

const isActive = (path) => {
    if (path === '/' || path === '/my-dashboard') {
        return route.path === path
    }
    return route.path.startsWith(path)
}
</script>

<template>
    <nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom z-40">
        <div class="flex items-center justify-around h-16">
            <router-link
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                class="flex flex-col items-center justify-center flex-1 h-full transition-colors"
                :class="{
                    'text-primary-600 dark:text-primary-400': isActive(item.path),
                    'text-gray-500 dark:text-gray-400': !isActive(item.path)
                }"
            >
                <component
                    :is="isActive(item.path) ? item.iconActive : item.icon"
                    class="w-6 h-6"
                />
                <span class="text-xs mt-1 font-medium">{{ item.name }}</span>
            </router-link>
        </div>
    </nav>
</template>
