<template>
  <span
    class="inline-flex items-center gap-0.5 font-semibold animate-fade-in"
    :class="[sizeClasses, colorClasses]"
  >
    <!-- Up arrow -->
    <svg
      v-if="isPositive"
      :class="iconSize"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 12V4M8 4L4.5 7.5M8 4L11.5 7.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Down arrow -->
    <svg
      v-else-if="isNegative"
      :class="iconSize"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 4V12M8 12L4.5 8.5M8 12L11.5 8.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Neutral dash -->
    <span v-else class="leading-none">&mdash;</span>

    <!-- Value display -->
    <span v-if="isPositive || isNegative">{{ displayValue }}%</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  value?: number | null;
  size?: "sm" | "md";
  inverted?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  size: "sm",
  inverted: false,
});

const isPositive = computed(() => props.value !== null && props.value > 0);
const isNegative = computed(() => props.value !== null && props.value < 0);
const isNeutral = computed(() => props.value === null || props.value === 0);

const displayValue = computed(() => {
  if (props.value === null) return "";
  return Math.abs(props.value).toFixed(1).replace(/\.0$/, "");
});

const sizeClasses = computed(() => {
  if (props.size === "md") {
    return "text-sm px-2 py-1 rounded-lg";
  }
  return "text-xs px-1.5 py-0.5 rounded-md";
});

const iconSize = computed(() => {
  return props.size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
});

const colorClasses = computed(() => {
  if (isNeutral.value) {
    return "bg-gray-500/15 text-gray-500";
  }

  const positiveGood = "bg-green-500/15 text-green-600 dark:text-green-400";
  const negativeBad = "bg-red-500/15 text-red-600 dark:text-red-400";
  const positiveInverted = "bg-red-500/15 text-red-600 dark:text-red-400";
  const negativeInverted = "bg-green-500/15 text-green-600 dark:text-green-400";

  if (isPositive.value) {
    return props.inverted ? positiveInverted : positiveGood;
  }

  // isNegative
  return props.inverted ? negativeInverted : negativeBad;
});
</script>
