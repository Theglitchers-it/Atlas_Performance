<template>
  <div class="space-y-2 sm:space-y-3">
    <!-- Metric selector: compact flex-wrap -->
    <div class="flex flex-wrap gap-x-3 gap-y-1 pb-1">
      <button
        v-for="metric in metrics"
        :key="metric.key"
        @click="activeMetric = metric.key"
        class="flex items-center gap-1 text-[11px] py-0.5 transition-colors"
        :class="activeMetric === metric.key
          ? 'text-habit-text font-medium'
          : 'text-habit-text-muted hover:text-habit-text'"
      >
        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: metric.color }"></span>
        {{ metric.label }}
      </button>
    </div>

    <!-- Chart -->
    <div
      v-if="activeChartData.datasets && activeChartData.datasets.length > 0"
      class="chart-height-wrapper"
    >
      <ChartWidget
        :type="currentChartType"
        :chart-data="activeChartData"
        :chart-options="chartOptions"
        :loading="loading"
        height="100%"
      />
    </div>
    <div
      v-else
      class="flex items-center justify-center h-20 sm:h-36 rounded-lg border border-dashed border-habit-border text-habit-text-muted text-[11px] sm:text-sm"
    >
      Nessun dato per questa metrica
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ChartWidget from "@/components/ui/ChartWidget.vue";
import type {
  BodyMeasurementRecord,
  BiaRecord,
  SkinfoldRecord,
  CircumferenceRecord,
} from "@/types";

interface Props {
  bodyMeasurements: BodyMeasurementRecord[];
  biaMeasurements: BiaRecord[];
  skinfolds: SkinfoldRecord[];
  circumferences: CircumferenceRecord[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const activeMetric = ref<string>("weight");

const metrics = [
  { key: "weight", label: "Peso", color: "#3b82f6" },
  { key: "bodyFat", label: "Grasso", color: "#f97316" },
  { key: "leanMass", label: "Magra", color: "#22c55e" },
  { key: "composition", label: "Comp.", color: "#8b5cf6" },
  { key: "circumferences", label: "Circ.", color: "#06b6d4" },
];

const currentChartType = computed(() => {
  if (activeMetric.value === "composition") return "doughnut" as const;
  if (activeMetric.value === "circumferences") return "radar" as const;
  return "line" as const;
});

const sortedBody = computed(() =>
  [...props.bodyMeasurements].sort((a, b) =>
    a.measurement_date.localeCompare(b.measurement_date),
  ),
);
const sortedBia = computed(() =>
  [...props.biaMeasurements].sort((a, b) =>
    a.measurement_date.localeCompare(b.measurement_date),
  ),
);
const sortedSkinfolds = computed(() =>
  [...props.skinfolds].sort((a, b) =>
    a.measurement_date.localeCompare(b.measurement_date),
  ),
);

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};

// === Chart data per metric ===

const weightChartData = computed(() => {
  const records = sortedBody.value.filter((r) => r.weight_kg != null);
  return {
    labels: records.map((r) => formatDate(r.measurement_date)),
    datasets: records.length
      ? [
          {
            label: "Peso (kg)",
            data: records.map((r) => r.weight_kg!),
            borderColor: "#3b82f6",
            backgroundColor: "#3b82f620",
          },
        ]
      : [],
  };
});

const bodyFatChartData = computed(() => {
  const biaRecords = sortedBia.value.filter((r) => r.fat_mass_pct != null);
  const skinfoldRecords = sortedSkinfolds.value.filter(
    (r) => r.body_fat_percentage != null,
  );
  const bodyRecords = sortedBody.value.filter(
    (r) => r.body_fat_percentage != null,
  );

  const datasets: any[] = [];
  if (biaRecords.length) {
    datasets.push({
      label: "BIA %",
      data: biaRecords.map((r) => r.fat_mass_pct!),
      borderColor: "#f97316",
      backgroundColor: "#f9731620",
    });
  }
  if (skinfoldRecords.length) {
    datasets.push({
      label: "Plicometria %",
      data: skinfoldRecords.map((r) => r.body_fat_percentage!),
      borderColor: "#fb923c",
      backgroundColor: "#fb923c20",
    });
  }
  if (bodyRecords.length && !biaRecords.length) {
    datasets.push({
      label: "Body %",
      data: bodyRecords.map((r) => r.body_fat_percentage!),
      borderColor: "#fdba74",
      backgroundColor: "#fdba7420",
    });
  }

  const longestSource =
    biaRecords.length >= skinfoldRecords.length
      ? biaRecords.length >= bodyRecords.length
        ? biaRecords
        : bodyRecords
      : skinfoldRecords.length >= bodyRecords.length
        ? skinfoldRecords
        : bodyRecords;

  return {
    labels: longestSource.map((r) => formatDate(r.measurement_date)),
    datasets,
  };
});

const leanMassChartData = computed(() => {
  const biaRecords = sortedBia.value.filter((r) => r.lean_mass_kg != null);
  const bodyRecords = sortedBody.value.filter((r) => r.muscle_mass_kg != null);
  const datasets: any[] = [];

  if (biaRecords.length) {
    datasets.push({
      label: "Massa Magra BIA (kg)",
      data: biaRecords.map((r) => r.lean_mass_kg!),
      borderColor: "#22c55e",
      backgroundColor: "#22c55e20",
    });
  }
  if (bodyRecords.length) {
    datasets.push({
      label: "Massa Muscolare (kg)",
      data: bodyRecords.map((r) => r.muscle_mass_kg!),
      borderColor: "#4ade80",
      backgroundColor: "#4ade8020",
    });
  }

  const source =
    biaRecords.length >= bodyRecords.length ? biaRecords : bodyRecords;
  return {
    labels: source.map((r) => formatDate(r.measurement_date)),
    datasets,
  };
});

const compositionChartData = computed(() => {
  const latest = sortedBia.value[sortedBia.value.length - 1];
  if (!latest) return { labels: [], datasets: [] };

  const fat = latest.fat_mass_kg || 0;
  const lean = latest.lean_mass_kg || 0;
  const water = latest.total_body_water_l || 0;
  const bone = latest.bone_mass_kg || 0;

  if (!fat && !lean) return { labels: [], datasets: [] };

  return {
    labels: ["Massa Grassa", "Massa Magra", "Acqua", "Ossa"],
    datasets: [
      {
        data: [fat, Math.max(0, lean - bone), water, bone],
        backgroundColor: ["#f97316", "#22c55e", "#3b82f6", "#94a3b8"],
      },
    ],
  };
});

const circumferenceChartData = computed(() => {
  const latest = props.circumferences[0];
  if (!latest) return { labels: [], datasets: [] };

  const fields = [
    { key: "waist_cm", label: "Vita" },
    { key: "hips_cm", label: "Fianchi" },
    { key: "chest_cm", label: "Petto" },
    { key: "shoulders_cm", label: "Spalle" },
    { key: "biceps_cm", label: "Bicipiti" },
    { key: "thigh_upper_cm", label: "Coscia" },
    { key: "glutes_cm", label: "Glutei" },
  ];

  const data = fields.map((f) => (latest as any)[f.key] || 0);
  const hasData = data.some((v: number) => v > 0);
  if (!hasData) return { labels: [], datasets: [] };

  const datasets: any[] = [
    {
      label: formatDate(latest.measurement_date),
      data,
      borderColor: "#06b6d4",
      backgroundColor: "#06b6d420",
    },
  ];

  const previous = props.circumferences[1];
  if (previous) {
    datasets.push({
      label: formatDate(previous.measurement_date),
      data: fields.map((f) => (previous as any)[f.key] || 0),
      borderColor: "#94a3b8",
      backgroundColor: "#94a3b810",
    });
  }

  return {
    labels: fields.map((f) => f.label),
    datasets,
  };
});

const activeChartData = computed(() => {
  switch (activeMetric.value) {
    case "weight":
      return weightChartData.value;
    case "bodyFat":
      return bodyFatChartData.value;
    case "leanMass":
      return leanMassChartData.value;
    case "composition":
      return compositionChartData.value;
    case "circumferences":
      return circumferenceChartData.value;
    default:
      return { labels: [], datasets: [] };
  }
});

const chartOptions = computed(() => {
  const opts: Record<string, any> = {};
  if (activeMetric.value === "composition") {
    opts.plugins = { legend: { position: "bottom" } };
  }
  if (
    activeMetric.value !== "composition" &&
    activeMetric.value !== "circumferences"
  ) {
    opts.scales = { y: { beginAtZero: false } };
  }
  return opts;
});

</script>

<style scoped>
.chart-height-wrapper {
  height: 150px;
}
@media (min-width: 640px) {
  .chart-height-wrapper {
    height: 260px;
  }
}
</style>
