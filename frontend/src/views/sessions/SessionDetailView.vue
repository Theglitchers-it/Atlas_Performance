<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionStore } from "@/store/session";
import { useToast } from "vue-toastification";
import { useNative } from "@/composables/useNative";

const _toast = useToast();
const { isMobile } = useNative();

const route = useRoute();
const router = useRouter();
const store = useSessionStore();

// Timer per durata live
const elapsedTimer = ref<any>(null);
const elapsedMinutes = ref(0);

// Form log set (uno per esercizio, indicizzato per sessionExerciseId)
const setForms = ref<Record<string, any>>({});

// Modal state
const showCompleteModal = ref(false);
const showSkipModal = ref(false);
const saving = ref(false);

// Complete form
const completeForm = ref({
  overallFeeling: "",
  notes: "",
});

// Skip form
const skipReason = ref("");

// Computed
const session = computed(() => store.currentSession as any);
const isLoading = computed(() => store.detailLoading);

const isInProgress = computed(() => session.value?.status === "in_progress");
const isCompleted = computed(() => session.value?.status === "completed");
const isSkipped = computed(() => session.value?.status === "skipped");

const sessionTitle = computed(() => {
  if (!session.value) return "";
  return session.value.template_name || "Sessione Libera";
});

const clientName = computed(() => {
  if (!session.value) return "";
  return `${session.value.client_first_name || ""} ${session.value.client_last_name || ""}`.trim();
});

// Progress: set completati vs totali prescritti
const progress = computed(() => {
  if (!session.value?.exercises) return { completed: 0, total: 0, percent: 0 };
  let completed = 0;
  let total = 0;
  for (const ex of session.value.exercises) {
    const prescribed = ex.prescribed_sets || 0;
    total += prescribed;
    completed += ex.sets?.length || 0;
  }
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
});

// Status helpers
const getStatusClasses = (status: any) => {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/20 text-emerald-400",
    in_progress: "bg-blue-500/20 text-blue-400",
    scheduled: "bg-habit-skeleton/50 text-habit-text-muted",
    skipped: "bg-red-500/20 text-red-400",
    partial: "bg-yellow-500/20 text-yellow-400",
  };
  return map[status] || "bg-habit-skeleton/50 text-habit-text-muted";
};

const getStatusLabel = (status: any) => {
  const map: Record<string, string> = {
    in_progress: "In Corso",
    completed: "Completata",
    skipped: "Saltata",
    partial: "Parziale",
    scheduled: "Pianificata",
  };
  return map[status] || status;
};

// Feeling helpers
const feelingOptions = [
  { value: "terrible", emoji: "😫", label: "Terribile" },
  { value: "bad", emoji: "😓", label: "Male" },
  { value: "okay", emoji: "😐", label: "Ok" },
  { value: "good", emoji: "😊", label: "Bene" },
  { value: "great", emoji: "💪", label: "Ottimo" },
];

const getFeelingEmoji = (feeling: any) => {
  const opt = feelingOptions.find((f) => f.value === feeling);
  return opt ? opt.emoji : "";
};

const getFeelingLabel = (feeling: any) => {
  const opt = feelingOptions.find((f) => f.value === feeling);
  return opt ? opt.label : feeling;
};

// Date formatting
const formatDateTime = (dateStr: any) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Elapsed timer
const startElapsedTimer = () => {
  if (!session.value?.started_at) return;
  const updateElapsed = () => {
    const start = new Date(session.value!.started_at).getTime();
    const now = Date.now();
    elapsedMinutes.value = Math.floor((now - start) / 60000);
  };
  updateElapsed();
  elapsedTimer.value = setInterval(updateElapsed, 30000); // aggiorna ogni 30s
};

const stopElapsedTimer = () => {
  if (elapsedTimer.value) {
    clearInterval(elapsedTimer.value);
    elapsedTimer.value = null;
  }
};

// Set form helpers
const getSetForm = (exerciseId: any) => {
  if (!setForms.value[exerciseId]) {
    const exercise = session.value?.exercises?.find(
      (e: any) => e.id === exerciseId,
    );
    const nextSetNumber = (exercise?.sets?.length || 0) + 1;
    setForms.value[exerciseId] = {
      repsCompleted: null,
      weightUsed: null,
      rpe: null,
      isWarmup: false,
      isFailure: false,
      notes: "",
      setNumber: nextSetNumber,
    };
  }
  return setForms.value[exerciseId];
};

const resetSetForm = (exerciseId: any) => {
  const exercise = session.value?.exercises?.find(
    (e: any) => e.id === exerciseId,
  );
  const nextSetNumber = (exercise?.sets?.length || 0) + 1;
  setForms.value[exerciseId] = {
    repsCompleted: null,
    weightUsed: null,
    rpe: null,
    isWarmup: false,
    isFailure: false,
    notes: "",
    setNumber: nextSetNumber,
  };
};

// Prescrizione formattata
const formatPrescription = (exercise: any) => {
  const parts = [];
  if (exercise.prescribed_sets) parts.push(`${exercise.prescribed_sets}`);
  if (exercise.prescribed_reps) parts.push(`x ${exercise.prescribed_reps}`);
  if (exercise.prescribed_weight)
    parts.push(`@ ${exercise.prescribed_weight} kg`);
  return parts.join(" ") || "-";
};

// Actions
const handleLogSet = async (exerciseId: any) => {
  const form = setForms.value[exerciseId];
  if (!form || !form.repsCompleted) return;

  saving.value = true;
  const setData = {
    sessionExerciseId: exerciseId,
    setNumber: form.setNumber,
    repsCompleted: parseInt(form.repsCompleted),
    weightUsed: form.weightUsed ? parseFloat(form.weightUsed) : null,
    rpe: form.rpe ? parseFloat(form.rpe) : null,
    isWarmup: form.isWarmup || false,
    isFailure: form.isFailure || false,
    notes: form.notes || null,
  };

  const result = await store.logSet(route.params.id as any, setData);
  if (result.success) {
    resetSetForm(exerciseId);
    _toast.success("Set registrato");
  } else {
    _toast.error(result.message || "Errore nel salvataggio del set");
  }
  saving.value = false;
};

const handleComplete = async () => {
  if (!completeForm.value.overallFeeling) return;
  saving.value = true;

  const result = await store.completeSession(route.params.id as any, {
    overallFeeling: completeForm.value.overallFeeling,
    notes: completeForm.value.notes || null,
  });

  if (result.success) {
    showCompleteModal.value = false;
    stopElapsedTimer();
    _toast.success("Sessione completata!");
  } else {
    _toast.error(result.message || "Errore nel completamento");
  }
  saving.value = false;
};

const handleSkip = async () => {
  saving.value = true;
  const result = await store.skipSession(
    route.params.id as any,
    (skipReason.value || null) as any,
  );
  if (result.success) {
    showSkipModal.value = false;
    stopElapsedTimer();
    _toast.success("Sessione saltata");
    // Ricarica sessione per aggiornare lo stato
    await store.fetchSessionById(route.params.id as any);
  } else {
    _toast.error(result.message || "Errore");
  }
  saving.value = false;
};

const goBack = () => {
  router.push("/sessions");
};

// Lifecycle
onMounted(async () => {
  await store.fetchSessionById(route.params.id as any);
  if (isInProgress.value) {
    startElapsedTimer();
  }
});

onUnmounted(() => {
  stopElapsedTimer();
  store.clearCurrentSession();
});
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <!-- Loading -->
    <div v-if="isLoading" class="animate-pulse space-y-6">
      <div class="h-8 bg-habit-skeleton rounded w-64"></div>
      <div class="h-40 bg-habit-skeleton rounded-habit"></div>
      <div class="h-60 bg-habit-skeleton rounded-habit"></div>
      <div class="h-60 bg-habit-skeleton rounded-habit"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error && !session" class="space-y-4">
      <div class="bg-red-500/10 border border-red-500/30 rounded-habit p-4">
        <p class="text-red-400">{{ store.error }}</p>
      </div>
      <button
        @click="goBack"
        class="text-habit-cyan hover:text-cyan-300 flex items-center gap-2 text-sm"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Torna alle Sessioni
      </button>
    </div>

    <!-- Content -->
    <div v-else-if="session" class="space-y-6">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <button
            @click="goBack"
            class="text-habit-text-subtle hover:text-habit-text flex items-center gap-1 text-sm mb-2 transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Torna alle Sessioni
          </button>
          <h1
            class="text-xl sm:text-2xl font-bold text-habit-text flex items-center gap-3"
          >
            {{ sessionTitle }}
            <span
              :class="[
                'px-2.5 py-1 text-xs rounded-full font-medium',
                getStatusClasses(session.status),
              ]"
            >
              {{ getStatusLabel(session.status) }}
            </span>
          </h1>
          <p class="text-habit-text-subtle mt-1">{{ clientName }}</p>
        </div>

        <!-- Azioni per sessioni in_progress -->
        <div v-if="isInProgress" class="flex flex-wrap gap-3">
          <button
            @click="showSkipModal = true"
            class="px-4 py-2 border border-red-500/40 text-red-400 rounded-habit hover:bg-red-500/10 transition-colors text-sm"
          >
            Salta Sessione
          </button>
          <button
            @click="showCompleteModal = true"
            class="px-4 py-2 bg-emerald-500 text-white rounded-habit hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            Completa Sessione
          </button>
        </div>
      </div>

      <!-- Error banner -->
      <div
        v-if="store.error"
        class="bg-red-500/10 border border-red-500/30 rounded-habit p-3"
      >
        <p class="text-red-400 text-sm">{{ store.error }}</p>
      </div>

      <!-- Info Card: IN PROGRESS -->
      <div
        v-if="isInProgress"
        class="bg-habit-card border border-habit-border rounded-habit p-5"
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Iniziata
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ formatDateTime(session.started_at) }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Durata Attuale
            </p>
            <p class="text-habit-cyan text-sm font-medium">
              {{ elapsedMinutes }} min
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Status
            </p>
            <span
              class="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400"
            >
              In Corso
            </span>
          </div>
        </div>
      </div>

      <!-- Info Card: COMPLETED -->
      <div
        v-if="isCompleted"
        class="bg-habit-card border border-habit-border rounded-habit p-5"
      >
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Iniziata
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ formatDateTime(session.started_at) }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Completata
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ formatDateTime(session.completed_at) }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Durata
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ session.duration_minutes || "-" }} min
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              XP Guadagnati
            </p>
            <p
              class="text-habit-orange text-sm font-medium flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
              {{ session.xp_earned || 0 }}
            </p>
          </div>
        </div>
        <!-- Feeling & notes -->
        <div
          v-if="session.overall_feeling || session.notes"
          class="mt-4 pt-4 border-t border-habit-border"
        >
          <div class="flex flex-wrap gap-6">
            <div v-if="session.overall_feeling">
              <p
                class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
              >
                Sensazione
              </p>
              <p class="text-habit-text text-sm font-medium">
                {{ getFeelingEmoji(session.overall_feeling) }}
                {{ getFeelingLabel(session.overall_feeling) }}
              </p>
            </div>
            <div v-if="session.notes" class="flex-1 min-w-[200px]">
              <p
                class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
              >
                Note
              </p>
              <p class="text-habit-text-muted text-sm">{{ session.notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Card: SKIPPED -->
      <div
        v-if="isSkipped"
        class="bg-habit-card border border-habit-border rounded-habit p-5"
      >
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Status
            </p>
            <span
              class="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400"
            >
              Saltata
            </span>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Data
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ formatDateTime(session.started_at) }}
            </p>
          </div>
        </div>
        <div
          v-if="session.notes"
          class="mt-4 pt-4 border-t border-habit-border"
        >
          <p
            class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
          >
            Motivo
          </p>
          <p class="text-habit-text-muted text-sm">{{ session.notes }}</p>
        </div>
      </div>

      <!-- Progress Bar (solo in_progress) -->
      <div
        v-if="isInProgress && progress.total > 0"
        class="bg-habit-card border border-habit-border rounded-habit p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-habit-text-subtle text-sm">Progresso Sessione</p>
          <p class="text-habit-text text-sm font-medium">
            {{ progress.completed }} / {{ progress.total }} set
            <span class="text-habit-text-subtle ml-1"
              >({{ progress.percent }}%)</span
            >
          </p>
        </div>
        <div class="w-full bg-habit-skeleton rounded-full h-2.5">
          <div
            class="bg-habit-cyan h-2.5 rounded-full transition-all duration-500"
            :style="{ width: progress.percent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Lista Esercizi -->
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-habit-text">
          Esercizi ({{ session.exercises?.length || 0 }})
        </h2>

        <div
          v-if="!session.exercises || session.exercises.length === 0"
          class="bg-habit-card border border-habit-border rounded-habit p-8 text-center"
        >
          <p class="text-habit-text-subtle">
            Nessun esercizio in questa sessione
          </p>
        </div>

        <!-- Exercise Card -->
        <div
          v-for="(exercise, idx) in session.exercises"
          :key="exercise.id"
          class="bg-habit-card border border-habit-border rounded-habit overflow-hidden"
        >
          <!-- Exercise Header -->
          <div class="p-4 border-b border-habit-border flex items-center gap-4">
            <!-- Numero ordinale -->
            <div
              class="w-8 h-8 rounded-full bg-habit-cyan/20 text-habit-cyan flex items-center justify-center text-sm font-bold flex-shrink-0"
            >
              {{ Number(idx) + 1 }}
            </div>

            <!-- Info esercizio -->
            <div class="flex-1 min-w-0">
              <h3 class="text-habit-text font-medium truncate">
                {{ exercise.exercise_name }}
              </h3>
              <p class="text-habit-text-subtle text-sm mt-0.5">
                Prescrizione:
                <span class="text-habit-text-muted">{{
                  formatPrescription(exercise)
                }}</span>
              </p>
            </div>

            <!-- Set counter badge -->
            <div class="flex-shrink-0">
              <span
                :class="[
                  'px-2 py-1 text-xs rounded-full font-medium',
                  (exercise.sets?.length || 0) >=
                  (exercise.prescribed_sets || 0)
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-habit-skeleton/50 text-habit-text-muted',
                ]"
              >
                {{ exercise.sets?.length || 0 }}/{{
                  exercise.prescribed_sets || "?"
                }}
                set
              </span>
            </div>
          </div>

          <!-- Note esercizio -->
          <div
            v-if="exercise.notes"
            class="px-4 py-2 border-b border-habit-border bg-habit-bg-light/30"
          >
            <p class="text-habit-text-subtle text-xs">
              <span class="text-habit-text-subtle">Note:</span>
              {{ exercise.notes }}
            </p>
          </div>

          <!-- Tabella Set: Mobile Card Layout -->
          <div v-if="isMobile" class="px-3 py-2 space-y-2">
            <!-- Set loggati -->
            <div
              v-for="set in exercise.sets"
              :key="set.id"
              class="bg-habit-bg-light/30 border border-habit-border/40 rounded-lg p-3"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-habit-text-subtle font-medium text-xs"
                  >Set #{{ set.set_number }}</span
                >
                <div class="flex items-center gap-2">
                  <span v-if="set.is_warmup" class="text-yellow-400 text-xs"
                    >🔥 Warm</span
                  >
                  <span v-if="set.is_failure" class="text-red-400 text-xs"
                    >⚠ Fail</span
                  >
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span
                    class="block text-habit-text-subtle text-[10px] uppercase"
                    >Reps</span
                  >
                  <span class="font-medium text-habit-text">{{
                    set.reps_completed
                  }}</span>
                </div>
                <div>
                  <span
                    class="block text-habit-text-subtle text-[10px] uppercase"
                    >Peso</span
                  >
                  <span class="text-habit-text-muted">{{
                    set.weight_used ? `${set.weight_used}kg` : "-"
                  }}</span>
                </div>
                <div>
                  <span
                    class="block text-habit-text-subtle text-[10px] uppercase"
                    >RPE</span
                  >
                  <span
                    v-if="set.rpe"
                    :class="[
                      'font-medium',
                      set.rpe >= 9
                        ? 'text-red-400'
                        : set.rpe >= 7
                          ? 'text-yellow-400'
                          : 'text-emerald-400',
                    ]"
                    >{{ set.rpe }}</span
                  >
                  <span v-else class="text-habit-text-subtle">-</span>
                </div>
              </div>
              <p
                v-if="set.notes"
                class="text-habit-text-subtle text-xs mt-1.5 truncate"
              >
                {{ set.notes }}
              </p>
            </div>

            <!-- Form inline per nuovo set (mobile) -->
            <div
              v-if="isInProgress"
              class="bg-habit-cyan/5 border border-habit-cyan/20 rounded-lg p-3 space-y-2"
            >
              <span class="text-habit-cyan font-medium text-xs"
                >Set #{{ getSetForm(exercise.id).setNumber }}</span
              >
              <div class="grid grid-cols-3 gap-2">
                <input
                  v-model.number="getSetForm(exercise.id).repsCompleted"
                  type="number"
                  min="0"
                  placeholder="Reps"
                  class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-center text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
                <input
                  v-model.number="getSetForm(exercise.id).weightUsed"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="kg"
                  class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-center text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
                <input
                  v-model.number="getSetForm(exercise.id).rpe"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  placeholder="RPE"
                  class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-center text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
              <div class="flex items-center gap-4">
                <label
                  class="flex items-center gap-1.5 text-xs text-habit-text-muted"
                >
                  <input
                    v-model="getSetForm(exercise.id).isWarmup"
                    type="checkbox"
                    class="w-4 h-4 rounded border-habit-border bg-habit-bg-light text-yellow-400"
                  />
                  🔥 Warmup
                </label>
                <label
                  class="flex items-center gap-1.5 text-xs text-habit-text-muted"
                >
                  <input
                    v-model="getSetForm(exercise.id).isFailure"
                    type="checkbox"
                    class="w-4 h-4 rounded border-habit-border bg-habit-bg-light text-red-400"
                  />
                  ⚠ Failure
                </label>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="getSetForm(exercise.id).notes"
                  type="text"
                  placeholder="Note..."
                  class="flex-1 bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
                <button
                  @click="handleLogSet(exercise.id)"
                  :disabled="!getSetForm(exercise.id).repsCompleted || saving"
                  class="px-4 py-1.5 bg-habit-cyan text-white rounded text-xs font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {{ saving ? "..." : "Salva" }}
                </button>
              </div>
            </div>

            <!-- Vuoto -->
            <div
              v-if="
                (!exercise.sets || exercise.sets.length === 0) && !isInProgress
              "
              class="py-4 text-center text-habit-text-subtle text-sm"
            >
              Nessun set registrato
            </div>
          </div>

          <!-- Tabella Set: Desktop Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-habit-text-subtle text-xs uppercase tracking-wider"
                >
                  <th class="px-4 py-2 text-left font-medium w-12">Set</th>
                  <th class="px-4 py-2 text-center font-medium">Reps</th>
                  <th class="px-4 py-2 text-center font-medium">Peso (kg)</th>
                  <th class="px-4 py-2 text-center font-medium">RPE</th>
                  <th class="px-4 py-2 text-center font-medium w-16">Warm</th>
                  <th class="px-4 py-2 text-center font-medium w-16">Fail</th>
                  <th class="px-4 py-2 text-left font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="set in exercise.sets"
                  :key="set.id"
                  class="border-t border-habit-border/50 text-habit-text-muted"
                >
                  <td class="px-4 py-2 text-left">
                    <span class="text-habit-text-subtle font-medium"
                      >#{{ set.set_number }}</span
                    >
                  </td>
                  <td class="px-4 py-2 text-center font-medium text-habit-text">
                    {{ set.reps_completed }}
                  </td>
                  <td class="px-4 py-2 text-center">
                    {{ set.weight_used ? `${set.weight_used}` : "-" }}
                  </td>
                  <td class="px-4 py-2 text-center">
                    <span
                      v-if="set.rpe"
                      :class="[
                        'font-medium',
                        set.rpe >= 9
                          ? 'text-red-400'
                          : set.rpe >= 7
                            ? 'text-yellow-400'
                            : 'text-emerald-400',
                      ]"
                      >{{ set.rpe }}</span
                    >
                    <span v-else class="text-habit-text-subtle">-</span>
                  </td>
                  <td class="px-4 py-2 text-center">
                    <span v-if="set.is_warmup" class="text-yellow-400 text-xs"
                      >🔥</span
                    >
                    <span v-else class="text-habit-text-subtle">-</span>
                  </td>
                  <td class="px-4 py-2 text-center">
                    <span v-if="set.is_failure" class="text-red-400 text-xs"
                      >⚠</span
                    >
                    <span v-else class="text-habit-text-subtle">-</span>
                  </td>
                  <td
                    class="px-4 py-2 text-left text-habit-text-subtle text-xs truncate max-w-[120px]"
                  >
                    {{ set.notes || "" }}
                  </td>
                </tr>

                <tr
                  v-if="isInProgress"
                  class="border-t border-habit-cyan/20 bg-habit-cyan/5"
                >
                  <td class="px-4 py-2 text-left">
                    <span class="text-habit-cyan font-medium text-xs">
                      #{{ getSetForm(exercise.id).setNumber }}
                    </span>
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model.number="getSetForm(exercise.id).repsCompleted"
                      type="number"
                      min="0"
                      placeholder="Reps"
                      class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1 text-center text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model.number="getSetForm(exercise.id).weightUsed"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="kg"
                      class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1 text-center text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model.number="getSetForm(exercise.id).rpe"
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      placeholder="RPE"
                      class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1 text-center text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
                    />
                  </td>
                  <td class="px-2 py-2 text-center">
                    <input
                      v-model="getSetForm(exercise.id).isWarmup"
                      type="checkbox"
                      class="w-4 h-4 rounded border-habit-border bg-habit-bg-light text-yellow-400 focus:ring-yellow-400/50"
                    />
                  </td>
                  <td class="px-2 py-2 text-center">
                    <input
                      v-model="getSetForm(exercise.id).isFailure"
                      type="checkbox"
                      class="w-4 h-4 rounded border-habit-border bg-habit-bg-light text-red-400 focus:ring-red-400/50"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <div class="flex items-center gap-1">
                      <input
                        v-model="getSetForm(exercise.id).notes"
                        type="text"
                        placeholder="Note..."
                        class="flex-1 bg-habit-bg-light border border-habit-border rounded px-2 py-1 text-habit-text text-sm min-w-[60px] focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
                      />
                      <button
                        @click="handleLogSet(exercise.id)"
                        :disabled="
                          !getSetForm(exercise.id).repsCompleted || saving
                        "
                        class="px-3 py-1 bg-habit-cyan text-white rounded text-xs font-medium hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        {{ saving ? "..." : "Salva" }}
                      </button>
                    </div>
                  </td>
                </tr>

                <tr
                  v-if="
                    (!exercise.sets || exercise.sets.length === 0) &&
                    !isInProgress
                  "
                  class="border-t border-habit-border/50"
                >
                  <td
                    colspan="7"
                    class="px-4 py-4 text-center text-habit-text-subtle text-sm"
                  >
                    Nessun set registrato
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer Actions (ridondanti, per accessibilita mobile) -->
      <div v-if="isInProgress" class="flex justify-center gap-4 pt-4 pb-8">
        <button
          @click="showSkipModal = true"
          class="px-6 py-2.5 border border-red-500/40 text-red-400 rounded-habit hover:bg-red-500/10 transition-colors text-sm"
        >
          Salta Sessione
        </button>
        <button
          @click="showCompleteModal = true"
          class="px-6 py-2.5 bg-emerald-500 text-white rounded-habit hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          ✓ Completa Sessione
        </button>
      </div>
    </div>

    <!-- ==================== MODAL: Completa Sessione ==================== -->
    <Teleport to="body">
      <div
        v-if="showCompleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="fixed inset-0 bg-black/60"
          @click="showCompleteModal = false"
        ></div>
        <div
          class="bg-habit-card border border-habit-border rounded-habit w-full max-w-md relative z-10 max-h-[90vh] overflow-y-auto"
        >
          <div class="p-6">
            <h3 class="text-lg font-bold text-habit-text mb-1">
              Completa Sessione
            </h3>
            <p class="text-habit-text-subtle text-sm mb-6">
              Come ti sei sentito durante l'allenamento?
            </p>

            <!-- Feeling Selector -->
            <div class="mb-5">
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-3"
                >Sensazione *</label
              >
              <div class="flex gap-2 justify-center">
                <button
                  v-for="opt in feelingOptions"
                  :key="opt.value"
                  @click="completeForm.overallFeeling = opt.value"
                  :class="[
                    'flex flex-col items-center px-3 py-2 rounded-habit border transition-all text-sm',
                    completeForm.overallFeeling === opt.value
                      ? 'border-habit-cyan bg-habit-cyan/10 text-white'
                      : 'border-habit-border bg-habit-bg-light/50 text-habit-text-subtle hover:border-habit-border',
                  ]"
                >
                  <span class="text-xl mb-1">{{ opt.emoji }}</span>
                  <span class="text-xs">{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <!-- Note -->
            <div class="mb-5">
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-2"
                >Note (opzionale)</label
              >
              <textarea
                v-model="completeForm.notes"
                rows="3"
                placeholder="Come e' andato l'allenamento..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none resize-none"
              >
              </textarea>
            </div>

            <!-- Riepilogo -->
            <div class="bg-habit-bg-light/50 rounded-habit p-3 mb-6">
              <p
                class="text-habit-text-subtle text-xs uppercase tracking-wide mb-2"
              >
                Riepilogo
              </p>
              <div class="flex gap-6 text-sm">
                <div>
                  <span class="text-habit-text-subtle">Esercizi:</span>
                  <span class="text-habit-text ml-1 font-medium">{{
                    session?.exercises?.length || 0
                  }}</span>
                </div>
                <div>
                  <span class="text-habit-text-subtle">Set completati:</span>
                  <span class="text-habit-text ml-1 font-medium">{{
                    progress.completed
                  }}</span>
                </div>
                <div>
                  <span class="text-habit-text-subtle">Durata:</span>
                  <span class="text-habit-text ml-1 font-medium"
                    >{{ elapsedMinutes }} min</span
                  >
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="showCompleteModal = false"
                class="flex-1 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
              >
                Annulla
              </button>
              <button
                @click="handleComplete"
                :disabled="!completeForm.overallFeeling || saving"
                class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-habit hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {{ saving ? "Salvataggio..." : "Completa" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==================== MODAL: Salta Sessione ==================== -->
    <Teleport to="body">
      <div
        v-if="showSkipModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="fixed inset-0 bg-black/60"
          @click="showSkipModal = false"
        ></div>
        <div
          class="bg-habit-card border border-habit-border rounded-habit w-full max-w-md relative z-10 max-h-[90vh] overflow-y-auto"
        >
          <div class="p-6">
            <h3 class="text-lg font-bold text-habit-text mb-1">
              Salta Sessione
            </h3>
            <p class="text-habit-text-subtle text-sm mb-5">
              Sei sicuro di voler saltare questa sessione?
            </p>

            <!-- Motivo -->
            <div class="mb-6">
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-2"
                >Motivo (opzionale)</label
              >
              <textarea
                v-model="skipReason"
                rows="3"
                placeholder="Perche' salti questa sessione..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none resize-none"
              >
              </textarea>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="showSkipModal = false"
                class="flex-1 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
              >
                Annulla
              </button>
              <button
                @click="handleSkip"
                :disabled="saving"
                class="flex-1 px-4 py-2 bg-red-500 text-white rounded-habit hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {{ saving ? "Salvataggio..." : "Salta Sessione" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
