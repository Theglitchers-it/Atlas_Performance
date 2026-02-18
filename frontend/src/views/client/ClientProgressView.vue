<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import HabitCard from "@/components/ui/HabitCard.vue";
import PrimaryButton from "@/components/ui/PrimaryButton.vue";
import SecondaryButton from "@/components/ui/SecondaryButton.vue";
import ChartWidget from "@/components/ui/ChartWidget.vue";
import TrendBadge from "@/components/ui/TrendBadge.vue";
import api from "@/services/api";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useNative } from "@/composables/useNative";

interface WeightChangeData {
  change?: number;
}

const router = useRouter();
const auth = useAuthStore();
const { isMobile } = useNative();
const loading = ref(true);
const error = ref<string | null>(null);

// Data from API
const bodyMeasurements = ref<Record<string, any>[]>([]);
const circumferences = ref<Record<string, any>[]>([]);
const weightChange = ref<WeightChangeData | null>(null);
const clientGoal = ref<number | null>(null);

// Client ID from auth store (set by backend for client users)
const clientId = computed(() => auth.user?.clientId || null);

// Load all progress data
const loadProgress = async () => {
  loading.value = true;
  error.value = null;
  try {
    if (!clientId.value) {
      error.value = "Profilo cliente non trovato";
      loading.value = false;
      return;
    }

    // Load client profile for goal_weight_kg + measurements in parallel
    const [profileRes, progressRes, weightRes] = await Promise.all([
      api.get("/clients/me").catch(() => null),
      api.get(`/measurements/${clientId.value}`).catch(() => null),
      api
        .get(`/measurements/${clientId.value}/weight-change`)
        .catch(() => null),
    ]);

    clientGoal.value = profileRes?.data?.data?.client?.goal_weight_kg || null;

    bodyMeasurements.value = progressRes?.data?.data?.bodyMeasurements || [];
    circumferences.value = progressRes?.data?.data?.circumferences || [];
    weightChange.value =
      weightRes?.data?.data?.weightChange || weightRes?.data?.data || null;
  } catch (err: any) {
    error.value =
      err.response?.data?.message || "Errore nel caricamento dei progressi";
  } finally {
    loading.value = false;
  }
};

// Computed: peso attuale e trend
const pesoData = computed(() => {
  if (!bodyMeasurements.value.length) return null;
  const latest = bodyMeasurements.value[0];
  const previous =
    bodyMeasurements.value.length > 1 ? bodyMeasurements.value[1] : null;
  const attuale = parseFloat(latest.weight_kg) || 0;
  const precedente = previous ? parseFloat(previous.weight_kg) || 0 : attuale;
  const diff = attuale - precedente;
  const percentuale = precedente
    ? Math.round((diff / precedente) * 1000) / 10
    : 0;
  return {
    attuale,
    precedente,
    trend: diff <= 0 ? "down" : "up",
    percentuale,
  };
});

// Computed: massa grassa attuale e trend
const massaGrassaData = computed(() => {
  const withBf = bodyMeasurements.value.filter(
    (m) => m.body_fat_percentage != null,
  );
  if (!withBf.length) return null;
  const latest = withBf[0];
  const previous = withBf.length > 1 ? withBf[1] : null;
  const attuale = parseFloat(latest.body_fat_percentage) || 0;
  const precedente = previous
    ? parseFloat(previous.body_fat_percentage) || 0
    : attuale;
  const diff = attuale - precedente;
  const percentuale = precedente
    ? Math.round((diff / precedente) * 1000) / 10
    : 0;
  return {
    attuale,
    precedente,
    trend: diff <= 0 ? "down" : "up",
    percentuale,
  };
});

// Computed: circonferenze piu recenti vs precedenti
const circonferenzeData = computed(() => {
  if (!circumferences.value.length) return null;
  const latest = circumferences.value[0];
  const previous =
    circumferences.value.length > 1 ? circumferences.value[1] : null;

  const buildMeasure = (field: string) => {
    const att = parseFloat(latest[field]) || 0;
    const prec = previous ? parseFloat(previous[field]) || 0 : att;
    return {
      attuale: att,
      precedente: prec,
      diff: Math.round((att - prec) * 10) / 10,
    };
  };

  return {
    vita: buildMeasure("waist_cm"),
    petto: buildMeasure("chest_cm"),
    braccia: buildMeasure("biceps_cm"),
    cosce: buildMeasure("thigh_upper_cm"),
  };
});

// Computed: statistiche rapide
const totalCheckins = computed(() => bodyMeasurements.value.length);
const settimaneAttive = computed(() => {
  if (!bodyMeasurements.value.length) return 0;
  const dates = bodyMeasurements.value.map((m) => new Date(m.measurement_date));
  const weeks = new Set(
    dates.map((d) => {
      const start = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(
        ((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7,
      );
    }),
  );
  return weeks.size;
});
const pesoPerso = computed(() => {
  if (!weightChange.value) return 0;
  return weightChange.value.change || 0;
});

// Goal weight ref for chart
const goalWeight = computed(() =>
  clientGoal.value ? Number(clientGoal.value) : null,
);

// Navigate to checkin
const goToCheckin = () => router.push("/checkin");
const goToMeasurements = () => router.push("/measurements");

// Days since last check-in
const daysSinceLastCheckin = computed(() => {
  if (!bodyMeasurements.value.length) return null;
  const last = new Date(bodyMeasurements.value[0].measurement_date);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / 86400000);
});

// ===== Chart.js: Weight trend line chart =====
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
};

const weightChartData = computed(() => {
  const measurements = bodyMeasurements.value
    .filter((m) => m.weight_kg != null)
    .slice()
    .reverse();
  if (!measurements.length) return { labels: [], datasets: [] };

  const datasets: any[] = [
    {
      label: "Peso (kg)",
      data: measurements.map((m) => parseFloat(m.weight_kg)),
      borderColor: "#0283a7",
      backgroundColor: "rgba(2, 131, 167, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#0283a7",
    },
  ];

  // Goal weight dashed line
  if (goalWeight.value) {
    datasets.push({
      label: "Obiettivo",
      data: measurements.map(() => goalWeight.value),
      borderColor: "#ff4c00",
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
      borderWidth: 2,
    });
  }

  return {
    labels: measurements.map((m) => formatDate(m.measurement_date || m.date)),
    datasets,
  };
});

const weightChartOptions = computed(() => ({
  scales: {
    y: {
      beginAtZero: false,
    },
  },
  plugins: {
    legend: {
      display: true,
    },
  },
}));

// ===== Chart.js: Body fat trend line chart =====
const bodyFatChartData = computed(() => {
  const measurements = bodyMeasurements.value
    .filter((m) => m.body_fat_percentage != null)
    .slice()
    .reverse();
  if (!measurements.length) return { labels: [], datasets: [] };

  return {
    labels: measurements.map((m) => formatDate(m.measurement_date || m.date)),
    datasets: [
      {
        label: "Massa Grassa (%)",
        data: measurements.map((m) => parseFloat(m.body_fat_percentage)),
        borderColor: "#ff4c00",
        backgroundColor: "rgba(255, 76, 0, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#ff4c00",
      },
    ],
  };
});

// ===== Chart.js: Radar chart for body composition =====
const hasCircumferences = computed(() => {
  if (!circumferences.value.length) return false;
  const latest = circumferences.value[0];
  return !!(
    latest.waist_cm ||
    latest.chest_cm ||
    latest.biceps_cm ||
    latest.thigh_upper_cm
  );
});

const bodyRadarData = computed(() => {
  if (!circumferences.value.length) return { labels: [], datasets: [] };

  const latest = circumferences.value[0];
  const previous =
    circumferences.value.length > 1 ? circumferences.value[1] : null;

  const labels = ["Vita", "Petto", "Braccia", "Cosce"];
  const fields = ["waist_cm", "chest_cm", "biceps_cm", "thigh_upper_cm"];

  const datasets: any[] = [
    {
      label: "Attuale",
      data: fields.map((f) => parseFloat(latest[f]) || 0),
      borderColor: "#0283a7",
      backgroundColor: "rgba(2, 131, 167, 0.2)",
      pointBackgroundColor: "#0283a7",
      borderWidth: 2,
    },
  ];

  if (previous) {
    datasets.push({
      label: "Precedente",
      data: fields.map((f) => parseFloat(previous[f]) || 0),
      borderColor: "#ff4c00",
      backgroundColor: "rgba(255, 76, 0, 0.1)",
      pointBackgroundColor: "#ff4c00",
      borderWidth: 2,
      borderDash: [4, 4],
    });
  }

  return { labels, datasets };
});

onMounted(loadProgress);
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <!-- Header -->
    <div class="mb-8">
      <h1
        class="text-2xl sm:text-4xl md:text-5xl font-bold text-habit-text leading-[0.9] tracking-tight mb-2"
      >
        I tuoi <span class="text-habit-orange">Progressi</span>
      </h1>
      <p class="text-habit-text/60 text-lg">
        Monitora il tuo percorso di trasformazione
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <HabitCard v-for="i in 3" :key="i" class="p-6 animate-pulse">
          <div class="h-6 bg-habit-card-hover/50 rounded w-1/3 mb-4"></div>
          <div class="h-10 bg-habit-card-hover/50 rounded w-1/2 mb-4"></div>
          <div class="h-20 bg-habit-card-hover/50 rounded"></div>
        </HabitCard>
      </div>
    </div>

    <!-- Error -->
    <HabitCard v-else-if="error" class="p-8 text-center">
      <p class="text-red-400 text-lg mb-4">{{ error }}</p>
      <PrimaryButton @click="loadProgress">Riprova</PrimaryButton>
    </HabitCard>

    <!-- Empty state -->
    <HabitCard
      v-else-if="!bodyMeasurements.length && !circumferences.length"
      class="p-8 text-center"
    >
      <div class="text-5xl mb-4">📊</div>
      <h3 class="text-xl font-bold text-habit-text mb-2">
        Nessuna misurazione
      </h3>
      <p class="text-habit-text/60 mb-6">
        Inizia a tracciare i tuoi progressi aggiungendo le prime misurazioni.
      </p>
      <PrimaryButton @click="goToCheckin">Primo check-in</PrimaryButton>
    </HabitCard>

    <!-- Data loaded -->
    <template v-else>
      <!-- Griglia Card Principali -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <!-- Card Peso -->
        <HabitCard v-if="pesoData" class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p
                class="text-habit-text/60 text-sm uppercase tracking-wider mb-1"
              >
                Peso Corporeo
              </p>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-habit-text">{{
                  pesoData.attuale
                }}</span>
                <span class="text-habit-text/60">kg</span>
                <TrendBadge
                  :value="pesoData.percentuale"
                  :inverted="true"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <p class="text-habit-text/40 text-xs mt-1">
            vs precedente: {{ pesoData.precedente }} kg
          </p>
        </HabitCard>

        <!-- Card Massa Grassa -->
        <HabitCard v-if="massaGrassaData" class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p
                class="text-habit-text/60 text-sm uppercase tracking-wider mb-1"
              >
                Massa Grassa
              </p>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-habit-text">{{
                  massaGrassaData.attuale
                }}</span>
                <span class="text-habit-text/60">%</span>
                <TrendBadge
                  :value="massaGrassaData.percentuale"
                  :inverted="true"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <p class="text-habit-text/40 text-xs mt-1">
            vs precedente: {{ massaGrassaData.precedente }}%
          </p>
        </HabitCard>

        <!-- Card Circonferenze -->
        <HabitCard
          v-if="circonferenzeData"
          class="p-6 md:col-span-2 lg:col-span-1"
        >
          <div class="mb-4">
            <p class="text-habit-text/60 text-sm uppercase tracking-wider mb-1">
              Circonferenze
            </p>
            <p class="text-2xl font-bold text-habit-text">Dettaglio misure</p>
          </div>

          <div class="space-y-4">
            <!-- Vita -->
            <template v-if="circonferenzeData.vita.attuale">
              <div class="flex items-center justify-between">
                <span class="text-habit-text/80">Vita</span>
                <div class="flex items-center gap-3">
                  <span class="text-habit-text font-semibold"
                    >{{ circonferenzeData.vita.attuale }} cm</span
                  >
                  <span
                    :class="
                      circonferenzeData.vita.diff <= 0
                        ? 'text-habit-cyan'
                        : 'text-habit-orange'
                    "
                    class="text-sm"
                  >
                    {{ circonferenzeData.vita.diff > 0 ? "+" : ""
                    }}{{ circonferenzeData.vita.diff }} cm
                  </span>
                </div>
              </div>
              <div
                class="h-1.5 bg-habit-card-hover/50 rounded-full overflow-hidden"
              >
                <div
                  class="h-full rounded-full"
                  :class="
                    circonferenzeData.vita.diff <= 0
                      ? 'bg-habit-cyan'
                      : 'bg-habit-orange'
                  "
                  style="width: 70%"
                ></div>
              </div>
            </template>

            <!-- Petto -->
            <template v-if="circonferenzeData.petto.attuale">
              <div class="flex items-center justify-between">
                <span class="text-habit-text/80">Petto</span>
                <div class="flex items-center gap-3">
                  <span class="text-habit-text font-semibold"
                    >{{ circonferenzeData.petto.attuale }} cm</span
                  >
                  <span
                    :class="
                      circonferenzeData.petto.diff >= 0
                        ? 'text-habit-orange'
                        : 'text-habit-cyan'
                    "
                    class="text-sm"
                  >
                    {{ circonferenzeData.petto.diff > 0 ? "+" : ""
                    }}{{ circonferenzeData.petto.diff }} cm
                  </span>
                </div>
              </div>
              <div
                class="h-1.5 bg-habit-card-hover/50 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-habit-orange rounded-full"
                  style="width: 85%"
                ></div>
              </div>
            </template>

            <!-- Braccia -->
            <template v-if="circonferenzeData.braccia.attuale">
              <div class="flex items-center justify-between">
                <span class="text-habit-text/80">Braccia</span>
                <div class="flex items-center gap-3">
                  <span class="text-habit-text font-semibold"
                    >{{ circonferenzeData.braccia.attuale }} cm</span
                  >
                  <span
                    :class="
                      circonferenzeData.braccia.diff >= 0
                        ? 'text-habit-orange'
                        : 'text-habit-cyan'
                    "
                    class="text-sm"
                  >
                    {{ circonferenzeData.braccia.diff > 0 ? "+" : ""
                    }}{{ circonferenzeData.braccia.diff }} cm
                  </span>
                </div>
              </div>
              <div
                class="h-1.5 bg-habit-card-hover/50 rounded-full overflow-hidden"
              >
                <div
                  class="h-full bg-habit-orange rounded-full"
                  style="width: 60%"
                ></div>
              </div>
            </template>

            <!-- No data -->
            <p
              v-if="
                !circonferenzeData.vita.attuale &&
                !circonferenzeData.petto.attuale &&
                !circonferenzeData.braccia.attuale
              "
              class="text-habit-text/40 text-sm"
            >
              Nessuna misurazione di circonferenze registrata
            </p>
          </div>
        </HabitCard>
      </div>

      <!-- ===== Chart.js: Weight Trend ===== -->
      <div class="mb-8" v-if="weightChartData.datasets.length">
        <ChartWidget
          type="line"
          title="Andamento Peso"
          :chart-data="weightChartData"
          :chart-options="weightChartOptions"
          :loading="loading"
          :height="isMobile ? '200px' : '300px'"
        />
      </div>

      <!-- ===== Chart.js: Body Fat Trend ===== -->
      <div class="mb-8" v-if="bodyFatChartData.datasets.length">
        <ChartWidget
          type="line"
          title="Andamento Massa Grassa"
          :chart-data="bodyFatChartData"
          :chart-options="{ scales: { y: { beginAtZero: false } } }"
          :loading="loading"
          :height="isMobile ? '200px' : '280px'"
        />
      </div>

      <!-- ===== Chart.js: Radar Body Composition ===== -->
      <div class="mb-8" v-if="hasCircumferences">
        <ChartWidget
          type="radar"
          title="Composizione Corporea"
          :chart-data="bodyRadarData"
          :loading="loading"
          :height="isMobile ? '200px' : '300px'"
        />
      </div>

      <!-- Sezione Azioni -->
      <HabitCard :hoverable="false" class="p-6">
        <div
          class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h3 class="text-xl font-bold text-habit-text mb-1">
              Aggiorna le tue misure
            </h3>
            <p class="text-habit-text/60">
              <template v-if="daysSinceLastCheckin !== null">
                L'ultimo check-in risale a {{ daysSinceLastCheckin }} giorni fa
              </template>
              <template v-else>Nessun check-in registrato</template>
            </p>
          </div>
          <div class="flex gap-3">
            <SecondaryButton @click="goToMeasurements"
              >Storico completo</SecondaryButton
            >
            <PrimaryButton @click="goToCheckin">Nuovo check-in</PrimaryButton>
          </div>
        </div>
      </HabitCard>

      <!-- Griglia Statistiche Rapide -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <HabitCard class="p-4 text-center">
          <p class="text-habit-text/60 text-sm mb-1">Check-in totali</p>
          <p class="text-2xl font-bold text-habit-text">{{ totalCheckins }}</p>
        </HabitCard>
        <HabitCard class="p-4 text-center">
          <p class="text-habit-text/60 text-sm mb-1">Settimane attive</p>
          <p class="text-2xl font-bold text-habit-text">
            {{ settimaneAttive }}
          </p>
        </HabitCard>
        <HabitCard class="p-4 text-center">
          <p class="text-habit-text/60 text-sm mb-1">Variazione peso</p>
          <div class="flex items-center justify-center gap-2">
            <p
              class="text-2xl font-bold"
              :class="pesoPerso <= 0 ? 'text-habit-cyan' : 'text-habit-orange'"
            >
              {{ pesoPerso > 0 ? "+" : "" }}{{ pesoPerso }} kg
            </p>
            <TrendBadge :value="pesoPerso" :inverted="true" size="sm" />
          </div>
        </HabitCard>
        <HabitCard class="p-4 text-center">
          <p class="text-habit-text/60 text-sm mb-1">Obiettivo</p>
          <p class="text-2xl font-bold text-habit-orange">
            {{ clientGoal ? clientGoal + " kg" : "-" }}
          </p>
        </HabitCard>
      </div>
    </template>
  </div>
</template>
