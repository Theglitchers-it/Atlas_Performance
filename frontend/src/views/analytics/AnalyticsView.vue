<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAnalyticsStore } from "@/store/analytics";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import ChartWidget from "@/components/ui/ChartWidget.vue";
import _TrendBadge from "@/components/ui/TrendBadge.vue";
import SparkLine from "@/components/ui/SparkLine.vue";
import { useNative } from "@/composables/useNative";

const store = useAnalyticsStore();
const toast = useToast();
const { isMobile } = useNative();
const exporting = ref("");

const downloadExport = async (type: any, format: any) => {
  exporting.value = `${type}-${format}`;
  try {
    const url =
      format === "pdf"
        ? `/analytics/report/${type}`
        : format === "excel"
          ? `/analytics/export/${type}/excel`
          : `/analytics/export/${type}`;
    const response = await api.get(url, { responseType: "blob" });
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const ext = format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv";
    link.download = `${type}_export.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Download completato");
  } catch (error: any) {
    toast.error("Errore nel download");
  } finally {
    exporting.value = "";
  }
};

// Computed - store data
const overview = computed(() => store.overview as any);
const quickStats = computed(() => store.quickStats);
const sessionTrend = computed(() => store.sessionTrend);
const topClients = computed(() => store.topClients);
const appointmentDist = computed(() => store.appointmentDistribution);
const readinessTrend = computed(() => store.readinessTrend);
const programCompletion = computed(() => store.programCompletion);
const loading = computed(() => store.loading);
const error = computed(() => store.error);
const trendGroupBy = computed(() => store.trendGroupBy);

// Helpers
const n = (val: any) => Number(val) || 0;

const completionRate = computed(() => {
  if (!overview.value?.sessions) return 0;
  const s = overview.value.sessions;
  if (n(s.total_sessions) === 0) return 0;
  return Math.round((n(s.completed_sessions) / n(s.total_sessions)) * 100);
});

const typeLabel = (type: any) => {
  const labels: Record<string, string> = {
    training: "Allenamento",
    assessment: "Valutazione",
    consultation: "Consulenza",
    other: "Altro",
  };
  return labels[type] || type || "-";
};

const statusLabel = (status: any) => {
  const labels: Record<string, string> = {
    draft: "Bozza",
    active: "Attivo",
    completed: "Completato",
    cancelled: "Annullato",
  };
  return labels[status] || status || "-";
};

const statusColor = (status: any) => {
  const colors: Record<string, string> = {
    draft: "bg-yellow-400",
    active: "bg-emerald-400",
    completed: "bg-blue-400",
    cancelled: "bg-red-400",
  };
  return colors[status] || "bg-gray-400";
};
void statusColor;

const totalPrograms = computed(() => {
  return programCompletion.value.reduce(
    (sum: any, d: any) => sum + n(d.count),
    0,
  );
});

const formatPeriod = (period: any) => {
  if (!period) return "";
  if (period.includes("-W")) {
    const parts = period.split("-W");
    return `S${parts[1]}`;
  }
  if (period.length === 7) {
    const [_y, m] = period.split("-");
    const months = [
      "Gen",
      "Feb",
      "Mar",
      "Apr",
      "Mag",
      "Giu",
      "Lug",
      "Ago",
      "Set",
      "Ott",
      "Nov",
      "Dic",
    ];
    return months[parseInt(m) - 1] || period;
  }
  if (period.length === 10) {
    const date = new Date(period);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
    });
  }
  return period;
};

// ── Chart.js Data: Session Trend (Bar) ──
const sessionBarData = computed(() => {
  const trend = sessionTrend.value || [];
  if (!trend.length) return { labels: [], datasets: [] };
  return {
    labels: trend.map((t: any) => formatPeriod(t.period)),
    datasets: [
      {
        label: "Completate",
        data: trend.map((t: any) => n(t.completed)),
        backgroundColor: "#22c55e",
        borderRadius: 6,
      },
      {
        label: "Totali",
        data: trend.map((t: any) => n(t.total)),
        backgroundColor: "rgba(2, 131, 167, 0.45)",
        borderRadius: 6,
      },
    ],
  };
});

// ── Chart.js Data: Appointment Distribution (Doughnut) ──
const appointmentDoughnutData = computed(() => {
  const dist = appointmentDist.value || [];
  if (!dist.length) {
    return {
      labels: ["Nessun dato"],
      datasets: [{ data: [1], backgroundColor: ["#374151"], borderWidth: 0 }],
    };
  }
  return {
    labels: dist.map((d: any) => typeLabel(d.appointment_type)),
    datasets: [
      {
        data: dist.map((d: any) => n(d.count)),
        backgroundColor: [
          "#0283a7",
          "#8b5cf6",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
        ],
        borderWidth: 0,
        spacing: 4,
      },
    ],
  };
});

// ── Chart.js Data: Readiness Trend (Line) ──
const readinessLineData = computed(() => {
  const data = readinessTrend.value || [];
  if (!data.length) return { labels: [], datasets: [] };
  return {
    labels: data.map((d: any) => {
      if (!d.date) return "";
      const date = new Date(d.date);
      return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
      });
    }),
    datasets: [
      {
        label: "Readiness Score",
        data: data.map((d: any) => n(d.avg_score) || n(d.score) || 0),
        borderColor: "#ff4c00",
        backgroundColor: "rgba(255, 76, 0, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#ff4c00",
      },
    ],
  };
});

const readinessChartOptions = computed(() => ({
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 25,
        callback: (v: any) => `${v}%`,
      },
    },
  },
}));

// ── Chart.js Data: Program Completion (Doughnut) ──
const programDoughnutData = computed(() => {
  const data = programCompletion.value || [];
  if (!data.length) {
    return {
      labels: ["Nessun dato"],
      datasets: [{ data: [1], backgroundColor: ["#374151"], borderWidth: 0 }],
    };
  }
  const statusColors: Record<string, string> = {
    draft: "#eab308",
    active: "#22c55e",
    completed: "#3b82f6",
    cancelled: "#ef4444",
  };
  return {
    labels: data.map((d: any) => statusLabel(d.status)),
    datasets: [
      {
        data: data.map((d: any) => n(d.count)),
        backgroundColor: data.map(
          (d: any) => statusColors[d.status] || "#6b7280",
        ),
        borderWidth: 0,
        spacing: 4,
      },
    ],
  };
});

// ── SparkLine data for top clients ──
const clientSparkData = (client: any) => {
  // If the client object has a trend array, use it; otherwise generate a small synthetic
  // sparkline from their stats so the column is never empty
  if (client.trend && Array.isArray(client.trend) && client.trend.length > 1) {
    return client.trend;
  }
  // Fallback: create a small 5-point array derived from available numbers
  const sessions = n(client.completed_sessions);
  const minutes = n(client.total_minutes);
  void minutes;
  const base = Math.max(sessions, 1);
  return [
    Math.round(base * 0.4),
    Math.round(base * 0.6),
    Math.round(base * 0.55),
    Math.round(base * 0.8),
    sessions,
  ];
};

onMounted(() => {
  store.initialize();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Analytics</h1>
        <p class="text-habit-text-subtle text-sm mt-1">
          Panoramica statistiche e performance
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="relative group">
          <button
            class="px-3 py-2 text-sm bg-habit-card border border-habit-border rounded-habit text-habit-text-muted hover:text-habit-text hover:bg-habit-card-hover transition-all flex items-center gap-1.5"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export
          </button>
          <div
            class="absolute right-0 top-full mt-1 w-56 bg-habit-card border border-habit-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 py-1"
          >
            <p
              class="px-3 py-1.5 text-xs text-habit-text-subtle uppercase tracking-wide"
            >
              CSV
            </p>
            <button
              @click="downloadExport('clients', 'csv')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "clients-csv" ? "Scaricando..." : "Clienti (CSV)"
              }}
            </button>
            <button
              @click="downloadExport('payments', 'csv')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "payments-csv"
                  ? "Scaricando..."
                  : "Pagamenti (CSV)"
              }}
            </button>
            <button
              @click="downloadExport('sessions', 'csv')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "sessions-csv"
                  ? "Scaricando..."
                  : "Sessioni (CSV)"
              }}
            </button>
            <div class="border-t border-habit-border my-1"></div>
            <p
              class="px-3 py-1.5 text-xs text-habit-text-subtle uppercase tracking-wide"
            >
              Excel
            </p>
            <button
              @click="downloadExport('clients', 'excel')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "clients-excel"
                  ? "Scaricando..."
                  : "Clienti (Excel)"
              }}
            </button>
            <button
              @click="downloadExport('payments', 'excel')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "payments-excel"
                  ? "Scaricando..."
                  : "Pagamenti (Excel)"
              }}
            </button>
            <button
              @click="downloadExport('analytics', 'excel')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "analytics-excel"
                  ? "Scaricando..."
                  : "Analytics (Excel)"
              }}
            </button>
            <div class="border-t border-habit-border my-1"></div>
            <p
              class="px-3 py-1.5 text-xs text-habit-text-subtle uppercase tracking-wide"
            >
              PDF
            </p>
            <button
              @click="downloadExport('payments', 'pdf')"
              :disabled="!!exporting"
              class="w-full text-left px-3 py-1.5 text-sm text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-colors"
            >
              {{
                exporting === "payments-pdf"
                  ? "Scaricando..."
                  : "Report Pagamenti (PDF)"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-500/10 border border-red-500/30 rounded-habit p-3 mb-6"
    >
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-habit-card border border-habit-border rounded-habit p-5 animate-pulse"
        >
          <div class="h-3 bg-habit-skeleton rounded w-1/2 mb-3"></div>
          <div class="h-7 bg-habit-skeleton rounded w-1/3"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          class="bg-habit-card border border-habit-border rounded-habit p-6 animate-pulse h-80"
        ></div>
        <div
          class="bg-habit-card border border-habit-border rounded-habit p-6 animate-pulse h-80"
        ></div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- ═══════════ STATS ROW ═══════════ -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-habit-card border border-habit-border rounded-habit p-5">
          <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
            Clienti Attivi
          </p>
          <p class="text-2xl font-bold text-habit-text mt-1">
            {{ n(overview?.clients?.active_clients) }}
          </p>
          <p class="text-habit-text-subtle text-xs mt-1">
            {{ n(overview?.clients?.new_clients_30d) }} nuovi (30gg)
          </p>
        </div>
        <div class="bg-habit-card border border-habit-border rounded-habit p-5">
          <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
            Sessioni Completate
          </p>
          <p class="text-2xl font-bold text-habit-text mt-1">
            {{ n(overview?.sessions?.completed_sessions) }}
          </p>
          <p class="text-habit-text-subtle text-xs mt-1">
            {{ n(overview?.sessions?.sessions_this_week) }} questa settimana
          </p>
        </div>
        <div class="bg-habit-card border border-habit-border rounded-habit p-5">
          <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
            Tasso Completamento
          </p>
          <p
            class="text-2xl font-bold mt-1"
            :class="
              completionRate >= 70
                ? 'text-emerald-400'
                : completionRate >= 40
                  ? 'text-yellow-400'
                  : 'text-red-400'
            "
          >
            {{ completionRate }}%
          </p>
          <p class="text-habit-text-subtle text-xs mt-1">
            {{ n(overview?.sessions?.total_sessions) }} sessioni totali
          </p>
        </div>
        <div class="bg-habit-card border border-habit-border rounded-habit p-5">
          <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
            Programmi Attivi
          </p>
          <p class="text-2xl font-bold text-habit-text mt-1">
            {{ n(overview?.programs?.active_programs) }}
          </p>
          <p class="text-habit-text-subtle text-xs mt-1">
            {{ n(overview?.programs?.completed_programs) }} completati
          </p>
        </div>
      </div>

      <!-- ═══════════ CHARTS 2-COL GRID ═══════════ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Session Trend Bar Chart (2/3 width) -->
        <div class="lg:col-span-2">
          <ChartWidget
            type="bar"
            title="Trend Sessioni"
            :chart-data="sessionBarData"
            :chart-options="{ plugins: { legend: { display: true } } }"
            :loading="loading"
            :height="isMobile ? '200px' : '320px'"
          >
            <template #actions>
              <div class="flex gap-1">
                <button
                  v-for="p in ['day', 'week', 'month']"
                  :key="p"
                  @click="store.setTrendGroupBy(p as any)"
                  :class="
                    trendGroupBy === p
                      ? 'bg-habit-orange text-white'
                      : 'bg-habit-bg text-habit-text-muted'
                  "
                  class="px-3 py-1 rounded-full text-xs font-medium transition-all"
                >
                  {{
                    p === "day" ? "Giorno" : p === "week" ? "Settimana" : "Mese"
                  }}
                </button>
              </div>
            </template>
          </ChartWidget>
        </div>

        <!-- Appointment Distribution Doughnut (1/3 width) -->
        <div>
          <ChartWidget
            type="doughnut"
            title="Distribuzione Appuntamenti"
            :chart-data="appointmentDoughnutData"
            :chart-options="{
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 12,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                  },
                },
              },
            }"
            :loading="loading"
            :height="isMobile ? '200px' : '320px'"
          />
        </div>
      </div>

      <!-- ═══════════ READINESS LINE CHART (FULL WIDTH) ═══════════ -->
      <ChartWidget
        type="line"
        title="Trend Readiness (30 giorni)"
        :chart-data="readinessLineData"
        :chart-options="readinessChartOptions"
        :loading="loading"
        :height="isMobile ? '200px' : '300px'"
      />

      <!-- ═══════════ BOTTOM SECTION: TOP CLIENTS + PROGRAMS ═══════════ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Top Clients Table with SparkLines (2/3) -->
        <div
          class="lg:col-span-2 bg-habit-card border border-habit-border rounded-habit p-6"
        >
          <h2 class="text-habit-text font-semibold text-sm mb-4">
            Clienti Piu Attivi (30gg)
          </h2>
          <div v-if="topClients.length === 0" class="text-center py-8">
            <p class="text-habit-text-subtle text-sm">
              Nessun dato disponibile
            </p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(client, idx) in topClients"
              :key="client.id"
              class="flex items-center gap-3 bg-habit-bg-light/50 rounded-lg p-3"
            >
              <span
                class="text-habit-text-subtle text-xs font-bold w-5 text-center"
                >{{ idx + 1 }}</span
              >
              <div
                class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              >
                {{ (client.first_name?.[0] || "").toUpperCase()
                }}{{ (client.last_name?.[0] || "").toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-habit-text text-sm font-medium truncate">
                  {{ client.first_name }} {{ client.last_name }}
                </p>
                <p class="text-habit-text-subtle text-xs">
                  Lv.{{ client.level || 1 }} &middot;
                  {{ n(client.xp_points) }} XP
                </p>
              </div>
              <!-- SparkLine showing client activity trend -->
              <div class="flex-shrink-0 hidden md:block">
                <SparkLine
                  :data="clientSparkData(client)"
                  :width="80"
                  :height="28"
                  :color="'#0283a7'"
                  :stroke-width="1.5"
                />
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-habit-cyan text-sm font-bold">
                  {{ n(client.completed_sessions) }}
                </p>
                <p class="text-habit-text-subtle text-[10px]">sessioni</p>
              </div>
              <div class="text-right flex-shrink-0 hidden sm:block">
                <p class="text-habit-text text-sm">
                  {{ n(client.total_minutes) }}
                </p>
                <p class="text-habit-text-subtle text-[10px]">minuti</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Program Completion Doughnut (1/3) -->
        <div>
          <ChartWidget
            type="doughnut"
            title="Stato Programmi"
            :chart-data="programDoughnutData"
            :chart-options="{
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 12,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                  },
                },
              },
            }"
            :loading="loading"
            :height="isMobile ? '200px' : '320px'"
          />
          <!-- Summary below chart -->
          <div
            v-if="programCompletion.length > 0"
            class="bg-habit-card border border-habit-border border-t-0 rounded-b-habit px-6 pb-4 -mt-px"
          >
            <p
              class="text-habit-text-subtle text-xs pt-3 border-t border-habit-border"
            >
              Totale programmi:
              <span class="text-habit-text font-semibold">{{
                totalPrograms
              }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- ═══════════ TODAY SUMMARY ═══════════ -->
      <div
        v-if="quickStats"
        class="bg-habit-card border border-habit-border rounded-habit p-6"
      >
        <h2 class="text-habit-text font-semibold text-sm mb-4">Oggi</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="text-center">
            <p class="text-habit-text-subtle text-xs">Sessioni</p>
            <p class="text-habit-text text-xl font-bold mt-1">
              {{ n(quickStats.sessions_today) }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-habit-text-subtle text-xs">Appuntamenti</p>
            <p class="text-habit-text text-xl font-bold mt-1">
              {{ n(quickStats.appointments_today) }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-habit-text-subtle text-xs">Clienti Attivi</p>
            <p class="text-habit-text text-xl font-bold mt-1">
              {{ n(quickStats.active_clients) }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-habit-text-subtle text-xs">Readiness Media</p>
            <p
              class="text-xl font-bold mt-1"
              :class="
                n(quickStats.avg_readiness_today) >= 75
                  ? 'text-emerald-400'
                  : n(quickStats.avg_readiness_today) >= 50
                    ? 'text-yellow-400'
                    : 'text-habit-text-subtle'
              "
            >
              {{
                quickStats.avg_readiness_today
                  ? Math.round(n(quickStats.avg_readiness_today))
                  : "-"
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
