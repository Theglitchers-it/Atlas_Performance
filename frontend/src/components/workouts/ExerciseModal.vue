<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from "vue";

interface MuscleGroup {
  id: number;
  name: string;
  name_it?: string;
  is_primary?: boolean;
  activation_percentage?: number;
}

interface ExerciseData {
  id: number;
  name: string;
  difficulty?: string;
  category?: string;
  image_url?: string;
  video_url?: string;
  description?: string;
  instructions?: string;
  is_compound?: boolean;
  equipment?: string | string[];
  muscleGroups?: MuscleGroup[];
  [key: string]: unknown;
}

interface Props {
  exercise?: ExerciseData | null;
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  exercise: null,
  show: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", exercise: ExerciseData): void;
}>();

// Close on escape key
const handleKeydown = (ev: KeyboardEvent): void => {
  if (ev.key === "Escape" && props.show) {
    emit("close");
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});

// Lock body scroll when modal is open
watch(
  () => props.show,
  (isOpen: boolean) => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  },
);

// Primary muscle group
const primaryMuscle = computed((): MuscleGroup | null | undefined => {
  if (!props.exercise) return null;
  const primary = props.exercise.muscleGroups?.find(
    (m: MuscleGroup) => m.is_primary,
  );
  return primary || props.exercise.muscleGroups?.[0];
});

// Secondary muscles
const secondaryMuscles = computed((): MuscleGroup[] => {
  if (!props.exercise) return [];
  return (
    props.exercise.muscleGroups?.filter((m: MuscleGroup) => !m.is_primary) || []
  );
});

// Difficulty badge color
const difficultyClass = computed((): string => {
  if (!props.exercise) return "";
  switch (props.exercise.difficulty) {
    case "beginner":
      return "bg-habit-success/20 text-habit-success border-habit-success/30";
    case "intermediate":
      return "bg-habit-cyan/20 text-habit-cyan border-habit-cyan/30";
    case "advanced":
      return "bg-habit-orange/20 text-habit-orange border-habit-orange/30";
    default:
      return "bg-habit-skeleton text-habit-text-subtle border-habit-border";
  }
});

// Difficulty label
const difficultyLabel = computed((): string => {
  if (!props.exercise) return "";
  switch (props.exercise.difficulty) {
    case "beginner":
      return "Principiante";
    case "intermediate":
      return "Intermedio";
    case "advanced":
      return "Avanzato";
    default:
      return props.exercise.difficulty || "";
  }
});

// Category label
const categoryLabel = computed((): string => {
  if (!props.exercise) return "";
  const labels: Record<string, string> = {
    strength: "Forza",
    cardio: "Cardio",
    flexibility: "Flessibilita",
    balance: "Equilibrio",
    plyometric: "Pliometrico",
    compound: "Composto",
    isolation: "Isolamento",
  };
  return (
    labels[props.exercise.category as string] ||
    (props.exercise.category as string) ||
    ""
  );
});

// Equipment list
const equipmentList = computed((): string[] => {
  if (!props.exercise?.equipment) return [];
  let equipment: string[];
  try {
    equipment =
      typeof props.exercise.equipment === "string"
        ? JSON.parse(props.exercise.equipment)
        : props.exercise.equipment;
  } catch {
    return [];
  }

  const labels: Record<string, string> = {
    barbell: "Bilanciere",
    dumbbell: "Manubri",
    kettlebell: "Kettlebell",
    cable: "Cavi",
    machine: "Macchina",
    bodyweight: "Corpo libero",
    resistance_band: "Elastici",
    medicine_ball: "Palla medica",
    trx: "TRX",
    none: "Nessuno",
  };

  return (equipment || []).map((e: string) => labels[e] || e);
});

const handleClose = (): void => {
  emit("close");
};

const handleBackdropClick = (e: MouseEvent): void => {
  if (e.target === e.currentTarget) {
    emit("close");
  }
};

const handleSelect = (): void => {
  if (props.exercise) {
    emit("select", props.exercise);
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && exercise"
        role="dialog"
        aria-modal="true"
        aria-label="Dettagli esercizio"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

        <!-- Modal Content -->
        <div
          class="relative w-full sm:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-habit-bg border-0 sm:border border-habit-border rounded-t-[20px] sm:rounded-habit shadow-2xl animate-fade-in overflow-hidden"
        >
          <!-- Close button -->
          <button
            @click="handleClose"
            aria-label="Chiudi dettagli esercizio"
            class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <!-- Scrollable content -->
          <div class="overflow-y-auto flex-1 min-h-0">
            <!-- Image/Video -->
            <div class="relative aspect-video bg-habit-bg-light">
              <img
                v-if="exercise.image_url"
                :src="exercise.image_url"
                :alt="exercise.name"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center bg-gradient-to-br from-habit-cyan/20 to-habit-orange/20"
              >
                <svg
                  class="w-20 h-20 text-habit-text-subtle"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <!-- Video player button -->
              <a
                v-if="exercise.video_url"
                :href="exercise.video_url"
                target="_blank"
                class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                <div
                  class="w-16 h-16 rounded-full bg-habit-orange flex items-center justify-center"
                >
                  <svg
                    class="w-8 h-8 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </a>
            </div>

            <!-- Content -->
            <div class="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <!-- Header -->
              <div>
                <h2
                  class="text-xl sm:text-2xl font-bold text-habit-text mb-2 sm:mb-3"
                >
                  {{ exercise.name }}
                </h2>

                <!-- Badges -->
                <div class="flex flex-wrap gap-2">
                  <span
                    class="px-3 py-1 text-sm rounded-full border"
                    :class="difficultyClass"
                  >
                    {{ difficultyLabel }}
                  </span>
                  <span
                    class="px-3 py-1 text-sm rounded-full bg-habit-card-hover/50 text-habit-text-muted border border-habit-border"
                  >
                    {{ categoryLabel }}
                  </span>
                  <span
                    v-if="exercise.is_compound"
                    class="px-3 py-1 text-sm rounded-full bg-habit-orange/20 text-habit-orange border border-habit-orange/30"
                  >
                    Compound
                  </span>
                </div>
              </div>

              <!-- Muscle Groups -->
              <div v-if="primaryMuscle || secondaryMuscles.length > 0">
                <h3
                  class="text-sm font-semibold text-habit-text-subtle uppercase tracking-wider mb-3"
                >
                  Muscoli coinvolti
                </h3>

                <div class="space-y-2">
                  <!-- Primary -->
                  <div v-if="primaryMuscle" class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-habit-cyan"></div>
                    <span class="text-habit-text font-medium">{{
                      primaryMuscle.name_it || primaryMuscle.name
                    }}</span>
                    <span class="text-xs text-habit-cyan">(Primario)</span>
                    <span
                      v-if="primaryMuscle.activation_percentage"
                      class="ml-auto text-sm text-habit-text-subtle"
                    >
                      {{ primaryMuscle.activation_percentage }}%
                    </span>
                  </div>

                  <!-- Secondary -->
                  <div
                    v-for="muscle in secondaryMuscles"
                    :key="muscle.id"
                    class="flex items-center gap-3"
                  >
                    <div
                      class="w-2 h-2 rounded-full bg-habit-text-subtle"
                    ></div>
                    <span class="text-habit-text-muted">{{
                      muscle.name_it || muscle.name
                    }}</span>
                    <span
                      v-if="muscle.activation_percentage"
                      class="ml-auto text-sm text-habit-text-subtle"
                    >
                      {{ muscle.activation_percentage }}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Equipment -->
              <div v-if="equipmentList.length > 0">
                <h3
                  class="text-sm font-semibold text-habit-text-subtle uppercase tracking-wider mb-3"
                >
                  Attrezzatura
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="equip in equipmentList"
                    :key="equip"
                    class="px-3 py-1 text-sm rounded-full bg-habit-card-hover/50 text-habit-text-muted"
                  >
                    {{ equip }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <div v-if="exercise.description">
                <h3
                  class="text-sm font-semibold text-habit-text-subtle uppercase tracking-wider mb-3"
                >
                  Descrizione
                </h3>
                <p class="text-habit-text-muted leading-relaxed">
                  {{ exercise.description }}
                </p>
              </div>

              <!-- Instructions -->
              <div v-if="exercise.instructions">
                <h3
                  class="text-sm font-semibold text-habit-text-subtle uppercase tracking-wider mb-3"
                >
                  Istruzioni
                </h3>
                <div
                  class="text-habit-text-muted leading-relaxed whitespace-pre-line"
                >
                  {{ exercise.instructions }}
                </div>
              </div>

              <!-- Actions -->
              <div
                class="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-habit-border"
              >
                <button
                  @click="handleClose"
                  class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-habit-border text-habit-text-muted hover:bg-habit-card-hover transition-colors text-sm sm:text-base"
                >
                  Chiudi
                </button>
                <button
                  @click="handleSelect"
                  class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-habit-orange text-white hover:bg-habit-cyan transition-colors font-medium text-sm sm:text-base"
                >
                  Seleziona Esercizio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
