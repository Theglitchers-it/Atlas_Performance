<template>
  <div
    class="card-feature group cursor-pointer"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Icon -->
    <div
      class="feature-icon mb-4 transition-transform duration-300 group-hover:scale-110"
      :class="iconColorClass"
    >
      <slot name="icon">
        <component :is="icon" v-if="icon" class="w-6 h-6" />
        <span v-else>{{ iconEmoji }}</span>
      </slot>
    </div>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-white mb-2 group-hover:text-habit-orange transition-colors duration-300">
      {{ title }}
    </h3>

    <!-- Description -->
    <p class="text-habit-text-muted text-sm leading-relaxed">
      {{ description }}
    </p>

    <!-- Optional Link/Action -->
    <div v-if="actionText" class="mt-4 flex items-center gap-2 text-habit-orange text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <span>{{ actionText }}</span>
      <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>

    <!-- Badge (optional) -->
    <div v-if="badge" class="absolute top-4 right-4">
      <span class="badge-primary">{{ badge }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
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
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  actionText: {
    type: String,
    default: ''
  },
  badge: {
    type: String,
    default: ''
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
</script>
