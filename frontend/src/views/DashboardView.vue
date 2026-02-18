<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useAuthStore } from "@/store/auth";
// import { useNotificationStore } from '@/store/notification'
import StatsCard from "@/components/ui/StatsCard.vue";
import ChartWidget from "@/components/ui/ChartWidget.vue";
import SparkLine from "@/components/ui/SparkLine.vue";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline.vue";
import DashboardSkeleton from "@/components/skeleton/DashboardSkeleton.vue";
import PullToRefresh from "@/components/mobile/PullToRefresh.vue";
import api from "@/services/api";

const authStore = useAuthStore();

const stats = ref({
  totalClients: 0,
  activeClients: 0,
  todayWorkouts: 0,
  weekWorkouts: 0,
});

const recentClients = ref<any[]>([]);
const todayAppointments = ref<any[]>([]);
const smartAlerts = ref<any[]>([]);
const analyticsData = ref<any>(null);
const sessionTrend = ref<any[]>([]);
const statsLoading = ref(true);
const chartsLoading = ref(true);
const clientsLoading = ref(true);
const appointmentsLoading = ref(true);
const initialLoad = ref(true);

const userName = computed(() => authStore.user?.firstName || "Trainer");
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
});

// Chart computed properties
const sessionChartData = computed(() => {
  if (!sessionTrend.value.length) return { labels: [], datasets: [] };
  return {
    labels: sessionTrend.value.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("it-IT", { weekday: "short" });
    }),
    datasets: [
      {
        label: "Completate",
        data: sessionTrend.value.map((d) => d.completed || 0),
        backgroundColor: "#22c55e",
        borderRadius: 8,
      },
      {
        label: "Totali",
        data: sessionTrend.value.map((d) => d.total || 0),
        backgroundColor: "#3b82f6",
        borderRadius: 8,
      },
    ],
  };
});

const clientDistributionData = computed(() => ({
  labels: ["Attivi", "In Pausa", "Inattivi"],
  datasets: [
    {
      data: [
        analyticsData.value?.clients?.active || stats.value.activeClients || 0,
        analyticsData.value?.clients?.paused || 0,
        analyticsData.value?.clients?.inactive || 0,
      ],
      backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
      borderWidth: 0,
      spacing: 4,
    },
  ],
}));

// Sparkline data
const clientsTrendData = computed(() => {
  // Use real data if available, otherwise placeholder
  return [12, 15, 13, 18, 20, 19, stats.value.totalClients || 22];
});
const sessionsTrendData = computed(() => {
  return sessionTrend.value.length
    ? sessionTrend.value.map((d) => d.completed || 0)
    : [3, 5, 4, 6, 8, 5, 7];
});
const completionTrendData = computed(() => {
  return sessionTrend.value.length
    ? sessionTrend.value.map((d) =>
        d.total ? Math.round((d.completed / d.total) * 100) : 0,
      )
    : [70, 75, 80, 65, 85, 90, 78];
});

// Responsive chart height
const windowWidth = ref(
  typeof window !== "undefined" ? window.innerWidth : 1024,
);
const onResize = () => {
  windowWidth.value = window.innerWidth;
};
const chartHeight = computed(() => {
  if (windowWidth.value < 640) return "180px";
  if (windowWidth.value < 768) return "200px";
  return "280px";
});

// Activity timeline from existing data
const recentActivities = computed(() => {
  const activities: any[] = [];
  recentClients.value.slice(0, 3).forEach((c) => {
    activities.push({
      id: "client-" + c.id,
      type: "client_added",
      title: (c.first_name || "") + " " + (c.last_name || ""),
      description: "Nuovo cliente aggiunto",
      timestamp: c.created_at || new Date().toISOString(),
    });
  });
  todayAppointments.value.slice(0, 3).forEach((a) => {
    activities.push({
      id: "appt-" + a.id,
      type: "appointment",
      title: a.client_name || "Appuntamento",
      description: (a.type || "Training") + " - " + (a.start_time || ""),
      timestamp: a.date || new Date().toISOString(),
    });
  });
  smartAlerts.value.slice(0, 4).forEach((al) => {
    activities.push({
      id: "alert-" + al.id,
      type: "alert",
      title: al.alert_type || al.type || "Avviso",
      description: al.message || "",
      timestamp: al.created_at || new Date().toISOString(),
    });
  });
  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);
});

onMounted(async () => {
  window.addEventListener("resize", onResize);
  await loadAllData();
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

// Progressive loading: stats first (above the fold), then appointments, then charts + clients
const loadAllData = async (resolve?: any) => {
  statsLoading.value = true;
  appointmentsLoading.value = true;
  chartsLoading.value = true;
  clientsLoading.value = true;

  try {
    // Phase 1: Load stats (above the fold - highest priority)
    const statsPromise = api.get("/analytics/overview").catch(() => null);
    const statsRes = await statsPromise;
    if (statsRes?.data?.data) {
      analyticsData.value = statsRes.data.data;
    }
    statsLoading.value = false;
    initialLoad.value = false;

    // Phase 2: Load appointments
    const appointmentsPromise = api.get("/booking/today").catch(() => null);
    const alertsPromise = api.get("/alerts").catch(() => null);
    const [appointmentsRes, smartRes] = await Promise.all([
      appointmentsPromise,
      alertsPromise,
    ]);
    todayAppointments.value = appointmentsRes?.data?.data?.appointments || [];
    smartAlerts.value =
      smartRes?.data?.data?.alerts || smartRes?.data?.data || [];
    appointmentsLoading.value = false;

    // Phase 3: Load charts + clients (below the fold)
    const [trendRes, clientsRes] = await Promise.all([
      api
        .get("/analytics/sessions-trend", { params: { groupBy: "daily" } })
        .catch(() => null),
      api.get("/clients", { params: { limit: 5 } }).catch(() => null),
    ]);

    if (trendRes?.data?.data?.trend) {
      sessionTrend.value = trendRes.data.data.trend;
    }
    chartsLoading.value = false;

    if (clientsRes?.data?.data) {
      recentClients.value = clientsRes.data.data.clients || [];
      stats.value.totalClients = clientsRes.data.data.pagination?.total || 0;
      stats.value.activeClients = recentClients.value.filter(
        (c) => c.status === "active",
      ).length;
    }
    clientsLoading.value = false;
  } catch (error: any) {
    console.error("Error loading dashboard:", error);
    statsLoading.value = false;
    appointmentsLoading.value = false;
    chartsLoading.value = false;
    clientsLoading.value = false;
    initialLoad.value = false;
  } finally {
    if (resolve) resolve();
  }
};
</script>

<template>
  <PullToRefresh @refresh="loadAllData">
    <DashboardSkeleton v-if="initialLoad" />
    <div v-else class="min-h-screen bg-habit-bg space-y-4 sm:space-y-6">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
            {{ greeting }}, {{ userName }}!
          </h1>
          <p class="text-habit-text-subtle mt-1">
            Ecco un riepilogo della tua attivita
          </p>
        </div>
        <router-link
          to="/clients/new"
          class="flex sm:inline-flex items-center justify-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 w-full sm:w-auto"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuovo Cliente
        </router-link>
      </div>

      <!-- Stats Grid with Sparklines -->
      <div
        class="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3"
        aria-live="polite"
        aria-label="Statistiche dashboard"
      >
        <StatsCard
          class=""
          :value="statsLoading ? '...' : stats.totalClients"
          label="Clienti Totali"
          icon-emoji="👥"
          icon-color="blue"
          :delay="0"
          :format-number="!statsLoading"
        >
          <template #footer>
            <SparkLine
              :data="clientsTrendData"
              color="#3b82f6"
              :height="28"
              :width="100"
            />
          </template>
        </StatsCard>
        <StatsCard
          class=""
          :value="
            statsLoading ? '...' : analyticsData?.sessions?.completed || 0
          "
          label="Sessioni Settimana"
          icon-emoji="💪"
          icon-color="green"
          :delay="0.1"
          :format-number="!statsLoading"
        >
          <template #footer>
            <SparkLine
              :data="sessionsTrendData"
              color="#22c55e"
              :height="28"
              :width="100"
            />
          </template>
        </StatsCard>
        <StatsCard
          class=""
          :value="
            statsLoading ? '...' : analyticsData?.sessions?.completionRate || 0
          "
          label="Tasso Completamento"
          icon-emoji="📊"
          icon-color="orange"
          suffix="%"
          :delay="0.2"
          :format-number="!statsLoading"
        >
          <template #footer>
            <SparkLine
              :data="completionTrendData"
              color="#ff4c00"
              :height="28"
              :width="100"
            />
          </template>
        </StatsCard>
        <StatsCard
          class=""
          :value="appointmentsLoading ? '...' : todayAppointments.length"
          label="Appuntamenti Oggi"
          icon-emoji="📅"
          icon-color="purple"
          :delay="0.3"
          :format-number="!appointmentsLoading"
        />
      </div>

      <!-- Charts Row -->
      <div class="grid md:grid-cols-2 gap-4 sm:gap-6">
        <ChartWidget
          type="bar"
          title="Sessioni Settimana"
          :chart-data="sessionChartData"
          :loading="chartsLoading"
          :height="chartHeight"
        />
        <ChartWidget
          type="doughnut"
          title="Distribuzione Clienti"
          :chart-data="clientDistributionData"
          :loading="chartsLoading"
          :height="chartHeight"
        />
      </div>

      <!-- Main Content: Recent Clients + Activity Timeline -->
      <div class="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <!-- Recent Clients -->
        <div
          class="lg:col-span-2 bg-habit-card border border-habit-border rounded-habit"
        >
          <div
            class="p-4 xs:p-6 border-b border-habit-border flex items-center justify-between"
          >
            <h2 class="text-lg font-semibold text-habit-text">
              Clienti Recenti
            </h2>
            <router-link
              to="/clients"
              class="text-sm text-habit-cyan hover:text-habit-orange transition-colors"
            >
              Vedi tutti
            </router-link>
          </div>
          <div v-if="clientsLoading" class="p-4 xs:p-6">
            <div class="animate-pulse space-y-4">
              <div v-for="i in 3" :key="i" class="flex items-center space-x-4">
                <div class="w-10 h-10 bg-habit-skeleton rounded-full"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
                  <div class="h-3 bg-habit-skeleton rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else-if="recentClients.length === 0"
            class="p-4 xs:p-6 text-center text-habit-text-subtle"
          >
            <svg
              class="w-12 h-12 mx-auto mb-4 text-habit-text-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p>Nessun cliente ancora</p>
            <router-link
              to="/clients/new"
              class="mt-2 inline-block text-habit-cyan hover:text-habit-orange transition-colors"
            >
              Aggiungi il primo cliente
            </router-link>
          </div>
          <ul v-else class="divide-y divide-habit-border">
            <li
              v-for="client in recentClients"
              :key="client.id"
              class="p-4 hover:bg-habit-card-hover transition-colors"
            >
              <router-link
                :to="`/clients/${client.id}`"
                class="flex items-center space-x-4"
              >
                <div
                  class="flex-shrink-0 w-10 h-10 bg-habit-cyan/20 rounded-full flex items-center justify-center"
                >
                  <span class="text-habit-cyan font-medium">
                    {{ client.first_name?.charAt(0)
                    }}{{ client.last_name?.charAt(0) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-habit-text truncate">
                    {{ client.first_name || "" }} {{ client.last_name || "" }}
                  </p>
                  <p class="text-sm text-habit-text-subtle truncate">
                    {{ client.email || "Nessuna email" }}
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <span
                    class="px-2 py-1 text-xs rounded-full"
                    :class="{
                      'bg-habit-success/20 text-habit-success':
                        client.status === 'active',
                      'bg-habit-skeleton text-habit-text-subtle':
                        client.status !== 'active',
                    }"
                  >
                    {{ client.status === "active" ? "Attivo" : "Inattivo" }}
                  </span>
                </div>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Activity Timeline -->
        <ActivityTimeline :activities="recentActivities" />
      </div>

      <!-- Quick Actions + Smart Alerts -->
      <div class="grid md:grid-cols-2 gap-4 sm:gap-6">
        <!-- Quick Actions - compact 2x2 grid -->
        <div
          class="bg-habit-card border border-habit-border rounded-habit p-4 xs:p-6"
        >
          <h2 class="text-lg font-semibold text-habit-text mb-4">
            Azioni Rapide
          </h2>
          <div class="grid grid-cols-2 gap-2 xs:gap-3">
            <router-link
              to="/clients/new"
              class="flex flex-col items-center gap-1.5 xs:gap-2 p-3 xs:p-4 rounded-xl bg-habit-bg hover:bg-habit-card-hover transition-all duration-200 border border-habit-border hover:border-habit-cyan group"
            >
              <div
                class="w-8 h-8 xs:w-10 xs:h-10 bg-habit-cyan/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-4 h-4 xs:w-5 xs:h-5 text-habit-cyan"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <span class="text-xs font-medium text-habit-text-muted"
                >Nuovo Cliente</span
              >
            </router-link>

            <router-link
              to="/workouts/builder"
              class="flex flex-col items-center gap-1.5 xs:gap-2 p-3 xs:p-4 rounded-xl bg-habit-bg hover:bg-habit-card-hover transition-all duration-200 border border-habit-border hover:border-habit-cyan group"
            >
              <div
                class="w-8 h-8 xs:w-10 xs:h-10 bg-habit-success/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-4 h-4 xs:w-5 xs:h-5 text-habit-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <span class="text-xs font-medium text-habit-text-muted"
                >Crea Scheda</span
              >
            </router-link>

            <router-link
              to="/calendar"
              class="flex flex-col items-center gap-1.5 xs:gap-2 p-3 xs:p-4 rounded-xl bg-habit-bg hover:bg-habit-card-hover transition-all duration-200 border border-habit-border hover:border-habit-cyan group"
            >
              <div
                class="w-8 h-8 xs:w-10 xs:h-10 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-4 h-4 xs:w-5 xs:h-5 text-blue-500"
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
              <span class="text-xs font-medium text-habit-text-muted"
                >Calendario</span
              >
            </router-link>

            <router-link
              to="/chat"
              class="flex flex-col items-center gap-1.5 xs:gap-2 p-3 xs:p-4 rounded-xl bg-habit-bg hover:bg-habit-card-hover transition-all duration-200 border border-habit-border hover:border-habit-cyan group"
            >
              <div
                class="w-8 h-8 xs:w-10 xs:h-10 bg-habit-orange/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-4 h-4 xs:w-5 xs:h-5 text-habit-orange"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <span class="text-xs font-medium text-habit-text-muted"
                >Messaggi</span
              >
            </router-link>
          </div>
        </div>

        <!-- Smart Alerts -->
        <div
          v-if="smartAlerts.length > 0"
          class="bg-habit-card border border-habit-border rounded-habit"
        >
          <div class="p-4 border-b border-habit-border">
            <h2
              class="text-sm font-semibold text-habit-text flex items-center gap-2"
            >
              <svg
                class="w-4 h-4 text-habit-orange"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Avvisi ({{ smartAlerts.length }})
            </h2>
          </div>
          <div class="divide-y divide-habit-border max-h-60 overflow-y-auto">
            <div
              v-for="alert in smartAlerts.slice(0, 5)"
              :key="alert.id"
              class="p-3 flex items-start gap-3"
            >
              <div
                class="w-2 h-2 mt-1.5 rounded-full flex-shrink-0"
                :class="{
                  'bg-red-400': alert.severity === 'high',
                  'bg-habit-orange': alert.severity === 'medium',
                  'bg-yellow-400': alert.severity === 'low',
                }"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-habit-text">{{ alert.message }}</p>
                <p class="text-[10px] text-habit-text-subtle mt-0.5">
                  {{ alert.alert_type || alert.type }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="bg-habit-card border border-habit-border rounded-habit p-6 flex flex-col items-center justify-center text-center"
        >
          <div
            class="w-12 h-12 bg-green-500/15 rounded-full flex items-center justify-center mb-3"
          >
            <svg
              class="w-6 h-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p class="text-sm text-habit-text-muted">Nessun avviso attivo</p>
          <p class="text-xs text-habit-text-subtle mt-1">
            Tutti i clienti sono in regola
          </p>
        </div>
      </div>
    </div>
  </PullToRefresh>
</template>
