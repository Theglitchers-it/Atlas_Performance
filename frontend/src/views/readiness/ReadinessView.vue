<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useReadinessStore } from "@/store/readiness";
import ChartWidget from "@/components/ui/ChartWidget.vue";
import HeatmapGrid from "@/components/ui/HeatmapGrid.vue";
import api from "@/services/api";
import { useNative } from "@/composables/useNative";

const store = useReadinessStore();
const { isMobile } = useNative();

// Cast store data to any to avoid narrow type errors
const checkin = computed(() => store.todayCheckin as any);
const avgs = computed(() => store.averages as any);

// Local state
const saving = ref(false);
const editing = ref(false);

// AI Recovery Recommendations
const aiRecommendation = ref("");
const aiLoading = ref(false);
const aiError = ref(false);

const fetchAiRecommendation = async () => {
  if (!checkin.value?.readiness_score) return;
  aiLoading.value = true;
  aiError.value = false;
  try {
    const res = await api.post("/ai/suggest-workout", {
      readinessScore: parseFloat(checkin.value.readiness_score),
      sleepQuality: checkin.value.sleep_quality,
      sleepHours: parseFloat(checkin.value.sleep_hours),
      energyLevel: checkin.value.energy_level,
      stressLevel: checkin.value.stress_level,
      muscleSoreness: checkin.value.soreness_level,
      mood: checkin.value.mood,
    });
    aiRecommendation.value = res.data.data?.suggestion || "";
  } catch (e: any) {
    aiError.value = true;
    aiRecommendation.value = "";
  } finally {
    aiLoading.value = false;
  }
};

// Recovery tips based on readiness score (fallback when AI not configured)
const getRecoveryTips = (score: any) => {
  const s = parseFloat(score);
  if (s < 40)
    return [
      {
        icon: "rest",
        tip: "Riposo attivo o giorno di rest completo consigliato",
        color: "bg-red-500/10 border-red-500/20",
      },
      {
        icon: "sleep",
        tip: "Priorita assoluta: dormire almeno 8 ore stanotte",
        color: "bg-red-500/10 border-red-500/20",
      },
      {
        icon: "hydration",
        tip: "Aumentare idratazione (almeno 2.5L acqua)",
        color: "bg-red-500/10 border-red-500/20",
      },
      {
        icon: "stretch",
        tip: "Stretching leggero o yoga di 15-20 minuti",
        color: "bg-red-500/10 border-red-500/20",
      },
    ];
  if (s < 60)
    return [
      {
        icon: "light",
        tip: "Allenamento leggero al 60-70% dell'intensita",
        color: "bg-orange-500/10 border-orange-500/20",
      },
      {
        icon: "mobility",
        tip: "Dedicare 15 min alla mobilita articolare",
        color: "bg-orange-500/10 border-orange-500/20",
      },
      {
        icon: "nutrition",
        tip: "Pasto ricco di proteine e carboidrati complessi",
        color: "bg-orange-500/10 border-orange-500/20",
      },
      {
        icon: "sleep",
        tip: "Cercare di dormire 7-8 ore stanotte",
        color: "bg-orange-500/10 border-orange-500/20",
      },
    ];
  if (s < 75)
    return [
      {
        icon: "training",
        tip: "Sessione moderata possibile, evitare massimali",
        color: "bg-yellow-500/10 border-yellow-500/20",
      },
      {
        icon: "warmup",
        tip: "Riscaldamento prolungato di 10-15 minuti",
        color: "bg-yellow-500/10 border-yellow-500/20",
      },
      {
        icon: "recovery",
        tip: "Post-allenamento: foam rolling + stretching",
        color: "bg-yellow-500/10 border-yellow-500/20",
      },
    ];
  return [
    {
      icon: "strong",
      tip: "Condizione ottimale: sessione intensa possibile",
      color: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: "progressive",
      tip: "Buon giorno per progressione di carico o PR",
      color: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: "compound",
      tip: "Priorizzare esercizi multiarticolari composti",
      color: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];
};

const recoveryTips = computed(() => {
  if (!checkin.value?.readiness_score) return [];
  return getRecoveryTips(checkin.value.readiness_score);
});

const tipIcon = (type: any) => {
  const icons: Record<string, string> = {
    rest: "\u{1F6CF}\u{FE0F}",
    sleep: "\u{1F4A4}",
    hydration: "\u{1F4A7}",
    stretch: "\u{1F9D8}",
    light: "\u{1F3CB}\u{FE0F}",
    mobility: "\u{1F4AA}",
    nutrition: "\u{1F957}",
    training: "\u{1F3AF}",
    warmup: "\u{1F525}",
    recovery: "\u{2744}\u{FE0F}",
    strong: "\u{26A1}",
    progressive: "\u{1F4C8}",
    compound: "\u{1F3CB}\u{FE0F}",
  };
  return icons[type] || "\u{2728}";
};

// Tab definitions
const tabs = [
  { id: "today", label: "Check-in Oggi", icon: "today" },
  { id: "history", label: "Storico", icon: "history" },
];

// Date filters for history
const filterStartDate = ref("");
const filterEndDate = ref("");

// Check-in form (scala 1-5 allineata al backend validator)
const checkinForm = ref({
  sleepQuality: 3,
  sleepHours: 7.0,
  energyLevel: 3,
  stressLevel: 3,
  muscleSoreness: 3,
  motivation: 3,
  mood: 3 as number,
  notes: "",
});

// Mood options (integer 1-5 matching backend validator)
const moodOptions = [
  { value: 1, label: "Terribile", emoji: "\u{1F62B}" },
  { value: 2, label: "Male", emoji: "\u{1F61E}" },
  { value: 3, label: "Neutrale", emoji: "\u{1F610}" },
  { value: 4, label: "Bene", emoji: "\u{1F60A}" },
  { value: 5, label: "Ottimo", emoji: "\u{1F929}" },
];

// Slider emoji maps (5 values for scale 1-5)
const sliderEmojis: Record<string, string[]> = {
  sleepQuality: ["😫", "😔", "😐", "😊", "💤"],
  energyLevel: ["🪫", "😪", "😐", "💪", "🚀"],
  stressLevel: ["😌", "🙂", "😐", "😰", "🆘"],
  muscleSoreness: ["✨", "🙂", "😐", "😖", "🏥"],
  motivation: ["😴", "😒", "😐", "💪", "🏆"],
};

const getSliderEmoji = (field: any, value: any) => {
  const arr = sliderEmojis[field];
  if (!arr) return "";
  return arr[Math.min(Math.max(Math.round(value) - 1, 0), arr.length - 1)];
};

// Computed
const activeTab = computed({
  get: () => store.activeTab,
  set: (val: any) => {
    store.activeTab = val;
  },
});

const hasCheckinToday = computed(() => !!checkin.value);

// Readiness score SVG ring
const scoreRingDash = computed(() => {
  if (!checkin.value?.readiness_score) return 0;
  const score = parseFloat(checkin.value.readiness_score);
  const circumference = 2 * Math.PI * 54; // r=54
  return (score / 100) * circumference;
});

const scoreRingCircumference = computed(() => 2 * Math.PI * 54);

// Helpers
const formatDate = (dateStr: any) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatNum = (val: any, decimals = 1) => {
  if (val === null || val === undefined) return "-";
  return parseFloat(val).toFixed(decimals);
};

const scoreColor = (score: any) => {
  if (score === null || score === undefined) return "text-habit-text-subtle";
  const s = parseFloat(score);
  if (s < 40) return "text-red-400";
  if (s < 60) return "text-orange-400";
  if (s < 75) return "text-yellow-400";
  return "text-emerald-400";
};

const scoreGradient = (score: any) => {
  if (score === null || score === undefined) return "from-gray-500 to-gray-600";
  const s = parseFloat(score);
  if (s < 40) return "from-red-500 to-red-600";
  if (s < 60) return "from-orange-500 to-orange-600";
  if (s < 75) return "from-yellow-500 to-yellow-600";
  return "from-emerald-500 to-emerald-600";
};

const scoreStroke = (score: any) => {
  if (score === null || score === undefined) return "#6b7280";
  const s = parseFloat(score);
  if (s < 40) return "#ef4444";
  if (s < 60) return "#f97316";
  if (s < 75) return "#eab308";
  return "#10b981";
};

const scoreLabel = (score: any) => {
  if (score === null || score === undefined) return "-";
  const s = parseFloat(score);
  if (s < 40) return "Critico";
  if (s < 60) return "Basso";
  if (s < 75) return "Moderato";
  return "Ottimo";
};

const scoreBgClass = (score: any) => {
  if (score === null || score === undefined) return "bg-gray-500/10";
  const s = parseFloat(score);
  if (s < 40) return "bg-red-500/10";
  if (s < 60) return "bg-orange-500/10";
  if (s < 75) return "bg-yellow-500/10";
  return "bg-emerald-500/10";
};

const moodStringToInt: Record<string, number> = {
  terrible: 1, bad: 2, neutral: 3, good: 4, great: 5,
};

const moodEmoji = (mood: any) => {
  const val = typeof mood === "number" ? mood : (moodStringToInt[mood] || 3);
  const found = moodOptions.find((m) => m.value === val);
  return found ? found.emoji : "";
};

// Progress bar percent (scale 1-5, sleep hours use custom max)
const barPercent = (val: any, max = 5) => {
  if (!val) return 0;
  return Math.min((parseFloat(val) / max) * 100, 100);
};

const barColor = (val: any, invert = false) => {
  const v = parseFloat(val);
  if (invert) {
    if (v <= 2) return "bg-emerald-400";
    if (v <= 3) return "bg-yellow-400";
    return "bg-red-400";
  }
  if (v >= 4) return "bg-emerald-400";
  if (v >= 3) return "bg-yellow-400";
  return "bg-red-400";
};

// Form management
const resetForm = () => {
  if (checkin.value && editing.value) {
    const c = checkin.value;
    checkinForm.value = {
      sleepQuality: c.sleep_quality || 3,
      sleepHours: parseFloat(c.sleep_hours) || 7.0,
      energyLevel: c.energy_level || 3,
      stressLevel: c.stress_level || 3,
      muscleSoreness: c.soreness_level || 3,
      motivation: c.motivation_level || 3,
      mood: typeof c.mood === 'number' ? c.mood : (moodStringToInt[c.mood] || 3),
      notes: c.notes || "",
    };
  } else {
    checkinForm.value = {
      sleepQuality: 3,
      sleepHours: 7.0,
      energyLevel: 3,
      stressLevel: 3,
      muscleSoreness: 3,
      motivation: 3,
      mood: 3,
      notes: "",
    };
  }
};

const startEdit = () => {
  editing.value = true;
  resetForm();
};

const cancelEdit = () => {
  editing.value = false;
};

const handleSubmit = async () => {
  saving.value = true;
  const result = await store.saveCheckin(checkinForm.value as any);
  if (result?.success) editing.value = false;
  saving.value = false;
};

const applyFilter = async () => {
  await store.fetchHistory({
    startDate: filterStartDate.value || undefined,
    endDate: filterEndDate.value || undefined,
  });
};

// ===== Chart.js: Readiness trend line chart =====
const historyLoading = computed(
  () => store.loading && activeTab.value === "history",
);

const readinessChartData = computed(() => {
  const data = store.history || [];
  if (!data.length) return { labels: [], datasets: [] };

  // Reverse so oldest is on the left
  const sorted = [...data].reverse();

  return {
    labels: sorted.map((d: any) =>
      new Date(d.checkin_date || d.date).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
      }),
    ),
    datasets: [
      {
        label: "Readiness Score",
        data: sorted.map((d: any) => d.readiness_score || 0),
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
  scales: {
    y: {
      min: 0,
      max: 100,
    },
  },
}));

// ===== HeatmapGrid: Readiness heatmap =====
const heatmapData = computed(() => {
  return (store.history || []).map((d: any) => ({
    date: d.checkin_date || d.date,
    value: d.readiness_score || 0,
  }));
});

const heatmapColorScale = [
  "#1e1e1e20",
  "#ef444440",
  "#f9731670",
  "#eab308a0",
  "#10b981",
];

// Tab change -> load history
watch(activeTab, async (tab: any) => {
  if (!store.selectedClientId) return;
  if (tab === "history") await store.fetchHistory();
});

// Lifecycle
onMounted(() => {
  store.initialize();
});
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1
            class="text-xl sm:text-2xl font-bold text-habit-text flex items-center gap-3"
          >
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            Readiness Check-in
          </h1>
          <p class="text-habit-text-subtle text-sm mt-1 ml-[52px]">
            Monitora la prontezza giornaliera dei tuoi clienti
          </p>
        </div>
      </div>

      <!-- Client Selector -->
      <div
        class="bg-habit-card border border-habit-border rounded-2xl p-4 mb-6"
      >
        <label
          class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-2 font-medium"
          >Seleziona Cliente</label
        >
        <select
          :value="store.selectedClientId"
          @change="store.setClient(($event.target as any).value)"
          class="w-full sm:w-80 bg-habit-bg-light border border-habit-border rounded-xl px-4 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-2 focus:ring-habit-cyan/20 outline-none transition-all"
        >
          <option :value="null" disabled>Scegli un cliente...</option>
          <option
            v-for="client in store.clients"
            :key="client.id"
            :value="client.id"
          >
            {{ client.first_name }} {{ client.last_name }}
          </option>
        </select>
      </div>

      <!-- No client selected -->
      <div
        v-if="!store.selectedClientId"
        class="bg-habit-card border border-habit-border rounded-2xl p-8 sm:p-16 text-center"
      >
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-habit-cyan/10 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-habit-cyan"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <p class="text-habit-text-subtle mb-1 text-sm">
          Seleziona un cliente per gestire i check-in readiness
        </p>
      </div>

      <!-- Content (client selected) -->
      <div v-else>
        <!-- Loading -->
        <div
          v-if="store.loading && !checkin && !store.history.length"
          class="animate-pulse space-y-4"
        >
          <div class="h-12 bg-habit-skeleton rounded-2xl w-full"></div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              class="h-28 bg-habit-skeleton rounded-2xl"
              v-for="i in 4"
              :key="i"
            ></div>
          </div>
        </div>

        <template v-else>
          <!-- Tabs -->
          <div
            class="flex gap-1 bg-habit-card border border-habit-border rounded-2xl p-1.5 mb-6"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-habit-cyan to-blue-600 text-white shadow-lg shadow-habit-cyan/20'
                  : 'text-habit-text-subtle hover:text-habit-text hover:bg-habit-bg-light/50',
              ]"
            >
              <svg
                v-if="tab.icon === 'today'"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg
                v-else
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ tab.label }}
            </button>
          </div>

          <!-- Error banner -->
          <div
            v-if="store.error"
            class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4 flex items-center gap-3"
          >
            <svg
              class="w-5 h-5 text-red-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p class="text-red-400 text-sm">{{ store.error }}</p>
          </div>

          <!-- ==================== TAB: CHECK-IN OGGI ==================== -->
          <div v-if="activeTab === 'today'" class="space-y-6">
            <!-- Average Stats Cards (7 giorni) -->
            <div v-if="avgs" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Readiness -->
              <div
                class="bg-habit-card border border-habit-border rounded-2xl p-5 relative overflow-hidden group hover:border-habit-cyan/30 transition-all"
              >
                <div
                  class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl opacity-10 rounded-bl-[40px]"
                  :class="scoreGradient(avgs.avg_readiness)"
                ></div>
                <div class="flex items-center gap-2 mb-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-habit-cyan/10 flex items-center justify-center"
                  >
                    <svg
                      class="w-4 h-4 text-habit-cyan"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p
                    class="text-habit-text-subtle text-xs uppercase tracking-wide font-medium"
                  >
                    Readiness
                  </p>
                </div>
                <p
                  :class="[
                    'text-3xl font-bold',
                    scoreColor(avgs.avg_readiness),
                  ]"
                >
                  {{ formatNum(avgs.avg_readiness, 0)
                  }}<span class="text-sm font-normal text-habit-text-subtle"
                    >/100</span
                  >
                </p>
                <p class="text-habit-text-subtle text-xs mt-1">
                  Media 7 giorni
                </p>
              </div>

              <!-- Sonno -->
              <div
                class="bg-habit-card border border-habit-border rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all"
              >
                <div
                  class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500 to-blue-600 opacity-10 rounded-bl-[40px]"
                ></div>
                <div class="flex items-center gap-2 mb-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"
                  >
                    <span class="text-sm">💤</span>
                  </div>
                  <p
                    class="text-habit-text-subtle text-xs uppercase tracking-wide font-medium"
                  >
                    Sonno
                  </p>
                </div>
                <p class="text-3xl font-bold text-blue-400">
                  {{ formatNum(avgs.avg_sleep)
                  }}<span class="text-sm font-normal text-habit-text-subtle"
                    >/5</span
                  >
                </p>
                <div
                  class="mt-2 h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-blue-400 rounded-full transition-all duration-500"
                    :style="{ width: barPercent(avgs.avg_sleep) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Energia -->
              <div
                class="bg-habit-card border border-habit-border rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all"
              >
                <div
                  class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500 to-emerald-600 opacity-10 rounded-bl-[40px]"
                ></div>
                <div class="flex items-center gap-2 mb-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"
                  >
                    <span class="text-sm">⚡</span>
                  </div>
                  <p
                    class="text-habit-text-subtle text-xs uppercase tracking-wide font-medium"
                  >
                    Energia
                  </p>
                </div>
                <p class="text-3xl font-bold text-emerald-400">
                  {{ formatNum(avgs.avg_energy)
                  }}<span class="text-sm font-normal text-habit-text-subtle"
                    >/5</span
                  >
                </p>
                <div
                  class="mt-2 h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    :style="{ width: barPercent(avgs.avg_energy) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Stress -->
              <div
                class="bg-habit-card border border-habit-border rounded-2xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-all"
              >
                <div
                  class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-500 to-orange-600 opacity-10 rounded-bl-[40px]"
                ></div>
                <div class="flex items-center gap-2 mb-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center"
                  >
                    <span class="text-sm">😤</span>
                  </div>
                  <p
                    class="text-habit-text-subtle text-xs uppercase tracking-wide font-medium"
                  >
                    Stress
                  </p>
                </div>
                <p class="text-3xl font-bold text-orange-400">
                  {{ formatNum(avgs.avg_stress)
                  }}<span class="text-sm font-normal text-habit-text-subtle"
                    >/5</span
                  >
                </p>
                <div
                  class="mt-2 h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-orange-400 rounded-full transition-all duration-500"
                    :style="{ width: barPercent(avgs.avg_stress) + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Existing Check-in Display -->
            <div
              v-if="hasCheckinToday && !editing"
              class="bg-habit-card border border-habit-border rounded-2xl p-6"
            >
              <div class="flex items-center justify-between mb-6">
                <h3
                  class="text-habit-text font-semibold flex items-center gap-2"
                >
                  <svg
                    class="w-5 h-5 text-habit-cyan"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Check-in di Oggi
                </h3>
                <button
                  @click="startEdit"
                  class="text-xs px-3 py-1.5 bg-habit-cyan/10 text-habit-cyan rounded-lg hover:bg-habit-cyan/20 transition-colors font-medium"
                >
                  Modifica
                </button>
              </div>

              <!-- Readiness Score — SVG Ring -->
              <div class="flex flex-col items-center mb-8">
                <div class="relative w-36 h-36">
                  <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <!-- Background circle -->
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="8"
                      class="text-habit-skeleton"
                    />
                    <!-- Progress circle -->
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      :stroke="scoreStroke(checkin.readiness_score)"
                      stroke-width="8"
                      stroke-linecap="round"
                      :stroke-dasharray="scoreRingCircumference"
                      :stroke-dashoffset="
                        scoreRingCircumference - scoreRingDash
                      "
                      class="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <span
                      :class="[
                        'text-4xl font-bold',
                        scoreColor(checkin.readiness_score),
                      ]"
                    >
                      {{ formatNum(checkin.readiness_score, 0) }}
                    </span>
                    <span class="text-habit-text-subtle text-xs -mt-1"
                      >/100</span
                    >
                  </div>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                      scoreBgClass(checkin.readiness_score),
                      scoreColor(checkin.readiness_score),
                    ]"
                  >
                    {{ scoreLabel(checkin.readiness_score) }}
                  </span>
                </div>
              </div>

              <!-- Metrics Grid con progress bars -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div
                  class="bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-base">💤</span>
                    <p class="text-habit-text-subtle text-xs font-medium">
                      Qualita Sonno
                    </p>
                  </div>
                  <p class="text-habit-text font-bold text-lg mb-1.5">
                    {{ checkin.sleep_quality
                    }}<span class="text-xs font-normal text-habit-text-subtle"
                      >/5</span
                    >
                  </p>
                  <div
                    class="h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        barColor(checkin.sleep_quality),
                      ]"
                      :style="{
                        width: barPercent(checkin.sleep_quality) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div
                  class="bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-base">🛏️</span>
                    <p class="text-habit-text-subtle text-xs font-medium">
                      Ore Sonno
                    </p>
                  </div>
                  <p class="text-habit-text font-bold text-lg mb-1.5">
                    {{ formatNum(checkin.sleep_hours)
                    }}<span class="text-xs font-normal text-habit-text-subtle"
                      >h</span
                    >
                  </p>
                  <div
                    class="h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        barColor(checkin.sleep_hours, false),
                      ]"
                      :style="{
                        width: barPercent(checkin.sleep_hours, 10) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div
                  class="bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-base">⚡</span>
                    <p class="text-habit-text-subtle text-xs font-medium">
                      Energia
                    </p>
                  </div>
                  <p class="text-habit-text font-bold text-lg mb-1.5">
                    {{ checkin.energy_level
                    }}<span class="text-xs font-normal text-habit-text-subtle"
                      >/5</span
                    >
                  </p>
                  <div
                    class="h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        barColor(checkin.energy_level),
                      ]"
                      :style="{ width: barPercent(checkin.energy_level) + '%' }"
                    ></div>
                  </div>
                </div>
                <div
                  class="bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-base">😤</span>
                    <p class="text-habit-text-subtle text-xs font-medium">
                      Stress
                    </p>
                  </div>
                  <p class="text-habit-text font-bold text-lg mb-1.5">
                    {{ checkin.stress_level
                    }}<span class="text-xs font-normal text-habit-text-subtle"
                      >/5</span
                    >
                  </p>
                  <div
                    class="h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        barColor(checkin.stress_level, true),
                      ]"
                      :style="{ width: barPercent(checkin.stress_level) + '%' }"
                    ></div>
                  </div>
                </div>
                <div
                  class="bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-base">🩹</span>
                    <p class="text-habit-text-subtle text-xs font-medium">
                      Indolenzimento
                    </p>
                  </div>
                  <p class="text-habit-text font-bold text-lg mb-1.5">
                    {{ checkin.soreness_level
                    }}<span class="text-xs font-normal text-habit-text-subtle"
                      >/5</span
                    >
                  </p>
                  <div
                    class="h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        barColor(checkin.soreness_level, true),
                      ]"
                      :style="{
                        width: barPercent(checkin.soreness_level) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div
                  class="bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-base">🏆</span>
                    <p class="text-habit-text-subtle text-xs font-medium">
                      Motivazione
                    </p>
                  </div>
                  <p class="text-habit-text font-bold text-lg mb-1.5">
                    {{ checkin.motivation_level
                    }}<span class="text-xs font-normal text-habit-text-subtle"
                      >/5</span
                    >
                  </p>
                  <div
                    class="h-1.5 bg-habit-skeleton rounded-full overflow-hidden"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        barColor(checkin.motivation_level),
                      ]"
                      :style="{
                        width: barPercent(checkin.motivation_level) + '%',
                      }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Mood + Notes -->
              <div
                class="mt-5 flex items-center gap-3 bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
              >
                <span class="text-2xl">{{ moodEmoji(checkin.mood) }}</span>
                <div>
                  <span
                    class="text-habit-text-subtle text-xs uppercase tracking-wide font-medium"
                    >Umore</span
                  >
                  <p class="text-habit-text text-sm font-medium capitalize">
                    {{ checkin.mood }}
                  </p>
                </div>
              </div>
              <div
                v-if="checkin.notes"
                class="mt-3 bg-habit-bg-light/30 rounded-xl p-4 border border-habit-border/50"
              >
                <p
                  class="text-habit-text-subtle text-xs uppercase tracking-wide font-medium mb-1"
                >
                  Note
                </p>
                <p class="text-habit-text-muted text-sm">{{ checkin.notes }}</p>
              </div>
            </div>

            <!-- AI Recovery Recommendations -->
            <div
              v-if="hasCheckinToday && !editing"
              class="bg-habit-card border border-habit-border rounded-2xl p-6"
            >
              <div class="flex items-center justify-between mb-5">
                <h3
                  class="text-habit-text font-semibold flex items-center gap-2"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center"
                  >
                    <svg
                      class="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  Raccomandazioni Recovery
                </h3>
                <button
                  @click="fetchAiRecommendation"
                  :disabled="aiLoading"
                  class="text-xs px-4 py-2 bg-gradient-to-r from-habit-cyan to-blue-600 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 font-medium shadow-lg shadow-habit-cyan/20"
                >
                  {{ aiLoading ? "Analisi..." : "✨ Chiedi AI" }}
                </button>
              </div>

              <!-- Recovery Tips -->
              <div class="space-y-2.5">
                <div
                  v-for="(tip, idx) in recoveryTips"
                  :key="idx"
                  :class="[
                    'flex items-start gap-3 p-4 rounded-xl border transition-all hover:scale-[1.01]',
                    tip.color,
                  ]"
                >
                  <span class="text-xl flex-shrink-0 mt-0.5">{{
                    tipIcon(tip.icon)
                  }}</span>
                  <p class="text-sm text-habit-text-muted leading-relaxed">
                    {{ tip.tip }}
                  </p>
                </div>
              </div>

              <!-- AI Recommendation -->
              <div
                v-if="aiRecommendation"
                class="mt-5 p-5 bg-gradient-to-br from-habit-cyan/5 to-blue-600/5 border border-habit-cyan/20 rounded-2xl"
              >
                <div class="flex items-center gap-2 mb-3">
                  <div
                    class="w-6 h-6 rounded-lg bg-habit-cyan/20 flex items-center justify-center"
                  >
                    <span class="text-xs">✨</span>
                  </div>
                  <p
                    class="text-xs text-habit-cyan uppercase tracking-wide font-semibold"
                  >
                    Suggerimento AI
                  </p>
                </div>
                <p
                  class="text-sm text-habit-text-muted whitespace-pre-line leading-relaxed"
                >
                  {{ aiRecommendation }}
                </p>
              </div>
              <div
                v-if="aiError"
                class="mt-4 p-4 bg-habit-skeleton/30 rounded-xl"
              >
                <p class="text-xs text-habit-text-subtle">
                  AI non disponibile. Le raccomandazioni sopra sono basate sul
                  punteggio readiness.
                </p>
              </div>
            </div>

            <!-- Check-in Form -->
            <div
              v-if="!hasCheckinToday || editing"
              class="bg-habit-card border border-habit-border rounded-2xl p-6"
            >
              <h3
                class="text-lg font-bold text-habit-text mb-6 flex items-center gap-2"
              >
                <div
                  class="w-8 h-8 rounded-lg bg-habit-cyan/10 flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-habit-cyan"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                {{
                  editing ? "Modifica Check-in" : "Nuovo Check-in Giornaliero"
                }}
              </h3>
              <div class="space-y-6">
                <!-- Sleep Quality -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <div class="flex justify-between items-center mb-2">
                    <label
                      class="text-habit-text text-sm font-medium flex items-center gap-2"
                    >
                      <span>💤</span> Qualita Sonno
                    </label>
                    <span class="text-habit-cyan font-bold text-lg"
                      >{{
                        getSliderEmoji("sleepQuality", checkinForm.sleepQuality)
                      }}
                      {{ checkinForm.sleepQuality }}</span
                    >
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    v-model.number="checkinForm.sleepQuality"
                    class="w-full h-2 bg-habit-skeleton rounded-lg appearance-none cursor-pointer accent-[#0283a7]"
                  />
                  <div
                    class="flex justify-between text-xs text-habit-text-subtle mt-1"
                  >
                    <span>Pessimo</span><span>Ottimo</span>
                  </div>
                </div>

                <!-- Sleep Hours -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <label
                    class="block text-habit-text text-sm font-medium mb-2 flex items-center gap-2"
                  >
                    <span>🛏️</span> Ore di Sonno
                  </label>
                  <input
                    type="number"
                    v-model.number="checkinForm.sleepHours"
                    min="0"
                    max="16"
                    step="0.5"
                    placeholder="7.5"
                    class="w-full sm:w-40 bg-habit-bg border border-habit-border rounded-xl px-4 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-2 focus:ring-habit-cyan/20 outline-none transition-all"
                  />
                </div>

                <!-- Energy Level -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <div class="flex justify-between items-center mb-2">
                    <label
                      class="text-habit-text text-sm font-medium flex items-center gap-2"
                    >
                      <span>⚡</span> Livello Energia
                    </label>
                    <span class="text-habit-cyan font-bold text-lg"
                      >{{
                        getSliderEmoji("energyLevel", checkinForm.energyLevel)
                      }}
                      {{ checkinForm.energyLevel }}</span
                    >
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    v-model.number="checkinForm.energyLevel"
                    class="w-full h-2 bg-habit-skeleton rounded-lg appearance-none cursor-pointer accent-[#0283a7]"
                  />
                  <div
                    class="flex justify-between text-xs text-habit-text-subtle mt-1"
                  >
                    <span>Esausto</span><span>Pieno di energia</span>
                  </div>
                </div>

                <!-- Stress Level -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <div class="flex justify-between items-center mb-2">
                    <label
                      class="text-habit-text text-sm font-medium flex items-center gap-2"
                    >
                      <span>😤</span> Livello Stress
                    </label>
                    <span class="text-habit-orange font-bold text-lg"
                      >{{
                        getSliderEmoji("stressLevel", checkinForm.stressLevel)
                      }}
                      {{ checkinForm.stressLevel }}</span
                    >
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    v-model.number="checkinForm.stressLevel"
                    class="w-full h-2 bg-habit-skeleton rounded-lg appearance-none cursor-pointer accent-[#f59e0b]"
                  />
                  <div
                    class="flex justify-between text-xs text-habit-text-subtle mt-1"
                  >
                    <span>Rilassato</span><span>Molto stressato</span>
                  </div>
                </div>

                <!-- Soreness Level -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <div class="flex justify-between items-center mb-2">
                    <label
                      class="text-habit-text text-sm font-medium flex items-center gap-2"
                    >
                      <span>🩹</span> Indolenzimento Muscolare
                    </label>
                    <span class="text-habit-orange font-bold text-lg"
                      >{{
                        getSliderEmoji(
                          "muscleSoreness",
                          checkinForm.muscleSoreness,
                        )
                      }}
                      {{ checkinForm.muscleSoreness }}</span
                    >
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    v-model.number="checkinForm.muscleSoreness"
                    class="w-full h-2 bg-habit-skeleton rounded-lg appearance-none cursor-pointer accent-[#f59e0b]"
                  />
                  <div
                    class="flex justify-between text-xs text-habit-text-subtle mt-1"
                  >
                    <span>Nessuno</span><span>Molto intenso</span>
                  </div>
                </div>

                <!-- Motivation Level -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <div class="flex justify-between items-center mb-2">
                    <label
                      class="text-habit-text text-sm font-medium flex items-center gap-2"
                    >
                      <span>🏆</span> Motivazione
                    </label>
                    <span class="text-habit-cyan font-bold text-lg"
                      >{{
                        getSliderEmoji(
                          "motivation",
                          checkinForm.motivation,
                        )
                      }}
                      {{ checkinForm.motivation }}</span
                    >
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    v-model.number="checkinForm.motivation"
                    class="w-full h-2 bg-habit-skeleton rounded-lg appearance-none cursor-pointer accent-[#0283a7]"
                  />
                  <div
                    class="flex justify-between text-xs text-habit-text-subtle mt-1"
                  >
                    <span>Nessuna</span><span>Massima</span>
                  </div>
                </div>

                <!-- Mood Selector -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <label class="block text-habit-text text-sm font-medium mb-3"
                    >Come ti senti oggi?</label
                  >
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="option in moodOptions"
                      :key="option.value"
                      @click="checkinForm.mood = option.value"
                      type="button"
                      :class="[
                        'px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                        checkinForm.mood === option.value
                          ? 'bg-gradient-to-r from-habit-cyan to-blue-600 border-transparent text-white shadow-lg shadow-habit-cyan/20 scale-105'
                          : 'bg-habit-bg border-habit-border text-habit-text-subtle hover:bg-habit-bg-light hover:text-habit-text',
                      ]"
                    >
                      <span class="text-lg mr-1">{{ option.emoji }}</span>
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <!-- Notes -->
                <div class="bg-habit-bg-light/30 rounded-xl p-4">
                  <label
                    class="block text-habit-text text-sm font-medium mb-2 flex items-center gap-2"
                  >
                    <span>📝</span> Note (opzionale)
                  </label>
                  <textarea
                    v-model="checkinForm.notes"
                    rows="3"
                    placeholder="Come ti senti oggi? Qualcosa da segnalare?"
                    class="w-full bg-habit-bg border border-habit-border rounded-xl px-4 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-2 focus:ring-habit-cyan/20 outline-none resize-none transition-all"
                  ></textarea>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 pt-2">
                  <button
                    v-if="editing"
                    @click="cancelEdit"
                    class="flex-1 sm:flex-none px-5 py-2.5 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-bg-light transition-all text-sm font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    @click="handleSubmit"
                    :disabled="saving"
                    class="flex-1 sm:flex-none px-8 py-2.5 bg-gradient-to-r from-habit-cyan to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-lg shadow-habit-cyan/20"
                  >
                    {{
                      saving
                        ? "Salvataggio..."
                        : editing
                          ? "Aggiorna Check-in"
                          : "Salva Check-in"
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ==================== TAB: STORICO ==================== -->
          <div v-if="activeTab === 'history'" class="space-y-4">
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <h2
                class="text-lg font-semibold text-habit-text flex items-center gap-2"
              >
                <svg
                  class="w-5 h-5 text-habit-cyan"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Storico Check-in
              </h2>
              <div class="flex items-center gap-2">
                <input
                  type="date"
                  v-model="filterStartDate"
                  class="bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
                <span class="text-habit-text-subtle text-sm">-</span>
                <input
                  type="date"
                  v-model="filterEndDate"
                  class="bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
                <button
                  @click="applyFilter"
                  class="px-4 py-2 bg-gradient-to-r from-habit-cyan to-blue-600 text-white rounded-xl hover:opacity-90 transition-all text-sm font-medium shadow-lg shadow-habit-cyan/20"
                >
                  Filtra
                </button>
              </div>
            </div>

            <!-- ===== Chart.js: Readiness Trend ===== -->
            <div
              v-if="
                readinessChartData.datasets.length &&
                readinessChartData.labels.length
              "
            >
              <ChartWidget
                type="line"
                title="Andamento Readiness"
                :chart-data="readinessChartData"
                :chart-options="readinessChartOptions"
                :loading="historyLoading"
                :height="isMobile ? '200px' : '280px'"
              />
            </div>

            <!-- ===== HeatmapGrid: Readiness Heatmap ===== -->
            <div
              v-if="heatmapData.length"
              class="bg-habit-card border border-habit-border rounded-2xl p-6"
            >
              <h3 class="text-sm font-semibold text-habit-text mb-3">
                Mappa Readiness
              </h3>
              <HeatmapGrid
                :data="heatmapData"
                :weeks="8"
                :color-scale="heatmapColorScale"
              />
            </div>

            <!-- Empty state -->
            <div
              v-if="store.history.length === 0"
              class="bg-habit-card border border-habit-border rounded-2xl p-12 text-center"
            >
              <div
                class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-habit-cyan/10 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-habit-cyan"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <p class="text-habit-text-subtle">Nessun check-in registrato</p>
            </div>

            <!-- History Cards (mobile-friendly alternative to table) -->
            <div v-else class="space-y-3">
              <div
                v-for="c in store.history as any[]"
                :key="c.id"
                class="bg-habit-card border border-habit-border rounded-2xl p-4 hover:border-habit-cyan/20 transition-all"
              >
                <div class="flex items-center justify-between mb-3">
                  <span class="text-habit-text text-sm font-medium">{{
                    formatDate(c.checkin_date)
                  }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ moodEmoji(c.mood) }}</span>
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
                        scoreBgClass(c.readiness_score),
                        scoreColor(c.readiness_score),
                      ]"
                    >
                      {{ formatNum(c.readiness_score, 0) }}
                    </span>
                  </div>
                </div>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div class="bg-habit-bg-light/30 rounded-lg p-2">
                    <p class="text-[10px] text-habit-text-subtle uppercase">
                      Sonno
                    </p>
                    <p class="text-sm font-bold text-blue-400">
                      {{ c.sleep_quality || "-" }}
                    </p>
                  </div>
                  <div class="bg-habit-bg-light/30 rounded-lg p-2">
                    <p class="text-[10px] text-habit-text-subtle uppercase">
                      Ore
                    </p>
                    <p class="text-sm font-bold text-habit-text">
                      {{ c.sleep_hours ? formatNum(c.sleep_hours) : "-" }}
                    </p>
                  </div>
                  <div class="bg-habit-bg-light/30 rounded-lg p-2">
                    <p class="text-[10px] text-habit-text-subtle uppercase">
                      Energia
                    </p>
                    <p class="text-sm font-bold text-emerald-400">
                      {{ c.energy_level || "-" }}
                    </p>
                  </div>
                  <div class="bg-habit-bg-light/30 rounded-lg p-2">
                    <p class="text-[10px] text-habit-text-subtle uppercase">
                      Stress
                    </p>
                    <p class="text-sm font-bold text-orange-400">
                      {{ c.stress_level || "-" }}
                    </p>
                  </div>
                  <div class="bg-habit-bg-light/30 rounded-lg p-2">
                    <p class="text-[10px] text-habit-text-subtle uppercase">
                      Indol.
                    </p>
                    <p class="text-sm font-bold text-orange-400">
                      {{ c.soreness_level || "-" }}
                    </p>
                  </div>
                  <div class="bg-habit-bg-light/30 rounded-lg p-2">
                    <p class="text-[10px] text-habit-text-subtle uppercase">
                      Motiv.
                    </p>
                    <p class="text-sm font-bold text-habit-cyan">
                      {{ c.motivation_level || "-" }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
