<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import type { PaginationMeta } from "@/types";

interface SessionStats {
  total_sessions?: number;
  completed_sessions?: number;
  total_minutes?: number;
  total_xp?: number;
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

interface FeelingConfig {
  emoji: string;
  label: string;
  color: string;
}

const auth = useAuthStore();

const loading = ref(true);
const sessions = ref<any[]>([]);
const sessionStats = ref<SessionStats | null>(null);
const currentSession = ref<any>(null);
const showSessionDetail = ref(false);
const activeFilter = ref("all");

// Paginazione
const pagination = ref<PaginationMeta>({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

// Client ID from auth store (set by backend for client users)
const clientId = computed(() => auth.user?.clientId || null);

// Feeling config
const feelingConfig: Record<string, FeelingConfig> = {
  terrible: { emoji: "😫", label: "Terribile", color: "text-red-400" },
  bad: { emoji: "😞", label: "Male", color: "text-orange-400" },
  okay: { emoji: "😐", label: "Ok", color: "text-yellow-400" },
  good: { emoji: "😊", label: "Bene", color: "text-green-400" },
  great: { emoji: "🤩", label: "Ottimo", color: "text-habit-cyan" },
};

const getFeeling = (f: string): FeelingConfig =>
  feelingConfig[f] || feelingConfig.okay;

// Status config
const statusConfig: Record<string, StatusConfig> = {
  completed: {
    label: "Completata",
    color: "text-green-400",
    bg: "bg-green-500/20",
    icon: "✅",
  },
  in_progress: {
    label: "In corso",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    icon: "⏳",
  },
  skipped: {
    label: "Saltata",
    color: "text-red-400",
    bg: "bg-red-500/20",
    icon: "⏭️",
  },
  partial: {
    label: "Parziale",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
    icon: "🔶",
  },
};

const getStatus = (s: string): StatusConfig =>
  statusConfig[s] || statusConfig.completed;

// Formatters
const formatDate = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes) return "-";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? m + "min" : ""}`;
  }
  return `${minutes} min`;
};

// Load sessioni
const loadSessions = async (page: number = 1) => {
  if (!clientId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const params: Record<string, any> = { page, limit: pagination.value.limit };
    if (activeFilter.value !== "all") params.status = activeFilter.value;

    const response = await api.get(`/sessions/client/${clientId.value}`, {
      params,
    });
    sessions.value = response.data.data?.sessions || [];
    pagination.value = response.data.data?.pagination || pagination.value;
  } catch (err) {
    console.error("Errore caricamento sessioni:", err);
  } finally {
    loading.value = false;
  }
};

// Load stats
const loadStats = async () => {
  if (!clientId.value) return;
  try {
    const response = await api.get(`/sessions/client/${clientId.value}/stats`);
    sessionStats.value = response.data.data?.stats || null;
  } catch (err) {
    console.error("Errore caricamento stats:", err);
  }
};

// Dettaglio sessione
const openSessionDetail = async (sessionId: number) => {
  try {
    const response = await api.get(`/sessions/${sessionId}`);
    currentSession.value = response.data.data?.session || null;
    showSessionDetail.value = true;
  } catch (err) {
    console.error("Errore dettaglio sessione:", err);
  }
};

// Filtro
const handleFilter = (filter: string) => {
  activeFilter.value = filter;
  loadSessions(1);
};

onMounted(async () => {
  await Promise.all([loadSessions(), loadStats()]);
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Il Mio Allenamento
      </h1>
      <p class="text-habit-text-muted text-sm mt-1">
        Storico delle tue sessioni di allenamento
      </p>
    </div>

    <!-- Stats -->
    <div v-if="sessionStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-text">
          {{ sessionStats.total_sessions || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Sessioni Totali</div>
      </div>
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-green-400">
          {{ sessionStats.completed_sessions || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Completate</div>
      </div>
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-orange">
          {{ sessionStats.total_minutes || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Minuti Totali</div>
      </div>
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-text">
          {{ sessionStats.total_xp || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">XP Guadagnati</div>
      </div>
    </div>

    <!-- Filtri -->
    <div class="flex gap-2 flex-wrap mb-6">
      <button
        @click="handleFilter('all')"
        class="pill text-xs"
        :class="activeFilter === 'all' ? 'pill-active' : ''"
      >
        Tutte
      </button>
      <button
        v-for="(config, key) in statusConfig"
        :key="key"
        @click="handleFilter(key)"
        class="pill text-xs"
        :class="activeFilter === key ? 'pill-active' : ''"
      >
        {{ config.icon }} {{ config.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card-dark p-4 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-habit-skeleton rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-habit-skeleton rounded w-1/2"></div>
            <div class="h-3 bg-habit-skeleton rounded w-1/3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="sessions.length === 0" class="card-dark p-12 text-center">
      <div class="text-5xl mb-4">🏋️</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Nessuna sessione trovata
      </h3>
      <p class="text-habit-text-muted text-sm mb-4">
        {{
          activeFilter !== "all"
            ? "Nessuna sessione con questo filtro"
            : "Non hai ancora completato nessun allenamento"
        }}
      </p>
      <button
        v-if="activeFilter !== 'all'"
        @click="handleFilter('all')"
        class="btn-secondary btn-sm"
      >
        Mostra tutte
      </button>
    </div>

    <!-- Sessions List -->
    <div v-else class="space-y-3">
      <div
        v-for="session in sessions"
        :key="session.id"
        @click="openSessionDetail(session.id)"
        class="card-dark p-4 cursor-pointer hover:border-habit-orange/30 transition-all"
      >
        <div class="flex items-center gap-4">
          <!-- Status Icon -->
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            :class="getStatus(session.status).bg"
          >
            {{ getStatus(session.status).icon }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-semibold text-habit-text text-sm truncate">
                {{ session.workout_name || "Sessione di allenamento" }}
              </h4>
              <span
                :class="[
                  getStatus(session.status).bg,
                  getStatus(session.status).color,
                ]"
                class="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              >
                {{ getStatus(session.status).label }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-habit-text-subtle">
              <span>{{ formatDate(session.started_at) }}</span>
              <span>{{ formatTime(session.started_at) }}</span>
              <span v-if="session.duration_minutes">{{
                formatDuration(session.duration_minutes)
              }}</span>
            </div>
          </div>

          <!-- Right -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <!-- Feeling -->
            <div v-if="session.overall_feeling" class="text-center">
              <span class="text-xl">{{
                getFeeling(session.overall_feeling).emoji
              }}</span>
            </div>
            <!-- XP -->
            <div
              v-if="session.xp_earned"
              class="text-sm font-bold text-habit-orange"
            >
              +{{ session.xp_earned }} XP
            </div>
            <!-- Arrow -->
            <svg
              class="w-4 h-4 text-habit-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <!-- Note Preview -->
        <p
          v-if="session.notes"
          class="text-habit-text-muted text-xs mt-2 pl-16 line-clamp-1"
        >
          {{ session.notes }}
        </p>
      </div>
    </div>

    <!-- Paginazione -->
    <div
      v-if="pagination.totalPages > 1"
      class="flex justify-center gap-2 mt-6"
    >
      <button
        v-for="page in pagination.totalPages"
        :key="page"
        @click="loadSessions(page)"
        class="w-8 h-8 rounded-lg text-sm font-medium transition-all"
        :class="
          page === pagination.page
            ? 'bg-habit-orange text-white'
            : 'bg-habit-bg-light text-habit-text-muted hover:text-habit-text'
        "
      >
        {{ page }}
      </button>
    </div>

    <!-- Modale Dettaglio Sessione -->
    <div
      v-if="showSessionDetail && currentSession"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60"
        @click="showSessionDetail = false"
      ></div>
      <div
        class="relative card-dark p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-habit-text">
            Dettaglio Sessione
          </h2>
          <button
            @click="showSessionDetail = false"
            class="text-habit-text-muted hover:text-habit-text"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <!-- Session Header -->
        <div class="p-4 bg-habit-bg-light rounded-xl mb-4">
          <h3 class="font-semibold text-habit-text mb-2">
            {{ currentSession.workout_name || "Sessione di allenamento" }}
          </h3>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              :class="[
                getStatus(currentSession.status).bg,
                getStatus(currentSession.status).color,
              ]"
              class="text-xs px-2 py-1 rounded-full"
            >
              {{ getStatus(currentSession.status).icon }}
              {{ getStatus(currentSession.status).label }}
            </span>
            <span
              v-if="currentSession.overall_feeling"
              class="text-xs px-2 py-1 rounded-full bg-habit-bg-light"
            >
              {{ getFeeling(currentSession.overall_feeling).emoji }}
              {{ getFeeling(currentSession.overall_feeling).label }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-habit-text-subtle text-xs">Inizio</span>
              <div class="text-habit-text">
                {{ formatDate(currentSession.started_at) }}
                {{ formatTime(currentSession.started_at) }}
              </div>
            </div>
            <div>
              <span class="text-habit-text-subtle text-xs">Fine</span>
              <div class="text-habit-text">
                {{
                  currentSession.completed_at
                    ? `${formatDate(currentSession.completed_at)} ${formatTime(currentSession.completed_at)}`
                    : "-"
                }}
              </div>
            </div>
            <div>
              <span class="text-habit-text-subtle text-xs">Durata</span>
              <div class="text-habit-text font-medium">
                {{ formatDuration(currentSession.duration_minutes) }}
              </div>
            </div>
            <div>
              <span class="text-habit-text-subtle text-xs">XP Guadagnati</span>
              <div class="text-habit-orange font-bold">
                {{ currentSession.xp_earned || 0 }} XP
              </div>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div v-if="currentSession.notes" class="mb-4">
          <h4 class="text-sm font-medium text-habit-text mb-2">Note</h4>
          <p
            class="text-habit-text-muted text-sm p-3 bg-habit-bg-light rounded-xl"
          >
            {{ currentSession.notes }}
          </p>
        </div>

        <!-- Esercizi (se presenti) -->
        <div
          v-if="currentSession.exercises && currentSession.exercises.length"
          class="mb-4"
        >
          <h4 class="text-sm font-medium text-habit-text mb-3">
            Esercizi svolti
          </h4>
          <div class="space-y-2">
            <div
              v-for="ex in currentSession.exercises"
              :key="ex.id"
              class="p-3 bg-habit-bg-light rounded-xl"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-habit-text">{{
                  ex.exercise_name || ex.name
                }}</span>
                <span class="text-xs text-habit-text-subtle"
                  >{{ ex.sets_count || 0 }} serie</span
                >
              </div>
              <!-- Sets -->
              <div v-if="ex.sets && ex.sets.length" class="mt-2 space-y-1">
                <div
                  v-for="(set, idx) in ex.sets"
                  :key="idx"
                  class="flex items-center gap-3 text-xs text-habit-text-muted"
                >
                  <span class="w-6 text-habit-text-subtle"
                    >S{{ Number(idx) + 1 }}</span
                  >
                  <span v-if="set.weight_kg">{{ set.weight_kg }}kg</span>
                  <span v-if="set.reps">x{{ set.reps }}</span>
                  <span v-if="set.duration_seconds"
                    >{{ set.duration_seconds }}s</span
                  >
                  <svg
                    v-if="set.is_completed"
                    class="w-3.5 h-3.5 text-green-400 ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="showSessionDetail = false"
          class="btn-secondary btn-sm w-full"
        >
          Chiudi
        </button>
      </div>
    </div>
  </div>
</template>
