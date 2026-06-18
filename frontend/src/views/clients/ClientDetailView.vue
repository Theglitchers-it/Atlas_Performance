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
import ClientProgramsTab from "@/components/clients/ClientProgramsTab.vue";
import ClientSubscriptionsTab from "@/components/clients/ClientSubscriptionsTab.vue";
import ProgressPhotoGallery from "@/components/clients/ProgressPhotoGallery.vue";
import ProgressPhotoUpload from "@/components/clients/ProgressPhotoUpload.vue";
import ProgressPhotoCompare from "@/components/clients/ProgressPhotoCompare.vue";
import DormantClientFollowUpModal from "@/components/clients/DormantClientFollowUpModal.vue";
import ClientTagsManager from "@/components/clients/ClientTagsManager.vue";
import ClientInjuriesList from "@/components/clients/ClientInjuriesList.vue";
import ClientFilesList from "@/components/clients/ClientFilesList.vue";
import ClientFileUpload from "@/components/clients/ClientFileUpload.vue";
import ClientFoodLogTab from "@/components/clients/ClientFoodLogTab.vue";
import ClientHealthSnapshotWidget from "@/components/clients/ClientHealthSnapshotWidget.vue";
import ClientVolumeAnalysisTab from "@/components/clients/ClientVolumeAnalysisTab.vue";
import ClientKeyExercisesPanel from "@/components/clients/ClientKeyExercisesPanel.vue";
import ClientActivationToggle from "@/components/clients/ClientActivationToggle.vue";
import ClientTrainersPanel from "@/components/clients/ClientTrainersPanel.vue";
import {
  formatDate,
  dateOnly,
  getDietPhaseLabel,
  getDietPhaseBadgeClass,
} from "@/composables/useFormatters";
import type { Client, Injury, MeasurementType, ProgressPhoto } from "@/types";

interface ClientDetail extends Client {
  level?: number;
  xp_points?: number;
  streak_days?: number;
  height_cm?: number;
  current_weight_kg?: number;
  training_location?: string;
  medical_notes?: string;
  goals?: ClientGoal[];
  injuries?: Injury[];
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
  { id: "programs", label: "Programmi" },
  { id: "workouts", label: "Allenamenti" },
  { id: "progress", label: "Progressi" },
  { id: "volume", label: "Volume" },
  { id: "photos", label: "Foto" },
  { id: "files", label: "File" },
  { id: "nutrition", label: "Nutrizione" },
  { id: "subscriptions", label: "Abbonamenti" },
];


const clientId = computed<string>(() => {
  const id = route.params.id;
  return Array.isArray(id) ? id[0] : id;
});

// ── Foto progresso ──
const photos = ref<ProgressPhoto[]>([]);
const photosLoading = ref(false);
const showPhotoUpload = ref(false);

const uniquePhotoDatesCount = computed(
  () => new Set(photos.value.map((p) => dateOnly(p.taken_at))).size,
);

const loadPhotos = async () => {
  if (!clientId.value) return;
  photosLoading.value = true;
  const res = await api
    .get(`/progress/${clientId.value}/photos`, { params: { limit: 100 } })
    .catch(() => null);
  photos.value = res?.data?.data?.photos || [];
  photosLoading.value = false;
};

watch(
  [activeTab, clientId],
  ([tab, id]) => {
    if (tab === "photos" && id) loadPhotos();
  },
  { immediate: true },
);

const onPhotoUploaded = () => {
  showPhotoUpload.value = false;
  loadPhotos();
};

const showFileUpload = ref(false);
const filesListRef = ref<{ loadFiles: () => Promise<void> } | null>(null);
const onFileUploaded = () => {
  showFileUpload.value = false;
  filesListRef.value?.loadFiles();
};

// Follow-up modal
const showFollowUpModal = ref(false);
const isDormant = computed(() =>
  (client.value?.tags || []).includes("dormiente"),
);

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

// Fase 2: callback dopo activate/deactivate (aggiorna UI senza refetch completo)
const onActivationChanged = (newStatus: 'active' | 'inactive') => {
  if (client.value) {
    client.value.status = newStatus;
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

// === Workout sessions per atleta (tab "Allenamenti") ===
interface WorkoutSession {
  id: number;
  status: 'completed' | 'skipped' | 'in_progress' | string;
  started_at: string;
  duration_minutes?: number | null;
  xp_earned?: number | null;
  template_name?: string | null;
}
const workoutSessions = ref<WorkoutSession[]>([]);
const workoutSessionsLoading = ref(false);
const workoutStatusFilter = ref<string>("");

const loadWorkoutSessions = async () => {
  if (!clientId.value) return;
  workoutSessionsLoading.value = true;
  try {
    const params: Record<string, any> = { limit: 20, page: 1 };
    if (workoutStatusFilter.value) params.status = workoutStatusFilter.value;
    const res = await api.get(`/sessions/client/${clientId.value}`, { params });
    workoutSessions.value = res.data?.data?.sessions || [];
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "Errore caricamento sessioni");
    workoutSessions.value = [];
  } finally {
    workoutSessionsLoading.value = false;
  }
};

const openSessionDetail = (sessionId: number) => {
  router.push(`/sessions/${sessionId}`);
};

const workoutStatusLabel = (s: string): string => ({
  completed: "Completata",
  skipped: "Saltata",
  in_progress: "In corso",
}[s] || s);

const workoutStatusBadge = (s: string): string => ({
  completed: "bg-green-500/20 text-green-400",
  skipped: "bg-red-500/20 text-red-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
}[s] || "bg-habit-skeleton/50 text-habit-text-subtle");

const formatWorkoutDate = (iso: string): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
};

// === Measurements: load when progress tab is activated ===
const initMeasurements = async () => {
  if (!clientId.value || measurementsInitialized.value) return;
  measurementsInitialized.value = true;
  await measurementStore.setClient(Number(clientId.value));
};

watch(activeTab, (tab) => {
  if (tab === "progress") initMeasurements();
  if (tab === "workouts" && workoutSessions.value.length === 0) loadWorkoutSessions();
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
      <!-- Hero header cliente (glass-mesh 2026) -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-habit-card via-habit-card to-habit-bg-light/40 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-4 sm:p-5">
        <div class="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-habit-orange/15 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-habit-cyan/10 blur-3xl"></div>
        <div class="relative">
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
                <div class="flex items-center gap-2 text-xs text-habit-text-subtle flex-wrap">
                  <span :class="getStatusBadgeClass(client.status)" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                    {{ getStatusLabel(client.status) }}
                  </span>
                  <ClientActivationToggle
                    :client-id="client.id"
                    :status="client.status"
                    @changed="onActivationChanged"
                  />
                  <span>Lv.{{ client.level || 1 }}</span>
                  <span>{{ client.xp_points || 0 }} XP</span>
                  <span v-if="client.streak_days" class="text-orange-500 font-semibold">{{ client.streak_days }}d</span>
                </div>
              </div>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
              <button @click="sendMessage" class="p-2 border border-white/10 bg-habit-card/60 rounded-lg text-habit-text-muted hover:bg-habit-card-hover">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button @click="createWorkout" class="p-2 bg-habit-cyan text-white rounded-lg hover:bg-cyan-500 shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Contact + info: single compact row -->
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-habit-text-subtle">
            <span v-if="client.email" class="truncate max-w-[200px]">{{ client.email }}</span>
            <span v-if="client.phone">{{ client.phone }}</span>
            <span v-if="client.height_cm">{{ client.height_cm }} cm</span>
            <span v-if="client.current_weight_kg">{{ client.current_weight_kg }} kg</span>
            <span>{{ getGoalLabel(client.primary_goal) }}</span>
          </div>

          <!-- Stats: divider + inline row -->
          <div class="mt-3 pt-3 border-t border-white/10 flex justify-between text-center">
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
        </div>
      </div>

      <!-- Fase 1: Pannello trainer/nutrizionisti assegnati (junction N:M) -->
      <ClientTrainersPanel :client-id="client.id" />

      <!-- Tabs (glass-mesh 2026) -->
      <div class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
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
            <ClientHealthSnapshotWidget
              :client-id="Number(clientId)"
              class="mb-4"
            />
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

            <!-- Anamnesi estesa -->
            <div
              v-if="
                client.sport_history ||
                client.occupation_type ||
                client.daily_steps_avg ||
                (client.joint_pain_areas && client.joint_pain_areas.length)
              "
              class="mt-4 pt-4 border-t border-habit-border space-y-2"
            >
              <h4 class="text-sm font-semibold text-habit-text">Anamnesi</h4>
              <div v-if="client.sport_history" class="text-xs">
                <span class="text-habit-text-subtle">Storico sportivo:</span>
                <p class="text-habit-text mt-0.5 whitespace-pre-wrap">
                  {{ client.sport_history }}
                </p>
              </div>
              <div
                v-if="client.occupation_type || client.daily_steps_avg"
                class="flex flex-wrap gap-4 text-xs"
              >
                <div v-if="client.occupation_type">
                  <span class="text-habit-text-subtle">Lavoro:</span>
                  <span class="text-habit-text ml-1 capitalize">{{
                    client.occupation_type.replace("_", " ")
                  }}</span>
                </div>
                <div v-if="client.daily_steps_avg">
                  <span class="text-habit-text-subtle">Passi/giorno:</span>
                  <span class="text-habit-text ml-1">{{
                    client.daily_steps_avg
                  }}</span>
                </div>
              </div>
              <div
                v-if="client.joint_pain_areas && client.joint_pain_areas.length"
                class="text-xs"
              >
                <span class="text-habit-text-subtle"
                  >Dolori articolari ricorrenti:</span
                >
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="area in client.joint_pain_areas"
                    :key="area"
                    class="px-1.5 py-0.5 text-[10px] bg-habit-orange/10 text-habit-orange border border-habit-orange/30 rounded-full capitalize"
                  >
                    {{ area }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Anamnesi nutrizionale -->
            <div
              v-if="
                client.previous_diets ||
                client.food_allergies ||
                (client.dietary_restrictions && client.dietary_restrictions.length) ||
                (client.current_diet_phase && client.current_diet_phase !== 'free') ||
                client.baseline_stress_level ||
                client.meals_per_day_habit
              "
              class="mt-4 pt-4 border-t border-habit-border space-y-2"
            >
              <h4 class="text-sm font-semibold text-habit-text">
                Anamnesi nutrizionale
              </h4>
              <div
                v-if="client.current_diet_phase && client.current_diet_phase !== 'free'"
                class="flex items-center gap-2 text-xs"
              >
                <span class="text-habit-text-subtle">Fase attuale:</span>
                <span
                  class="px-1.5 py-0.5 text-[10px] rounded-full font-semibold uppercase tracking-wider"
                  :class="getDietPhaseBadgeClass(client.current_diet_phase)"
                >
                  {{ getDietPhaseLabel(client.current_diet_phase) }}
                </span>
              </div>
              <div
                v-if="client.meals_per_day_habit || client.baseline_stress_level"
                class="flex flex-wrap gap-4 text-xs"
              >
                <div v-if="client.meals_per_day_habit">
                  <span class="text-habit-text-subtle">Pasti/giorno:</span>
                  <span class="text-habit-text ml-1">{{
                    client.meals_per_day_habit
                  }}</span>
                </div>
                <div v-if="client.baseline_stress_level">
                  <span class="text-habit-text-subtle">Stress iniziale:</span>
                  <span class="text-habit-text ml-1">{{
                    client.baseline_stress_level
                  }}/10</span>
                </div>
              </div>
              <div
                v-if="
                  client.dietary_restrictions &&
                  client.dietary_restrictions.length
                "
                class="text-xs"
              >
                <span class="text-habit-text-subtle">Restrizioni:</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="r in client.dietary_restrictions"
                    :key="r"
                    class="px-1.5 py-0.5 text-[10px] bg-habit-cyan/10 text-habit-cyan border border-habit-cyan/30 rounded-full capitalize"
                  >
                    {{ r }}
                  </span>
                </div>
              </div>
              <div v-if="client.food_allergies" class="text-xs">
                <span class="text-habit-text-subtle">Allergie:</span>
                <p class="text-habit-text mt-0.5 whitespace-pre-wrap">
                  {{ client.food_allergies }}
                </p>
              </div>
              <div v-if="client.previous_diets" class="text-xs">
                <span class="text-habit-text-subtle">Diete pregresse:</span>
                <p class="text-habit-text mt-0.5 whitespace-pre-wrap">
                  {{ client.previous_diets }}
                </p>
              </div>
            </div>

            <!-- Infortuni -->
            <div class="mt-4 pt-4 border-t border-habit-border">
              <ClientInjuriesList
                :client-id="Number(clientId)"
                :injuries="client.injuries || []"
                @changed="loadClient"
              />
            </div>

            <!-- Tag & Segmenti (fidelizzazione) -->
            <div class="mt-4 pt-4 border-t border-habit-border">
              <ClientTagsManager
                :client-id="Number(clientId)"
                @changed="loadClient"
              />
            </div>

            <!-- Azioni trainer: follow-up messaggio -->
            <div class="mt-4 pt-4 border-t border-habit-border">
              <button
                @click="showFollowUpModal = true"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                :class="
                  isDormant
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white'
                    : 'bg-habit-cyan/15 text-habit-cyan border border-habit-cyan/30 hover:bg-habit-cyan hover:text-white'
                "
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {{ isDormant ? "Recupera cliente dormiente" : "Invia messaggio follow-up" }}
              </button>
            </div>
          </div>

          <!-- Programs Tab -->
          <div v-if="activeTab === 'programs'">
            <ClientProgramsTab :client-id="clientId" />
          </div>

          <!-- Workouts Tab -->
          <div v-if="activeTab === 'workouts'">
            <!-- Header con filtro status -->
            <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 class="text-sm font-semibold text-habit-text">Storico Allenamenti</h3>
              <div class="flex items-center gap-2">
                <select
                  v-model="workoutStatusFilter"
                  @change="loadWorkoutSessions"
                  class="text-xs bg-habit-card border border-habit-border rounded-lg px-2 py-1 text-habit-text focus:outline-none focus:border-habit-orange"
                >
                  <option value="">Tutte</option>
                  <option value="completed">Completate</option>
                  <option value="skipped">Saltate</option>
                  <option value="in_progress">In corso</option>
                </select>
                <button @click="createWorkout" class="px-3 py-1 bg-habit-cyan text-white text-xs rounded-lg hover:bg-cyan-500">
                  + Scheda
                </button>
              </div>
            </div>

            <!-- Loading -->
            <div v-if="workoutSessionsLoading" class="space-y-2">
              <div v-for="i in 3" :key="i" class="h-16 bg-habit-skeleton rounded-xl animate-pulse"></div>
            </div>

            <!-- Empty -->
            <div v-else-if="workoutSessions.length === 0" class="text-center py-8 text-habit-text-subtle">
              <div class="text-3xl mb-2">&#127947;</div>
              <p class="text-sm">Nessuna sessione registrata</p>
              <p class="text-xs mt-1">Le sessioni completate dall'atleta appariranno qui.</p>
            </div>

            <!-- Lista sessioni (timeline cronologica) -->
            <div v-else class="space-y-2">
              <div
                v-for="s in workoutSessions"
                :key="s.id"
                @click="openSessionDetail(s.id)"
                class="bg-habit-card border border-habit-border rounded-xl p-3 hover:border-habit-orange/40 cursor-pointer transition-colors"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-medium text-habit-text truncate">
                        {{ s.template_name || 'Sessione libera' }}
                      </span>
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        :class="workoutStatusBadge(s.status)"
                      >
                        {{ workoutStatusLabel(s.status) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-habit-text-subtle">
                      <span>&#128197; {{ formatWorkoutDate(s.started_at) }}</span>
                      <span v-if="s.duration_minutes">&#9201; {{ s.duration_minutes }} min</span>
                      <span v-if="s.xp_earned">&#11088; +{{ s.xp_earned }} XP</span>
                    </div>
                  </div>
                  <svg class="w-4 h-4 text-habit-text-subtle flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
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

            <div class="mt-4 pt-4 border-t border-habit-border">
              <ClientKeyExercisesPanel :client-id="Number(clientId)" />
            </div>
          </div>

          <!-- Volume Analysis Tab (trainer-only) -->
          <div v-if="activeTab === 'volume'">
            <ClientVolumeAnalysisTab :client-id="Number(clientId)" />
          </div>

          <!-- Nutrition Tab -->
          <div v-if="activeTab === 'nutrition'">
            <ClientFoodLogTab :client-id="Number(clientId)" />
          </div>

          <!-- Subscriptions Tab -->
          <div v-if="activeTab === 'subscriptions' && client">
            <ClientSubscriptionsTab
              :client-id="Number(clientId)"
              :client-first-name="client.first_name"
              :client-last-name="client.last_name"
            />
          </div>

          <!-- Photos Tab -->
          <div v-if="activeTab === 'photos' && client" class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-habit-text">
                  Foto progresso
                </h3>
                <p class="text-xs text-habit-text-subtle mt-0.5">
                  {{ photos.length }} foto caricate &middot; mostra visivamente
                  i progressi durante i check
                </p>
              </div>
              <button
                @click="showPhotoUpload = true"
                class="px-3 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded-lg hover:bg-habit-orange transition-colors"
              >
                + Carica foto
              </button>
            </div>

            <ProgressPhotoGallery
              :photos="photos"
              :loading="photosLoading"
              @deleted="loadPhotos"
            />

            <div
              v-if="uniquePhotoDatesCount >= 2"
              class="pt-4 border-t border-habit-border"
            >
              <h3 class="text-base font-semibold text-habit-text mb-3">
                Confronto prima / dopo
              </h3>
              <ProgressPhotoCompare
                :client-id="Number(clientId)"
                :photos="photos"
              />
            </div>

            <ProgressPhotoUpload
              v-if="showPhotoUpload"
              :client-id="Number(clientId)"
              :client-name="`${client.first_name} ${client.last_name}`"
              @close="showPhotoUpload = false"
              @uploaded="onPhotoUploaded"
            />
          </div>

          <!-- Files Tab (Cartella Cliente Digitale) -->
          <div v-if="activeTab === 'files' && client" class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-habit-text">
                  Cartella cliente
                </h3>
                <p class="text-xs text-habit-text-subtle mt-0.5">
                  Documenti, certificati medici, contratti, piani nutrizionali
                </p>
              </div>
              <button
                @click="showFileUpload = true"
                class="px-3 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded-lg hover:bg-habit-orange transition-colors"
              >
                + Carica file
              </button>
            </div>

            <ClientFilesList
              ref="filesListRef"
              :client-id="Number(clientId)"
            />

            <ClientFileUpload
              v-if="showFileUpload"
              :client-id="Number(clientId)"
              :client-name="`${client.first_name} ${client.last_name}`"
              @close="showFileUpload = false"
              @uploaded="onFileUploaded"
            />
          </div>
        </div>
      </div>

      <DormantClientFollowUpModal
        v-if="showFollowUpModal && client"
        :client-id="Number(clientId)"
        :client-first-name="client.first_name"
        :client-last-name="client.last_name"
        :lifetime-months="client.lifetime_subscription_months"
        :days-since-last-sub-end="client.days_since_last_sub_end"
        @close="showFollowUpModal = false"
        @sent="showFollowUpModal = false"
      />
    </template>
  </div>
</template>
