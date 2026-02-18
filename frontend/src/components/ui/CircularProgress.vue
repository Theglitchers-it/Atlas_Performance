<template>
  <div
    class="inline-flex flex-col items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="transform -rotate-90"
    >
      <defs>
        <!-- Gradient definition when color is an array -->
        <linearGradient
          v-if="isGradient"
          :id="gradientId"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" :stop-color="gradientColors[0]" />
          <stop offset="100%" :stop-color="gradientColors[1]" />
        </linearGradient>
      </defs>

      <!-- Track ring (background) -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="trackStrokeColor"
        :stroke-width="strokeWidth"
      />

      <!-- Progress ring (foreground) -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="progressStroke"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="currentOffset"
        :style="transitionStyle"
      />
    </svg>

    <!-- Center text overlay -->
    <div
      v-if="showValue"
      class="absolute flex flex-col items-center justify-center"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <span
        class="font-bold text-habit-text leading-none"
        :style="{ fontSize: `${valueFontSize}px` }"
      >
        {{ displayValue }}
      </span>
      <span
        v-if="label"
        class="text-habit-text-muted leading-tight mt-0.5"
        :style="{ fontSize: `${labelFontSize}px` }"
      >
        {{ label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";

interface Props {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string | string[];
  trackColor?: string;
  label?: string;
  showValue?: boolean;
  animate?: boolean;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  max: 100,
  size: 120,
  strokeWidth: 8,
  color: "#ff4c00",
  trackColor: "",
  label: "",
  showValue: true,
  animate: true,
  duration: 1000,
});

// Unique gradient ID to avoid SVG conflicts when multiple instances exist
const uid = Math.random().toString(36).substring(2, 9);
const gradientId = computed(() => `cp-grad-${uid}`);

const isGradient = computed(
  () => Array.isArray(props.color) && props.color.length >= 2,
);
const gradientColors = computed(() =>
  Array.isArray(props.color) ? props.color : [props.color, props.color],
);

const center = computed(() => props.size / 2);
const radius = computed(() => (props.size - props.strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);

const percentage = computed(() => {
  if (props.max <= 0) return 0;
  return Math.min(Math.max(props.value / props.max, 0), 1);
});

const targetOffset = computed(() => {
  return circumference.value * (1 - percentage.value);
});

// Track whether mount animation has completed
const hasMounted = ref(false);
const currentOffset = ref(circumference.value);

onMounted(() => {
  if (props.animate) {
    // Start from full offset, then transition to target on next frame
    requestAnimationFrame(() => {
      currentOffset.value = targetOffset.value;
      hasMounted.value = true;
    });
  } else {
    currentOffset.value = targetOffset.value;
    hasMounted.value = true;
  }
});

// React to value changes after mount
watch(targetOffset, (newVal) => {
  if (hasMounted.value) {
    currentOffset.value = newVal;
  }
});

const transitionStyle = computed(() => {
  if (!props.animate) return {};
  return {
    transition: `stroke-dashoffset ${props.duration}ms ease-out`,
  };
});

const progressStroke = computed((): string => {
  if (isGradient.value) {
    return `url(#${gradientId.value})`;
  }
  return props.color as string;
});

// Reactive dark mode detection via MutationObserver
const isDarkMode = ref(false);
let darkModeObserver: MutationObserver | null = null;

onMounted(() => {
  if (typeof document !== "undefined") {
    isDarkMode.value = document.documentElement.classList.contains("dark");
    darkModeObserver = new MutationObserver(() => {
      isDarkMode.value = document.documentElement.classList.contains("dark");
    });
    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
});

onBeforeUnmount(() => {
  darkModeObserver?.disconnect();
});

const trackStrokeColor = computed(() => {
  if (props.trackColor) return props.trackColor;
  return isDarkMode.value ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
});

const displayValue = computed(() => {
  return Math.round(percentage.value * 100);
});

const valueFontSize = computed(() => {
  return Math.max(props.size * 0.22, 12);
});

const labelFontSize = computed(() => {
  return Math.max(props.size * 0.11, 9);
});
</script>

<style scoped>
div:first-child {
  position: relative;
}
</style>
