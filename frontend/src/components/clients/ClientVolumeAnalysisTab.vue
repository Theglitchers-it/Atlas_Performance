<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import api from "@/services/api";
import { formatDate } from "@/composables/useFormatters";
import type { VolumeByMuscleResponse } from "@/types";
import ChartWidget from "@/components/ui/ChartWidget.vue";

const props = defineProps<{
  clientId: number;
}>();

interface ClientProgram {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

const data = ref<VolumeByMuscleResponse | null>(null);
const loading = ref(false);
const programs = ref<ClientProgram[]>([]);
const programsLoading = ref(false);

type Mode = "days" | "program";
const mode = ref<Mode>("days");
const days = ref<number>(28);
const selectedProgramId = ref<number | null>(null);

const daysOptions = [14, 28, 56, 84];

const loadPrograms = async () => {
  programsLoading.value = true;
  const res = await api
    .get("/programs", { params: { clientId: props.clientId, limit: 50 } })
    .catch(() => null);
  programs.value = res?.data?.data?.programs || [];
  programsLoading.value = false;
};

const loadVolume = async () => {
  loading.value = true;
  const params: Record<string, string | number> = {};
  if (mode.value === "program" && selectedProgramId.value) {
    params.programId = selectedProgramId.value;
  } else {
    params.days = days.value;
  }
  const res = await api
    .get(`/analytics/volume-by-muscle/${props.clientId}`, { params })
    .catch(() => null);
  data.value = res?.data?.data || null;
  loading.value = false;
};

onMounted(() => {
  Promise.all([loadPrograms(), loadVolume()]);
});

watch([mode, days, selectedProgramId], () => {
  if (mode.value === "program" && !selectedProgramId.value) return;
  loadVolume();
});

const chartData = computed(() => {
  const items = data.value?.items || [];
  return {
    labels: items.map((i) => i.muscle_group),
    datasets: [
      {
        label: "Serie allenanti (pesate)",
        data: items.map((i) => i.weighted_sets),
        backgroundColor: items.map(
          (i) => volumeByMuscleId.value[i.muscle_group_id]?.color || "#10b981",
        ),
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number }; dataIndex: number }) => {
          const i = data.value?.items?.[ctx.dataIndex];
          if (!i) return "";
          return `${i.weighted_sets} pesate · ${i.raw_sets} grezze`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "rgba(128,128,128,0.15)" },
      ticks: { color: "#9ca3af" },
    },
    x: {
      grid: { display: false },
      ticks: { color: "#9ca3af", maxRotation: 45, minRotation: 45 },
    },
  },
}));

// Soglie empiriche volume settimanale (schema: adjust per periodo selezionato)
const weeklyScale = computed(() => {
  if (!data.value) return 1;
  const periodFrom = new Date(data.value.period.from);
  const periodTo = new Date(data.value.period.to);
  const dayDiff =
    Math.max(1, (periodTo.getTime() - periodFrom.getTime()) / 86400000) || 1;
  return dayDiff / 7;
});

interface VolumeLevel {
  label: string;
  color: string;
  cls: string;
}

const evaluateVolume = (weightedSets: number): VolumeLevel => {
  const perWeek = weightedSets / weeklyScale.value;
  if (perWeek < 8) {
    return { label: "Basso", color: "#ef4444", cls: "bg-red-500/15 text-red-400" };
  }
  if (perWeek > 20) {
    return { label: "Alto", color: "#f97316", cls: "bg-habit-orange/15 text-habit-orange" };
  }
  return { label: "Ottimale", color: "#10b981", cls: "bg-habit-success/15 text-habit-success" };
};

const volumeByMuscleId = computed<Record<number, VolumeLevel>>(() => {
  const map: Record<number, VolumeLevel> = {};
  for (const i of data.value?.items || []) {
    map[i.muscle_group_id] = evaluateVolume(i.weighted_sets);
  }
  return map;
});

const perWeek = (n: number) => Math.round((n / weeklyScale.value) * 10) / 10;
</script>

<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="mode = 'days'"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors"
          :class="
            mode === 'days'
              ? 'bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30 font-medium'
              : 'bg-habit-bg border-habit-border text-habit-text-subtle'
          "
        >
          Periodo
        </button>
        <button
          type="button"
          @click="mode = 'program'"
          :disabled="programs.length === 0"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-40"
          :class="
            mode === 'program'
              ? 'bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30 font-medium'
              : 'bg-habit-bg border-habit-border text-habit-text-subtle'
          "
        >
          Programma
        </button>
      </div>

      <select
        v-if="mode === 'days'"
        v-model.number="days"
        class="bg-habit-bg border border-habit-border rounded px-2 py-1 text-xs text-habit-text focus:outline-none focus:border-habit-cyan"
        aria-label="Finestra giorni"
      >
        <option v-for="d in daysOptions" :key="d" :value="d">
          Ultimi {{ d }}gg
        </option>
      </select>

      <select
        v-else
        v-model.number="selectedProgramId"
        :disabled="programsLoading"
        class="bg-habit-bg border border-habit-border rounded px-2 py-1 text-xs text-habit-text focus:outline-none focus:border-habit-cyan max-w-[240px]"
        aria-label="Programma cliente"
      >
        <option :value="null">Seleziona programma...</option>
        <option v-for="p in programs" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>

      <span
        v-if="data?.period"
        class="ml-auto text-[11px] text-habit-text-subtle tabular-nums"
      >
        {{ formatDate(data.period.from) }} → {{ formatDate(data.period.to) }}
      </span>
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && data && data.totals.raw_sets === 0"
      class="py-8 text-center text-habit-text-subtle border border-habit-border rounded-lg"
    >
      <p class="text-sm">Nessuna sessione completata nel periodo selezionato</p>
      <p class="text-xs mt-1">
        Le serie allenanti vengono calcolate quando il cliente completa i workout.
      </p>
    </div>

    <!-- Chart + table -->
    <template v-else>
      <ChartWidget
        type="bar"
        :chart-data="chartData"
        :chart-options="chartOptions"
        :loading="loading"
        height="260px"
      />

      <div
        v-if="data && data.items.length > 0"
        class="bg-habit-bg border border-habit-border rounded-lg overflow-hidden"
      >
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-habit-bg-light/40 text-habit-text-subtle">
              <th class="text-left px-3 py-2 font-medium">Muscolo</th>
              <th class="text-right px-3 py-2 font-medium">Serie pesate</th>
              <th class="text-right px-3 py-2 font-medium">Serie grezze</th>
              <th class="text-right px-3 py-2 font-medium">Settimana</th>
              <th class="text-right px-3 py-2 font-medium">Valutazione</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-habit-border">
            <tr v-for="i in data.items" :key="i.muscle_group_id">
              <td class="px-3 py-1.5 text-habit-text capitalize">
                {{ i.muscle_group }}
              </td>
              <td class="px-3 py-1.5 text-right text-habit-text tabular-nums">
                {{ i.weighted_sets }}
              </td>
              <td class="px-3 py-1.5 text-right text-habit-text-subtle tabular-nums">
                {{ i.raw_sets }}
              </td>
              <td class="px-3 py-1.5 text-right text-habit-text tabular-nums">
                {{ perWeek(i.weighted_sets) }}/sett
              </td>
              <td class="px-3 py-1.5 text-right">
                <span
                  class="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  :class="volumeByMuscleId[i.muscle_group_id]?.cls"
                >
                  {{ volumeByMuscleId[i.muscle_group_id]?.label }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[10px] text-habit-text-subtle">
        Serie pesate: muscolo primario = 1.0, secondario = attivazione %. Soglia
        ottimale: 8-20 serie/settimana per muscolo.
      </p>
    </template>
  </div>
</template>
