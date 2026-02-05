<template>
  <div
    class="card-dark p-4 relative overflow-hidden"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Background emoji -->
    <div class="absolute -right-4 -bottom-4 text-8xl opacity-20 transform rotate-12">
      {{ emoji }}
    </div>

    <div class="relative z-10">
      <!-- Header -->
      <div class="flex items-center gap-2 text-habit-text-subtle text-xs mb-2">
        <span>{{ timeLabel }}</span>
        <span>•</span>
        <span>{{ category }}</span>
      </div>

      <!-- Title -->
      <h4 class="text-white font-semibold mb-2">{{ title }}</h4>

      <!-- Description -->
      <p class="text-habit-text-muted text-sm mb-4">{{ description }}</p>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          class="btn-secondary btn-sm flex-1"
          @click="$emit('dismiss')"
        >
          {{ dismissText }}
        </button>
        <button
          class="btn-primary btn-sm flex-1"
          @click="$emit('accept')"
        >
          {{ acceptText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  emoji: {
    type: String,
    default: '🧘'
  },
  timeLabel: {
    type: String,
    default: '8:00 PM'
  },
  category: {
    type: String,
    default: 'Evening Wind Down'
  },
  title: {
    type: String,
    default: 'Take a 5-minute break'
  },
  description: {
    type: String,
    default: 'Time to stretch and refresh before your next task.'
  },
  dismissText: {
    type: String,
    default: 'Later'
  },
  acceptText: {
    type: String,
    default: "I'm on it"
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

defineEmits(['accept', 'dismiss'])
</script>
