<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from "vue";
import MuscleMap from "./MuscleMap.vue";

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
  selectLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  exercise: null,
  show: false,
  selectLabel: 'Seleziona Esercizio',
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
  document.body.style.overflow = "";
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
          class="relative w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[75vh] flex flex-col bg-habit-bg dark:bg-habit-card border-0 sm:border border-habit-border dark:border-white/[0.12] rounded-t-[20px] sm:rounded-2xl shadow-2xl animate-fade-in overflow-hidden"
        >
          <!-- Close button -->
          <button
            @click="handleClose"
            aria-label="Chiudi dettagli esercizio"
            class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <svg
              class="w-4 h-4"
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
            <div class="relative aspect-video bg-habit-bg-light dark:bg-white/[0.04]">
              <img
                v-if="exercise.image_url"
                :src="exercise.image_url"
                :alt="exercise.name"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center bg-gradient-to-br from-habit-cyan/10 to-habit-orange/10 dark:from-habit-cyan/15 dark:to-habit-orange/15"
              >
                <MuscleMap size="lg" :muscleGroups="exercise.muscleGroups || []" />
              </div>

              <!-- Video player button -->
              <a
                v-if="exercise.video_url"
                :href="exercise.video_url"
                target="_blank"
                class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                <div
                  class="w-12 h-12 rounded-full bg-habit-orange flex items-center justify-center"
                >
                  <svg
                    class="w-5 h-5 text-white ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </a>
            </div>

            <!-- Content -->
            <div class="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <!-- Header -->
              <div>
                <h2
                  class="text-base sm:text-lg font-bold text-habit-text mb-1.5 sm:mb-2"
                >
                  {{ exercise.name }}
                </h2>

                <!-- Badges -->
                <div class="flex flex-wrap gap-2">
                  <span
                    class="px-2 py-0.5 text-xs rounded-full border"
                    :class="difficultyClass"
                  >
                    {{ difficultyLabel }}
                  </span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full bg-habit-card-hover/50 dark:bg-white/[0.08] text-habit-text-muted border border-habit-border dark:border-white/[0.1]"
                  >
                    {{ categoryLabel }}
                  </span>
                  <span
                    v-if="exercise.is_compound"
                    class="px-2 py-0.5 text-xs rounded-full bg-habit-orange/20 text-habit-orange border border-habit-orange/30"
                  >
                    Compound
                  </span>
                </div>
              </div>

              <!-- Muscle Groups -->
              <div v-if="primaryMuscle || secondaryMuscles.length > 0">
                <h3
                  class="text-[10px] font-semibold text-habit-text-subtle uppercase tracking-wider mb-2"
                >
                  Muscoli coinvolti
                </h3>

                <div class="flex gap-3">
                  <MuscleMap size="sm" :muscleGroups="exercise.muscleGroups || []" class="mt-0.5" />
                  <div class="space-y-2 flex-1">
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
                      class="w-2 h-2 rounded-full bg-habit-text-subtle dark:bg-white/30"
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
              </div>

              <!-- Equipment -->
              <div v-if="equipmentList.length > 0">
                <h3
                  class="text-[10px] font-semibold text-habit-text-subtle uppercase tracking-wider mb-2"
                >
                  Attrezzatura
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="equip in equipmentList"
                    :key="equip"
                    class="px-2 py-0.5 text-xs rounded-full bg-habit-card-hover/50 dark:bg-white/[0.07] text-habit-text-muted"
                  >
                    {{ equip }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <div v-if="exercise.description">
                <h3
                  class="text-[10px] font-semibold text-habit-text-subtle uppercase tracking-wider mb-2"
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
                  class="text-[10px] font-semibold text-habit-text-subtle uppercase tracking-wider mb-2"
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
                class="flex gap-2 pt-3 border-t border-habit-border dark:border-white/[0.1]"
              >
                <button
                  @click="handleClose"
                  class="flex-1 px-3 py-2 rounded-xl border border-habit-border dark:border-white/[0.12] text-habit-text-muted hover:bg-habit-card-hover transition-colors text-xs sm:text-sm"
                >
                  Chiudi
                </button>
                <button
                  @click="handleSelect"
                  class="flex-1 px-3 py-2 rounded-xl bg-habit-orange text-white hover:bg-habit-cyan transition-colors font-medium text-xs sm:text-sm"
                >
                  {{ selectLabel }}
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
.modal-enter-active {
  transition: opacity 0.3s ease;
}
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative {
  animation: modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active .relative {
  animation: modalSlideDown 0.2s ease-in forwards;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes modalSlideDown {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
}
</style>
