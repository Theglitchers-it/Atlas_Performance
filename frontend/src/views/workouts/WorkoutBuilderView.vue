<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useExerciseStore } from "@/store/exercise";
import ExerciseCard from "@/components/workouts/ExerciseCard.vue";
import ExerciseModal from "@/components/workouts/ExerciseModal.vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";

const router = useRouter();
const route = useRoute();
const exerciseStore = useExerciseStore() as any;
const toast = useToast();

// Unsaved changes tracking
const isDirty = ref(false);
useUnsavedChanges(isDirty);

// Mode detection
const isEditMode = computed(() => !!route.params.id);
const templateId = computed(() =>
  route.params.id ? parseInt(route.params.id as string) : null,
);

// Template form state
const formData = ref<Record<string, any>>({
  name: "",
  description: "",
  category: "custom",
  difficulty: "intermediate",
  estimatedDurationMin: null,
});

// Exercises list
const workoutExercises = ref<any[]>([]);
let uidCounter = 0;
const generateUid = () => `ex_${++uidCounter}_${Date.now()}`;

// UI state
const isLoading = ref(false);
const isSaving = ref(false);
const errors = ref<Record<string, any>>({});
const errorMessage = ref("");

// Exercise picker
const showExercisePicker = ref(false);
const showExerciseDetail = ref(false);
const pickerSearchTimeout = ref<any>(null);

// Static options
const categoryOptions = [
  { value: "strength", label: "Forza" },
  { value: "hypertrophy", label: "Ipertrofia" },
  { value: "endurance", label: "Resistenza" },
  { value: "power", label: "Potenza" },
  { value: "conditioning", label: "Condizionamento" },
  { value: "recovery", label: "Recupero" },
  { value: "custom", label: "Personalizzato" },
];

const difficultyOptions = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzato" },
];

const weightTypeOptions = [
  { value: "fixed", label: "Peso fisso (kg)" },
  { value: "percentage_1rm", label: "% 1RM" },
  { value: "rpe", label: "RPE (1-10)" },
  { value: "bodyweight", label: "Corpo libero" },
];

// Track form changes
watch(
  formData,
  () => {
    isDirty.value = true;
  },
  { deep: true },
);
watch(
  workoutExercises,
  () => {
    isDirty.value = true;
  },
  { deep: true },
);

// Lifecycle
onMounted(async () => {
  await exerciseStore.initialize();
  if (isEditMode.value) {
    await loadTemplate();
  }
});

// Load template in edit mode
const loadTemplate = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.get(`/workouts/${templateId.value}`);
    const workout = response.data.data.workout;

    formData.value = {
      name: workout.name || "",
      description: workout.description || "",
      category: workout.category || "custom",
      difficulty: workout.difficulty || "intermediate",
      estimatedDurationMin: workout.estimated_duration_min || null,
    };

    workoutExercises.value = (workout.exercises || []).map((ex: any) => ({
      _uid: generateUid(),
      exerciseId: ex.exercise_id,
      exerciseName: ex.exercise_name || ex.name,
      exerciseCategory: ex.exercise_category || "",
      sets: ex.sets || 3,
      repsMin: ex.reps_min || null,
      repsMax: ex.reps_max || null,
      weightType: ex.weight_type || "fixed",
      weightValue: ex.weight_value || null,
      restSeconds: ex.rest_seconds || 90,
      tempo: ex.tempo || "",
      notes: ex.notes || "",
      supersetGroup: ex.superset_group || null,
      isWarmup: !!ex.is_warmup,
    }));
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || "Errore nel caricamento della scheda";
    toast.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

// Exercise Picker
const openExercisePicker = () => {
  showExercisePicker.value = true;
  exerciseStore.resetFilters();
};

const closeExercisePicker = () => {
  showExercisePicker.value = false;
};

const handlePickerExerciseClick = (exercise: any) => {
  exerciseStore.selectExercise(exercise);
  showExerciseDetail.value = true;
};

const handleCloseExerciseDetail = () => {
  showExerciseDetail.value = false;
  exerciseStore.clearSelectedExercise();
};

const handleExerciseSelected = (exercise: any) => {
  workoutExercises.value.push({
    _uid: generateUid(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseCategory: exercise.category || "",
    sets: 3,
    repsMin: null,
    repsMax: null,
    weightType: "fixed",
    weightValue: null,
    restSeconds: 90,
    tempo: "",
    notes: "",
    supersetGroup: null,
    isWarmup: false,
  });
  handleCloseExerciseDetail();
  if (errors.value.exercises) {
    delete errors.value.exercises;
  }
};

// Picker filters
const handlePickerSearch = (e: any) => {
  const value = e.target.value;
  if (pickerSearchTimeout.value) clearTimeout(pickerSearchTimeout.value);
  pickerSearchTimeout.value = setTimeout(() => {
    exerciseStore.setFilter("search", value);
  }, 300);
};

const handlePickerMuscleGroupChange = (e: any) => {
  exerciseStore.setFilter(
    "muscleGroup",
    e.target.value ? (parseInt(e.target.value) as any) : null,
  );
};

const handlePickerCategoryChange = (e: any) => {
  exerciseStore.setFilter("category", e.target.value || null);
};

const handlePickerPageChange = (page: any) => {
  exerciseStore.setPage(page);
};

// Exercise list manipulation
const moveExerciseUp = (index: number) => {
  if (index <= 0) return;
  const arr = workoutExercises.value;
  const temp = arr[index];
  arr[index] = arr[index - 1];
  arr[index - 1] = temp;
  workoutExercises.value = [...arr];
};

const moveExerciseDown = (index: number) => {
  const arr = workoutExercises.value;
  if (index >= arr.length - 1) return;
  const temp = arr[index];
  arr[index] = arr[index + 1];
  arr[index + 1] = temp;
  workoutExercises.value = [...arr];
};

const removeExercise = (index: number) => {
  workoutExercises.value.splice(index, 1);
};

const handleWeightTypeChange = (exercise: any, newType: any) => {
  exercise.weightType = newType;
  if (newType === "bodyweight") {
    exercise.weightValue = null;
  }
};

const getWeightLabel = (weightType: any) => {
  switch (weightType) {
    case "fixed":
      return "Peso (kg)";
    case "percentage_1rm":
      return "% 1RM";
    case "rpe":
      return "RPE";
    default:
      return "Valore";
  }
};

const getWeightPlaceholder = (weightType: any) => {
  switch (weightType) {
    case "fixed":
      return "es. 80";
    case "percentage_1rm":
      return "es. 75";
    case "rpe":
      return "es. 8";
    default:
      return "";
  }
};

// Validation
const validateForm = () => {
  errors.value = {};

  if (!formData.value.name.trim()) {
    errors.value.name = "Il nome della scheda e' obbligatorio";
  }

  if (workoutExercises.value.length === 0) {
    errors.value.exercises = "Aggiungi almeno un esercizio alla scheda";
  }

  return Object.keys(errors.value).length === 0;
};

// Save
const handleSave = async () => {
  if (!validateForm()) {
    await nextTick();
    const firstError = document.querySelector(".text-red-500");
    firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  try {
    const payload = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim() || null,
      category: formData.value.category,
      difficulty: formData.value.difficulty,
      estimatedDurationMin: formData.value.estimatedDurationMin
        ? parseInt(formData.value.estimatedDurationMin)
        : null,
      exercises: workoutExercises.value.map((ex: any) => ({
        exerciseId: ex.exerciseId,
        sets: parseInt(ex.sets) || 3,
        repsMin: ex.repsMin ? parseInt(ex.repsMin) : null,
        repsMax: ex.repsMax ? parseInt(ex.repsMax) : null,
        weightType: ex.weightType,
        weightValue: ex.weightValue ? parseFloat(ex.weightValue) : null,
        restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : 90,
        tempo: ex.tempo?.trim() || null,
        notes: ex.notes?.trim() || null,
        supersetGroup: ex.supersetGroup ? parseInt(ex.supersetGroup) : null,
        isWarmup: !!ex.isWarmup,
      })),
    };

    if (isEditMode.value) {
      await api.put(`/workouts/${templateId.value}`, payload);
      toast.success("Scheda aggiornata con successo");
    } else {
      await api.post("/workouts", payload);
      toast.success("Scheda creata con successo");
    }

    isDirty.value = false;
    router.push("/workouts");
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || "Errore durante il salvataggio";
    toast.error(errorMessage.value);
  } finally {
    isSaving.value = false;
  }
};

const handleCancel = () => {
  router.push("/workouts");
};
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <!-- Header -->
      <div>
        <button
          @click="handleCancel"
          class="inline-flex items-center text-habit-text-subtle hover:text-habit-text mb-4 transition-colors"
        >
          <svg
            class="w-5 h-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Torna alle schede
        </button>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          {{ isEditMode ? "Modifica Scheda" : "Nuova Scheda" }}
        </h1>
        <p class="text-habit-text-subtle mt-1">
          {{
            isEditMode
              ? "Modifica i dettagli della scheda allenamento"
              : "Crea una nuova scheda allenamento"
          }}
        </p>
      </div>

      <!-- Error Banner -->
      <div
        v-if="errorMessage"
        class="bg-red-500/10 border border-red-500/30 rounded-habit p-4 flex items-start gap-3"
      >
        <svg
          class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Loading Skeleton (edit mode) -->
      <div v-if="isLoading" class="space-y-6">
        <div
          class="bg-habit-bg border border-habit-border rounded-habit p-6 animate-pulse"
        >
          <div class="h-5 bg-habit-skeleton rounded w-1/3 mb-4"></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="h-10 bg-habit-skeleton rounded-xl col-span-2"></div>
            <div class="h-20 bg-habit-skeleton rounded-xl col-span-2"></div>
            <div class="h-10 bg-habit-skeleton rounded-xl"></div>
            <div class="h-10 bg-habit-skeleton rounded-xl"></div>
          </div>
        </div>
        <div
          class="bg-habit-bg border border-habit-border rounded-habit p-6 animate-pulse"
        >
          <div class="h-5 bg-habit-skeleton rounded w-1/4 mb-4"></div>
          <div
            v-for="i in 3"
            :key="i"
            class="h-24 bg-habit-skeleton rounded-xl mb-3"
          ></div>
        </div>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSave" class="space-y-6">
        <!-- Template Info Card -->
        <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
          <h2 class="text-lg font-semibold text-habit-text mb-4">
            Informazioni Scheda
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Name -->
            <div class="sm:col-span-2">
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Nome scheda *</label
              >
              <input
                v-model="formData.name"
                type="text"
                placeholder="es. Scheda Forza A - Upper Body"
                class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                :class="errors.name ? 'border-red-500' : 'border-habit-border'"
              />
              <p v-if="errors.name" class="text-red-500 text-xs mt-1">
                {{ errors.name }}
              </p>
            </div>

            <!-- Description -->
            <div class="sm:col-span-2">
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Descrizione</label
              >
              <textarea
                v-model="formData.description"
                rows="3"
                placeholder="Descrizione della scheda (opzionale)..."
                class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text placeholder-habit-text-subtle resize-none"
              ></textarea>
            </div>

            <!-- Category -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Categoria</label
              >
              <select
                v-model="formData.category"
                class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text"
              >
                <option
                  v-for="opt in categoryOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Difficulty -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Difficolta</label
              >
              <select
                v-model="formData.difficulty"
                class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text"
              >
                <option
                  v-for="opt in difficultyOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Estimated Duration -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Durata stimata (min)</label
              >
              <input
                v-model="formData.estimatedDurationMin"
                type="number"
                min="1"
                max="300"
                placeholder="es. 60"
                class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text placeholder-habit-text-subtle"
              />
            </div>
          </div>
        </div>

        <!-- Exercises Card -->
        <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-habit-text">
              Esercizi
              <span class="text-habit-text-subtle font-normal text-sm"
                >({{ workoutExercises.length }})</span
              >
            </h2>
            <button
              @click="openExercisePicker"
              type="button"
              class="inline-flex items-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 text-sm"
            >
              <svg
                class="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Aggiungi Esercizio
            </button>
          </div>

          <!-- Exercises validation error -->
          <p v-if="errors.exercises" class="text-red-500 text-sm mb-4">
            {{ errors.exercises }}
          </p>

          <!-- Empty state -->
          <div
            v-if="workoutExercises.length === 0"
            class="text-center py-12 border-2 border-dashed border-habit-border rounded-xl"
          >
            <svg
              class="w-12 h-12 mx-auto text-habit-text-subtle mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p class="text-habit-text-subtle">Nessun esercizio aggiunto</p>
            <p class="text-habit-text-subtle text-sm mt-1">
              Clicca "Aggiungi Esercizio" per iniziare
            </p>
          </div>

          <!-- Exercise rows -->
          <div v-else class="space-y-4">
            <div
              v-for="(exercise, index) in workoutExercises"
              :key="exercise._uid"
              class="border border-habit-border rounded-xl p-4 hover:border-habit-cyan/30 transition-colors"
              :class="{
                'border-l-4 border-l-habit-orange/50': exercise.isWarmup,
              }"
            >
              <!-- Row Header -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="text-sm font-bold text-habit-cyan w-6 text-center flex-shrink-0"
                    >{{ index + 1 }}</span
                  >
                  <span class="font-medium text-habit-text truncate">{{
                    exercise.exerciseName
                  }}</span>
                  <span
                    v-if="exercise.isWarmup"
                    class="px-2 py-0.5 text-xs rounded-full bg-habit-orange/20 text-habit-orange flex-shrink-0"
                  >
                    Riscaldamento
                  </span>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                  <!-- Move Up -->
                  <button
                    @click="moveExerciseUp(index)"
                    type="button"
                    :disabled="index === 0"
                    class="p-1.5 text-habit-text-subtle hover:text-habit-text hover:bg-habit-card-hover rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Sposta su"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <!-- Move Down -->
                  <button
                    @click="moveExerciseDown(index)"
                    type="button"
                    :disabled="index === workoutExercises.length - 1"
                    class="p-1.5 text-habit-text-subtle hover:text-habit-text hover:bg-habit-card-hover rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Sposta giu"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <!-- Remove -->
                  <button
                    @click="removeExercise(index)"
                    type="button"
                    class="p-1.5 text-habit-text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Rimuovi"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Parameters Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <!-- Sets -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Serie</label
                  >
                  <input
                    v-model="exercise.sets"
                    type="number"
                    min="1"
                    max="20"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
                  />
                </div>
                <!-- Reps Min -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Rep Min</label
                  >
                  <input
                    v-model="exercise.repsMin"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="-"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                  />
                </div>
                <!-- Reps Max -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Rep Max</label
                  >
                  <input
                    v-model="exercise.repsMax"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="-"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                  />
                </div>
                <!-- Weight Type -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Tipo Peso</label
                  >
                  <select
                    :value="exercise.weightType"
                    @change="
                      handleWeightTypeChange(
                        exercise,
                        ($event.target as any).value,
                      )
                    "
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
                  >
                    <option
                      v-for="opt in weightTypeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <!-- Weight Value -->
                <div v-if="exercise.weightType !== 'bodyweight'">
                  <label class="block text-xs text-habit-text-subtle mb-1">{{
                    getWeightLabel(exercise.weightType)
                  }}</label>
                  <input
                    v-model="exercise.weightValue"
                    type="number"
                    min="0"
                    step="0.5"
                    :placeholder="getWeightPlaceholder(exercise.weightType)"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                  />
                </div>
                <!-- Rest -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Recupero (s)</label
                  >
                  <input
                    v-model="exercise.restSeconds"
                    type="number"
                    min="0"
                    max="600"
                    step="15"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
                  />
                </div>
              </div>

              <!-- Secondary Row -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <!-- Tempo -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Tempo</label
                  >
                  <input
                    v-model="exercise.tempo"
                    type="text"
                    placeholder="es. 3-1-2-0"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                  />
                </div>
                <!-- Superset Group -->
                <div>
                  <label class="block text-xs text-habit-text-subtle mb-1"
                    >Gruppo Superset</label
                  >
                  <input
                    v-model="exercise.supersetGroup"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="-"
                    class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                  />
                </div>
                <!-- Warmup Toggle -->
                <div class="flex items-end pb-1">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      v-model="exercise.isWarmup"
                      type="checkbox"
                      class="w-4 h-4 rounded border-habit-border bg-habit-bg text-habit-orange focus:ring-habit-cyan"
                    />
                    <span class="text-sm text-habit-text-subtle"
                      >Riscaldamento</span
                    >
                  </label>
                </div>
              </div>

              <!-- Notes -->
              <div class="mt-3">
                <input
                  v-model="exercise.notes"
                  type="text"
                  placeholder="Note (opzionale)..."
                  class="w-full px-3 py-1.5 text-sm border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-4 pb-8">
          <button
            type="button"
            @click="handleCancel"
            class="px-6 py-2.5 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-card-hover transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="px-6 py-2.5 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <svg
              v-if="isSaving"
              class="animate-spin w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
            {{
              isSaving
                ? isEditMode
                  ? "Salvataggio..."
                  : "Creazione..."
                : isEditMode
                  ? "Salva Modifiche"
                  : "Crea Scheda"
            }}
          </button>
        </div>
      </form>
    </div>

    <!-- Exercise Picker Sidebar -->
    <Teleport to="body">
      <Transition name="slide">
        <div v-if="showExercisePicker" class="fixed inset-0 z-40">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60"
            @click="closeExercisePicker"
          ></div>

          <!-- Panel -->
          <div
            class="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-habit-bg border-l border-habit-border overflow-hidden flex flex-col"
          >
            <!-- Panel Header -->
            <div
              class="p-4 border-b border-habit-border flex items-center justify-between flex-shrink-0"
            >
              <h3 class="text-lg font-semibold text-habit-text">
                Seleziona Esercizio
              </h3>
              <button
                @click="closeExercisePicker"
                class="p-2 text-habit-text-subtle hover:text-habit-text hover:bg-habit-card-hover rounded-lg transition-colors"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            <!-- Filters -->
            <div
              class="p-4 border-b border-habit-border space-y-3 flex-shrink-0"
            >
              <!-- Search -->
              <div class="relative">
                <svg
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-habit-text-subtle"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  autocomplete="off"
                  placeholder="Cerca esercizio..."
                  @input="handlePickerSearch"
                  class="w-full pl-9 pr-4 py-2 text-sm border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text placeholder-habit-text-subtle"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <!-- Muscle Group -->
                <select
                  @change="handlePickerMuscleGroupChange"
                  class="w-full px-3 py-2 text-sm border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
                >
                  <option value="">Tutti i muscoli</option>
                  <option
                    v-for="mg in exerciseStore.muscleGroups"
                    :key="mg.id"
                    :value="mg.id"
                  >
                    {{ mg.name_it || mg.name }}
                  </option>
                </select>
                <!-- Category -->
                <select
                  @change="handlePickerCategoryChange"
                  class="w-full px-3 py-2 text-sm border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
                >
                  <option value="">Tutte le categorie</option>
                  <option
                    v-for="cat in exerciseStore.categories"
                    :key="cat"
                    :value="cat"
                  >
                    {{ cat }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Exercise List -->
            <div class="flex-1 overflow-y-auto p-4">
              <!-- Loading -->
              <div
                v-if="exerciseStore.loading"
                class="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div
                  v-for="i in 6"
                  :key="i"
                  class="bg-habit-bg border border-habit-border rounded-habit p-4 animate-pulse"
                >
                  <div
                    class="aspect-video bg-habit-skeleton rounded-xl mb-3"
                  ></div>
                  <div class="h-4 bg-habit-skeleton rounded w-2/3 mb-2"></div>
                  <div class="h-3 bg-habit-skeleton rounded w-1/2"></div>
                </div>
              </div>

              <!-- Empty -->
              <div
                v-else-if="exerciseStore.exercises.length === 0"
                class="text-center py-12 text-habit-text-subtle"
              >
                <svg
                  class="w-12 h-12 mx-auto mb-3 text-habit-text-subtle"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p>Nessun esercizio trovato</p>
                <p class="text-sm text-habit-text-subtle mt-1">
                  Prova a modificare i filtri
                </p>
              </div>

              <!-- Exercise Cards -->
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ExerciseCard
                  v-for="exercise in exerciseStore.exercises"
                  :key="exercise.id"
                  :exercise="exercise"
                  @click="handlePickerExerciseClick"
                />
              </div>
            </div>

            <!-- Pagination -->
            <div
              v-if="exerciseStore.pagination.totalPages > 1"
              class="p-4 border-t border-habit-border flex items-center justify-between flex-shrink-0"
            >
              <span class="text-xs text-habit-text-subtle">
                Pagina {{ exerciseStore.pagination.page }} di
                {{ exerciseStore.pagination.totalPages }}
              </span>
              <div class="flex gap-2">
                <button
                  @click="
                    handlePickerPageChange(exerciseStore.pagination.page - 1)
                  "
                  :disabled="exerciseStore.pagination.page <= 1"
                  class="px-3 py-1 text-xs border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Prec
                </button>
                <button
                  @click="
                    handlePickerPageChange(exerciseStore.pagination.page + 1)
                  "
                  :disabled="
                    exerciseStore.pagination.page >=
                    exerciseStore.pagination.totalPages
                  "
                  class="px-3 py-1 text-xs border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Succ
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Exercise Detail Modal (reuse ExerciseModal) -->
    <ExerciseModal
      :exercise="exerciseStore.selectedExercise"
      :show="showExerciseDetail"
      @close="handleCloseExerciseDetail"
      @select="handleExerciseSelected"
    />
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .absolute.right-0,
.slide-leave-to .absolute.right-0 {
  transform: translateX(100%);
}
</style>
