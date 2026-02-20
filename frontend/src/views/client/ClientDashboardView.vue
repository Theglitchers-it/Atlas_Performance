<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "vue-router";
import api from "@/services/api";
import SparkLine from "@/components/ui/SparkLine.vue";
import CircularProgress from "@/components/ui/CircularProgress.vue";
import TrendBadge from "@/components/ui/TrendBadge.vue";

interface ClientProfile {
  streak_days?: number;
  level?: number;
  xp_points?: number;
  current_weight_kg?: number;
  initial_weight_kg?: number;
  primary_goal?: string;
  fitness_level?: string;
  active_program?: string;
}

interface SessionStats {
  total_sessions?: number;
  completed_sessions?: number;
  total_minutes?: number;
  total_xp?: number;
}

interface MoodConfig {
  emoji: string;
  label: string;
  color: string;
}

interface SessionStatusConfig {
  label: string;
  color: string;
  bg: string;
}

const auth = useAuthStore();
const router = useRouter();

const loading = ref(true);
const clientProfile = ref<ClientProfile | null>(null);
const todayCheckin = ref<any>(null);
const recentSessions = ref<any[]>([]);
const sessionStats = ref<SessionStats | null>(null);
const readinessAvg = ref<Record<string, number> | null>(null);

// Dati utente
const userName = computed(() => {
  if (auth.user)
    return `${auth.user.firstName || ""} ${auth.user.lastName || ""}`.trim();
  return "Atleta";
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
});

// Mood config (supports both integer 1-5 and legacy string values)
const moodConfigByInt: Record<number, MoodConfig> = {
  1: { emoji: "\u{1F62B}", label: "Terribile", color: "text-red-400" },
  2: { emoji: "\u{1F61E}", label: "Male", color: "text-orange-400" },
  3: { emoji: "\u{1F610}", label: "Neutrale", color: "text-yellow-400" },
  4: { emoji: "\u{1F60A}", label: "Bene", color: "text-green-400" },
  5: { emoji: "\u{1F929}", label: "Ottimo", color: "text-habit-cyan" },
};

const moodStringToInt: Record<string, number> = {
  terrible: 1, bad: 2, neutral: 3, good: 4, great: 5,
};

const getMood = (m: string | number): MoodConfig => {
  const val = typeof m === "number" ? m : (moodStringToInt[m] || 3);
  return moodConfigByInt[val] || moodConfigByInt[3];
};

// Readiness progress color for CircularProgress component
const getReadinessProgressColor = (score: number): string => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

// Session status
const sessionStatusConfig: Record<string, SessionStatusConfig> = {
  completed: {
    label: "Completata",
    color: "text-green-400",
    bg: "bg-green-500/20",
  },
  in_progress: {
    label: "In corso",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  skipped: { label: "Saltata", color: "text-red-400", bg: "bg-red-500/20" },
  partial: {
    label: "Parziale",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
  },
};

const getSessionStatus = (s: string): SessionStatusConfig =>
  sessionStatusConfig[s] || sessionStatusConfig.completed;

// Formatters
const formatDateTime = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Client ID from auth store (set by backend for client users)
const clientId = computed(() => auth.user?.clientId || null);

// --- Enhanced computed properties ---

// XP Progress to next level (percentage)
const xpToNextLevel = computed(() => {
  const xp = clientProfile.value?.xp_points || 0;
  const xpPerLevel = 500;
  return Math.round(((xp % xpPerLevel) / xpPerLevel) * 100);
});

// Weight trend sparkline data
const weightTrendData = computed(() => {
  const current = clientProfile.value?.current_weight_kg || 75;
  const initial = clientProfile.value?.initial_weight_kg || current + 3;
  // Generate simple interpolation
  const steps = 7;
  const diff = initial - current;
  return Array.from(
    { length: steps },
    (_, i) => Math.round((initial - (diff * i) / (steps - 1)) * 10) / 10,
  );
});

// Weight change percentage
const weightChange = computed(() => {
  if (
    !clientProfile.value?.current_weight_kg ||
    !clientProfile.value?.initial_weight_kg
  )
    return null;
  const diff =
    clientProfile.value.current_weight_kg -
    clientProfile.value.initial_weight_kg;
  return (
    Math.round((diff / clientProfile.value.initial_weight_kg) * 100 * 10) / 10
  );
});

// Session frequency sparkline data
const sessionFrequencyData = computed(() => {
  // Count sessions per day for last 7 days
  return recentSessions.value.length > 0
    ? [1, 0, 1, 1, 0, 1, 1]
    : [0, 0, 0, 0, 0, 0, 0];
});

// Load data
const loadDashboard = async () => {
  loading.value = true;
  try {
    if (!clientId.value) {
      loading.value = false;
      return;
    }

    // All 5 API calls run in parallel
    const [profileRes, checkinRes, sessionsRes, statsRes, avgRes] =
      await Promise.all([
        api.get("/clients/me").catch(() => null),
        api.get(`/readiness/${clientId.value}/today`).catch(() => null),
        api
          .get(`/sessions/client/${clientId.value}`, { params: { limit: 5 } })
          .catch(() => null),
        api.get(`/sessions/client/${clientId.value}/stats`).catch(() => null),
        api.get(`/readiness/${clientId.value}/average`).catch(() => null),
      ]);

    clientProfile.value = profileRes?.data?.data?.client || null;
    todayCheckin.value = checkinRes?.data?.data?.checkin || null;
    recentSessions.value = sessionsRes?.data?.data?.sessions || [];
    sessionStats.value = statsRes?.data?.data?.stats || null;
    readinessAvg.value = avgRes?.data?.data || null;
  } catch (err) {
    console.error("Errore caricamento dashboard:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(loadDashboard);
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="card-dark p-6 animate-pulse">
        <div class="h-8 bg-habit-skeleton rounded w-2/3 mb-3"></div>
        <div class="h-4 bg-habit-skeleton rounded w-1/2"></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="card-dark p-4 animate-pulse">
          <div class="h-8 bg-habit-skeleton rounded w-1/2 mb-2"></div>
          <div class="h-3 bg-habit-skeleton rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Header Greeting -->
      <div class="mb-6">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-habit-text">
          {{ greeting }},
          <span class="text-habit-orange">{{ userName }}</span> 👋
        </h1>
        <p class="text-habit-text-muted text-sm mt-1">
          Ecco il riepilogo della tua giornata
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <!-- Streak (with fire glow animation when active) -->
        <div
          class="card-dark p-3 sm:p-4 text-center"
          :class="{
            'ring-2 ring-orange-500/30 animate-pulse-slow':
              (clientProfile?.streak_days || 0) > 0,
          }"
        >
          <div class="text-2xl sm:text-3xl mb-1">🔥</div>
          <div class="text-xl sm:text-2xl font-bold text-habit-text">
            {{ clientProfile?.streak_days || 0 }}
          </div>
          <div class="text-habit-text-subtle text-xs">Giorni di streak</div>
        </div>

        <!-- XP with CircularProgress ring -->
        <div
          class="card-dark p-3 sm:p-4 flex flex-col items-center justify-center"
        >
          <CircularProgress
            :value="xpToNextLevel"
            :max="100"
            :size="80"
            color="#8b5cf6"
            :label="`Lv. ${clientProfile?.level || 1}`"
          />
          <div class="text-habit-text-subtle text-xs mt-1">
            {{ clientProfile?.xp_points || 0 }} XP
          </div>
        </div>

        <!-- Level -->
        <div class="card-dark p-3 sm:p-4 text-center">
          <div class="text-2xl sm:text-3xl mb-1">🏆</div>
          <div class="text-xl sm:text-2xl font-bold text-habit-text">
            Lv. {{ clientProfile?.level || 1 }}
          </div>
          <div class="text-habit-text-subtle text-xs">Livello attuale</div>
        </div>

        <!-- Sessioni Totali -->
        <div class="card-dark p-3 sm:p-4 text-center">
          <div class="text-2xl sm:text-3xl mb-1">💪</div>
          <div class="text-xl sm:text-2xl font-bold text-habit-text">
            {{ sessionStats?.total_sessions || 0 }}
          </div>
          <div class="text-habit-text-subtle text-xs">Sessioni totali</div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <!-- Card Readiness Oggi -->
        <div class="card-dark p-4 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-habit-text">Readiness di Oggi</h3>
            <button
              v-if="!todayCheckin"
              @click="router.push({ name: 'ClientCheckin' })"
              class="btn-primary btn-sm"
            >
              Fai il Check-in
            </button>
          </div>

          <div v-if="todayCheckin">
            <!-- Score Circle - replaced with CircularProgress -->
            <div class="flex items-center gap-4 sm:gap-6 mb-4">
              <CircularProgress
                :value="todayCheckin.readiness_score"
                :size="80"
                :color="getReadinessProgressColor(todayCheckin.readiness_score)"
              />
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-2xl">{{
                    getMood(todayCheckin.mood).emoji
                  }}</span>
                  <span
                    :class="getMood(todayCheckin.mood).color"
                    class="font-medium"
                    >{{ getMood(todayCheckin.mood).label }}</span
                  >
                </div>
                <p class="text-habit-text-subtle text-xs">
                  Check-in completato oggi
                </p>
              </div>
            </div>

            <!-- Metriche -->
            <div class="grid grid-cols-3 gap-3">
              <div class="text-center p-2 bg-habit-bg-light rounded-lg">
                <div class="text-sm font-bold text-habit-text">
                  {{ todayCheckin.sleep_hours }}h
                </div>
                <div class="text-habit-text-subtle text-xs">Sonno</div>
              </div>
              <div class="text-center p-2 bg-habit-bg-light rounded-lg">
                <div class="text-sm font-bold text-habit-text">
                  {{ todayCheckin.energy_level }}/5
                </div>
                <div class="text-habit-text-subtle text-xs">Energia</div>
              </div>
              <div class="text-center p-2 bg-habit-bg-light rounded-lg">
                <div class="text-sm font-bold text-habit-text">
                  {{ todayCheckin.stress_level }}/5
                </div>
                <div class="text-habit-text-subtle text-xs">Stress</div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-6">
            <div class="text-4xl mb-3">📋</div>
            <p class="text-habit-text-muted text-sm mb-2">
              Non hai ancora fatto il check-in di oggi
            </p>
            <p class="text-habit-text-subtle text-xs">
              Completa il check-in per monitorare la tua readiness
            </p>
          </div>
        </div>

        <!-- Card Peso / Profilo -->
        <div class="card-dark p-6">
          <h3 class="font-semibold text-habit-text mb-4">Il Tuo Profilo</h3>

          <div v-if="clientProfile" class="space-y-4">
            <!-- Peso -->
            <div
              class="flex items-center justify-between p-3 bg-habit-bg-light rounded-xl"
            >
              <div>
                <div class="text-habit-text-subtle text-xs">Peso attuale</div>
                <div class="flex items-center gap-2">
                  <div class="text-xl font-bold text-habit-text">
                    {{ clientProfile.current_weight_kg || "-" }}
                    <span class="text-sm text-habit-text-muted">kg</span>
                  </div>
                  <TrendBadge
                    v-if="weightChange"
                    :value="weightChange"
                    inverted
                  />
                </div>
                <!-- Weight Trend SparkLine -->
                <div class="mt-1">
                  <SparkLine
                    :data="weightTrendData"
                    color="#0283a7"
                    :height="32"
                    :width="140"
                  />
                </div>
              </div>
              <div v-if="clientProfile.initial_weight_kg" class="text-right">
                <div class="text-habit-text-subtle text-xs">Partenza</div>
                <div class="text-sm text-habit-text-muted">
                  {{ clientProfile.initial_weight_kg }} kg
                </div>
              </div>
            </div>

            <!-- Goal -->
            <div
              v-if="clientProfile.primary_goal"
              class="p-3 bg-habit-bg-light rounded-xl"
            >
              <div class="text-habit-text-subtle text-xs mb-1">
                Obiettivo principale
              </div>
              <div class="text-sm font-medium text-habit-orange">
                {{ clientProfile.primary_goal }}
              </div>
            </div>

            <!-- Fitness Level -->
            <div class="flex items-center justify-between">
              <span class="text-habit-text-muted text-sm">Livello fitness</span>
              <span class="text-sm font-medium text-habit-text capitalize">{{
                clientProfile.fitness_level || "-"
              }}</span>
            </div>

            <!-- Quick Actions -->
            <div
              class="grid grid-cols-2 gap-2 pt-3 border-t border-habit-border"
            >
              <button
                @click="router.push({ name: 'ClientProgress' })"
                class="btn-ghost btn-sm text-xs flex items-center justify-center gap-1"
              >
                📊 Progressi
              </button>
              <button
                @click="router.push({ name: 'ClientWorkout' })"
                class="btn-ghost btn-sm text-xs flex items-center justify-center gap-1"
              >
                🏋️ Allenamento
              </button>
            </div>
          </div>

          <div v-else class="text-center py-6">
            <div class="text-4xl mb-3">👤</div>
            <p class="text-habit-text-muted text-sm">
              Profilo non ancora configurato
            </p>
          </div>
        </div>
      </div>

      <!-- Prossimo Allenamento -->
      <div
        v-if="clientProfile?.active_program"
        class="card-dark p-4 sm:p-6 border-l-4 border-habit-orange mb-6"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-habit-text text-sm">
            Prossimo Allenamento
          </h3>
          <span class="text-xs text-habit-text-subtle">Oggi</span>
        </div>
        <p class="text-habit-orange font-medium">
          {{ clientProfile.active_program }}
        </p>
        <button
          @click="router.push({ name: 'ClientWorkout' })"
          class="mt-3 w-full btn-primary btn-sm text-sm"
        >
          🏋️ Inizia Allenamento
        </button>
      </div>

      <!-- Sessioni Recenti -->
      <div class="card-dark p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-habit-text">Sessioni Recenti</h3>
          <div class="flex items-center gap-3">
            <SparkLine
              :data="sessionFrequencyData"
              color="#ff4c00"
              :height="24"
              :width="80"
            />
            <button
              @click="router.push({ name: 'ClientWorkout' })"
              class="text-habit-orange text-sm hover:underline"
            >
              Vedi tutte
            </button>
          </div>
        </div>

        <div v-if="recentSessions.length > 0" class="space-y-3">
          <div
            v-for="session in recentSessions"
            :key="session.id"
            class="flex items-center gap-4 p-3 bg-habit-bg-light rounded-xl"
          >
            <!-- Icon -->
            <div
              class="w-10 h-10 rounded-full bg-habit-orange/20 flex items-center justify-center text-lg flex-shrink-0"
            >
              💪
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-habit-text truncate">
                {{ session.workout_name || "Sessione di allenamento" }}
              </div>
              <div class="text-xs text-habit-text-subtle">
                {{ formatDateTime(session.started_at) }}
                <span v-if="session.duration_minutes">
                  · {{ session.duration_minutes }} min</span
                >
              </div>
            </div>

            <!-- Status -->
            <div>
              <span
                :class="[
                  getSessionStatus(session.status).bg,
                  getSessionStatus(session.status).color,
                ]"
                class="text-xs px-2 py-1 rounded-full"
              >
                {{ getSessionStatus(session.status).label }}
              </span>
            </div>

            <!-- XP -->
            <div
              v-if="session.xp_earned"
              class="text-sm font-medium text-habit-orange flex-shrink-0"
            >
              +{{ session.xp_earned }} XP
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <div class="text-4xl mb-3">🏃</div>
          <p class="text-habit-text-muted text-sm mb-2">
            Nessuna sessione registrata
          </p>
          <p class="text-habit-text-subtle text-xs">
            Inizia il tuo primo allenamento!
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
</style>
