<template>
  <div
    class="stat-card group"
    :class="{
      'hover:border-habit-orange/30 transition-all duration-300': hoverable,
      'animate-card-appear': animate
    }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Header with icon -->
    <div class="flex items-start justify-between mb-4">
      <div
        v-if="icon || iconEmoji"
        class="feature-icon w-10 h-10 text-sm"
        :class="iconColorClass"
      >
        <component :is="icon" v-if="icon" class="w-5 h-5" />
        <span v-else>{{ iconEmoji }}</span>
      </div>

      <!-- Trend indicator -->
      <div v-if="trend" class="stat-change" :class="trendClass">
        <svg v-if="trend > 0" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>

    <!-- Value -->
    <div class="stat-value mb-1" :class="{ 'text-gradient-orange': gradientValue }">
      <span v-if="prefix" class="text-xl text-habit-text-muted">{{ prefix }}</span>
      {{ formattedValue }}
      <span v-if="suffix" class="text-xl text-habit-text-muted">{{ suffix }}</span>
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
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-habit-border">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [Number, String],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: [Object, Function],
    default: null
  },
  iconEmoji: {
    type: String,
    default: ''
  },
  iconColor: {
    type: String,
    default: 'orange',
    validator: (value) => ['orange', 'green', 'blue', 'purple', 'red'].includes(value)
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  trend: {
    type: Number,
    default: null
  },
  progress: {
    type: Number,
    default: null
  },
  progressLabel: {
    type: String,
    default: ''
  },
  progressColor: {
    type: String,
    default: 'orange',
    validator: (value) => ['orange', 'green', 'blue', 'purple'].includes(value)
  },
  gradientValue: {
    type: Boolean,
    default: false
  },
  hoverable: {
    type: Boolean,
    default: true
  },
  animate: {
    type: Boolean,
    default: true
  },
  delay: {
    type: Number,
    default: 0
  },
  formatNumber: {
    type: Boolean,
    default: true
  }
})

const iconColorClass = computed(() => {
  const colors = {
    orange: 'feature-icon-orange',
    green: 'feature-icon-green',
    blue: 'feature-icon-blue',
    purple: 'feature-icon-purple',
    red: 'feature-icon-red'
  }
  return colors[props.iconColor] || colors.orange
})

const trendClass = computed(() => {
  return props.trend > 0 ? 'stat-change-positive' : 'stat-change-negative'
})

const progressColorClass = computed(() => {
  const colors = {
    orange: 'bg-habit-orange',
    green: 'progress-bar-success',
    blue: 'bg-habit-blue',
    purple: 'bg-habit-purple'
  }
  return colors[props.progressColor] || ''
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number' && props.formatNumber) {
    return new Intl.NumberFormat('it-IT').format(props.value)
  }
  return props.value
})
</script>
