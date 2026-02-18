<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProgramStore } from "@/store/program";

const route = useRoute();
const router = useRouter();
const store = useProgramStore();

// Local state
const editingInfo = ref(false);
const showAddWorkoutModal = ref(false);
const showDeleteWorkoutModal = ref(false);
const removingWorkout = ref<any>(null);
const isRemoving = ref(false);
const isAdding = ref(false);
const isSaving = ref(false);
const localSuccess = ref("");
const localError = ref("");

// Edit form
const editForm = ref<any>({
  name: "",
  description: "",
  startDate: "",
  weeks: 4,
  daysPerWeek: 3,
});

// Add workout form
const workoutForm = ref<any>({
  templateId: "",
  weekNumber: 1,
  dayOfWeek: 1,
  notes: "",
});

// Computed
const program = computed(() => store.currentProgram as any);
const loading = computed(() => store.detailLoading);
const error = computed(() => store.error);
const workoutTemplates = computed(() => store.workoutTemplates);

const programId = computed(() => route.params.id as any);

const statusLabel = (status: any) => {
  const labels: Record<string, string> = {
    draft: "Bozza",
    active: "Attivo",
    completed: "Completato",
    cancelled: "Annullato",
  };
  return labels[status] || status || "-";
};

const statusClass = (status: any) => {
  const classes: Record<string, string> = {
    draft: "bg-yellow-500/15 text-yellow-400",
    active: "bg-emerald-500/15 text-emerald-400",
    completed: "bg-blue-500/15 text-blue-400",
    cancelled: "bg-red-500/15 text-red-400",
  };
  return classes[status] || "bg-habit-skeleton/50 text-habit-text-subtle";
};

const formatDate = (dateStr: any) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const dayLabel = (day: any) => {
  const days: Record<string, string> = {
    1: "Lunedi",
    2: "Martedi",
    3: "Mercoledi",
    4: "Giovedi",
    5: "Venerdi",
    6: "Sabato",
    7: "Domenica",
  };
  return days[day] || `Giorno ${day}`;
};

const getClientName = () => {
  if (!program.value) return "-";
  if (program.value.client_first_name)
    return `${program.value.client_first_name} ${program.value.client_last_name || ""}`.trim();
  return "-";
};

// Grouped workouts by week
const workoutsByWeek = computed(() => {
  if (!program.value?.workouts) return {};
  const grouped: Record<string, any[]> = {};
  for (const w of program.value.workouts) {
    const week = w.week_number || 1;
    if (!grouped[week]) grouped[week] = [];
    grouped[week].push(w);
  }
  // Sort each week's workouts by day_of_week
  for (const week of Object.keys(grouped)) {
    grouped[week].sort(
      (a: any, b: any) => (a.day_of_week || 0) - (b.day_of_week || 0),
    );
  }
  return grouped;
});

const weekNumbers = computed(() => {
  return Object.keys(workoutsByWeek.value)
    .map(Number)
    .sort((a: any, b: any) => a - b);
});

// Actions
const startEdit = () => {
  if (!program.value) return;
  editForm.value = {
    name: program.value.name || "",
    description: program.value.description || "",
    startDate: program.value.start_date
      ? program.value.start_date.substring(0, 10)
      : "",
    weeks: program.value.weeks || 4,
    daysPerWeek: program.value.days_per_week || 3,
  };
  editingInfo.value = true;
  localError.value = "";
};

const cancelEdit = () => {
  editingInfo.value = false;
  localError.value = "";
};

const saveEdit = async () => {
  isSaving.value = true;
  localError.value = "";
  const result = await store.updateProgram(programId.value, {
    name: editForm.value.name,
    description: editForm.value.description || null,
    startDate: editForm.value.startDate || null,
    weeks: parseInt(editForm.value.weeks) || 4,
    daysPerWeek: parseInt(editForm.value.daysPerWeek) || 3,
  });
  isSaving.value = false;
  if (result.success) {
    editingInfo.value = false;
    localSuccess.value = "Programma aggiornato";
    setTimeout(() => {
      localSuccess.value = "";
    }, 3000);
  } else {
    localError.value = result.message || "Errore durante il salvataggio";
  }
};

const handleStatusChange = async (newStatus: any) => {
  await store.updateStatus(programId.value, newStatus);
  await store.fetchProgramById(programId.value);
};

const openAddWorkout = () => {
  workoutForm.value = {
    templateId: "",
    weekNumber: 1,
    dayOfWeek: 1,
    notes: "",
  };
  showAddWorkoutModal.value = true;
  if (workoutTemplates.value.length === 0) store.fetchWorkoutTemplates();
};

const handleAddWorkout = async () => {
  if (!workoutForm.value.templateId) return;
  isAdding.value = true;
  const result = await store.addWorkout(programId.value, {
    templateId: parseInt(workoutForm.value.templateId),
    weekNumber: parseInt(workoutForm.value.weekNumber) || 1,
    dayOfWeek: parseInt(workoutForm.value.dayOfWeek) || 1,
    notes: workoutForm.value.notes || null,
  });
  isAdding.value = false;
  if (result.success) {
    showAddWorkoutModal.value = false;
    localSuccess.value = "Workout aggiunto";
    setTimeout(() => {
      localSuccess.value = "";
    }, 3000);
  }
};

const openRemoveWorkout = (workout: any) => {
  removingWorkout.value = workout;
  showDeleteWorkoutModal.value = true;
};

const handleRemoveWorkout = async () => {
  if (!removingWorkout.value) return;
  isRemoving.value = true;
  const result = await store.removeWorkout(
    programId.value,
    removingWorkout.value.id,
  );
  isRemoving.value = false;
  if (result.success) {
    showDeleteWorkoutModal.value = false;
    removingWorkout.value = null;
    localSuccess.value = "Workout rimosso";
    setTimeout(() => {
      localSuccess.value = "";
    }, 3000);
  }
};

onMounted(async () => {
  await store.fetchProgramById(programId.value);
});

watch(
  () => route.params.id,
  (newId: any) => {
    if (newId) store.fetchProgramById(newId);
  },
);
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/programs')"
          class="p-2 rounded-habit border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-border transition-colors"
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
        </button>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
            {{ program?.name || "Dettaglio Programma" }}
          </h1>
          <p class="text-habit-text-subtle text-sm mt-0.5">
            {{ getClientName() }}
          </p>
        </div>
      </div>
      <div v-if="program" class="flex items-center gap-2">
        <span
          :class="[
            'px-3 py-1 rounded-full text-xs font-medium',
            statusClass(program.status),
          ]"
        >
          {{ statusLabel(program.status) }}
        </span>
        <button
          v-if="program.status === 'draft'"
          @click="handleStatusChange('active')"
          class="px-3 py-1.5 bg-emerald-600 text-white rounded-habit hover:bg-emerald-500 transition-colors text-xs font-medium"
        >
          Attiva
        </button>
        <button
          v-if="program.status === 'active'"
          @click="handleStatusChange('completed')"
          class="px-3 py-1.5 bg-blue-600 text-white rounded-habit hover:bg-blue-500 transition-colors text-xs font-medium"
        >
          Completa
        </button>
      </div>
    </div>

    <!-- Success/Error -->
    <div
      v-if="localSuccess"
      class="bg-emerald-500/10 border border-emerald-500/30 rounded-habit p-3 mb-4"
    >
      <p class="text-emerald-400 text-sm">{{ localSuccess }}</p>
    </div>
    <div
      v-if="error"
      class="bg-red-500/10 border border-red-500/30 rounded-habit p-3 mb-4"
    >
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div
        class="bg-habit-card border border-habit-border rounded-habit p-6 animate-pulse"
      >
        <div class="h-5 bg-habit-skeleton rounded w-1/4 mb-4"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="h-4 bg-habit-skeleton rounded"></div>
          <div class="h-4 bg-habit-skeleton rounded"></div>
          <div class="h-4 bg-habit-skeleton rounded"></div>
          <div class="h-4 bg-habit-skeleton rounded"></div>
        </div>
      </div>
    </div>

    <div v-else-if="program" class="space-y-6 max-w-4xl mx-auto">
      <!-- Program Info Card -->
      <div class="bg-habit-card border border-habit-border rounded-habit p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-habit-text font-semibold">Informazioni Programma</h2>
          <button
            v-if="!editingInfo"
            @click="startEdit"
            class="text-xs text-habit-cyan hover:text-cyan-300 transition-colors"
          >
            Modifica
          </button>
        </div>

        <!-- View Mode -->
        <div
          v-if="!editingInfo"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Nome
            </p>
            <p class="text-habit-text text-sm mt-0.5">{{ program.name }}</p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Cliente
            </p>
            <p class="text-habit-text text-sm mt-0.5">{{ getClientName() }}</p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Stato
            </p>
            <span
              :class="[
                'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5',
                statusClass(program.status),
              ]"
            >
              {{ statusLabel(program.status) }}
            </span>
          </div>
          <div>
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Settimane
            </p>
            <p class="text-habit-text text-sm mt-0.5">
              {{ program.weeks || "-" }}
            </p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Giorni/Sett
            </p>
            <p class="text-habit-text text-sm mt-0.5">
              {{ program.days_per_week || "-" }}
            </p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Periodo
            </p>
            <p class="text-habit-text text-sm mt-0.5">
              {{ program.start_date ? formatDate(program.start_date) : "-" }}
              <span v-if="program.end_date">
                - {{ formatDate(program.end_date) }}</span
              >
            </p>
          </div>
          <div v-if="program.description" class="sm:col-span-2 lg:col-span-3">
            <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
              Descrizione
            </p>
            <p class="text-habit-text-muted text-sm mt-0.5">
              {{ program.description }}
            </p>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="space-y-4">
          <div
            v-if="localError"
            class="bg-red-500/10 border border-red-500/30 rounded-habit p-3"
          >
            <p class="text-red-400 text-sm">{{ localError }}</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Nome *</label
              >
              <input
                v-model="editForm.name"
                type="text"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div class="sm:col-span-2">
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Descrizione</label
              >
              <textarea
                v-model="editForm.description"
                rows="2"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none resize-none"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Data Inizio</label
              >
              <input
                v-model="editForm.startDate"
                type="date"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Settimane</label
                >
                <input
                  v-model.number="editForm.weeks"
                  type="number"
                  min="1"
                  max="52"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Gg/Sett</label
                >
                <input
                  v-model.number="editForm.daysPerWeek"
                  type="number"
                  min="1"
                  max="7"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              @click="cancelEdit"
              class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="saveEdit"
              :disabled="isSaving || !editForm.name"
              class="px-6 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ isSaving ? "Salvataggio..." : "Salva" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Workouts Section -->
      <div class="bg-habit-card border border-habit-border rounded-habit p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-habit-text font-semibold">Schede Allenamento</h2>
          <button
            @click="openAddWorkout"
            class="px-3 py-1.5 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 transition-colors text-xs font-medium flex items-center gap-1.5"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Aggiungi Workout
          </button>
        </div>

        <!-- No workouts -->
        <div
          v-if="!program.workouts || program.workouts.length === 0"
          class="text-center py-10"
        >
          <svg
            class="w-12 h-12 mx-auto text-habit-text-subtle mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p class="text-habit-text-subtle text-sm mb-3">
            Nessuna scheda assegnata
          </p>
          <button
            @click="openAddWorkout"
            class="text-xs text-habit-cyan hover:text-cyan-300 transition-colors"
          >
            Aggiungi la prima scheda
          </button>
        </div>

        <!-- Workouts by Week -->
        <div v-else class="space-y-6">
          <div v-for="week in weekNumbers" :key="week">
            <h3
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-3 flex items-center gap-2"
            >
              <span
                class="w-6 h-6 rounded bg-habit-skeleton flex items-center justify-center text-habit-text text-xs font-bold"
                >{{ week }}</span
              >
              Settimana {{ week }}
            </h3>
            <div class="space-y-2">
              <div
                v-for="workout in workoutsByWeek[week]"
                :key="workout.id"
                class="flex items-center justify-between bg-habit-bg-light/50 rounded-lg p-3 hover:bg-habit-bg-light transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-8 h-8 rounded bg-habit-cyan/10 border border-habit-cyan/20 flex items-center justify-center flex-shrink-0"
                  >
                    <span class="text-habit-cyan text-xs font-bold">{{
                      workout.day_of_week || "-"
                    }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-habit-text text-sm font-medium truncate">
                      {{
                        workout.template_name ||
                        workout.workout_name ||
                        "Workout"
                      }}
                    </p>
                    <p class="text-habit-text-subtle text-xs">
                      {{ dayLabel(workout.day_of_week) }}
                      <span v-if="workout.scheduled_date">
                        &middot; {{ formatDate(workout.scheduled_date) }}</span
                      >
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span
                    v-if="workout.notes"
                    class="text-habit-text-subtle text-xs max-w-[120px] truncate hidden sm:inline"
                    :title="workout.notes"
                  >
                    {{ workout.notes }}
                  </span>
                  <button
                    @click="openRemoveWorkout(workout)"
                    class="p-1.5 text-habit-text-subtle hover:text-red-400 transition-colors"
                    title="Rimuovi"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!loading" class="text-center py-16">
      <p class="text-habit-text-subtle text-sm mb-4">Programma non trovato</p>
      <button
        @click="router.push('/programs')"
        class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
      >
        Torna alla lista
      </button>
    </div>

    <!-- Add Workout Modal -->
    <Teleport to="body">
      <div
        v-if="showAddWorkoutModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60"
          @click="showAddWorkoutModal = false"
        ></div>
        <div
          class="relative bg-habit-card border border-habit-border rounded-habit p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-habit-text font-semibold text-lg mb-4">
            Aggiungi Workout
          </h3>

          <div class="space-y-4">
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Scheda Allenamento *</label
              >
              <select
                v-model="workoutForm.templateId"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              >
                <option value="">Seleziona scheda</option>
                <option v-for="t in workoutTemplates" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
              <p
                v-if="workoutTemplates.length === 0"
                class="text-habit-text-subtle text-xs mt-1"
              >
                Nessuna scheda disponibile. Creane una dalla sezione Schede.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Settimana</label
                >
                <input
                  v-model.number="workoutForm.weekNumber"
                  type="number"
                  min="1"
                  :max="program?.weeks || 52"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Giorno</label
                >
                <select
                  v-model.number="workoutForm.dayOfWeek"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                >
                  <option :value="1">Lunedi</option>
                  <option :value="2">Martedi</option>
                  <option :value="3">Mercoledi</option>
                  <option :value="4">Giovedi</option>
                  <option :value="5">Venerdi</option>
                  <option :value="6">Sabato</option>
                  <option :value="7">Domenica</option>
                </select>
              </div>
            </div>

            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Note</label
              >
              <input
                v-model="workoutForm.notes"
                type="text"
                placeholder="Note opzionali..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              @click="showAddWorkoutModal = false"
              class="flex-1 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="handleAddWorkout"
              :disabled="isAdding || !workoutForm.templateId"
              class="flex-1 px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ isAdding ? "Aggiunta..." : "Aggiungi" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Remove Workout Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteWorkoutModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60"
          @click="showDeleteWorkoutModal = false"
        ></div>
        <div
          class="relative bg-habit-card border border-habit-border rounded-habit p-6 w-full max-w-sm"
        >
          <h3 class="text-habit-text font-semibold text-lg mb-2">
            Rimuovi Workout
          </h3>
          <p class="text-habit-text-subtle text-sm mb-6">
            Sei sicuro di voler rimuovere
            <strong class="text-habit-text">{{
              removingWorkout?.template_name ||
              removingWorkout?.workout_name ||
              "questo workout"
            }}</strong>
            dal programma?
          </p>
          <div class="flex gap-3">
            <button
              @click="showDeleteWorkoutModal = false"
              class="flex-1 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="handleRemoveWorkout"
              :disabled="isRemoving"
              class="flex-1 px-4 py-2 bg-red-600 text-white rounded-habit hover:bg-red-500 disabled:opacity-40 transition-colors text-sm font-medium"
            >
              {{ isRemoving ? "Rimozione..." : "Rimuovi" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
