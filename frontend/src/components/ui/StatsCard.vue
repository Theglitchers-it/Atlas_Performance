<template>
  <div
    class="stat-card group relative overflow-hidden"
    :class="{
      'card-tilt': hoverable,
      'animate-card-appear': animate,
      'opacity-0': animate && !hasAppeared,
    }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Header with icon -->
    <div class="flex items-start justify-between mb-1 xs:mb-2 sm:mb-3">
      <div
        v-if="icon || iconEmoji"
        class="feature-icon w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 text-xs xs:text-sm"
        :class="iconColorClass"
      >
        <component :is="icon" v-if="icon" class="w-4 h-4 sm:w-5 sm:h-5" />
        <span v-else>{{ iconEmoji }}</span>
      </div>

      <!-- Trend indicator -->
      <div v-if="trend" class="stat-change" :class="trendClass">
        <svg
          v-if="trend > 0"
          class="w-3 h-3 sm:w-4 sm:h-4"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <svg v-else class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>

    <!-- Value with animated counter -->
    <div
      class="stat-value mb-1"
      :class="{ 'text-gradient-orange': gradientValue }"
    >
      <span v-if="prefix" class="text-sm sm:text-xl text-habit-text-muted">{{
        prefix
      }}</span>
      {{ animatedFormattedValue }}
      <span v-if="suffix" class="text-sm sm:text-xl text-habit-text-muted">{{
        suffix
      }}</span>
    </div>

    <!-- Label -->
    <div class="stat-label">{{ label }}</div>

    <!-- Progress bar (optional) -->
    <div v-if="progress !== null" class="mt-4">
      <div class="progress-bar">
        <div
          class="progress-bar-fill"
          :class="progressColorClass"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <div v-if="progressLabel" class="text-xs text-habit-text-subtle mt-1">
        {{ progressLabel }}
      </div>
    </div>

    <!-- Footer slot -->
    <div
      v-if="$slots.footer"
      class="mt-1.5 pt-1.5 xs:mt-2 xs:pt-2 sm:mt-4 sm:pt-4 border-t border-habit-border"
    >
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, onMounted } from "vue";
import type { Component } from "vue";
import { useAnimatedNumber } from "@/composables/useAnimatedNumber";

type IconColor = "orange" | "green" | "blue" | "purple" | "red";
type ProgressColor = "orange" | "green" | "blue" | "purple";

interface Props {
  value: number | string;
  label: string;
  icon?: Component | null;
  iconEmoji?: string;
  iconColor?: IconColor;
  prefix?: string;
  suffix?: string;
  trend?: number | null;
  progress?: number | null;
  progressLabel?: string;
  progressColor?: ProgressColor;
  gradientValue?: boolean;
  hoverable?: boolean;
  animate?: boolean;
  delay?: number;
  formatNumber?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  iconEmoji: "",
  iconColor: "orange",
  prefix: "",
  suffix: "",
  trend: null,
  progress: null,
  progressLabel: "",
  progressColor: "orange",
  gradientValue: false,
  hoverable: true,
  animate: true,
  delay: 0,
  formatNumber: true,
});

const hasAppeared = ref(!props.animate);

// Animated number counter
const numericValue = computed(() => {
  const n = Number(props.value);
  return isNaN(n) ? 0 : n;
});
const numericRef = toRef(() => numericValue.value);

const isNumeric = computed(() => typeof props.value === "number");

const { formattedValue: animatedCounter } = useAnimatedNumber(numericRef, {
  duration: 800,
  formatNumber: props.formatNumber,
  autoStart: true,
});

const animatedFormattedValue = computed(() => {
  if (isNumeric.value && props.formatNumber) {
    return animatedCounter.value;
  }
  if (typeof props.value === "number" && props.formatNumber) {
    return new Intl.NumberFormat("it-IT").format(props.value);
  }
  return props.value;
});

const iconColorClass = computed(() => {
  const colors = {
    orange: "feature-icon-orange",
    green: "feature-icon-green",
    blue: "feature-icon-blue",
    purple: "feature-icon-purple",
    red: "feature-icon-red",
  };
  return colors[props.iconColor] || colors.orange;
});

const trendClass = computed(() => {
  return props.trend! > 0 ? "stat-change-positive" : "stat-change-negative";
});

const progressColorClass = computed(() => {
  const colors = {
    orange: "bg-habit-orange",
    green: "progress-bar-success",
    blue: "bg-habit-blue",
    purple: "bg-habit-purple",
  };
  return colors[props.progressColor] || "";
});

onMounted(() => {
  if (props.animate) {
    // Mark as appeared once animation delay passes
    setTimeout(
      () => {
        hasAppeared.value = true;
      },
      props.delay * 1000 + 50,
    );
  }
});
</script>
