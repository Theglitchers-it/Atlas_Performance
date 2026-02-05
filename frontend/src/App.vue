<script setup>
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'

// Layout components
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import BottomNavigation from '@/components/mobile/BottomNavigation.vue'

// Composables
import { useNative } from '@/composables/useNative'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const { isNative, isMobile } = useNative()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const showSidebar = computed(() => isAuthenticated.value && !isMobile.value)
const showBottomNav = computed(() => isAuthenticated.value && isMobile.value)

// Theme watcher
watch(() => themeStore.isDark, (isDark) => {
    if (isDark) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}, { immediate: true })

onMounted(async () => {
    // Check for existing auth token
    await authStore.checkAuth()

    // Initialize theme
    themeStore.initTheme()
})
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <!-- Authenticated Layout -->
        <template v-if="isAuthenticated">
            <!-- Header -->
            <AppHeader />

            <div class="flex">
                <!-- Sidebar (Desktop) -->
                <AppSidebar v-if="showSidebar" />

                <!-- Main Content -->
                <main
                    class="flex-1 transition-all duration-300"
                    :class="{
                        'lg:ml-64': showSidebar,
                        'pt-16': true,
                        'pb-20': showBottomNav
                    }"
                >
                    <div class="container mx-auto px-4 py-6">
                        <router-view v-slot="{ Component }">
                            <transition
                                name="fade"
                                mode="out-in"
                            >
                                <component :is="Component" />
                            </transition>
                        </router-view>
                    </div>
                </main>
            </div>

            <!-- Bottom Navigation (Mobile) -->
            <BottomNavigation v-if="showBottomNav" />
        </template>

        <!-- Public Layout (Login, Register, etc.) -->
        <template v-else>
            <router-view v-slot="{ Component }">
                <transition
                    name="fade"
                    mode="out-in"
                >
                    <component :is="Component" />
                </transition>
            </router-view>
        </template>
    </div>
</template>

<style>
/* Page transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Slide transitions */
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from {
    transform: translateX(20px);
    opacity: 0;
}

.slide-leave-to {
    transform: translateX(-20px);
    opacity: 0;
}
</style>
