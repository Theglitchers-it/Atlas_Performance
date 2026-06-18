<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { formatDate } from "@/composables/useFormatters";
import type { KeyExercise, PerformancePoint } from "@/types";
import ChartWidget from "@/components/ui/ChartWidget.vue";

interface ExerciseProgressState {
  points?: PerformancePoint[];
  loading: boolean;
  expanded: boolean;
}

const props = defineProps<{
  clientId: number;
}>();

const toast = useToast();

const keyExercises = ref<KeyExercise[]>([]);
const loading = ref(false);
const stateById = ref<Record<number, ExerciseProgressState>>({});

const showAddModal = ref(false);
const searchText = ref("");
const searchResults = ref<{ id: number; name: string; category: string | null }[]>([]);
const searching = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const noteDraft = ref("");
const pickedExerciseId = ref<number | null>(null);
const saving = ref(false);

const ensureState = (exId: number): ExerciseProgressState => {
  if (!stateById.value[exId]) {
    stateById.value[exId] = { loading: false, expanded: false };
  }
  return stateById.value[exId];
};

const loadList = async () => {
  loading.value = true;
  const res = await api
    .get(`/clients/${props.clientId}/key-exercises`)
    .catch(() => null);
  keyExercises.value = res?.data?.data?.items || [];
  loading.value = false;
};

onMounted(loadList);

const loadProgression = async (exerciseId: number) => {
  const s = ensureState(exerciseId);
  s.loading = true;
  const res = await api
    .get(`/clients/${props.clientId}/key-exercises/${exerciseId}/progression`)
    .catch(() => null);
  s.points = res?.data?.data?.points || [];
  s.loading = false;
};

const toggle = async (exerciseId: number) => {
  const s = ensureState(exerciseId);
  s.expanded = !s.expanded;
  if (s.expanded && !s.points) {
    await loadProgression(exerciseId);
  }
};

const searchExercises = () => {
  // User modifying input invalidates previous pick to avoid id/text mismatch
  pickedExerciseId.value = null;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    if (!searchText.value.trim()) {
      searchResults.value = [];
      return;
    }
    searching.value = true;
    const res = await api
      .get("/exercises", { params: { search: searchText.value, limit: 15 } })
      .catch(() => null);
    searchResults.value =
      res?.data?.data?.exercises || res?.data?.data || [];
    searching.value = false;
  }, 250);
};

const pickExercise = (ex: { id: number; name: string }) => {
  pickedExerciseId.value = ex.id;
  searchResults.value = [];
  searchText.value = ex.name;
};

const openAddModal = () => {
  showAddModal.value = true;
  searchText.value = "";
  searchResults.value = [];
  pickedExerciseId.value = null;
  noteDraft.value = "";
};

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

const submitAdd = async () => {
  if (!pickedExerciseId.value) {
    toast.error("Seleziona un esercizio dalla lista");
    return;
  }
  saving.value = true;
  try {
    await api.post(`/clients/${props.clientId}/key-exercises`, {
      exerciseId: pickedExerciseId.value,
      note: noteDraft.value || null,
    });
    toast.success("Esercizio fondamentale aggiunto");
    showAddModal.value = false;
    await loadList();
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore aggiunta";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};

const removeKey = async (exerciseId: number, name: string) => {
  if (!confirm(`Rimuovere "${name}" dagli esercizi fondamentali?`)) return;
  try {
    await api.delete(`/clients/${props.clientId}/key-exercises/${exerciseId}`);
    toast.success("Rimosso");
    delete stateById.value[exerciseId];
    await loadList();
  } catch {
    toast.error("Errore rimozione");
  }
};

const chartDataFor = (exerciseId: number) => {
  const points = stateById.value[exerciseId]?.points || [];
  return {
    labels: points.map((p) => formatDate(p.date)),
    datasets: [
      {
        label: "1RM stimato (Epley)",
        data: points.map((p) => p.estimated_1rm),
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.2)",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#06b6d4",
      },
    ],
  };
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number }; dataIndex: number }) => {
          return `${ctx.parsed.y} kg`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      grid: { color: "rgba(128,128,128,0.15)" },
      ticks: { color: "#9ca3af" },
    },
    x: {
      grid: { display: false },
      ticks: { color: "#9ca3af", maxRotation: 45, minRotation: 45 },
    },
  },
};

interface DeltaInfo {
  current: number;
  delta: number;
  sign: string;
  cls: string;
}

const computeDelta = (
  points: { estimated_1rm: number }[] | undefined,
): DeltaInfo | null => {
  if (!points || points.length < 2) return null;
  const first = points[0].estimated_1rm;
  const last = points[points.length - 1].estimated_1rm;
  const delta = Math.round((last - first) * 10) / 10;
  return {
    current: last,
    delta,
    sign: delta > 0 ? "+" : "",
    cls:
      delta > 0
        ? "text-habit-success"
        : delta < 0
          ? "text-red-400"
          : "text-habit-text-subtle",
  };
};

const deltaByExerciseId = computed<Record<number, DeltaInfo | null>>(() => {
  const result: Record<number, DeltaInfo | null> = {};
  for (const ke of keyExercises.value) {
    result[ke.exercise_id] = computeDelta(
      stateById.value[ke.exercise_id]?.points,
    );
  }
  return result;
});
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-habit-text">
          Esercizi fondamentali
        </h3>
        <p class="text-[11px] text-habit-text-subtle">
          Traccia la progressione del 1RM stimato (formula Epley) sugli esercizi
          chiave del cliente
        </p>
      </div>
      <button
        @click="openAddModal"
        class="px-3 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded-lg hover:bg-habit-orange transition-colors"
      >
        + Aggiungi
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in 2"
        :key="i"
        class="h-14 bg-habit-skeleton rounded animate-pulse"
      ></div>
    </div>

    <div
      v-else-if="keyExercises.length === 0"
      class="py-6 text-center text-habit-text-subtle text-sm border border-habit-border rounded-lg"
    >
      <p>Nessun esercizio fondamentale</p>
      <p class="text-xs mt-1">
        Aggiungi squat, panca, stacco o altri movimenti chiave per monitorarne la
        progressione.
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="ke in keyExercises"
        :key="ke.id"
        class="border border-habit-border rounded-lg overflow-hidden"
      >
        <div
          class="px-3 py-2 flex items-center gap-2 bg-habit-bg hover:bg-habit-card-hover cursor-pointer"
          @click="toggle(ke.exercise_id)"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-habit-text truncate">
              {{ ke.exercise_name }}
            </p>
            <p
              v-if="ke.note"
              class="text-[11px] text-habit-text-subtle truncate"
            >
              {{ ke.note }}
            </p>
          </div>
          <div
            v-if="deltaByExerciseId[ke.exercise_id]"
            class="text-right tabular-nums flex-shrink-0"
          >
            <p class="text-sm font-semibold text-habit-text">
              {{ deltaByExerciseId[ke.exercise_id]?.current }}
              <span class="text-[10px] font-normal text-habit-text-subtle">kg</span>
            </p>
            <p
              class="text-[10px] font-medium"
              :class="deltaByExerciseId[ke.exercise_id]?.cls"
            >
              {{ deltaByExerciseId[ke.exercise_id]?.sign
              }}{{ deltaByExerciseId[ke.exercise_id]?.delta }} kg
            </p>
          </div>
          <button
            @click.stop="removeKey(ke.exercise_id, ke.exercise_name)"
            class="p-1 text-red-400 hover:text-red-500 text-xs"
            :aria-label="'Rimuovi ' + ke.exercise_name"
          >
            ✕
          </button>
          <svg
            class="w-3.5 h-3.5 text-habit-text-subtle transition-transform flex-shrink-0"
            :class="stateById[ke.exercise_id]?.expanded ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div v-if="stateById[ke.exercise_id]?.expanded" class="p-3 bg-habit-card">
          <div
            v-if="stateById[ke.exercise_id]?.loading"
            class="h-40 bg-habit-skeleton rounded animate-pulse"
          ></div>
          <div
            v-else-if="!stateById[ke.exercise_id]?.points?.length"
            class="py-6 text-center text-xs text-habit-text-subtle"
          >
            Nessun dato di progressione. Il grafico si popola quando il cliente
            completa sessioni con questo esercizio.
          </div>
          <ChartWidget
            v-else
            type="line"
            :chart-data="chartDataFor(ke.exercise_id)"
            :chart-options="chartOptions"
            height="200px"
          />
        </div>
      </div>
    </div>

    <!-- Add modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="showAddModal = false"
    >
      <div
        class="bg-habit-card border border-habit-border rounded-xl max-w-md w-full p-5 space-y-3"
      >
        <h3 class="text-base font-semibold text-habit-text">
          Aggiungi esercizio fondamentale
        </h3>

        <div class="relative">
          <label class="block text-xs text-habit-text-subtle mb-1"
            >Cerca esercizio</label
          >
          <input
            v-model="searchText"
            @input="searchExercises"
            type="text"
            placeholder="Es. squat, panca piana, stacco..."
            class="w-full px-3 py-2 bg-habit-bg border border-habit-border text-sm text-habit-text rounded focus:outline-none focus:border-habit-cyan"
          />
          <div
            v-if="searchResults.length > 0"
            class="absolute z-10 mt-1 w-full bg-habit-card border border-habit-border rounded shadow-lg max-h-48 overflow-y-auto"
          >
            <button
              v-for="ex in searchResults"
              :key="ex.id"
              type="button"
              @click="pickExercise(ex)"
              class="w-full text-left px-3 py-2 hover:bg-habit-card-hover text-sm border-b border-habit-border last:border-0"
            >
              <span class="text-habit-text">{{ ex.name }}</span>
              <span
                v-if="ex.category"
                class="text-[10px] text-habit-text-subtle ml-2"
              >
                {{ ex.category }}
              </span>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs text-habit-text-subtle mb-1"
            >Nota (opz.)</label
          >
          <input
            v-model="noteDraft"
            type="text"
            maxlength="255"
            placeholder="Es. 'Strength primario mesociclo 1'"
            class="w-full px-3 py-2 bg-habit-bg border border-habit-border text-sm text-habit-text rounded focus:outline-none focus:border-habit-cyan"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="showAddModal = false"
            class="px-3 py-1.5 text-sm text-habit-text-subtle hover:text-habit-text"
          >
            Annulla
          </button>
          <button
            @click="submitAdd"
            :disabled="!pickedExerciseId || saving"
            class="px-4 py-1.5 bg-habit-cyan text-white text-sm font-medium rounded hover:bg-habit-orange disabled:opacity-50"
          >
            {{ saving ? "Salvataggio..." : "Aggiungi" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
