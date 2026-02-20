<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { useMeasurementStore } from "@/store/measurement";
import { useSlowRequest } from "@/composables/useSlowRequest";
import { useToast } from "vue-toastification";
import BodyCompositionChart from "@/components/measurements/BodyCompositionChart.vue";
import MeasurementFormCard from "@/components/measurements/MeasurementFormCard.vue";
import MeasurementComparison from "@/components/measurements/MeasurementComparison.vue";
import MeasurementHistory from "@/components/measurements/MeasurementHistory.vue";
import type { Client, MeasurementType } from "@/types";

interface ClientDetail extends Omit<Client, "status" | "fitness_level"> {
  status: string;
  level?: number;
  xp_points?: number;
  streak_days?: number;
  height_cm?: number;
  current_weight_kg?: number;
  fitness_level?: string;
  primary_goal?: string;
  training_location?: string;
  last_workout_at?: string;
  medical_notes?: string;
  goals?: ClientGoal[];
}

interface ClientGoal {
  id: number;
  goal_type: string;
  target_value: number;
  current_value?: number;
  unit?: string;
}

interface ClientStats {
  totalWorkouts?: number;
  workoutsThisWeek?: number;
  totalMinutes?: number;
  avgDuration?: number;
}

interface TabItem {
  id: string;
  label: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const measurementStore = useMeasurementStore();

const client = ref<ClientDetail | null>(null);
const stats = ref<ClientStats | null>(null);
const isLoading = ref<boolean>(true);
const { isSlowRequest } = useSlowRequest(isLoading);
const activeTab = ref<string>("overview");

// Measurement state
const saving = ref<string | null>(null);
const editingRecord = ref<{
  type: MeasurementType;
  record: Record<string, any>;
} | null>(null);
const measurementsInitialized = ref(false);

const tabs: TabItem[] = [
  { id: "overview", label: "Panoramica" },
  { id: "workouts", label: "Allenamenti" },
  { id: "progress", label: "Progressi" },
  { id: "nutrition", label: "Nutrizione" },
];

const clientId = computed(() => route.params.id);

onMounted(async () => {
  await loadClient();
});

const loadClient = async () => {
  isLoading.value = true;
  try {
    const [clientRes, statsRes] = await Promise.all([
      api.get(`/clients/${clientId.value}`),
      api
        .get(`/clients/${clientId.value}/stats`)
        .catch(() => ({ data: { data: { stats: {} } } })),
    ]);

    client.value = clientRes.data.data.client;
    stats.value = statsRes.data.data.stats;
  } catch (error: any) {
    console.error("Error loading client:", error);
    if (error.response?.status === 404) {
      router.push("/clients");
    }
  } finally {
    isLoading.value = false;
  }
};

const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    active: "bg-habit-success/20 text-habit-success",
    inactive: "bg-habit-skeleton text-habit-text-subtle",
    paused: "bg-habit-orange/20 text-habit-orange",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return classes[status] || classes.inactive;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: "Attivo",
    inactive: "Inattivo",
    paused: "In pausa",
    cancelled: "Cancellato",
  };
  return labels[status] || status;
};

const getFitnessLevelLabel = (level: string | undefined): string => {
  if (!level) return "-";
  const labels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzato",
    elite: "Elite",
  };
  return labels[level] || level;
};

const getGoalLabel = (goal: string | undefined): string => {
  if (!goal) return "-";
  const labels: Record<string, string> = {
    weight_loss: "Perdita peso",
    muscle_gain: "Aumento massa",
    strength: "Forza",
    endurance: "Resistenza",
    flexibility: "Flessibilita",
    general_fitness: "Fitness generale",
    sport_specific: "Sport specifico",
  };
  return labels[goal] || goal;
};

const formatDate = (date: string | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("it-IT");
};

const calculateAge = (dob: string | undefined): string => {
  if (!dob) return "-";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age + " anni";
};

const goBack = () => {
  router.push("/clients");
};

const sendMessage = () => {
  router.push(`/chat?client=${clientId.value}`);
};

const createWorkout = () => {
  router.push(`/workouts/builder?client=${clientId.value}`);
};

// === Measurements: load when progress tab is activated ===
const initMeasurements = async () => {
  if (!clientId.value || measurementsInitialized.value) return;
  measurementsInitialized.value = true;
  await measurementStore.setClient(Number(clientId.value));
};

watch(activeTab, (tab) => {
  if (tab === "progress") initMeasurements();
});

// Quick stats for measurements
const measurementStats = computed(() => {
  const o = measurementStore.overview;
  return [
    {
      label: "Peso",
      value: o?.body?.weight_kg ?? o?.anthropometric?.weight_kg ?? null,
      suffix: "kg",
      color: "text-habit-text",
      dotColor: "bg-blue-500",
    },
    {
      label: "% Grasso",
      value:
        o?.bia?.fat_mass_pct ??
        o?.skinfold?.body_fat_percentage ??
        o?.body?.body_fat_percentage ??
        null,
      suffix: "%",
      color: "text-habit-orange",
      dotColor: "bg-habit-orange",
    },
    {
      label: "Massa Magra",
      value: o?.bia?.lean_mass_kg ?? o?.body?.muscle_mass_kg ?? null,
      suffix: "kg",
      color: "text-habit-success",
      dotColor: "bg-habit-success",
    },
    {
      label: "BMR",
      value: o?.bia?.basal_metabolic_rate ?? null,
      suffix: "kcal",
      color: "text-habit-purple",
      dotColor: "bg-habit-purple",
    },
  ];
});

// Stat row tap → open forms section and scroll to the relevant form
const openFormForStat = (statLabel: string) => {
  const typeMap: Record<string, string> = {
    Peso: "body",
    "% Grasso": "bia",
    "Massa Magra": "bia",
    BMR: "bia",
  };
  const type = typeMap[statLabel];
  if (!type) return;
  const details = document.getElementById(
    "details-forms",
  ) as HTMLDetailsElement;
  if (details) details.open = true;
  setTimeout(() => {
    const el = document.getElementById(`form-${type}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
};

// Measurement form handlers
const handleFormSave = async (
  type: MeasurementType,
  data: Record<string, any>,
) => {
  saving.value = type;
  let result;
  try {
    if (editingRecord.value && editingRecord.value.type === type) {
      const id = editingRecord.value.record.id;
      switch (type) {
        case "anthropometric":
          result = await measurementStore.updateAnthropometric(id, data);
          break;
        case "body":
          result = await measurementStore.updateBody(id, data);
          break;
        case "circumferences":
          result = await measurementStore.updateCircumference(id, data);
          break;
        case "skinfolds":
          result = await measurementStore.updateSkinfold(id, data);
          break;
        case "bia":
          result = await measurementStore.updateBia(id, data);
          break;
      }
      if (result?.success) {
        toast.success("Misurazione aggiornata");
        editingRecord.value = null;
        setTimeout(() => {
          document.getElementById("progress-stats")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else {
        toast.error(result?.message || "Errore aggiornamento");
      }
    } else {
      switch (type) {
        case "anthropometric":
          result = await measurementStore.createAnthropometric(data);
          break;
        case "body":
          result = await measurementStore.createBody(data);
          break;
        case "circumferences":
          result = await measurementStore.createCircumference(data);
          break;
        case "skinfolds":
          result = await measurementStore.createSkinfold(data);
          break;
        case "bia":
          result = await measurementStore.createBia(data);
          break;
      }
      if (result?.success) {
        toast.success("Misurazione salvata");
        setTimeout(() => {
          document.getElementById("progress-stats")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else {
        toast.error(result?.message || "Errore salvataggio");
      }
    }
  } finally {
    saving.value = null;
  }
};

const handleFormCancel = () => {
  editingRecord.value = null;
};

const handleHistoryEdit = (
  type: MeasurementType,
  record: Record<string, any>,
) => {
  editingRecord.value = { type, record };
  const details = document.getElementById(
    "details-forms",
  ) as HTMLDetailsElement;
  if (details) details.open = true;
  setTimeout(() => {
    const el = document.getElementById(`form-${type}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
};

const handleHistoryDelete = async (type: MeasurementType, id: number) => {
  let result;
  switch (type) {
    case "anthropometric":
      result = await measurementStore.deleteAnthropometric(id);
      break;
    case "body":
      result = await measurementStore.deleteBody(id);
      break;
    case "circumferences":
      result = await measurementStore.deleteCircumference(id);
      break;
    case "skinfolds":
      result = await measurementStore.deleteSkinfold(id);
      break;
    case "bia":
      result = await measurementStore.deleteBia(id);
      break;
  }
  if (result?.success) {
    toast.success("Misurazione eliminata");
    if (editingRecord.value?.record?.id === id) editingRecord.value = null;
  } else {
    toast.error("Errore nell'eliminazione");
  }
};
</script>

<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- Loading -->
    <div v-if="isLoading" class="animate-pulse space-y-3">
      <div class="h-6 bg-habit-skeleton rounded w-1/3"></div>
      <div class="h-16 bg-habit-skeleton rounded-lg"></div>
      <div class="grid grid-cols-4 gap-2">
        <div v-for="i in 4" :key="i" class="h-12 bg-habit-skeleton rounded-lg"></div>
      </div>
    </div>
    <p v-if="isSlowRequest" class="text-sm text-habit-text-subtle text-center mt-2">
      La richiesta sta impiegando piu tempo del previsto...
    </p>

    <!-- Content -->
    <template v-else-if="client">
      <!-- Compact header: back + name + actions inline -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <button
            @click="goBack"
            class="p-1.5 text-habit-text-subtle hover:text-habit-text rounded-lg flex-shrink-0"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="min-w-0">
            <h1 class="text-base sm:text-xl font-bold text-habit-text truncate">
              {{ client.first_name }} {{ client.last_name }}
            </h1>
            <div class="flex items-center gap-2 text-xs text-habit-text-subtle">
              <span :class="getStatusBadgeClass(client.status)" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                {{ getStatusLabel(client.status) }}
              </span>
              <span>Lv.{{ client.level || 1 }}</span>
              <span>{{ client.xp_points || 0 }} XP</span>
              <span v-if="client.streak_days" class="text-orange-500 font-semibold">{{ client.streak_days }}d</span>
            </div>
          </div>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button @click="sendMessage" class="p-2 border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button @click="createWorkout" class="p-2 bg-habit-cyan text-white rounded-lg hover:bg-cyan-500">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Contact + info: single compact row -->
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-habit-text-subtle px-1">
        <span v-if="client.email" class="truncate max-w-[200px]">{{ client.email }}</span>
        <span v-if="client.phone">{{ client.phone }}</span>
        <span v-if="client.height_cm">{{ client.height_cm }} cm</span>
        <span v-if="client.current_weight_kg">{{ client.current_weight_kg }} kg</span>
        <span>{{ getGoalLabel(client.primary_goal) }}</span>
      </div>

      <!-- Stats: flat inline row -->
      <div class="flex justify-between px-1 text-center">
        <div>
          <p class="text-sm sm:text-lg font-bold text-habit-text">{{ stats?.totalWorkouts || 0 }}</p>
          <p class="text-[10px] text-habit-text-subtle">Workout</p>
        </div>
        <div>
          <p class="text-sm sm:text-lg font-bold text-habit-success">{{ stats?.workoutsThisWeek || 0 }}</p>
          <p class="text-[10px] text-habit-text-subtle">Settimana</p>
        </div>
        <div>
          <p class="text-sm sm:text-lg font-bold text-habit-blue">{{ stats?.totalMinutes || 0 }}</p>
          <p class="text-[10px] text-habit-text-subtle">Minuti</p>
        </div>
        <div>
          <p class="text-sm sm:text-lg font-bold text-habit-purple">{{ stats?.avgDuration || 0 }}<span class="text-[10px] font-normal">m</span></p>
          <p class="text-[10px] text-habit-text-subtle">Media</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-habit-bg border border-habit-border rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
        <nav class="flex border-b border-habit-border overflow-x-auto hide-scrollbar">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap text-center"
            :class="
              activeTab === tab.id
                ? 'border-habit-cyan text-habit-cyan'
                : 'border-transparent text-habit-text-subtle'
            "
          >
            {{ tab.label }}
          </button>
        </nav>

        <div class="p-3 sm:p-5">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'">
            <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div class="flex justify-between">
                <span class="text-habit-text-subtle">Eta</span>
                <span class="text-habit-text">{{ calculateAge(client.date_of_birth) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-habit-text-subtle">Genere</span>
                <span class="text-habit-text capitalize">{{ client.gender || "-" }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-habit-text-subtle">Livello</span>
                <span class="text-habit-text">{{ getFitnessLevelLabel(client.fitness_level) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-habit-text-subtle">Modalita</span>
                <span class="text-habit-text capitalize">{{ client.training_location || "-" }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-habit-text-subtle">Cliente dal</span>
                <span class="text-habit-text">{{ formatDate(client.created_at) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-habit-text-subtle">Ultimo workout</span>
                <span class="text-habit-text">{{ formatDate(client.last_workout_at) }}</span>
              </div>
            </div>

            <!-- Notes (compact) -->
            <div v-if="client.medical_notes" class="mt-3 p-2.5 bg-yellow-500/10 rounded-lg">
              <p class="text-xs text-yellow-600"><span class="font-medium">Note mediche:</span> {{ client.medical_notes }}</p>
            </div>
            <div v-if="client.notes" class="mt-2 p-2.5 bg-habit-card-hover/50 rounded-lg">
              <p class="text-xs text-habit-text-muted">{{ client.notes }}</p>
            </div>

            <!-- Goals -->
            <div v-if="client.goals && client.goals.length > 0" class="mt-3 space-y-2">
              <div
                v-for="goal in client.goals"
                :key="goal.id"
                class="flex items-center gap-3"
              >
                <span class="text-xs text-habit-text flex-shrink-0">{{ goal.goal_type }}</span>
                <div class="flex-1 bg-habit-skeleton rounded-full h-1.5">
                  <div
                    class="bg-habit-cyan h-1.5 rounded-full"
                    :style="{ width: (goal.target_value ? Math.min(((goal.current_value || 0) / goal.target_value) * 100, 100) : 0) + '%' }"
                  ></div>
                </div>
                <span class="text-[10px] text-habit-text-subtle flex-shrink-0">{{ goal.current_value || 0 }}/{{ goal.target_value }}{{ goal.unit }}</span>
              </div>
            </div>
          </div>

          <!-- Workouts Tab -->
          <div v-if="activeTab === 'workouts'" class="text-center py-6 text-habit-text-subtle">
            <p class="text-sm">Sezione allenamenti in arrivo</p>
            <button @click="createWorkout" class="mt-3 px-4 py-1.5 bg-habit-cyan text-white text-sm rounded-lg hover:bg-cyan-500">
              Crea prima scheda
            </button>
          </div>

          <!-- Progress Tab -->
          <div v-if="activeTab === 'progress'" class="space-y-2">
            <!-- Loading -->
            <div v-if="measurementStore.overviewLoading" class="space-y-1.5">
              <div v-for="i in 4" :key="i" class="h-5 bg-habit-skeleton rounded animate-pulse"></div>
            </div>

            <!-- Quick Stats: tappable rows → scroll to form -->
            <div v-else id="progress-stats" class="divide-y divide-habit-border/50">
              <div
                v-for="stat in measurementStats"
                :key="stat.label"
                role="button"
                tabindex="0"
                @click="openFormForStat(stat.label)"
                @keydown.enter="openFormForStat(stat.label)"
                @keydown.space.prevent="openFormForStat(stat.label)"
                class="flex items-center justify-between py-2 -mx-1 px-1 rounded transition-all cursor-pointer select-none
                       active:bg-habit-card-hover active:scale-[0.98]
                       hover:bg-habit-card-hover/30
                       focus-visible:ring-2 focus-visible:ring-habit-orange focus-visible:ring-offset-1"
              >
                <div class="flex items-center gap-1.5">
                  <span class="w-1 h-1 rounded-full flex-shrink-0" :class="stat.dotColor"></span>
                  <span class="text-xs text-habit-text">{{ stat.label }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-semibold tabular-nums" :class="stat.color">
                    {{ stat.value != null ? `${stat.value}` : "-" }}<span v-if="stat.value != null" class="text-[10px] font-normal ml-0.5 text-habit-text-muted">{{ stat.suffix }}</span>
                  </span>
                  <svg class="w-3 h-3 text-habit-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                </div>
              </div>
            </div>

            <!-- Chart: compact -->
            <BodyCompositionChart
              :body-measurements="measurementStore.bodyMeasurements"
              :bia-measurements="measurementStore.biaMeasurements"
              :skinfolds="measurementStore.skinfolds"
              :circumferences="measurementStore.circumferences"
              :loading="measurementStore.bodyLoading || measurementStore.biaLoading"
            />

            <!-- Action rows: flat links -->
            <div class="divide-y divide-habit-border/50 text-xs">
              <details class="group">
                <summary class="flex items-center justify-between cursor-pointer py-2 text-habit-text font-medium select-none">
                  Confronto date
                  <svg class="w-3.5 h-3.5 text-habit-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div class="pb-2"><MeasurementComparison /></div>
              </details>
              <details id="details-forms" class="group">
                <summary class="flex items-center justify-between cursor-pointer py-2 text-habit-text font-medium select-none">
                  Inserisci misurazioni
                  <svg class="w-3.5 h-3.5 text-habit-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div class="space-y-1.5 pb-2">
                  <div id="form-anthropometric"><MeasurementFormCard type="anthropometric" title="Antropometria" accent-color="#3b82f6" icon-emoji="" :saving="saving === 'anthropometric'" :editing-record="editingRecord?.type === 'anthropometric' ? editingRecord.record : null" @save="(data: Record<string, any>) => handleFormSave('anthropometric', data)" @cancel="handleFormCancel" @delete="(id: number) => handleHistoryDelete('anthropometric', id)" /></div>
                  <div id="form-body"><MeasurementFormCard type="body" title="Peso & Composizione" accent-color="#06b6d4" icon-emoji="" :saving="saving === 'body'" :editing-record="editingRecord?.type === 'body' ? editingRecord.record : null" @save="(data: Record<string, any>) => handleFormSave('body', data)" @cancel="handleFormCancel" @delete="(id: number) => handleHistoryDelete('body', id)" /></div>
                  <div id="form-circumferences"><MeasurementFormCard type="circumferences" title="Circonferenze" accent-color="#22c55e" icon-emoji="" :saving="saving === 'circumferences'" :editing-record="editingRecord?.type === 'circumferences' ? editingRecord.record : null" @save="(data: Record<string, any>) => handleFormSave('circumferences', data)" @cancel="handleFormCancel" @delete="(id: number) => handleHistoryDelete('circumferences', id)" /></div>
                  <div id="form-skinfolds"><MeasurementFormCard type="skinfolds" title="Plicometria" accent-color="#f97316" icon-emoji="" :saving="saving === 'skinfolds'" :editing-record="editingRecord?.type === 'skinfolds' ? editingRecord.record : null" @save="(data: Record<string, any>) => handleFormSave('skinfolds', data)" @cancel="handleFormCancel" @delete="(id: number) => handleHistoryDelete('skinfolds', id)" /></div>
                  <div id="form-bia"><MeasurementFormCard type="bia" title="BIA (Bioimpedenza)" accent-color="#8b5cf6" icon-emoji="" :saving="saving === 'bia'" :editing-record="editingRecord?.type === 'bia' ? editingRecord.record : null" @save="(data: Record<string, any>) => handleFormSave('bia', data)" @cancel="handleFormCancel" @delete="(id: number) => handleHistoryDelete('bia', id)" /></div>
                </div>
              </details>
              <details class="group">
                <summary class="flex items-center justify-between cursor-pointer py-2 text-habit-text font-medium select-none">
                  Storico misurazioni
                  <svg class="w-3.5 h-3.5 text-habit-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div class="pb-2">
                  <MeasurementHistory :anthropometric="measurementStore.anthropometric" :body-measurements="measurementStore.bodyMeasurements" :circumferences="measurementStore.circumferences" :skinfolds="measurementStore.skinfolds" :bia-measurements="measurementStore.biaMeasurements" @edit="handleHistoryEdit" @delete="handleHistoryDelete" />
                </div>
              </details>
            </div>
          </div>

          <!-- Nutrition Tab -->
          <div v-if="activeTab === 'nutrition'" class="text-center py-6 text-habit-text-subtle">
            <p class="text-sm">Sezione nutrizione in arrivo</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
