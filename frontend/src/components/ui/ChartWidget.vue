<template>
  <div
    class="min-w-0 w-full bg-habit-card border border-habit-border rounded-habit p-4 xs:p-6"
  >
    <!-- Header -->
    <div
      v-if="title || subtitle || $slots.actions"
      class="flex items-start justify-between gap-3 mb-4"
    >
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <div
          v-if="icon"
          class="w-7 h-7 rounded-lg bg-habit-orange/15 flex items-center justify-center flex-shrink-0 mt-0.5"
        >
          <component :is="icon" class="w-4 h-4 text-habit-orange" />
        </div>
        <div class="min-w-0">
          <h3 v-if="title" class="text-base font-semibold text-habit-text leading-snug">
            {{ title }}
          </h3>
          <p v-if="subtitle" class="text-xs text-habit-text-subtle mt-0.5">
            {{ subtitle }}
          </p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="animate-pulse" :style="{ height }">
      <div
        class="h-full w-full bg-habit-skeleton rounded-lg relative overflow-hidden"
      >
        <div class="shimmer absolute inset-0" />
      </div>
    </div>

    <!-- Chart -->
    <div v-else :style="{ height, position: 'relative', width: '100%' }">
      <component
        :is="chartComponent"
        :data="mergedData"
        :options="mergedOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import type { Component } from "vue";
import { Bar, Line, Doughnut, Radar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type ChartType = "line" | "bar" | "doughnut" | "radar";

interface ChartDataset {
  data?: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  tension?: number;
  borderWidth?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  hoverBackgroundColor?: string;
  borderRadius?: number;
  borderSkipped?: boolean;
  hoverOffset?: number;
  label?: string;
  [key: string]: unknown;
}

interface ChartData {
  labels?: string[];
  datasets?: ChartDataset[];
}

interface Props {
  type?: ChartType;
  chartData: ChartData;
  chartOptions?: Record<string, unknown>;
  height?: string;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  icon?: Component;
}

const props = withDefaults(defineProps<Props>(), {
  type: "line",
  chartOptions: () => ({}),
  height: "300px",
  loading: false,
  title: "",
  subtitle: "",
  icon: undefined,
});

const emit = defineEmits<{
  (e: "chart-click", payload: { index: number; label: string; value: number; datasetIndex: number }): void;
}>();

const BRAND_COLORS_LIGHT = [
  "#ff4c00",
  "#0283a7",
  "#22c55e",
  "#8b5cf6",
  "#3b82f6",
  "#ef4444",
];
const BRAND_COLORS_DARK = [
  "#ff6b2b",
  "#12b8d8",
  "#34d399",
  "#a78bfa",
  "#60a5fa",
  "#f87171",
];
const BRAND_COLORS = computed(() =>
  isDark.value ? BRAND_COLORS_DARK : BRAND_COLORS_LIGHT,
);

// -- Dark mode detection --
const isDark = ref(false);
let observer: MutationObserver | null = null;

function checkDark(): void {
  isDark.value = document.documentElement.classList.contains("dark");
}

onMounted(() => {
  checkDark();
  observer = new MutationObserver(() => {
    checkDark();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

// -- Component mapping --
const componentMap = { bar: Bar, line: Line, doughnut: Doughnut, radar: Radar };
const chartComponent = computed(() => componentMap[props.type] || Line);

// -- Merge brand colors into datasets --
const mergedData = computed(() => {
  if (!props.chartData) return { labels: [], datasets: [] };

  // structuredClone è nativo (Chrome 98+, Safari 15.4+, Firefox 94+), 3-5x più veloce di JSON.parse(JSON.stringify())
  const data: any = structuredClone(props.chartData);

  if (data.datasets) {
    data.datasets = data.datasets.map((ds: any, i: number) => {
      const color = BRAND_COLORS.value[i % BRAND_COLORS.value.length];
      const defaults: Record<string, any> = {};

      if (props.type === "line") {
        defaults.borderColor = color;
        defaults.backgroundColor = color + "33";
        defaults.pointBackgroundColor = color;
        defaults.pointBorderColor = color;
        defaults.tension = 0.4;
        defaults.borderWidth = 2;
        defaults.pointRadius = 3;
        defaults.pointHoverRadius = 5;
      } else if (props.type === "bar") {
        defaults.backgroundColor = color + "CC";
        defaults.hoverBackgroundColor = color;
        defaults.borderRadius = 4;
        defaults.borderSkipped = false;
      } else if (props.type === "doughnut") {
        if (!ds.backgroundColor) {
          defaults.backgroundColor = BRAND_COLORS.value.slice(
            0,
            ds.data?.length || BRAND_COLORS.value.length,
          );
          defaults.borderWidth = 0;
        }
        defaults.hoverOffset = 8;
      } else if (props.type === "radar") {
        defaults.borderColor = color;
        defaults.backgroundColor = color + "33";
        defaults.pointBackgroundColor = color;
        defaults.borderWidth = 2;
      }

      return { ...defaults, ...ds };
    });
  }

  return data;
});

// -- Chart click handler (extracted to avoid recreating inside computed) --
const handleChartClick = (_event: any, elements: any[]) => {
  if (elements.length > 0) {
    const el = elements[0];
    const datasetIndex = el.datasetIndex ?? 0;
    const index = el.index ?? 0;
    const label = mergedData.value.labels?.[index] ?? "";
    const value = mergedData.value.datasets?.[datasetIndex]?.data?.[index] ?? 0;
    emit("chart-click", { index, label: String(label), value: Number(value), datasetIndex });
  }
};

// -- Merge default options --
const mergedOptions = computed(() => {
  const dark = isDark.value;
  const gridColor = dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const textColor = dark ? "#ffffff" : "#0f172a";
  const tooltipBg = dark ? "#262830" : "#0f172a";
  const tooltipText = dark ? "#ffffff" : "#ffffff";
  const tooltipBorder = dark
    ? "rgba(255, 255, 255, 0.15)"
    : "rgba(0, 0, 0, 0.1)";

  const base: Record<string, any> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: "easeOutQuart",
    },
    onClick: handleChartClick,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
            size: 12,
          },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          boxWidth: 8,
          boxHeight: 8,
          borderWidth: 0,
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        borderColor: tooltipBorder,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: {
          family: "Inter, sans-serif",
          size: 13,
          weight: "600",
        },
        bodyFont: {
          family: "Inter, sans-serif",
          size: 12,
        },
        displayColors: true,
        boxPadding: 4,
      },
    },
  };

  // Add scale defaults for chart types that use axes
  if (props.type === "line" || props.type === "bar") {
    base.scales = {
      x: {
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
            size: 11,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
            size: 11,
          },
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    };
  }

  if (props.type === "radar") {
    base.scales = {
      r: {
        grid: {
          color: gridColor,
        },
        angleLines: {
          color: gridColor,
        },
        pointLabels: {
          color: textColor,
          font: {
            family: "Inter, sans-serif",
            size: 11,
          },
        },
        ticks: {
          color: textColor,
          backdropColor: "transparent",
          font: {
            family: "Inter, sans-serif",
            size: 10,
          },
        },
      },
    };
  }

  // Deep merge user options on top of defaults
  return deepMerge(base, props.chartOptions);
});

// -- Deep merge utility --
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  if (!source) return target;
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
</script>
