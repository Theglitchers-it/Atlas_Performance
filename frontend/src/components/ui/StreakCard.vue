<template>
  <div
    class="card-dark p-6"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <!-- Fire icon with animation -->
        <div class="text-4xl animate-streak-fire">
          {{ streakDays >= 7 ? '🔥' : '💪' }}
        </div>
        <div>
          <h3 class="text-2xl font-bold text-white">{{ streakDays }} Day Streak Active</h3>
          <p class="text-habit-text-muted text-sm">{{ subtitle }}</p>
        </div>
      </div>

      <!-- Badge for milestones -->
      <div v-if="milestone" class="badge-primary">
        {{ milestone }}
      </div>
    </div>

    <!-- Week Calendar -->
    <div class="flex justify-between gap-2 mb-6">
      <div
        v-for="(day, index) in weekDays"
        :key="index"
        class="flex flex-col items-center"
      >
        <span class="text-habit-text-subtle text-xs mb-2">{{ day.label }}</span>
        <div
          class="streak-day"
          :class="getDayClass(day)"
        >
          <span v-if="day.completed">✓</span>
          <span v-else-if="day.missed">✗</span>
          <span v-else>{{ day.date }}</span>
        </div>
      </div>
    </div>

    <!-- Mode Tags -->
    <div v-if="modes && modes.length" class="flex flex-wrap gap-2">
      <span
        v-for="(mode, index) in modes"
        :key="index"
        class="pill text-xs"
        :class="{ 'pill-active': mode.active }"
      >
        <span v-if="mode.icon" class="mr-1">{{ mode.icon }}</span>
        {{ mode.label }}
      </span>
    </div>

    <!-- Progress to next milestone -->
    <div v-if="nextMilestone" class="mt-6 pt-6 border-t border-habit-border">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-habit-text-muted">Next milestone</span>
        <span class="text-white font-medium">{{ nextMilestone.label }}</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-bar-fill"
          :style="{ width: `${nextMilestone.progress}%` }"
        ></div>
      </div>
      <p class="text-habit-text-subtle text-xs mt-2">
        {{ nextMilestone.remaining }} days remaining
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  streakDays: {
    type: Number,
    default: 0
  },
  subtitle: {
    type: String,
    default: 'Build honest streaks that reflect real commitment'
  },
  weekDays: {
    type: Array,
    default: () => [
      { label: 'Mon', date: 13, completed: true },
      { label: 'Tue', date: 14, completed: true },
      { label: 'Wed', date: 15, completed: true },
      { label: 'Thu', date: 16, completed: true },
      { label: 'Fri', date: 17, current: true },
      { label: 'Sat', date: 18, future: true },
      { label: 'Sun', date: 19, future: true }
    ]
  },
  modes: {
    type: Array,
    default: () => [
      { label: 'Travel Mode Active', icon: '✈️', active: true },
      { label: 'Sick Day Allowance', icon: '🏥', active: false }
    ]
  },
  milestone: {
    type: String,
    default: ''
  },
  nextMilestone: {
    type: Object,
    default: null
    // { label: '30 Day Streak', progress: 60, remaining: 12 }
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

const getDayClass = (day) => {
  if (day.completed) return 'streak-day-completed'
  if (day.missed) return 'streak-day-missed'
  if (day.current) return 'streak-day-active'
  if (day.future) return 'streak-day-future'
  return 'streak-day-future'
}
</script>
