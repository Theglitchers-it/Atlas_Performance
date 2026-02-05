<template>
  <div
    class="card-dark p-6"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Header -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-white mb-1">{{ title }}</h3>
      <p class="text-habit-text-muted text-sm">{{ subtitle }}</p>
    </div>

    <!-- Progress Circles -->
    <div class="bg-habit-bg-light rounded-xl p-6 mb-6">
      <h4 class="text-habit-text-muted text-sm text-center mb-6">Your week at a glance</h4>

      <div class="flex justify-center gap-8">
        <div
          v-for="(item, index) in progressItems"
          :key="index"
          class="flex flex-col items-center"
        >
          <!-- Circular Progress -->
          <div class="relative w-16 h-16 mb-2">
            <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <!-- Background circle -->
              <path
                class="text-habit-card"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <!-- Progress circle -->
              <path
                :class="getProgressColor(item.color)"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="`${item.progress}, 100`"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <!-- Percentage text -->
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-white font-bold text-sm">{{ item.progress }}%</span>
            </div>
          </div>
          <span class="text-habit-text-muted text-xs">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="(stat, index) in stats"
        :key="index"
        class="text-center p-4 bg-habit-bg-light rounded-xl"
      >
        <div class="text-2xl font-bold text-white">{{ stat.value }}</div>
        <div class="text-habit-text-subtle text-xs mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Insights (optional) -->
    <div v-if="insights && insights.length" class="mt-6 pt-6 border-t border-habit-border space-y-3">
      <div
        v-for="(insight, index) in insights"
        :key="index"
        class="flex items-start gap-3"
      >
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-sm" :class="getInsightIconClass(insight.type)">
          {{ getInsightIcon(insight.type) }}
        </div>
        <p class="text-habit-text-muted text-sm flex-1">{{ insight.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'Weekly reflection'
  },
  subtitle: {
    type: String,
    default: 'A clear summary of your week that highlights what improved and what needs adjusting.'
  },
  progressItems: {
    type: Array,
    default: () => [
      { label: 'Workout', progress: 86, color: 'blue' },
      { label: 'Meditation', progress: 100, color: 'green' },
      { label: 'Reading', progress: 71, color: 'purple' }
    ]
  },
  stats: {
    type: Array,
    default: () => [
      { label: 'Streaks completed', value: 12 },
      { label: 'Focused sessions', value: '07' },
      { label: '3 streaks improved', value: '' },
      { label: 'Total time: 4h 20m', value: '' }
    ]
  },
  insights: {
    type: Array,
    default: () => []
    // [{ type: 'success', text: 'Great progress on meditation!' }]
  },
  animate: {
    type: Boolean,
    default: true
  },
  delay: {
    type: Number,
    default: 0
  }
})

const getProgressColor = (color) => {
  const colors = {
    orange: 'text-habit-orange',
    green: 'text-habit-success',
    blue: 'text-habit-blue',
    purple: 'text-habit-purple',
    red: 'text-habit-red'
  }
  return colors[color] || colors.orange
}

const getInsightIcon = (type) => {
  const icons = {
    success: '✓',
    warning: '!',
    info: 'i',
    tip: '💡'
  }
  return icons[type] || icons.info
}

const getInsightIconClass = (type) => {
  const classes = {
    success: 'bg-habit-success/20 text-habit-success',
    warning: 'bg-warning/20 text-warning',
    info: 'bg-habit-blue/20 text-habit-blue',
    tip: 'bg-habit-orange/20'
  }
  return classes[type] || classes.info
}
</script>
