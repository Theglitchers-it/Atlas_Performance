<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import MuscleMap from "./MuscleMap.vue";

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
  index?: number;
  active?: boolean;
}

const props = withDefaults(defineProps<Props>(), { index: 0, active: false });

const emit = defineEmits<{
  (e: "click", exercise: ExerciseData): void;
  (e: "hover", exercise: ExerciseData): void;
}>();

const rowEl = ref<HTMLElement | null>(null);
const glowEl = ref<HTMLElement | null>(null);

const difficultyConfig = computed(() => {
  switch (props.exercise.difficulty) {
    case "beginner":
      return { label: "Base", dot: "bg-emerald-400", glow: "shadow-emerald-400/40" };
    case "intermediate":
      return { label: "Medio", dot: "bg-cyan-400", glow: "shadow-cyan-400/40" };
    case "advanced":
      return { label: "Pro", dot: "bg-orange-400", glow: "shadow-orange-400/40" };
    default:
      return { label: "-", dot: "bg-gray-500", glow: "" };
  }
});

const animDelay = computed(() => `${props.index * 20}ms`);

let rafId = 0;
const handleMouseMove = (e: MouseEvent) => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    if (!glowEl.value || !rowEl.value) return;
    const rect = rowEl.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowEl.value.style.background = `radial-gradient(300px circle at ${x}px ${y}px, var(--glass-glow, rgba(255,255,255,0.04)), transparent 60%)`;
  });
};

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<template>
  <div
    ref="rowEl"
    @click="emit('click', exercise)"
    @mouseenter="emit('hover', exercise)"
    @mousemove="handleMouseMove"
    class="exercise-row group relative flex items-center gap-1.5 xs:gap-2 sm:gap-3 px-2.5 sm:px-3 lg:px-4 py-2.5 sm:py-2.5 cursor-pointer overflow-hidden transition-colors duration-200"
    :class="active ? 'bg-habit-card-hover' : ''"
    :style="{ animationDelay: animDelay }"
  >
    <!-- Liquid glass light follow -->
    <div
      ref="glowEl"
      class="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 glass-glow"
    ></div>

    <!-- Active indicator -->
    <div
      class="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 group-hover:h-6 rounded-full bg-gradient-to-b from-habit-cyan to-blue-400 transition-all duration-300"
      :class="active ? '!h-6' : ''"
    ></div>

    <!-- Muscle mini map -->
    <MuscleMap size="sm" :muscleGroups="exercise.muscleGroups || []" class="hidden sm:block opacity-100 group-hover:opacity-100 transition-opacity duration-300" />

    <!-- Name -->
    <span class="flex-1 text-[13px] sm:text-sm text-habit-text font-medium truncate group-hover:text-habit-text transition-colors duration-300 pl-0.5 sm:pl-1.5">
      {{ exercise.name }}
    </span>

    <!-- Video icon -->
    <svg
      v-if="exercise.video_url"
      class="w-3 h-3 text-habit-text-subtle/40 dark:text-habit-text-subtle/50 flex-shrink-0 hidden sm:block group-hover:text-cyan-400/50 dark:group-hover:text-cyan-400/70 transition-colors duration-300"
      fill="currentColor" viewBox="0 0 24 24"
    >
      <path d="M8 5v14l11-7z" />
    </svg>

    <!-- Compound -->
    <span
      v-if="exercise.is_compound"
      class="hidden lg:inline px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-habit-orange/10 dark:bg-habit-orange/15 text-habit-orange/70 dark:text-habit-orange/85 flex-shrink-0"
    >
      Multi
    </span>

    <!-- Difficulty dot -->
    <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 w-auto xs:w-[52px] sm:w-14">
      <div
        class="w-[5px] h-[5px] rounded-full flex-shrink-0 shadow-sm transition-shadow duration-300 group-hover:shadow-md"
        :class="[difficultyConfig.dot, difficultyConfig.glow]"
      ></div>
      <span class="hidden xs:inline text-[11px] sm:text-xs text-habit-text-subtle/70 group-hover:text-habit-text-subtle transition-colors duration-300">
        {{ difficultyConfig.label }}
      </span>
    </div>

    <!-- Arrow -->
    <svg
      class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-habit-text-subtle/30 dark:text-habit-text-subtle/40 group-hover:text-habit-cyan/50 dark:group-hover:text-habit-cyan/70 transition-all duration-300 group-hover:translate-x-0.5 flex-shrink-0"
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
    </svg>
  </div>
</template>

<style scoped>
.exercise-row {
  animation: rowSlide 0.25s ease-out both;
}

:root:not(.dark) .glass-glow {
  --glass-glow: rgba(0, 0, 0, 0.03);
}

@keyframes rowSlide {
  from {
    opacity: 0;
    transform: translate3d(-6px, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>
