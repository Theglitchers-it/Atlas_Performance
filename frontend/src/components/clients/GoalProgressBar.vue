<script setup lang="ts">
import { computed } from "vue";

interface GoalData {
  name: string;
  current: number;
  target: number;
  unit: string;
}

const props = defineProps<{
  goal: GoalData;
}>();

const percentage = computed<number>(() => {
  if (!props.goal.target || props.goal.target === 0) return 0;
  const percent = (props.goal.current / props.goal.target) * 100;
  return Math.min(Math.max(percent, 0), 100);
});

const isCompleted = computed<boolean>(() => percentage.value >= 100);

const progressBarClass = computed<string>(() => {
  if (isCompleted.value) {
    return "bg-gradient-to-r from-habit-success to-emerald-400";
  } else if (percentage.value >= 75) {
    return "bg-gradient-to-r from-habit-cyan to-habit-orange";
  } else if (percentage.value >= 50) {
    return "bg-habit-cyan";
  } else if (percentage.value >= 25) {
    return "bg-habit-orange";
  } else {
    return "bg-red-500";
  }
});

const statusColor = computed<string>(() => {
  if (isCompleted.value) return "text-habit-success";
  if (percentage.value >= 75) return "text-habit-cyan";
  if (percentage.value >= 50) return "text-habit-orange";
  return "text-red-400";
});
</script>

<template>
  <div
    class="bg-habit-card rounded-xl p-4 border border-habit-border hover:border-habit-orange/30 transition-all duration-200"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-white truncate mb-1">
          {{ goal.name }}
        </h4>
        <div class="flex items-center gap-2 text-xs text-habit-text-subtle">
          <span>Progresso</span>
          <span
            v-if="isCompleted"
            class="inline-flex items-center gap-1 text-habit-success"
          >
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            Completato!
          </span>
        </div>
      </div>

      <div class="text-right flex-shrink-0 ml-3">
        <div :class="statusColor" class="text-lg font-bold">
          {{ percentage.toFixed(0) }}%
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mb-3">
      <div
        class="relative w-full h-3 bg-habit-surface rounded-full overflow-hidden"
      >
        <div
          :class="progressBarClass"
          class="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          :style="{ width: percentage + '%' }"
        >
          <!-- Shine effect -->
          <div
            v-if="percentage > 0"
            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          ></div>
        </div>
      </div>
    </div>

    <!-- Values -->
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-baseline gap-1">
        <span class="font-semibold text-white">{{ goal.current }}</span>
        <span class="text-habit-text-subtle">/</span>
        <span class="text-habit-text-muted">{{ goal.target }}</span>
        <span class="text-habit-text-subtle text-xs ml-1">{{ goal.unit }}</span>
      </div>

      <div class="text-xs text-habit-text-subtle">
        <span v-if="!isCompleted">
          Mancano
          <span class="font-medium text-habit-text-muted">{{
            (goal.target - goal.current).toFixed(1)
          }}</span>
          {{ goal.unit }}
        </span>
        <span v-else class="flex items-center gap-1 text-habit-success">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
          Obiettivo raggiunto
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
</style>
