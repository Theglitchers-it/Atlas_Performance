<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useLocalStorage } from "@vueuse/core";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";

// Layout components
import AppHeader from "@/components/layout/AppHeader.vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import AppBreadcrumb from "@/components/layout/AppBreadcrumb.vue";
import BottomNavigation from "@/components/mobile/BottomNavigation.vue";
import OfflineBanner from "@/components/mobile/OfflineBanner.vue";
import KeyboardShortcutsHelp from "@/components/ui/KeyboardShortcutsHelp.vue";
import ErrorBoundary from "@/components/ui/ErrorBoundary.vue";

// Composables
import { useNative } from "@/composables/useNative";
import { useNetwork } from "@/composables/useNetwork";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";
import { usePushNotifications } from "@/composables/usePushNotifications";
import { useAppLifecycle } from "@/composables/useAppLifecycle";
import { useOfflineSync } from "@/composables/useOfflineSync";
import { useRouteTransition } from "@/composables/useRouteTransition";
import { useSwipeBack } from "@/composables/useSwipeBack";
import { usePageLoading } from "@/composables/usePageLoading";

const route = useRoute();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const { isMobile, isNativeApp } = useNative();

// Keyboard shortcuts globali
const { showHelp, toggleHelp } = useKeyboardShortcuts();

// Push notifications native
const { register: registerPush } = usePushNotifications();

// App lifecycle (back button, foreground/background, deep links)
const { init: initLifecycle } = useAppLifecycle();

// Offline sync engine
const { init: initOfflineSync, syncQueue } = useOfflineSync();

// iOS-style page transitions (forward/back slide on mobile, fade on desktop)
const { transitionName } = useRouteTransition();

// Swipe-back navigation gesture (swipe from left edge to go back)
useSwipeBack();

// Global page loading indicator for route transitions
const { isLoading: pageLoading } = usePageLoading();

const isAuthenticated = computed<boolean>(() => authStore.isAuthenticated);
const showSidebar = computed<boolean>(
  () => isAuthenticated.value && !isMobile.value,
);
const showBottomNav = computed<boolean>(
  () => isAuthenticated.value && isMobile.value,
);

// Sidebar collapsed state (synced with AppSidebar via localStorage)
const sidebarCollapsed = useLocalStorage<boolean>("sidebar-collapsed", false);

// Drawer sidebar per tablet (768-1023px) — attivato dal bottone hamburger in AppHeader
const showDrawerSidebar = ref<boolean>(false);
const toggleDrawerSidebar = (): void => {
  showDrawerSidebar.value = !showDrawerSidebar.value;
};

// Chiudi drawer quando si naviga
watch(
  () => route.path,
  () => {
    showDrawerSidebar.value = false;
  },
);

// Theme watcher
watch(
  () => themeStore.isDark,
  (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },
  { immediate: true },
);

// Quando l'utente diventa autenticato, inizializza servizi nativi
watch(isAuthenticated, async (authenticated) => {
  if (authenticated && isNativeApp.value) {
    // Registra per push notifications native
    registerPush();
  }
});

// Network monitoring
const { init: initNetwork } = useNetwork();

onMounted(async () => {
  // Initialize theme (synchronous, no need to await)
  themeStore.initTheme();

  // Inizializza network monitoring
  try {
    await initNetwork();
  } catch (e) {
    console.warn("[App] Network init failed:", (e as Error).message);
  }

  // Inizializza offline sync engine (usa network internamente)
  initOfflineSync();

  // Inizializza gestione lifecycle app nativa
  initLifecycle({
    onResume: () => {
      // Quando l'app torna in foreground, sync dati offline
      syncQueue();
    },
  });
});
</script>

<template>
  <div
    class="min-h-screen bg-habit-bg transition-colors duration-300"
  >
    <!-- Global page loading bar -->
    <Transition name="fade">
      <div
        v-if="pageLoading"
        class="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-habit-orange/20"
      >
        <div
          class="h-full bg-habit-orange animate-loading-bar rounded-r-full"
        />
      </div>
    </Transition>

    <!-- Skip to content link (accessibility) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-habit-orange focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
    >
      Vai al contenuto principale
    </a>

    <!-- Authenticated Layout -->
    <template v-if="isAuthenticated">
      <!-- Header -->
      <AppHeader @toggle-sidebar="toggleDrawerSidebar" />

      <!-- Drawer Sidebar Overlay (mobile + tablet: < 1024px) -->
      <Transition name="fade">
        <div
          v-if="showDrawerSidebar"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          @click="showDrawerSidebar = false"
        />
      </Transition>
      <Transition name="slide-sidebar">
        <div
          v-if="showDrawerSidebar"
          class="fixed left-0 top-16 bottom-0 w-64 z-50 lg:hidden overflow-y-auto bg-habit-card rounded-r-2xl shadow-[4px_0_16px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.2)]"
          :class="{ 'pb-20': showBottomNav }"
        >
          <AppSidebar :drawer="true" @close="showDrawerSidebar = false" />
        </div>
      </Transition>

      <div class="flex">
        <!-- Sidebar (Desktop >= 1024px) -->
        <AppSidebar v-if="showSidebar" />

        <!-- Main Content -->
        <main
          id="main-content"
          tabindex="-1"
          class="flex-1 transition-all duration-300 safe-left safe-right"
          :class="{
            'lg:ml-64': showSidebar && !sidebarCollapsed,
            'lg:ml-14': showSidebar && sidebarCollapsed,
            'pb-20': showBottomNav,
          }"
          style="padding-top: calc(4rem + env(safe-area-inset-top, 0px))"
        >
          <div
            class="w-full px-3 pt-5 pb-4 sm:px-4 sm:pt-6 sm:pb-5 md:px-8 md:pt-8 md:pb-6 lg:px-10"
          >
            <!-- Breadcrumb -->
            <AppBreadcrumb />

            <ErrorBoundary>
              <router-view v-slot="{ Component }">
                <Transition :name="transitionName" mode="out-in">
                  <component :is="Component" />
                </Transition>
              </router-view>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <!-- Bottom Navigation (Mobile) -->
      <BottomNavigation v-if="showBottomNav" />

      <!-- Offline Status Banner -->
      <OfflineBanner />

      <!-- Keyboard Shortcuts Help Overlay -->
      <KeyboardShortcutsHelp :open="showHelp" @close="toggleHelp" />
    </template>

    <!-- Public Layout (Login, Register, etc.) -->
    <template v-else>
      <main id="main-content" tabindex="-1">
        <ErrorBoundary>
          <router-view />
        </ErrorBoundary>
      </main>
    </template>
  </div>
</template>

<style>
/* Fade overlay transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Drawer sidebar slide transition */
.slide-sidebar-enter-active,
.slide-sidebar-leave-active {
  transition: transform 0.3s ease;
}

.slide-sidebar-enter-from,
.slide-sidebar-leave-to {
  transform: translateX(-100%);
}

/* Loading bar animation */
@keyframes loading-bar {
  0% {
    width: 0;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 95%;
  }
}
.animate-loading-bar {
  animation: loading-bar 2s ease-in-out infinite;
}
</style>
