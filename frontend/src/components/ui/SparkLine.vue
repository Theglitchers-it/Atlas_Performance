<template>
  <svg
    v-if="data.length > 0"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    class="sparkline"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Gradient definition for area fill -->
    <defs v-if="showArea && data.length > 1">
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Filled area under the line -->
    <path
      v-if="showArea && data.length > 1"
      :d="areaPath"
      :fill="`url(#${gradientId})`"
    />

    <!-- Line path -->
    <path
      v-if="data.length > 1"
      :d="linePath"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="{ 'sparkline-animate': animate }"
      :style="
        animate
          ? { strokeDasharray: pathLength, strokeDashoffset: pathLength }
          : {}
      "
    />

    <!-- Last point dot -->
    <circle
      v-if="lastPoint"
      :cx="lastPoint.x"
      :cy="lastPoint.y"
      r="3"
      :fill="color"
      :class="{ 'sparkline-dot-animate': animate }"
    />

    <!-- Single data point -->
    <circle
      v-if="data.length === 1"
      :cx="width / 2"
      :cy="height / 2"
      r="3"
      :fill="color"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  data?: number[];
  color?: string;
  height?: number;
  width?: number;
  showArea?: boolean;
  strokeWidth?: number;
  animate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  color: "#ff4c00",
  height: 32,
  width: 120,
  showArea: true,
  strokeWidth: 2,
  animate: true,
});

// Unique gradient ID to avoid SVG conflicts when multiple sparklines are on the page
let instanceCounter = 0;
const gradientId = `sparkline-gradient-${Date.now()}-${instanceCounter++}`;

// Padding so the stroke and dot don't clip at edges
const padding = computed(() => Math.max(props.strokeWidth, 4));

// Compute SVG coordinate points from the data array
const points = computed(() => {
  if (props.data.length < 2) return [];

  const values = props.data.map((v) => Number(v)).filter((v) => !isNaN(v));
  if (values.length < 2) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid division by zero when all values equal

  const pad = padding.value;
  const drawWidth = props.width - pad * 2;
  const drawHeight = props.height - pad * 2;

  return values.map((val, i) => ({
    x: pad + (i / (values.length - 1)) * drawWidth,
    y: pad + drawHeight - ((val - min) / range) * drawHeight,
  }));
});

// SVG line path (polyline-style with L segments)
const linePath = computed(() => {
  if (points.value.length < 2) return "";
  return points.value
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
});

// SVG area path (closed shape: line path + bottom edge)
const areaPath = computed(() => {
  if (points.value.length < 2) return "";
  const pad = padding.value;
  const bottomY = props.height - pad;
  const first = points.value[0];
  const last = points.value[points.value.length - 1];

  const lineSegments = points.value
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  return `${lineSegments} L ${last.x.toFixed(2)} ${bottomY} L ${first.x.toFixed(2)} ${bottomY} Z`;
});

// Last data point coordinates for the highlight dot
const lastPoint = computed(() => {
  if (points.value.length < 2) return null;
  return points.value[points.value.length - 1];
});

// Approximate path length for stroke-dasharray animation
const pathLength = computed(() => {
  if (points.value.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < points.value.length; i++) {
    const dx = points.value[i].x - points.value[i - 1].x;
    const dy = points.value[i].y - points.value[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.ceil(len);
});
</script>

<style scoped>
.sparkline {
  display: block;
  overflow: visible;
}

.sparkline-animate {
  animation: sparkline-draw 1s ease-out forwards;
}

.sparkline-dot-animate {
  opacity: 0;
  animation: sparkline-dot-fade 0.3s ease-out 0.9s forwards;
}

@keyframes sparkline-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes sparkline-dot-fade {
  to {
    opacity: 1;
  }
}
</style>
