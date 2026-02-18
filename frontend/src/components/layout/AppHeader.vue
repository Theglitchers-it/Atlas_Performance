<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { useNotificationStore } from "@/store/notification";
import { useNative } from "@/composables/useNative";
import api from "@/services/api";
import {
  Bars3Icon,
  BellIcon,
  MoonIcon,
  SunIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  WifiIcon,
  CheckIcon,
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const notificationStore = useNotificationStore();
const { isMobile } = useNative();

const user = computed(() => authStore.user as Record<string, any> | null);
const isDark = computed(() => themeStore.isDark);

const showSearch = ref(false);
const searchQuery = ref("");
const showNotifications = ref(false);
const canInstallPwa = ref(false);
const isOffline = ref(!navigator.onLine);

// Collapsible header on mobile scroll
const isCollapsed = ref(false);
const lastScrollY = ref(0);
const SCROLL_THRESHOLD = 80;

const handleScroll = () => {
  if (!isMobile.value) {
    isCollapsed.value = false;
    return;
  }
  const currentY = window.scrollY;
  isCollapsed.value = currentY > SCROLL_THRESHOLD;
  lastScrollY.value = currentY;
};

const headerHeight = computed(() => {
  if (!isMobile.value) return "h-16";
  return isCollapsed.value ? "h-12" : "h-16";
});

// Search state
const searchResults = ref<Record<string, any[]> | null>(null);
const searchLoading = ref(false);
const showSearchResults = ref(false);
const searchError = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
let searchAbortController: AbortController | null = null;

// Notification getters from store
const unreadCount = computed(() => notificationStore.unreadCount);
const recentNotifications = computed(
  () => notificationStore.recentNotifications as any[],
);
const notificationsLoading = computed(() => notificationStore.loading);

const onPwaAvailable = () => {
  canInstallPwa.value = true;
};
const onOnline = () => {
  isOffline.value = false;
};
const onOffline = () => {
  isOffline.value = true;
};

// Close dropdowns on outside click
const handleClickOutside = (e: MouseEvent) => {
  // Close notifications
  if (
    showNotifications.value &&
    !(e.target as HTMLElement)?.closest(".notification-dropdown-container")
  ) {
    showNotifications.value = false;
  }
  // Close search results
  if (
    showSearchResults.value &&
    !(e.target as HTMLElement)?.closest(".search-container")
  ) {
    showSearchResults.value = false;
  }
};

onMounted(() => {
  window.addEventListener("pwa-install-available", onPwaAvailable);
  window.addEventListener("app-online", onOnline);
  window.addEventListener("app-offline", onOffline);
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("click", handleClickOutside);
  if ((window as any).pwaCanInstall?.()) canInstallPwa.value = true;

  // Initialize notifications from backend (non-blocking — loads in background)
  if (authStore.isAuthenticated) {
    notificationStore.initialize();
  }
});

onUnmounted(() => {
  window.removeEventListener("pwa-install-available", onPwaAvailable);
  window.removeEventListener("app-online", onOnline);
  window.removeEventListener("app-offline", onOffline);
  window.removeEventListener("scroll", handleScroll);
  document.removeEventListener("click", handleClickOutside);
  if (searchTimeout) clearTimeout(searchTimeout);
});

const installPwa = async () => {
  if ((window as any).pwaInstall) {
    const accepted = await (window as any).pwaInstall();
    if (accepted) canInstallPwa.value = false;
  }
};

const emit = defineEmits<{
  (e: "toggle-sidebar"): void;
}>();

const toggleTheme = () => {
  themeStore.toggleTheme();
};

// ============ NOTIFICATIONS ============

// Lazy load full notification list when dropdown opens
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value && recentNotifications.value.length === 0) {
    notificationStore.fetchNotifications();
  }
};

const handleNotificationClick = async (notification: Record<string, any>) => {
  // Mark as read
  if (!notification.read_at) {
    await notificationStore.markAsRead(notification.id);
  }
  // Navigate if action_url present
  if (notification.action_url) {
    router.push(notification.action_url);
  }
  showNotifications.value = false;
};

const handleMarkAllRead = async () => {
  await notificationStore.markAllAsRead();
};

const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    workout_assigned: "💪",
    program_updated: "📋",
    chat_message: "💬",
    achievement_unlocked: "🏆",
    reminder: "⏰",
    alert: "🔔",
    measurement: "📏",
    nutrition: "🥗",
    booking: "📅",
    system: "⚙️",
  };
  return icons[type] || "🔔";
};

const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Ora";
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHours < 24) return `${diffHours}h fa`;
  if (diffDays < 7) return `${diffDays}g fa`;
  return date.toLocaleDateString("it-IT");
};

// ============ SEARCH ============

const performSearch = async (query: string): Promise<void> => {
  if (!query || query.length < 2) {
    searchResults.value = null;
    showSearchResults.value = false;
    searchError.value = false;
    return;
  }

  // Cancel previous in-flight request
  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();

  searchLoading.value = true;
  showSearchResults.value = true;
  searchError.value = false;

  try {
    const response = await api.get("/search", {
      params: { q: query },
      signal: searchAbortController.signal,
    });
    searchResults.value = response.data.data;
  } catch (err: any) {
    if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
    console.error("Errore ricerca:", err);
    searchError.value = true;
    searchResults.value = { clients: [], exercises: [], workouts: [] };
  } finally {
    searchLoading.value = false;
  }
};

// Debounced search watcher
watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (!newVal || newVal.length < 2) {
    searchResults.value = null;
    showSearchResults.value = false;
    searchError.value = false;
    return;
  }
  searchTimeout = setTimeout(() => {
    performSearch(newVal);
  }, 300);
});

const hasResults = computed(() => {
  if (!searchResults.value) return false;
  const r = searchResults.value;
  return (
    r.clients?.length > 0 || r.exercises?.length > 0 || r.workouts?.length > 0
  );
});

const handleResultClick = (type: string, item: Record<string, any>): void => {
  showSearchResults.value = false;
  searchQuery.value = "";

  switch (type) {
    case "client":
      router.push(`/clients/${item.id}`);
      break;
    case "exercise":
      router.push(`/exercises`);
      break;
    case "workout":
      router.push(`/workouts/${item.id}`);
      break;
  }
};

const handleSearchKeydown = (e: KeyboardEvent): void => {
  if (e.key === "Escape") {
    showSearchResults.value = false;
    searchQuery.value = "";
  }
};
</script>

<template>
  <header
    :class="[
      headerHeight,
      'fixed top-0 left-0 right-0 bg-habit-card/90 backdrop-blur-xl border-b border-habit-border z-40 transition-all duration-300 safe-top',
    ]"
  >
    <div class="flex items-center justify-between h-full px-2 sm:px-4">
      <!-- Left side -->
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- Menu toggle (mobile + tablet — hidden su desktop >= 1024px dove c'e la Sidebar fissa) -->
        <button
          @click="$emit('toggle-sidebar')"
          aria-label="Apri menu di navigazione"
          class="lg:hidden p-2 rounded-xl hover:bg-habit-card-hover transition-colors touch-target"
        >
          <Bars3Icon class="w-6 h-6 text-habit-text-muted" />
        </button>

        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2 sm:gap-3">
          <span
            :class="[
              'font-display font-bold text-habit-text transition-all duration-300',
              isCollapsed && isMobile ? 'text-lg' : 'text-xl sm:text-2xl',
            ]"
          >
            Atlas
          </span>
        </router-link>
      </div>

      <!-- Center - Search (desktop) -->
      <div
        class="hidden md:flex items-center flex-1 max-w-md mx-8 search-container"
      >
        <div class="relative w-full">
          <MagnifyingGlassIcon
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-habit-text-subtle"
          />
          <input
            v-model="searchQuery"
            type="text"
            autocomplete="off"
            placeholder="Cerca clienti, workout, esercizi..."
            aria-label="Cerca clienti, workout, esercizi"
            role="combobox"
            :aria-expanded="showSearchResults"
            aria-autocomplete="list"
            aria-controls="search-results-listbox"
            aria-haspopup="listbox"
            class="w-full pl-10 pr-4 py-2.5 bg-habit-bg-light border-0 rounded-xl text-habit-text placeholder-habit-text-subtle focus:ring-2 focus:ring-habit-orange/50 transition-all duration-200"
            @keydown="handleSearchKeydown"
            data-search-input
          />

          <!-- Search Results Dropdown -->
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div
              v-if="showSearchResults"
              id="search-results-listbox"
              role="listbox"
              class="absolute top-full left-0 right-0 mt-2 bg-habit-card rounded-2xl shadow-habit-lg border border-habit-border overflow-hidden z-50"
            >
              <!-- Loading -->
              <div v-if="searchLoading" class="p-6 text-center">
                <div
                  class="inline-block w-6 h-6 border-2 border-habit-orange border-t-transparent rounded-full animate-spin"
                  role="status"
                  aria-label="Caricamento risultati"
                ></div>
                <p class="text-habit-text-muted text-sm mt-2">
                  Ricerca in corso...
                </p>
              </div>

              <!-- Results -->
              <div v-else-if="hasResults" class="max-h-80 overflow-y-auto">
                <!-- Clients -->
                <div v-if="searchResults!.clients?.length > 0">
                  <div class="px-4 py-2 bg-habit-bg-light">
                    <span
                      class="text-xs font-semibold text-habit-text-subtle uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <UserGroupIcon class="w-3.5 h-3.5" />
                      Clienti
                    </span>
                  </div>
                  <div
                    v-for="client in searchResults!.clients"
                    :key="'c-' + client.id"
                    @click="handleResultClick('client', client)"
                    class="px-4 py-3 hover:bg-habit-bg-light cursor-pointer transition-colors flex items-center gap-3"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-habit-orange/20 flex items-center justify-center"
                    >
                      <span class="text-habit-orange text-sm font-medium">{{
                        client.name?.[0] || "?"
                      }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-habit-text text-sm font-medium truncate">
                        {{ client.name }}
                      </p>
                      <p class="text-habit-text-subtle text-xs truncate">
                        {{ client.email }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Exercises -->
                <div v-if="searchResults!.exercises?.length > 0">
                  <div class="px-4 py-2 bg-habit-bg-light">
                    <span
                      class="text-xs font-semibold text-habit-text-subtle uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <SparklesIcon class="w-3.5 h-3.5" />
                      Esercizi
                    </span>
                  </div>
                  <div
                    v-for="exercise in searchResults!.exercises"
                    :key="'e-' + exercise.id"
                    @click="handleResultClick('exercise', exercise)"
                    class="px-4 py-3 hover:bg-habit-bg-light cursor-pointer transition-colors flex items-center gap-3"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-habit-cyan/20 flex items-center justify-center"
                    >
                      <SparklesIcon class="w-4 h-4 text-habit-cyan" />
                    </div>
                    <p class="text-habit-text text-sm font-medium truncate">
                      {{ exercise.name }}
                    </p>
                  </div>
                </div>

                <!-- Workouts -->
                <div v-if="searchResults!.workouts?.length > 0">
                  <div class="px-4 py-2 bg-habit-bg-light">
                    <span
                      class="text-xs font-semibold text-habit-text-subtle uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <ClipboardDocumentListIcon class="w-3.5 h-3.5" />
                      Schede
                    </span>
                  </div>
                  <div
                    v-for="workout in searchResults!.workouts"
                    :key="'w-' + workout.id"
                    @click="handleResultClick('workout', workout)"
                    class="px-4 py-3 hover:bg-habit-bg-light cursor-pointer transition-colors flex items-center gap-3"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-habit-green/20 flex items-center justify-center"
                    >
                      <ClipboardDocumentListIcon
                        class="w-4 h-4 text-habit-green"
                      />
                    </div>
                    <p class="text-habit-text text-sm font-medium truncate">
                      {{ workout.name }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Error -->
              <div v-else-if="searchError" class="p-6 text-center">
                <div class="w-8 h-8 text-red-400 mx-auto mb-2">⚠️</div>
                <p class="text-habit-text-muted text-sm">
                  Errore durante la ricerca
                </p>
                <p class="text-habit-text-subtle text-xs mt-1">
                  Verifica che il server sia attivo
                </p>
              </div>

              <!-- No results -->
              <div v-else class="p-6 text-center">
                <MagnifyingGlassIcon
                  class="w-8 h-8 text-habit-text-subtle mx-auto mb-2"
                />
                <p class="text-habit-text-muted text-sm">
                  Nessun risultato per "{{ searchQuery }}"
                </p>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-1 sm:gap-2">
        <!-- Mobile search toggle -->
        <button
          @click="showSearch = !showSearch"
          aria-label="Apri ricerca"
          class="md:hidden p-2 rounded-xl hover:bg-habit-card-hover transition-colors touch-target flex items-center justify-center"
        >
          <MagnifyingGlassIcon class="w-5 h-5 text-habit-text-muted" />
        </button>

        <!-- Offline indicator -->
        <div
          v-if="isOffline"
          class="flex items-center gap-1 px-2 py-1 bg-habit-orange/20 rounded-lg"
          title="Offline - dati salvati in cache"
        >
          <WifiIcon class="w-4 h-4 text-habit-orange" />
          <span class="text-xs text-habit-orange font-medium hidden sm:inline"
            >Offline</span
          >
        </div>

        <!-- PWA Install -->
        <button
          v-if="canInstallPwa"
          @click="installPwa"
          class="p-2 rounded-xl hover:bg-habit-card-hover transition-all duration-200 flex items-center gap-1"
          title="Installa App"
        >
          <ArrowDownTrayIcon class="w-5 h-5 text-habit-cyan" />
          <span class="text-xs text-habit-cyan font-medium hidden sm:inline"
            >Installa</span
          >
        </button>

        <!-- Theme toggle -->
        <button
          @click="toggleTheme"
          class="p-2 rounded-xl hover:bg-habit-card-hover transition-all duration-200 touch-target flex items-center justify-center"
          :title="isDark ? 'Modalita chiara' : 'Modalita scura'"
          :aria-label="
            isDark ? 'Attiva modalita chiara' : 'Attiva modalita scura'
          "
        >
          <SunIcon v-if="isDark" class="w-5 h-5 text-habit-orange" />
          <MoonIcon v-else class="w-5 h-5 text-habit-text-muted" />
        </button>

        <!-- Notifications -->
        <div class="relative notification-dropdown-container">
          <button
            @click="toggleNotifications"
            aria-label="Notifiche"
            aria-haspopup="true"
            :aria-expanded="showNotifications"
            class="relative p-2 rounded-xl hover:bg-habit-card-hover transition-colors touch-target flex items-center justify-center"
          >
            <BellIcon class="w-5 h-5 text-habit-text-muted" />
            <!-- Notification badge -->
            <span
              v-if="unreadCount > 0"
              class="absolute top-1 right-1 w-5 h-5 bg-habit-orange rounded-full text-white text-xs flex items-center justify-center font-medium"
            >
              {{ unreadCount > 9 ? "9+" : unreadCount }}
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
              class="fixed left-3 right-3 xs:left-auto xs:right-0 xs:absolute mt-2 xs:w-80 bg-habit-card rounded-2xl shadow-habit-lg border border-habit-border overflow-hidden z-50"
            >
              <div class="p-4 border-b border-habit-border">
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold text-habit-text">Notifiche</h3>
                  <div class="flex items-center gap-2">
                    <span v-if="unreadCount > 0" class="badge-primary"
                      >{{ unreadCount }} nuove</span
                    >
                    <button
                      v-if="unreadCount > 0"
                      @click="handleMarkAllRead"
                      class="text-xs text-habit-orange hover:underline font-medium"
                      title="Segna tutte come lette"
                      aria-label="Segna tutte le notifiche come lette"
                    >
                      <CheckIcon class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="max-h-80 overflow-y-auto">
                <!-- Loading state -->
                <div
                  v-if="
                    notificationsLoading && recentNotifications.length === 0
                  "
                  class="p-4 xs:p-6 text-center"
                >
                  <div
                    class="inline-block w-6 h-6 border-2 border-habit-orange border-t-transparent rounded-full animate-spin"
                  ></div>
                  <p class="text-habit-text-muted text-sm mt-2">
                    Caricamento...
                  </p>
                </div>

                <!-- Empty state -->
                <div
                  v-else-if="recentNotifications.length === 0"
                  class="p-4 xs:p-6 text-center"
                >
                  <BellIcon
                    class="w-10 h-10 text-habit-text-subtle mx-auto mb-2"
                  />
                  <p class="text-habit-text-muted text-sm">Nessuna notifica</p>
                  <p class="text-habit-text-subtle text-xs mt-1">
                    Le notifiche appariranno qui
                  </p>
                </div>

                <!-- Notification list -->
                <div
                  v-else
                  v-for="notification in recentNotifications"
                  :key="notification.id"
                  @click="handleNotificationClick(notification)"
                  class="p-4 hover:bg-habit-bg-light transition-colors cursor-pointer"
                  :class="{ 'bg-habit-orange/5': !notification.read_at }"
                >
                  <div class="flex gap-3">
                    <span class="text-2xl">{{
                      getNotificationIcon(notification.type)
                    }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-habit-text text-sm">
                        {{ notification.title }}
                      </p>
                      <p class="text-habit-text-muted text-sm truncate">
                        {{ notification.message || notification.body }}
                      </p>
                      <p
                        class="text-habit-text-subtle text-xs mt-1 flex items-center gap-1"
                      >
                        <ClockIcon class="w-3 h-3" />
                        {{ formatTimeAgo(notification.created_at) }}
                      </p>
                    </div>
                    <div
                      v-if="!notification.read_at"
                      class="w-2 h-2 bg-habit-orange rounded-full mt-2 flex-shrink-0"
                    ></div>
                  </div>
                </div>
              </div>
              <div class="p-3 border-t border-habit-border">
                <router-link
                  to="/notifications"
                  @click="showNotifications = false"
                  class="block w-full text-center text-habit-orange text-sm font-medium hover:underline"
                >
                  Vedi tutte le notifiche
                </router-link>
              </div>
            </div>
          </Transition>
        </div>

        <!-- User menu -->
        <router-link
          to="/profile"
          class="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-habit-card-hover transition-colors"
        >
          <div
            v-if="user?.avatarUrl"
            :class="[
              'rounded-xl overflow-hidden ring-2 ring-habit-orange/30 transition-all duration-300',
              isCollapsed && isMobile ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9',
            ]"
          >
            <img
              :src="
                user.avatarUrl.startsWith('http')
                  ? user.avatarUrl
                  : (api.defaults.baseURL?.replace('/api', '') || '') +
                    user.avatarUrl
              "
              :alt="user.firstName"
              class="w-full h-full object-cover"
            />
          </div>
          <div
            v-else
            :class="[
              'rounded-xl bg-habit-orange flex items-center justify-center transition-all duration-300',
              isCollapsed && isMobile ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9',
            ]"
          >
            <span class="text-white font-semibold text-xs sm:text-sm">
              {{ user?.firstName?.[0] || "U" }}
            </span>
          </div>
          <div class="hidden md:block text-left">
            <p class="text-sm font-medium text-habit-text">
              {{ user?.firstName || "Utente" }}
            </p>
            <p class="text-xs text-habit-text-subtle">
              {{ user?.role === "trainer" ? "Personal Trainer" : "Cliente" }}
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
      <div
        v-if="showSearch"
        class="md:hidden absolute top-full left-0 right-0 p-4 bg-habit-card border-b border-habit-border search-container"
      >
        <div class="relative">
          <MagnifyingGlassIcon
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-habit-text-subtle"
          />
          <input
            v-model="searchQuery"
            type="text"
            autocomplete="off"
            placeholder="Cerca..."
            class="w-full pl-10 pr-10 py-3 bg-habit-bg-light border-0 rounded-xl text-habit-text placeholder-habit-text-subtle focus:ring-2 focus:ring-habit-orange/50"
            autofocus
            @keydown="handleSearchKeydown"
          />
          <button
            @click="
              showSearch = false;
              searchQuery = '';
              showSearchResults = false;
            "
            aria-label="Chiudi ricerca"
            class="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <XMarkIcon class="w-5 h-5 text-habit-text-subtle" />
          </button>

          <!-- Mobile Search Results -->
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div
              v-if="showSearchResults"
              id="mobile-search-results-listbox"
              role="listbox"
              class="absolute top-full left-0 right-0 mt-2 bg-habit-card rounded-2xl shadow-habit-lg border border-habit-border overflow-hidden z-50"
            >
              <div v-if="searchLoading" class="p-6 text-center">
                <div
                  class="inline-block w-6 h-6 border-2 border-habit-orange border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
              <div v-else-if="hasResults" class="max-h-60 overflow-y-auto">
                <template v-if="searchResults!.clients?.length > 0">
                  <div class="px-4 py-2 bg-habit-bg-light">
                    <span
                      class="text-xs font-semibold text-habit-text-subtle uppercase"
                      >Clienti</span
                    >
                  </div>
                  <div
                    v-for="client in searchResults!.clients"
                    :key="'mc-' + client.id"
                    @click="handleResultClick('client', client)"
                    class="px-4 py-3 hover:bg-habit-bg-light cursor-pointer"
                  >
                    <p class="text-habit-text text-sm font-medium">
                      {{ client.name }}
                    </p>
                  </div>
                </template>
                <template v-if="searchResults!.exercises?.length > 0">
                  <div class="px-4 py-2 bg-habit-bg-light">
                    <span
                      class="text-xs font-semibold text-habit-text-subtle uppercase"
                      >Esercizi</span
                    >
                  </div>
                  <div
                    v-for="exercise in searchResults!.exercises"
                    :key="'me-' + exercise.id"
                    @click="handleResultClick('exercise', exercise)"
                    class="px-4 py-3 hover:bg-habit-bg-light cursor-pointer"
                  >
                    <p class="text-habit-text text-sm font-medium">
                      {{ exercise.name }}
                    </p>
                  </div>
                </template>
                <template v-if="searchResults!.workouts?.length > 0">
                  <div class="px-4 py-2 bg-habit-bg-light">
                    <span
                      class="text-xs font-semibold text-habit-text-subtle uppercase"
                      >Schede</span
                    >
                  </div>
                  <div
                    v-for="workout in searchResults!.workouts"
                    :key="'mw-' + workout.id"
                    @click="handleResultClick('workout', workout)"
                    class="px-4 py-3 hover:bg-habit-bg-light cursor-pointer"
                  >
                    <p class="text-habit-text text-sm font-medium">
                      {{ workout.name }}
                    </p>
                  </div>
                </template>
              </div>
              <div v-else-if="searchError" class="p-4 text-center">
                <p class="text-habit-text-muted text-sm">Errore di ricerca</p>
                <p class="text-habit-text-subtle text-xs mt-1">
                  Verifica che il server sia attivo
                </p>
              </div>
              <div v-else class="p-4 text-center">
                <p class="text-habit-text-muted text-sm">Nessun risultato</p>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </header>
</template>
