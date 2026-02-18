<script setup lang="ts">
import { computed } from "vue";

interface MuscleGroup {
  id: number;
  name: string;
  name_it?: string;
  is_primary?: boolean;
  activation_percentage?: number;
}

type Difficulty = "beginner" | "intermediate" | "advanced";
type Category =
  | "strength"
  | "cardio"
  | "flexibility"
  | "balance"
  | "plyometric"
  | "compound"
  | "isolation";

interface ExerciseData {
  id: number;
  name: string;
  difficulty?: Difficulty | string;
  category?: Category | string;
  image_url?: string;
  video_url?: string;
  is_compound?: boolean;
  equipment?: string | string[];
  muscleGroups?: MuscleGroup[];
  [key: string]: unknown;
}

interface Props {
  exercise: ExerciseData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "click", exercise: ExerciseData): void;
}>();

// Primary muscle group
const primaryMuscle = computed((): MuscleGroup | undefined => {
  const primary = props.exercise.muscleGroups?.find(
    (m: MuscleGroup) => m.is_primary,
  );
  return primary || props.exercise.muscleGroups?.[0];
});

// Difficulty badge color
const difficultyClass = computed((): string => {
  switch (props.exercise.difficulty) {
    case "beginner":
      return "bg-habit-success/20 text-habit-success";
    case "intermediate":
      return "bg-habit-cyan/20 text-habit-cyan";
    case "advanced":
      return "bg-habit-orange/20 text-habit-orange";
    default:
      return "bg-habit-skeleton text-habit-text-subtle";
  }
});

// Difficulty label
const difficultyLabel = computed((): string => {
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

const handleClick = (): void => {
  emit("click", props.exercise);
};
</script>

<template>
  <div
    @click="handleClick"
    class="bg-habit-bg border border-habit-border rounded-habit-sm sm:rounded-habit p-2.5 sm:p-4 cursor-pointer hover:border-habit-cyan/50 hover:scale-[1.02] transition-all duration-300 group h-full"
  >
    <!-- Image/Placeholder -->
    <div
      class="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden mb-2 sm:mb-4 bg-habit-bg-light"
    >
      <img
        v-if="exercise.image_url"
        :src="exercise.image_url"
        :alt="exercise.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-habit-cyan/20 to-habit-orange/20"
      >
        <svg
          class="w-8 h-8 sm:w-12 sm:h-12 text-habit-text-subtle"
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

      <!-- Video indicator -->
      <div
        v-if="exercise.video_url"
        class="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 bg-black/50 rounded-full flex items-center justify-center"
      >
        <svg
          class="w-3 h-3 sm:w-4 sm:h-4 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>

    <!-- Content -->
    <div class="space-y-1.5 sm:space-y-3">
      <!-- Title -->
      <h3
        class="font-semibold text-sm sm:text-base text-habit-text truncate group-hover:text-habit-cyan transition-colors"
      >
        {{ exercise.name }}
      </h3>

      <!-- Badges -->
      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <!-- Muscle group badge -->
        <span
          v-if="primaryMuscle"
          class="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-habit-cyan/20 text-habit-cyan"
        >
          {{ primaryMuscle.name_it || primaryMuscle.name }}
        </span>

        <!-- Difficulty badge -->
        <span
          class="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full"
          :class="difficultyClass"
        >
          {{ difficultyLabel }}
        </span>
      </div>

      <!-- Category and Equipment -->
      <div
        class="flex items-center justify-between text-[10px] sm:text-xs text-habit-text-subtle"
      >
        <span>{{ categoryLabel }}</span>
        <span v-if="exercise.is_compound" class="text-habit-orange"
          >Compound</span
        >
      </div>
    </div>
  </div>
</template>
