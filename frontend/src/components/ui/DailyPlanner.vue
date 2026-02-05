<template>
  <div
    class="card-dark p-6"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
        <p class="text-habit-text-muted text-sm">{{ subtitle }}</p>
      </div>

      <!-- Completion Badge -->
      <div class="flex items-center gap-2">
        <span class="text-habit-text-muted text-sm">{{ completionPercentage }}%</span>
        <span class="text-xs text-habit-text-subtle">Completion</span>
      </div>
    </div>

    <!-- Date Header -->
    <div class="bg-habit-bg-light rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-habit-orange font-medium">{{ dayName }}</p>
          <p class="text-habit-text-subtle text-sm">{{ formattedDate }}</p>
        </div>
        <div class="flex gap-2">
          <button class="btn-icon btn-ghost" @click="$emit('prev-day')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button class="btn-icon btn-ghost" @click="$emit('next-day')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Tasks List -->
    <div class="space-y-3">
      <div
        v-for="(task, index) in tasks"
        :key="index"
        class="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
        :class="task.completed ? 'bg-habit-success/10' : 'bg-habit-bg-light hover:bg-habit-card'"
      >
        <!-- Time -->
        <div class="text-center min-w-[60px]">
          <span class="text-white font-medium">{{ task.time }}</span>
          <span v-if="task.period" class="text-habit-text-subtle text-xs block">{{ task.period }}</span>
        </div>

        <!-- Divider -->
        <div class="w-px h-10 bg-habit-border"></div>

        <!-- Task info -->
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span v-if="task.icon" class="text-lg">{{ task.icon }}</span>
            <h4
              class="font-medium"
              :class="task.completed ? 'text-habit-text-muted line-through' : 'text-white'"
            >
              {{ task.title }}
            </h4>
          </div>
          <p v-if="task.deadline" class="text-habit-text-subtle text-xs mt-1">
            {{ task.deadline }}
          </p>
        </div>

        <!-- Status / Checkbox -->
        <button
          class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
          :class="task.completed
            ? 'bg-habit-success border-habit-success text-white'
            : 'border-habit-border hover:border-habit-orange'"
          @click="$emit('toggle-task', index)"
        >
          <svg v-if="task.completed" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Add Task Button -->
    <button
      class="w-full mt-4 py-3 border-2 border-dashed border-habit-border rounded-xl text-habit-text-muted hover:border-habit-orange hover:text-habit-orange transition-all duration-200 flex items-center justify-center gap-2"
      @click="$emit('add-task')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span>Add new habit</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Smart daily planner'
  },
  subtitle: {
    type: String,
    default: 'A simple view that shows only the habits that match your current time of day.'
  },
  date: {
    type: Date,
    default: () => new Date()
  },
  tasks: {
    type: Array,
    default: () => [
      { time: '07:30', period: 'AM', icon: '🚶', title: 'Morning walk', deadline: '30 minutes', completed: true },
      { time: '09:30', period: 'AM', icon: '💧', title: 'Drink 3 glasses of water', deadline: 'Before 11:00 AM', completed: false },
      { time: '11:00', period: 'AM', icon: '💻', title: 'Deep work session', deadline: '60 minutes', completed: false },
      { time: '11:30', period: 'AM', icon: '📖', title: 'Read 10 pages', deadline: '30 minutes', completed: false }
    ]
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

defineEmits(['toggle-task', 'add-task', 'prev-day', 'next-day'])

const dayName = computed(() => {
  return props.date.toLocaleDateString('en-US', { weekday: 'long' })
})

const formattedDate = computed(() => {
  return props.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
})

const completionPercentage = computed(() => {
  if (!props.tasks.length) return 0
  const completed = props.tasks.filter(t => t.completed).length
  return Math.round((completed / props.tasks.length) * 100)
})
</script>
