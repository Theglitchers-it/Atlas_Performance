<script setup lang="ts">
import { computed } from 'vue'
import {
  ANTERIOR_BODY,
  ANTERIOR_MUSCLES,
  POSTERIOR_BODY,
  POSTERIOR_MUSCLES,
} from './muscleMapPaths'
import { useMuscleMap, type MuscleGroupInput } from './useMuscleMap'

interface Props {
  muscleGroups?: MuscleGroupInput[]
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  muscleGroups: () => [],
  size: 'md',
})

const { getMuscleStyle } = useMuscleMap(() => props.muscleGroups)

// Each view is 100 wide; combined = 215 wide (100 + 15 gap + 100), 200 tall
const dimensions = computed(() => {
  switch (props.size) {
    case 'sm': return { width: 44, height: 40 }
    case 'lg': return { width: 260, height: 242 }
    default:   return { width: 172, height: 160 }
  }
})

const anteriorMuscleEntries = Object.entries(ANTERIOR_MUSCLES)
const posteriorMuscleEntries = Object.entries(POSTERIOR_MUSCLES)

const ariaLabel = computed(() => {
  if (!props.muscleGroups?.length) return 'Mappa muscolare'
  const names = props.muscleGroups.map((g) => g.name_it || g.name).join(', ')
  return `Mappa muscolare: ${names}`
})
</script>

<template>
  <svg
    :width="dimensions.width"
    :height="dimensions.height"
    viewBox="0 0 215 200"
    role="img"
    :aria-label="ariaLabel"
    class="muscle-map"
  >
    <title>{{ ariaLabel }}</title>

    <!-- ══ ANTERIOR (front) ══ -->
    <g class="anterior">
      <!-- Body parts (head, neck, knees) — always neutral -->
      <template v-for="(part, pi) in ANTERIOR_BODY" :key="'ab' + pi">
        <polygon
          v-for="(pts, idx) in part.polygons"
          :key="'ab' + pi + '-' + idx"
          :points="pts"
          class="body-part"
        >
          <title>{{ part.label }}</title>
        </polygon>
      </template>

      <!-- Muscle regions -->
      <template v-for="[key, region] in anteriorMuscleEntries" :key="'am' + key">
        <polygon
          v-for="(pts, idx) in region.polygons"
          :key="'am' + key + '-' + idx"
          :points="pts"
          :fill="getMuscleStyle(key).fill || 'var(--mm-neutral)'"
          :opacity="getMuscleStyle(key).opacity || 1"
          :class="getMuscleStyle(key).fill ? 'muscle-active' : 'body-part'"
        >
          <title>{{ region.label }}</title>
        </polygon>
      </template>
    </g>

    <!-- ══ POSTERIOR (back), shifted right ══ -->
    <g class="posterior" transform="translate(115, 0)">
      <!-- Body parts -->
      <template v-for="(part, pi) in POSTERIOR_BODY" :key="'pb' + pi">
        <polygon
          v-for="(pts, idx) in part.polygons"
          :key="'pb' + pi + '-' + idx"
          :points="pts"
          class="body-part"
        >
          <title>{{ part.label }}</title>
        </polygon>
      </template>

      <!-- Muscle regions -->
      <template v-for="[key, region] in posteriorMuscleEntries" :key="'pm' + key">
        <polygon
          v-for="(pts, idx) in region.polygons"
          :key="'pm' + key + '-' + idx"
          :points="pts"
          :fill="getMuscleStyle(key).fill || 'var(--mm-neutral)'"
          :opacity="getMuscleStyle(key).opacity || 1"
          :class="getMuscleStyle(key).fill ? 'muscle-active' : 'body-part'"
        >
          <title>{{ region.label }}</title>
        </polygon>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.muscle-map {
  --mm-neutral: rgba(140, 155, 170, 0.5);
  --mm-stroke: rgba(0, 0, 0, 0.4);
  display: block;
  flex-shrink: 0;
}

:root.dark .muscle-map,
.dark .muscle-map {
  --mm-neutral: rgba(200, 210, 220, 0.4);
  --mm-stroke: rgba(255, 255, 255, 0.35);
}

.body-part,
.muscle-active {
  stroke: var(--mm-stroke);
  stroke-width: 0.45;
  stroke-linejoin: round;
  transition: fill 500ms ease, opacity 500ms ease;
}

.body-part {
  fill: var(--mm-neutral);
}
</style>
