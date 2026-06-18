<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
// import { useNotificationStore } from '@/store/notification'
import ChartWidget from "@/components/ui/ChartWidget.vue";
import ClientSegmentsWidget from "@/components/dashboard/ClientSegmentsWidget.vue";
import SparkLine from "@/components/ui/SparkLine.vue";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline.vue";
import ActionItemsCard from "@/components/dashboard/ActionItemsCard.vue";
import DashboardSkeleton from "@/components/skeleton/DashboardSkeleton.vue";
import PullToRefresh from "@/components/mobile/PullToRefresh.vue";
import HeroGlassCard from "@/components/ui/HeroGlassCard.vue";
import StatTile from "@/components/ui/StatTile.vue";
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UsersIcon,
} from "@heroicons/vue/24/outline";
import api from "@/services/api";
import { useSlowRequest } from "@/composables/useSlowRequest";
import type {
  Client,
  AnalyticsOverview,
  SessionTrendPoint,
  ActionItem,
  ActionItemsCounts,
  ActionTypeFilter,
} from "@/types";

interface DashboardAppointment {
  id: number;
  client_name?: string;
  type?: string;
  appointment_type?: string;
  start_time?: string;
  start_datetime?: string;
  date?: string;
}

interface DashboardAlert {
  id: number;
  client_id?: number;
  first_name?: string;
  last_name?: string;
  type?: string;
  alert_type?: string;
  severity?: string;
  title?: string;
  message?: string;
  created_at?: string;
}

interface TopClientProgress {
  id: number;
  first_name?: string;
  last_name?: string;
  current_weight?: number;
  prev_weight?: number;
  recent_completed?: number;
  checkin_count?: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

const authStore = useAuthStore();
const router = useRouter();

const stats = ref({
  totalClients: 0,
  activeClients: 0,
  todayWorkouts: 0,
  weekWorkouts: 0,
});

const recentClients = ref<Client[]>([]);
const todayAppointments = ref<DashboardAppointment[]>([]);
const smartAlerts = ref<DashboardAlert[]>([]);
const analyticsData = ref<AnalyticsOverview | null>(null);
const sessionTrend = ref<SessionTrendPoint[]>([]);
const actionItems = ref<ActionItem[]>([]);
const actionCounts = ref<ActionItemsCounts | null>(null);
const actionItemsLoading = ref(true);
const actionItemsInitialized = ref(false);
const actionTypeFilter = ref<ActionTypeFilter>("all");
const thresholdDays = ref(30);
const statsLoading = ref(true);
const chartsLoading = ref(true);
const clientsLoading = ref(true);
const appointmentsLoading = ref(true);
const initialLoad = ref(true);
const { isSlowRequest } = useSlowRequest(initialLoad);

const userName = computed(() => authStore.user?.firstName || "Trainer");
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
});

const todayDate = computed(() => {
  return new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

const motivationalQuotes = [
  "Il successo e la somma di piccoli sforzi ripetuti giorno dopo giorno.",
  "Non conta la velocita, conta la costanza.",
  "Ogni cliente che migliora e il tuo miglior biglietto da visita.",
  "La disciplina batte il talento quando il talento non ha disciplina.",
  "Un buon trainer non crea dipendenza, crea autonomia.",
  "I risultati parlano piu forte di qualsiasi promessa.",
  "Oggi e il giorno perfetto per fare la differenza.",
  "Il corpo raggiunge cio che la mente crede.",
  "Ogni sessione conta, ogni progresso merita di essere celebrato.",
  "La costanza trasforma l'ordinario in straordinario.",
  "Sii la motivazione che i tuoi clienti cercano.",
  "Non esistono scorciatoie, solo percorsi piu intelligenti.",
  "Il miglior investimento e quello sulla propria salute.",
  "Piccoli passi portano a grandi trasformazioni.",
  "La forza non viene dal fisico, viene dalla volonta.",
  "Allenare e un privilegio, non un lavoro.",
  "Ogni giorno e un'opportunita per essere migliore di ieri.",
  "Il dolore di oggi e la forza di domani.",
  "Credi nei tuoi clienti piu di quanto credano in se stessi.",
  "La grandezza non si raggiunge mai da soli.",
];

const dailyQuote = computed(() => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return motivationalQuotes[dayOfYear % motivationalQuotes.length];
});

// Azioni rapide unificate nell'hero card (pill row)
const quickActions = computed(() => [
  {
    to: "/clients/new",
    label: "Nuovo Cliente",
    icon: PlusIcon,
    accent: "text-habit-orange",
    bg: "bg-habit-orange/10 hover:bg-habit-orange/20",
  },
  {
    to: "/workouts/builder",
    label: "Crea Scheda",
    icon: ClipboardDocumentListIcon,
    accent: "text-emerald-400",
    bg: "bg-emerald-400/10 hover:bg-emerald-400/20",
  },
  {
    to: "/calendar",
    label: "Calendario",
    icon: CalendarDaysIcon,
    accent: "text-habit-cyan",
    bg: "bg-habit-cyan/10 hover:bg-habit-cyan/20",
  },
  {
    to: "/chat",
    label: "Messaggi",
    icon: ChatBubbleLeftRightIcon,
    accent: "text-blue-400",
    bg: "bg-blue-400/10 hover:bg-blue-400/20",
  },
]);

const alertDotClass = (severity?: string): string => {
  if (severity === "critical" || severity === "high") return "bg-red-400";
  if (severity === "medium" || severity === "warning") return "bg-habit-orange";
  return "bg-yellow-400";
};

// Top clients progress
const topClientsProgress = ref<TopClientProgress[]>([]);
const topClientsLoading = ref(true);

// Chart computed properties
const formatSessionLabel = (period: string): string => {
  if (!period) return "";
  // Daily format: "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const date = new Date(period + "T00:00:00");
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
    }
  }
  // Weekly ISO format: "YYYY-Www"
  const weekMatch = period.match(/^(\d{4})-W(\d{1,2})$/);
  if (weekMatch) return `S${weekMatch[2]}`;
  // Monthly format: "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("it-IT", { month: "short" });
    }
  }
  return period;
};

const sessionChartData = computed(() => {
  // Build a map of API data points keyed by ISO date (YYYY-MM-DD)
  const dataMap = new Map<string, { total: number; completed: number }>();
  for (const d of sessionTrend.value) {
    const key = ((d as any).period || (d as any).date || "").toString();
    if (key) {
      dataMap.set(key, {
        total: Number((d as any).total) || 0,
        completed: Number((d as any).completed) || 0,
      });
    }
  }
  // Always render last 7 days so the chart looks sensible with few data points
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const labels: string[] = [];
  const completedData: number[] = [];
  const totalData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const isoKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    labels.push(formatSessionLabel(isoKey));
    const point = dataMap.get(isoKey);
    completedData.push(point?.completed ?? 0);
    totalData.push(point?.total ?? 0);
  }
  return {
    labels,
    datasets: [
      {
        label: "Completate",
        data: completedData,
        backgroundColor: "#22c55e",
        borderRadius: 8,
      },
      {
        label: "Totali",
        data: totalData,
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

// Subtitle inline per i 2 chart (riassumono i dati nel titolo)
const sessionsSummary = computed(() => {
  const completed = sessionChartData.value.datasets?.[0]?.data || [];
  const totals = sessionChartData.value.datasets?.[1]?.data || [];
  const safeSum = (arr: number[]) =>
    arr.reduce((s: number, n: number) => s + Math.max(0, Number(n) || 0), 0);
  const totalSum = safeSum(totals);
  const completedSum = safeSum(completed);
  if (totalSum === 0) return "Nessuna sessione negli ultimi 7 giorni";
  // Clamp 0-100% per evitare anomalie da dati inconsistenti (completed > total).
  const pct = Math.min(100, Math.round((completedSum / totalSum) * 100));
  return `Ultimi 7 giorni · ${totalSum} totali · ${completedSum} completate (${pct}%)`;
});

const clientsSummary = computed(() => {
  const labels = clientDistributionData.value.labels || [];
  const data = (clientDistributionData.value.datasets?.[0]?.data || []) as number[];
  const tot = data.reduce((s, n) => s + Math.max(0, Number(n) || 0), 0);
  if (tot === 0) return "Nessun cliente in portafoglio";
  // Lookup dinamico dell'indice "Attivi" per robustezza se l'ordine dei dataset cambia.
  const activeIdx = labels.indexOf("Attivi");
  const active = activeIdx >= 0 ? (data[activeIdx] || 0) : (data[0] || 0);
  const pct = Math.min(100, Math.round((active / tot) * 100));
  return `${tot} ${tot === 1 ? "cliente" : "clienti"} · ${pct}% attivi`;
});

// Sparkline for "Clienti Totali" card
const clientsTrendData = computed(() => {
  return [12, 15, 13, 18, 20, 19, stats.value.totalClients || 22];
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
  const activities: ActivityItem[] = [];
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
  if (reloadActionItemsTimer) {
    clearTimeout(reloadActionItemsTimer);
    reloadActionItemsTimer = null;
  }
});

// Ricarica Azioni Richieste quando cambiano le soglie (filtri dropdown)
const reloadActionItems = async () => {
  actionItemsLoading.value = true;
  const res = await api
    .get("/analytics/action-items", {
      params: {
        renewalDays: thresholdDays.value,
        checkinDays: thresholdDays.value,
      },
    })
    .catch(() => null);
  if (res?.data?.data) {
    actionItems.value = res.data.data.items || [];
    actionCounts.value = res.data.data.counts || null;
  }
  actionItemsLoading.value = false;
};

let reloadActionItemsTimer: ReturnType<typeof setTimeout> | null = null;
watch(thresholdDays, () => {
  if (!actionItemsInitialized.value) return;
  if (reloadActionItemsTimer) clearTimeout(reloadActionItemsTimer);
  reloadActionItemsTimer = setTimeout(() => {
    reloadActionItems();
    reloadActionItemsTimer = null;
  }, 300);
});

// Progressive loading: stats first (above the fold), then appointments, then charts + clients
const loadAllData = async (resolve?: () => void) => {
  // Guard: don't fire API calls if user is not authenticated (prevents 401 spam on login page)
  if (!authStore.isAuthenticated) return;

  statsLoading.value = true;
  appointmentsLoading.value = true;
  chartsLoading.value = true;
  clientsLoading.value = true;
  actionItemsLoading.value = true;

  try {
    // Phase 1: Load stats (above the fold - highest priority)
    const statsPromise = api.get("/analytics/overview").catch(() => null);
    const statsRes = await statsPromise;
    if (statsRes?.data?.data) {
      analyticsData.value = statsRes.data.data;
    }
    statsLoading.value = false;
    initialLoad.value = false;

    // Phase 2: Load appointments + action items
    const appointmentsPromise = api.get("/booking/today").catch(() => null);
    const alertsPromise = api.get("/alerts").catch(() => null);
    const actionItemsPromise = api
      .get("/analytics/action-items", {
        params: {
          renewalDays: thresholdDays.value,
          checkinDays: thresholdDays.value,
        },
      })
      .catch(() => null);
    const [appointmentsRes, smartRes, actionRes] = await Promise.all([
      appointmentsPromise,
      alertsPromise,
      actionItemsPromise,
    ]);
    todayAppointments.value = appointmentsRes?.data?.data?.appointments || [];
    smartAlerts.value =
      smartRes?.data?.data?.alerts || smartRes?.data?.data || [];
    if (actionRes?.data?.data) {
      actionItems.value = actionRes.data.data.items || [];
      actionCounts.value = actionRes.data.data.counts || null;
    }
    actionItemsLoading.value = false;
    actionItemsInitialized.value = true;
    appointmentsLoading.value = false;

    // Phase 3: Load charts + clients + top clients progress (below the fold)
    const [trendRes, clientsRes, topClientsRes] = await Promise.all([
      api
        .get("/analytics/sessions-trend", { params: { groupBy: "day" } })
        .catch(() => null),
      api.get("/clients", { params: { limit: 5 } }).catch(() => null),
      api.get("/analytics/top-clients-progress", { params: { limit: 5 } }).catch(() => null),
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

    topClientsProgress.value = topClientsRes?.data?.data?.clients || [];
    topClientsLoading.value = false;
  } catch (err: unknown) {
    console.error("Error loading dashboard:", err);
    statsLoading.value = false;
    appointmentsLoading.value = false;
    chartsLoading.value = false;
    clientsLoading.value = false;
    topClientsLoading.value = false;
    actionItemsLoading.value = false;
    initialLoad.value = false;
  } finally {
    if (resolve) resolve();
  }
};
</script>

<template>
  <PullToRefresh @refresh="loadAllData">
    <DashboardSkeleton v-if="initialLoad" />
    <p v-if="isSlowRequest" class="text-sm text-habit-text-subtle text-center mt-2">
      La richiesta sta impiegando piu tempo del previsto...
    </p>
    <div v-else class="min-h-screen bg-habit-bg space-y-4 sm:space-y-6">
      <!-- Welcome Banner unificato (glass-mesh 2026): greeting + azioni rapide + avvisi -->
      <HeroGlassCard mb="mb-0">
        <!-- Sezione 1: Greeting + data + quote -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-habit-text tracking-tight leading-tight">
              {{ greeting }},
              <span class="bg-gradient-to-r from-habit-orange to-pink-500 bg-clip-text text-transparent">{{ userName }}</span>
              <span aria-hidden="true">👋</span>
            </h1>
            <p class="text-xs sm:text-sm text-habit-text-subtle mt-1.5 capitalize">
              {{ todayDate }}
            </p>
          </div>
          <div class="flex items-start gap-2 sm:max-w-xs lg:max-w-sm">
            <svg class="w-4 h-4 text-habit-orange flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p class="text-xs sm:text-sm text-habit-text-muted italic leading-relaxed line-clamp-2">
              {{ dailyQuote }}
            </p>
          </div>
        </div>

        <!-- Sezione 2: Azioni rapide pill row -->
        <div class="mt-5 pt-4 border-t border-white/5">
          <div class="text-[11px] font-semibold uppercase tracking-wider text-habit-text-subtle mb-2.5">
            Azioni rapide
          </div>
          <div class="flex flex-wrap gap-2">
            <router-link
              v-for="action in quickActions"
              :key="action.to"
              :to="action.to"
              class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium text-habit-text transition-colors"
              :class="action.bg"
            >
              <component :is="action.icon" class="w-4 h-4" :class="action.accent" />
              <span>{{ action.label }}</span>
            </router-link>
          </div>
        </div>

        <!-- Sezione 3: Avvisi compatti -->
        <div class="mt-5 pt-4 border-t border-white/5">
          <div class="flex items-center justify-between mb-2.5">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-habit-text-subtle flex items-center gap-1.5">
              <BellAlertIcon class="w-3.5 h-3.5" />
              <span>Avvisi</span>
              <span v-if="smartAlerts.length" class="text-habit-orange">({{ smartAlerts.length }})</span>
            </div>
            <router-link
              v-if="smartAlerts.length > 3"
              to="/clients"
              class="text-xs text-habit-cyan hover:underline"
            >
              Vedi tutti →
            </router-link>
          </div>
          <div
            v-if="!smartAlerts.length"
            class="flex items-center gap-2 text-xs text-emerald-400/90"
          >
            <CheckCircleIcon class="w-4 h-4 flex-shrink-0" />
            <span>Nessun avviso attivo, tutti i clienti sono in regola</span>
          </div>
          <ul v-else class="space-y-1">
            <li v-for="alert in smartAlerts.slice(0, 3)" :key="alert.id">
              <router-link
                :to="alert.client_id ? `/clients/${alert.client_id}` : '/clients'"
                class="flex items-start gap-2 text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <span
                  class="w-1.5 h-1.5 mt-2 rounded-full flex-shrink-0"
                  :class="alertDotClass(alert.severity)"
                ></span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-1.5 flex-wrap">
                    <span v-if="alert.first_name" class="font-semibold text-habit-text">
                      {{ alert.first_name }} {{ alert.last_name }}
                    </span>
                    <span class="text-xs text-habit-text-subtle">{{ alert.title || alert.alert_type }}</span>
                  </div>
                  <p class="text-xs text-habit-text-subtle/80 truncate mt-0.5">
                    {{ alert.message }}
                  </p>
                </div>
                <svg
                  class="w-3 h-3 text-habit-text-subtle/40 group-hover:text-habit-cyan group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </li>
          </ul>
        </div>
      </HeroGlassCard>

      <!-- Stats Grid (glass-mesh 2026) -->
      <div
        class="grid grid-cols-2 sm:grid-cols-3 gap-3"
        aria-live="polite"
        aria-label="Statistiche dashboard"
      >
        <StatTile
          icon="👥"
          :value="statsLoading ? '...' : stats.totalClients"
          label="Clienti Totali"
          orb-color="bg-habit-cyan/15"
          :format-number="!statsLoading"
        >
          <template #extra>
            <!-- Sparkline solo su desktop -->
            <div class="hidden sm:flex justify-center mt-2">
              <SparkLine
                :data="clientsTrendData"
                color="#3b82f6"
                :height="28"
                :width="100"
              />
            </div>
          </template>
        </StatTile>
        <!-- Card combinata: Nuovi Iscritti + In Scadenza (glass-mesh 2026) -->
        <div
          class="relative overflow-hidden bg-habit-card border border-white/10 rounded-3xl p-3 sm:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] col-span-2 sm:col-span-1 order-last sm:order-none"
        >
          <div class="pointer-events-none absolute -top-8 -right-8 w-20 h-20 rounded-full bg-emerald-500/15 blur-2xl"></div>
          <div class="relative grid grid-cols-2 divide-x divide-white/10 h-full">
            <!-- Nuovi Iscritti -->
            <router-link
              to="/clients?filter=new_no_check"
              class="pr-3 flex flex-col items-center text-center hover:opacity-80 transition-opacity"
            >
              <div class="text-2xl sm:text-3xl mb-1">🆕</div>
              <div class="text-xl sm:text-2xl font-bold text-habit-text">
                {{
                  statsLoading
                    ? "..."
                    : (analyticsData?.clients?.new_clients_30d || 0).toLocaleString("it-IT")
                }}
              </div>
              <div class="text-habit-text-subtle text-xs">Nuovi (30gg)</div>
            </router-link>

            <!-- In Scadenza -->
            <router-link
              to="/clients?filter=subscription_expiring"
              class="pl-3 flex flex-col items-center text-center hover:opacity-80 transition-opacity"
            >
              <div class="text-2xl sm:text-3xl mb-1">⏰</div>
              <div class="text-xl sm:text-2xl font-bold text-habit-orange">
                {{
                  actionItemsLoading
                    ? "..."
                    : (actionCounts?.expiring_subscriptions || 0).toLocaleString("it-IT")
                }}
              </div>
              <div class="text-habit-text-subtle text-xs">In scadenza ({{ thresholdDays }}gg)</div>
            </router-link>
          </div>
        </div>
        <StatTile
          icon="📅"
          :value="appointmentsLoading ? '...' : todayAppointments.length"
          label="Appuntamenti Oggi"
          orb-color="bg-purple-500/15"
          :format-number="!appointmentsLoading"
        />
      </div>

      <!-- Segmenti clienti (fidelizzazione) -->
      <ClientSegmentsWidget />

      <!-- Charts Row -->
      <div class="grid md:grid-cols-2 gap-4 sm:gap-6 [&>*]:min-w-0">
        <ChartWidget
          type="bar"
          title="Sessioni Settimana"
          :subtitle="sessionsSummary"
          :icon="ChartBarIcon"
          :chart-data="sessionChartData"
          :loading="chartsLoading"
          :height="chartHeight"
          @chart-click="router.push('/programs?tab=sessioni')"
        >
          <template #actions>
            <router-link
              to="/programs?tab=sessioni"
              class="text-xs text-habit-cyan hover:text-habit-orange transition-colors inline-flex items-center gap-1"
            >
              Vedi tutte
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </template>
        </ChartWidget>
        <ChartWidget
          type="doughnut"
          title="Distribuzione Clienti"
          :subtitle="clientsSummary"
          :icon="UsersIcon"
          :chart-data="clientDistributionData"
          :loading="chartsLoading"
          :height="chartHeight"
          @chart-click="router.push('/clients')"
        >
          <template #actions>
            <router-link
              to="/clients"
              class="text-xs text-habit-cyan hover:text-habit-orange transition-colors inline-flex items-center gap-1"
            >
              Vedi tutti
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </template>
        </ChartWidget>
      </div>

      <!-- Top Clients Progress + Revenue Mockup -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 [&>*]:min-w-0">
        <!-- Top Clients Progress (glass-mesh 2026) -->
        <div class="md:col-span-2 lg:col-span-2 bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
          <div class="p-4 xs:p-6 border-b border-habit-border flex items-center justify-between">
            <h2 class="text-lg font-semibold text-habit-text">Progressi Top Clienti</h2>
            <router-link to="/insights" class="text-sm text-habit-cyan hover:text-habit-orange transition-colors">
              Vedi tutti
            </router-link>
          </div>
          <div v-if="topClientsLoading" class="p-4 xs:p-6">
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
          <div v-else-if="topClientsProgress.length === 0" class="p-4 xs:p-6 text-center text-habit-text-subtle">
            <p class="text-sm">Nessun dato sui progressi ancora</p>
            <p class="text-xs mt-1">I progressi appariranno quando i clienti avranno sessioni e misurazioni</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-xs text-habit-text-subtle uppercase tracking-wider">
                  <th class="px-4 xs:px-6 py-3 text-left font-medium">Cliente</th>
                  <th class="px-3 py-3 text-center font-medium">Peso</th>
                  <th class="hidden sm:table-cell px-3 py-3 text-center font-medium">Sessioni</th>
                  <th class="hidden sm:table-cell px-3 py-3 text-center font-medium">Check-in</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-habit-border">
                <tr
                  v-for="client in topClientsProgress"
                  :key="client.id"
                  class="hover:bg-habit-card-hover transition-colors cursor-pointer"
                  @click="router.push(`/clients/${client.id}`)"
                >
                  <td class="px-4 xs:px-6 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-habit-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-habit-cyan text-xs font-medium">{{ client.first_name?.charAt(0) }}{{ client.last_name?.charAt(0) }}</span>
                      </div>
                      <div class="min-w-0">
                        <span class="text-sm font-medium text-habit-text truncate block">{{ client.first_name }} {{ client.last_name }}</span>
                        <!-- Mobile: inline stats sotto il nome -->
                        <div class="flex items-center gap-2 mt-0.5 sm:hidden">
                          <span class="text-[11px] text-habit-text-subtle">{{ client.recent_completed || 0 }} sess.</span>
                          <span class="text-[11px] text-habit-text-subtle">{{ client.checkin_count || 0 }} gg</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-3 text-center">
                    <template v-if="client.current_weight && client.prev_weight">
                      <span
                        class="text-sm font-medium"
                        :class="client.current_weight < client.prev_weight ? 'text-habit-success' : client.current_weight > client.prev_weight ? 'text-red-400' : 'text-habit-text-muted'"
                      >
                        {{ client.current_weight < client.prev_weight ? '-' : client.current_weight > client.prev_weight ? '+' : '' }}{{ Math.abs(client.current_weight - client.prev_weight).toFixed(1) }} kg
                      </span>
                    </template>
                    <span v-else class="text-xs text-habit-text-subtle">—</span>
                  </td>
                  <td class="hidden sm:table-cell px-3 py-3 text-center">
                    <span class="text-sm font-medium text-habit-text">{{ client.recent_completed || 0 }}</span>
                  </td>
                  <td class="hidden sm:table-cell px-3 py-3 text-center">
                    <span class="text-sm font-medium text-habit-text">{{ client.checkin_count || 0 }}
                      <span class="text-xs text-habit-text-subtle">gg</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Action Items (scadenze abbonamenti, check periodici, nuovi senza primo check) -->
        <ActionItemsCard
          :items="actionItems"
          :counts="actionCounts"
          :loading="actionItemsLoading"
          v-model:action-type-filter="actionTypeFilter"
          v-model:threshold-days="thresholdDays"
        />
      </div>

      <!-- Main Content: Recent Clients + Activity Timeline -->
      <div class="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <!-- Recent Clients (glass-mesh 2026) -->
        <div
          class="lg:col-span-2 bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden"
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

    </div>
  </PullToRefresh>
</template>
