<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "@/store/session";
import { useNative } from "@/composables/useNative";
import { useResponsiveModal } from "@/composables/useResponsiveModal";
import PullToRefresh from "@/components/mobile/PullToRefresh.vue";
import FloatingActionButton from "@/components/mobile/FloatingActionButton.vue";
import SwipeableCard from "@/components/mobile/SwipeableCard.vue";
import SessionListSkeleton from "@/components/skeleton/SessionListSkeleton.vue";
import BottomSheet from "@/components/mobile/BottomSheet.vue";

const router = useRouter();
const sessionStore = useSessionStore();
const { isMobile } = useNative();
const {
  overlayClasses,
  backdropClasses,
  panelClasses,
  bodyClasses: _bodyClasses,
  transitionName: modalTransition,
} = useResponsiveModal();

// Local state
const showStartModal = ref(false);
const showSkipModal = ref(false);
const skipSessionId = ref<any>(null);
const skipReason = ref("");
const startClientId = ref<any>(null);
const startTemplateId = ref<any>(null);
const startLoading = ref(false);
const skipLoading = ref(false);
const initialLoadDone = ref(false);
const showFilters = ref(false);

// Computed from store
const sessions = computed(() => sessionStore.sessions as any[]);
const clients = computed(() => sessionStore.clients);
const workoutTemplates = computed(() => sessionStore.workoutTemplates);
const selectedClientId = computed(() => sessionStore.selectedClientId);
const stats = computed(() => sessionStore.stats);
const loading = computed(() => sessionStore.loading);
const statsLoading = computed(() => sessionStore.statsLoading);
const error = computed(() => sessionStore.error);
const pagination = computed(() => sessionStore.pagination);
const filters = computed(() => sessionStore.filters);
const hasFilters = computed(() => sessionStore.hasFilters);
const statsPeriod = computed(() => sessionStore.statsPeriod);
const completionRate = computed(() => sessionStore.completionRate);

// Initialize on mount
onMounted(async () => {
  await sessionStore.initialize();
  initialLoadDone.value = true;
});

// PullToRefresh handler
const onRefresh = async (resolve: any) => {
  await sessionStore.initialize();
  resolve();
};

// Client selection
const handleClientChange = (e: any) => {
  const value = e.target.value;
  sessionStore.setClient(value ? parseInt(value) : null);
};

// Filter handlers
const handleStatusChange = (e: any) => {
  sessionStore.setFilter("status", e.target.value || null);
};

const handleStartDateChange = (e: any) => {
  sessionStore.setFilter("startDate", e.target.value || null);
};

const handleEndDateChange = (e: any) => {
  sessionStore.setFilter("endDate", e.target.value || null);
};

const handleResetFilters = () => {
  sessionStore.resetFilters();
};

// Stats period
const handlePeriodChange = (period: any) => {
  sessionStore.setStatsPeriod(period);
};

// Pagination
const handlePrevPage = () => {
  if (pagination.value.page > 1) {
    sessionStore.setPage(pagination.value.page - 1);
  }
};

const handleNextPage = () => {
  if (pagination.value.page < pagination.value.totalPages) {
    sessionStore.setPage(pagination.value.page + 1);
  }
};

// Navigate to session detail
const goToSession = (sessionId: any) => {
  router.push(`/sessions/${sessionId}`);
};

// Swipe action on mobile
const handleSwipeAction = (session: any, direction: any) => {
  if (
    direction === "left" &&
    (session.status === "scheduled" || session.status === "in_progress")
  ) {
    openSkipModal(session.id);
  } else if (direction === "right") {
    goToSession(session.id);
  }
};

// Start session modal
const openStartModal = () => {
  startClientId.value = selectedClientId.value;
  startTemplateId.value = null;
  showStartModal.value = true;
};

const closeStartModal = () => {
  showStartModal.value = false;
  startClientId.value = null;
  startTemplateId.value = null;
};

const handleStartSession = async () => {
  if (!startClientId.value || !startTemplateId.value) return;

  startLoading.value = true;
  const result = await sessionStore.startSession(
    parseInt(startClientId.value),
    parseInt(startTemplateId.value),
  );
  startLoading.value = false;

  if (result.success) {
    closeStartModal();
    if (result.session?.id) {
      router.push(`/sessions/${result.session.id}`);
    }
  }
};

// Skip session modal
const openSkipModal = (sessionId: any) => {
  skipSessionId.value = sessionId;
  skipReason.value = "";
  showSkipModal.value = true;
};

const closeSkipModal = () => {
  showSkipModal.value = false;
  skipSessionId.value = null;
  skipReason.value = "";
};

const handleSkipSession = async () => {
  if (!skipSessionId.value) return;

  skipLoading.value = true;
  const result = await sessionStore.skipSession(
    skipSessionId.value,
    skipReason.value,
  );
  skipLoading.value = false;

  if (result.success) {
    closeSkipModal();
  }
};

// Helpers
const formatDate = (dateStr: any) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
void formatDate;

const formatDateTime = (dateStr: any) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (dateStr: any) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes: any) => {
  if (!minutes) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}min`;
};

const getStatusLabel = (status: any) => {
  const map: Record<string, string> = {
    scheduled: "Pianificata",
    in_progress: "In Corso",
    completed: "Completata",
    skipped: "Saltata",
  };
  return map[status] || status;
};

const getStatusClasses = (status: any) => {
  const map: Record<string, string> = {
    scheduled: "bg-habit-skeleton/50 text-habit-text-muted",
    in_progress: "bg-cyan-500/20 text-cyan-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    skipped: "bg-red-500/20 text-red-400",
  };
  return map[status] || "bg-habit-skeleton/50 text-habit-text-muted";
};

const getStatusIcon = (status: any) => {
  const map: Record<string, string> = {
    scheduled:
      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    in_progress:
      "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z",
    completed: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    skipped:
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z",
  };
  return map[status] || map.scheduled;
};

const getCategoryLabel = (category: any) => {
  const map: Record<string, string> = {
    strength: "Forza",
    hypertrophy: "Ipertrofia",
    endurance: "Resistenza",
    cardio: "Cardio",
    hiit: "HIIT",
    functional: "Funzionale",
    custom: "Personalizzato",
  };
  return map[category] || category || "-";
};
</script>

<template>
  <PullToRefresh @refresh="onRefresh">
    <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
            Sessioni Allenamento
          </h1>
          <p class="text-habit-text-subtle mt-1 text-sm sm:text-base">
            Gestisci e monitora le sessioni di allenamento
          </p>
        </div>
        <!-- Desktop start button -->
        <button
          @click="openStartModal"
          class="hidden sm:inline-flex items-center justify-center px-4 py-2.5 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 font-medium"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Avvia Sessione
        </button>
      </div>

      <!-- Error Banner -->
      <div
        v-if="error"
        class="bg-red-500/10 border border-red-500/30 rounded-habit p-4 flex items-center gap-3"
      >
        <svg
          class="w-5 h-5 text-red-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-red-400 text-sm">{{ error }}</p>
      </div>

      <!-- Client Selector -->
      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
      >
        <label class="block text-sm font-medium text-habit-text-muted mb-2">
          <svg
            class="w-4 h-4 inline mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Seleziona Cliente
        </label>
        <select
          :value="selectedClientId || ''"
          @change="handleClientChange"
          class="w-full sm:w-96 px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
        >
          <option value="">Seleziona un cliente...</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.first_name }} {{ client.last_name }}
          </option>
        </select>
      </div>

      <!-- No Client Selected State -->
      <div
        v-if="!selectedClientId"
        class="bg-habit-bg border border-habit-border rounded-habit p-8 sm:p-12 text-center"
      >
        <svg
          class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-habit-text-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 class="text-lg font-semibold text-habit-text mb-2">
          Seleziona un cliente
        </h3>
        <p class="text-habit-text-subtle text-sm">
          Scegli un cliente dal menu sopra per visualizzare le sue sessioni
        </p>
      </div>

      <!-- Content (visible only when client is selected) -->
      <template v-if="selectedClientId">
        <!-- Stats Cards -->
        <div class="space-y-3 sm:space-y-4">
          <!-- Period Toggle -->
          <div class="flex items-center justify-between">
            <h2 class="text-base sm:text-lg font-semibold text-habit-text">
              Statistiche
            </h2>
            <div class="flex bg-habit-bg-light rounded-xl p-1 gap-1">
              <button
                v-for="p in [
                  { key: 'week', label: 'Sett.' },
                  { key: 'month', label: 'Mese' },
                  { key: 'year', label: 'Anno' },
                ]"
                :key="p.key"
                @click="handlePeriodChange(p.key)"
                :class="[
                  'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
                  statsPeriod === p.key
                    ? 'bg-habit-cyan text-white'
                    : 'text-habit-text-subtle hover:text-habit-text',
                ]"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- Stats Grid - scrollabile su mobile -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <!-- Sessioni Totali -->
            <div
              class="bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
            >
              <div class="flex items-center gap-2 sm:gap-3">
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xl sm:text-2xl font-bold text-habit-text">
                    <template v-if="statsLoading">
                      <span
                        class="inline-block w-8 h-5 bg-habit-skeleton rounded animate-pulse"
                      ></span>
                    </template>
                    <template v-else>{{ stats?.total_sessions || 0 }}</template>
                  </p>
                  <p class="text-[11px] sm:text-xs text-habit-text-subtle">
                    Totali
                  </p>
                </div>
              </div>
            </div>

            <!-- Completate -->
            <div
              class="bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
            >
              <div class="flex items-center gap-2 sm:gap-3">
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xl sm:text-2xl font-bold text-habit-text">
                    <template v-if="statsLoading">
                      <span
                        class="inline-block w-8 h-5 bg-habit-skeleton rounded animate-pulse"
                      ></span>
                    </template>
                    <template v-else>
                      {{ stats?.completed_sessions || 0 }}
                      <span
                        class="text-xs font-normal text-emerald-400"
                        v-if="stats?.total_sessions"
                      >
                        ({{ completionRate }}%)
                      </span>
                    </template>
                  </p>
                  <p class="text-[11px] sm:text-xs text-habit-text-subtle">
                    Completate
                  </p>
                </div>
              </div>
            </div>

            <!-- Durata Media -->
            <div
              class="bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
            >
              <div class="flex items-center gap-2 sm:gap-3">
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xl sm:text-2xl font-bold text-habit-text">
                    <template v-if="statsLoading">
                      <span
                        class="inline-block w-12 h-5 bg-habit-skeleton rounded animate-pulse"
                      ></span>
                    </template>
                    <template v-else>{{
                      formatDuration(stats?.avg_duration)
                    }}</template>
                  </p>
                  <p class="text-[11px] sm:text-xs text-habit-text-subtle">
                    Durata Media
                  </p>
                </div>
              </div>
            </div>

            <!-- XP Guadagnati -->
            <div
              class="bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
            >
              <div class="flex items-center gap-2 sm:gap-3">
                <div
                  class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-habit-orange/20 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-habit-orange"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-xl sm:text-2xl font-bold text-habit-text">
                    <template v-if="statsLoading">
                      <span
                        class="inline-block w-10 h-5 bg-habit-skeleton rounded animate-pulse"
                      ></span>
                    </template>
                    <template v-else>{{ stats?.total_xp || 0 }}</template>
                  </p>
                  <p class="text-[11px] sm:text-xs text-habit-text-subtle">
                    XP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters - Mobile: bottone toggle, Desktop: inline -->
        <div
          class="bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
        >
          <!-- Mobile filter toggle -->
          <div class="sm:hidden flex items-center justify-between">
            <button
              @click="showFilters = !showFilters"
              class="flex items-center gap-2 text-sm font-medium text-habit-text-muted"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtri
              <span
                v-if="hasFilters"
                class="w-2 h-2 bg-habit-orange rounded-full"
              ></span>
            </button>
            <button
              v-if="hasFilters"
              @click="handleResetFilters"
              class="text-xs text-habit-cyan"
            >
              Reset
            </button>
          </div>

          <!-- Filter fields -->
          <div
            :class="[
              'flex flex-col lg:flex-row gap-3 sm:gap-4',
              isMobile && !showFilters ? 'hidden' : '',
              isMobile && showFilters ? 'mt-3' : '',
            ]"
          >
            <!-- Status Filter -->
            <div class="w-full lg:w-48">
              <select
                :value="filters.status || ''"
                @change="handleStatusChange"
                class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer text-sm"
              >
                <option value="">Tutti gli stati</option>
                <option value="scheduled">Pianificata</option>
                <option value="in_progress">In Corso</option>
                <option value="completed">Completata</option>
                <option value="skipped">Saltata</option>
              </select>
            </div>

            <!-- Start Date -->
            <div class="w-full lg:w-48">
              <input
                type="date"
                :value="filters.startDate || ''"
                @change="handleStartDateChange"
                placeholder="Data da"
                class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors text-sm"
              />
            </div>

            <!-- End Date -->
            <div class="w-full lg:w-48">
              <input
                type="date"
                :value="filters.endDate || ''"
                @change="handleEndDateChange"
                placeholder="Data a"
                class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors text-sm"
              />
            </div>

            <!-- Reset (desktop) -->
            <button
              v-if="hasFilters"
              @click="handleResetFilters"
              class="hidden sm:flex px-4 py-2.5 text-habit-cyan hover:text-habit-orange transition-colors items-center gap-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Reset
            </button>
          </div>
        </div>

        <!-- Skeleton Loading (initial) -->
        <SessionListSkeleton v-if="!initialLoadDone && loading" />

        <!-- Loading State (subsequent) -->
        <div v-else-if="loading" class="space-y-3">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-habit-bg border border-habit-border rounded-habit p-4 animate-pulse"
          >
            <div class="flex items-center justify-between">
              <div class="space-y-3 flex-1">
                <div class="h-5 bg-habit-skeleton rounded w-1/3"></div>
                <div class="flex gap-3">
                  <div class="h-4 bg-habit-skeleton rounded w-24"></div>
                  <div class="h-4 bg-habit-skeleton rounded w-20"></div>
                </div>
              </div>
              <div class="h-6 bg-habit-skeleton rounded-full w-20"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="sessions.length === 0"
          class="bg-habit-bg border border-habit-border rounded-habit p-8 sm:p-12 text-center"
        >
          <svg
            class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-habit-text-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 class="text-lg font-semibold text-habit-text mb-2">
            Nessuna sessione trovata
          </h3>
          <p class="text-habit-text-subtle text-sm mb-6">
            {{
              hasFilters
                ? "Prova a modificare i filtri"
                : "Nessuna sessione per questo cliente"
            }}
          </p>
          <div class="flex flex-col sm:flex-row justify-center gap-3">
            <button
              v-if="hasFilters"
              @click="handleResetFilters"
              class="inline-flex items-center justify-center px-4 py-2 text-habit-cyan hover:text-habit-orange transition-colors"
            >
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset filtri
            </button>
            <button
              @click="openStartModal"
              class="inline-flex items-center justify-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300"
            >
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Avvia prima sessione
            </button>
          </div>
        </div>

        <!-- Sessions List -->
        <div v-else class="space-y-3">
          <!-- Mobile: SwipeableCard layout -->
          <template v-if="isMobile">
            <SwipeableCard
              v-for="session in sessions"
              :key="'m-' + session.id"
              @swipe-left="handleSwipeAction(session, 'left')"
              @swipe-right="handleSwipeAction(session, 'right')"
              :left-label="
                session.status === 'scheduled' ||
                session.status === 'in_progress'
                  ? 'Salta'
                  : ''
              "
              :left-color="'bg-red-500'"
              :right-label="'Apri'"
              :right-color="'bg-habit-cyan'"
            >
              <div
                @click="goToSession(session.id)"
                class="bg-habit-bg border border-habit-border rounded-habit p-3.5 active:bg-habit-card-hover/20 transition-colors"
              >
                <div class="flex items-start gap-3">
                  <!-- Status icon -->
                  <div
                    :class="[
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      session.status === 'completed'
                        ? 'bg-emerald-500/20'
                        : session.status === 'in_progress'
                          ? 'bg-cyan-500/20'
                          : session.status === 'skipped'
                            ? 'bg-red-500/20'
                            : 'bg-habit-skeleton/30',
                    ]"
                  >
                    <svg
                      :class="[
                        'w-4 h-4',
                        session.status === 'completed'
                          ? 'text-emerald-400'
                          : session.status === 'in_progress'
                            ? 'text-cyan-400'
                            : session.status === 'skipped'
                              ? 'text-red-400'
                              : 'text-habit-text-subtle',
                      ]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        :d="getStatusIcon(session.status)"
                      />
                    </svg>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <h3 class="text-habit-text font-medium text-sm truncate">
                        {{ session.template_name || "Sessione libera" }}
                      </h3>
                      <span
                        :class="[
                          'px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap flex-shrink-0',
                          getStatusClasses(session.status),
                        ]"
                      >
                        {{ getStatusLabel(session.status) }}
                      </span>
                    </div>
                    <div
                      class="flex items-center gap-3 text-xs text-habit-text-subtle"
                    >
                      <span>{{ formatDateShort(session.started_at) }}</span>
                      <span v-if="session.duration_minutes">{{
                        formatDuration(session.duration_minutes)
                      }}</span>
                      <span v-if="session.xp_earned" class="text-habit-orange"
                        >+{{ session.xp_earned }} XP</span
                      >
                    </div>
                    <span
                      v-if="session.category"
                      class="inline-flex mt-1.5 px-2 py-0.5 text-[10px] rounded-full bg-habit-cyan/10 text-habit-cyan"
                    >
                      {{ getCategoryLabel(session.category) }}
                    </span>
                  </div>

                  <!-- Arrow -->
                  <svg
                    class="w-4 h-4 text-habit-text-subtle flex-shrink-0 mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </SwipeableCard>
          </template>

          <!-- Desktop: Standard card layout -->
          <template v-else>
            <div
              v-for="session in sessions"
              :key="'d-' + session.id"
              @click="goToSession(session.id)"
              class="bg-habit-bg border border-habit-border rounded-habit p-4 cursor-pointer hover:border-habit-cyan/50 hover:bg-habit-card-hover/20 transition-all duration-300 group"
            >
              <div class="flex items-center justify-between gap-3">
                <!-- Left: Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 mb-1.5">
                    <h3
                      class="text-habit-text font-medium truncate group-hover:text-habit-cyan transition-colors"
                    >
                      {{ session.template_name || "Sessione libera" }}
                    </h3>
                    <span
                      v-if="session.category"
                      class="px-2 py-0.5 text-xs rounded-full bg-habit-cyan/10 text-habit-cyan whitespace-nowrap"
                    >
                      {{ getCategoryLabel(session.category) }}
                    </span>
                  </div>
                  <div
                    class="flex items-center gap-4 text-sm text-habit-text-subtle"
                  >
                    <span class="flex items-center gap-1.5">
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {{ formatDateTime(session.started_at) }}
                    </span>
                    <span
                      v-if="session.duration_minutes"
                      class="flex items-center gap-1.5"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {{ formatDuration(session.duration_minutes) }}
                    </span>
                    <span
                      v-if="session.xp_earned"
                      class="flex items-center gap-1.5 text-habit-orange"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                      +{{ session.xp_earned }} XP
                    </span>
                  </div>
                </div>

                <!-- Right: Status + Actions -->
                <div class="flex items-center gap-3">
                  <span
                    :class="[
                      'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap',
                      getStatusClasses(session.status),
                    ]"
                  >
                    {{ getStatusLabel(session.status) }}
                  </span>

                  <!-- Skip button -->
                  <button
                    v-if="
                      session.status === 'scheduled' ||
                      session.status === 'in_progress'
                    "
                    @click.stop="openSkipModal(session.id)"
                    class="p-2 text-habit-text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    title="Salta sessione"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </button>

                  <!-- Arrow -->
                  <svg
                    class="w-5 h-5 text-habit-text-subtle group-hover:text-habit-cyan transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && pagination.totalPages > 1"
          class="flex items-center justify-between bg-habit-bg border border-habit-border rounded-habit p-3 sm:p-4"
        >
          <p class="text-xs sm:text-sm text-habit-text-subtle">
            Pag. {{ pagination.page }}/{{ pagination.totalPages }}
            <span class="hidden sm:inline">
              ({{ sessions.length }} di {{ pagination.total }} sessioni)
            </span>
          </p>

          <div class="flex gap-2">
            <button
              @click="handlePrevPage"
              :disabled="pagination.page <= 1"
              class="px-3 sm:px-4 py-2 rounded-xl border border-habit-border text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              @click="handleNextPage"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 sm:px-4 py-2 rounded-xl border border-habit-border text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- FAB Mobile: Avvia Sessione -->
      <FloatingActionButton
        icon="play"
        label="Avvia Sessione"
        @click="openStartModal"
      />

      <!-- Modal: Avvia Sessione -->
      <!-- Mobile: BottomSheet, Desktop: centered modal -->
      <Teleport to="body">
        <!-- Mobile BottomSheet -->
        <BottomSheet
          v-if="isMobile"
          :open="showStartModal"
          @close="closeStartModal"
          title="Avvia Sessione"
          snap="half"
        >
          <div class="space-y-4">
            <!-- Client Select -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1.5"
                >Cliente</label
              >
              <select
                v-model="startClientId"
                class="w-full px-4 py-3 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
              >
                <option :value="null">Seleziona cliente...</option>
                <option
                  v-for="client in clients"
                  :key="client.id"
                  :value="client.id"
                >
                  {{ client.first_name }} {{ client.last_name }}
                </option>
              </select>
            </div>

            <!-- Template Select -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1.5"
                >Scheda Allenamento</label
              >
              <select
                v-model="startTemplateId"
                class="w-full px-4 py-3 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
              >
                <option :value="null">Seleziona scheda...</option>
                <option
                  v-for="template in workoutTemplates"
                  :key="template.id"
                  :value="template.id"
                >
                  {{ template.name }}
                </option>
              </select>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2 pb-4">
              <button
                @click="closeStartModal"
                class="flex-1 px-4 py-3 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors font-medium"
              >
                Annulla
              </button>
              <button
                @click="handleStartSession"
                :disabled="!startClientId || !startTemplateId || startLoading"
                class="flex-1 px-4 py-3 bg-habit-orange text-white rounded-xl hover:bg-habit-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <svg
                  v-if="startLoading"
                  class="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                {{ startLoading ? "Avvio..." : "Avvia" }}
              </button>
            </div>
          </div>
        </BottomSheet>

        <!-- Desktop Modal -->
        <Transition :name="modalTransition" v-if="!isMobile">
          <div v-if="showStartModal" :class="overlayClasses">
            <div :class="backdropClasses" @click="closeStartModal"></div>
            <div :class="panelClasses" class="space-y-5">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-habit-text">
                  Avvia Sessione
                </h3>
                <button
                  @click="closeStartModal"
                  class="p-1 text-habit-text-subtle hover:text-habit-text transition-colors"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1.5"
                  >Cliente</label
                >
                <select
                  v-model="startClientId"
                  class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
                >
                  <option :value="null">Seleziona cliente...</option>
                  <option
                    v-for="client in clients"
                    :key="client.id"
                    :value="client.id"
                  >
                    {{ client.first_name }} {{ client.last_name }}
                  </option>
                </select>
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1.5"
                  >Scheda Allenamento</label
                >
                <select
                  v-model="startTemplateId"
                  class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
                >
                  <option :value="null">Seleziona scheda...</option>
                  <option
                    v-for="template in workoutTemplates"
                    :key="template.id"
                    :value="template.id"
                  >
                    {{ template.name }}
                  </option>
                </select>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  @click="closeStartModal"
                  class="flex-1 px-4 py-2.5 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors"
                >
                  Annulla
                </button>
                <button
                  @click="handleStartSession"
                  :disabled="!startClientId || !startTemplateId || startLoading"
                  class="flex-1 px-4 py-2.5 bg-habit-orange text-white rounded-xl hover:bg-habit-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg
                    v-if="startLoading"
                    class="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  {{ startLoading ? "Avvio..." : "Avvia" }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Modal: Salta Sessione -->
      <Teleport to="body">
        <!-- Mobile BottomSheet -->
        <BottomSheet
          v-if="isMobile"
          :open="showSkipModal"
          @close="closeSkipModal"
          title="Salta Sessione"
          snap="half"
        >
          <div class="space-y-4">
            <p class="text-habit-text-subtle text-sm">
              Sei sicuro di voler saltare questa sessione?
            </p>

            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1.5"
                >Motivo (opzionale)</label
              >
              <textarea
                v-model="skipReason"
                rows="3"
                placeholder="Es: Il cliente non si sente bene..."
                class="w-full px-4 py-3 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors resize-none"
              ></textarea>
            </div>

            <div class="flex gap-3 pt-2 pb-4">
              <button
                @click="closeSkipModal"
                class="flex-1 px-4 py-3 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors font-medium"
              >
                Annulla
              </button>
              <button
                @click="handleSkipSession"
                :disabled="skipLoading"
                class="flex-1 px-4 py-3 bg-red-500/80 text-white rounded-xl hover:bg-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <svg
                  v-if="skipLoading"
                  class="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                {{ skipLoading ? "Salto..." : "Salta Sessione" }}
              </button>
            </div>
          </div>
        </BottomSheet>

        <!-- Desktop Modal -->
        <Transition :name="modalTransition" v-if="!isMobile">
          <div v-if="showSkipModal" :class="overlayClasses">
            <div :class="backdropClasses" @click="closeSkipModal"></div>
            <div :class="panelClasses" class="space-y-5">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-habit-text">
                  Salta Sessione
                </h3>
                <button
                  @click="closeSkipModal"
                  class="p-1 text-habit-text-subtle hover:text-habit-text transition-colors"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p class="text-habit-text-subtle text-sm">
                Sei sicuro di voler saltare questa sessione? Puoi indicare un
                motivo opzionale.
              </p>

              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1.5"
                  >Motivo (opzionale)</label
                >
                <textarea
                  v-model="skipReason"
                  rows="3"
                  placeholder="Es: Il cliente non si sente bene..."
                  class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors resize-none"
                ></textarea>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  @click="closeSkipModal"
                  class="flex-1 px-4 py-2.5 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors"
                >
                  Annulla
                </button>
                <button
                  @click="handleSkipSession"
                  :disabled="skipLoading"
                  class="flex-1 px-4 py-2.5 bg-red-500/80 text-white rounded-xl hover:bg-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg
                    v-if="skipLoading"
                    class="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  {{ skipLoading ? "Salto..." : "Salta Sessione" }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </PullToRefresh>
</template>
