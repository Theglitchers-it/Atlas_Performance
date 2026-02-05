<template>
  <section class="hero-section relative min-h-screen flex items-center">
    <!-- Background Glow Effects -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-habit-hero-glow opacity-60"></div>
      <div class="absolute bottom-0 left-0 right-0 h-1/3 bg-habit-gradient-dark"></div>
    </div>

    <div class="container mx-auto px-4 relative z-10">
      <!-- Top Badge -->
      <div class="flex justify-center mb-8" v-if="badge">
        <div class="section-tag animate-fade-in">
          <span class="w-2 h-2 rounded-full bg-habit-success animate-pulse"></span>
          <span>{{ badge }}</span>
        </div>
      </div>

      <!-- Main Title -->
      <h1 class="hero-title animate-fade-in-up mb-6">
        <slot name="title">
          {{ title }}
        </slot>
      </h1>

      <!-- Subtitle -->
      <p class="hero-subtitle animate-fade-in-up mb-10" style="animation-delay: 0.1s">
        <slot name="subtitle">
          {{ subtitle }}
        </slot>
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style="animation-delay: 0.2s">
        <slot name="actions">
          <button v-if="primaryAction" class="btn-primary btn-lg" @click="$emit('primary-click')">
            {{ primaryAction }}
          </button>
          <button v-if="secondaryAction" class="btn-secondary btn-lg flex items-center gap-2" @click="$emit('secondary-click')">
            <svg v-if="showPlayIcon" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
            </svg>
            {{ secondaryAction }}
          </button>
        </slot>
      </div>

      <!-- Hero Image/Content Slot -->
      <div class="mt-16 animate-fade-in-up" style="animation-delay: 0.3s">
        <slot name="content"></slot>
      </div>

      <!-- Stats Row -->
      <div v-if="stats && stats.length" class="mt-16 flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in-up" style="animation-delay: 0.4s">
        <div v-for="(stat, index) in stats" :key="index" class="text-center">
          <div class="text-3xl md:text-4xl font-bold text-white">{{ stat.value }}</div>
          <div class="text-habit-text-muted text-sm mt-1">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Scroll Indicator -->
    <div v-if="showScrollIndicator" class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
      <svg class="w-6 h-6 text-habit-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  </section>
</template>

<script setup>
defineProps({
  badge: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'Build habits that actually stick'
  },
  subtitle: {
    type: String,
    default: 'You see the right habits at the right time so your day never feels crowded.'
  },
  primaryAction: {
    type: String,
    default: 'Start tracking for free'
  },
  secondaryAction: {
    type: String,
    default: 'Watch demo'
  },
  showPlayIcon: {
    type: Boolean,
    default: true
  },
  stats: {
    type: Array,
    default: () => []
  },
  showScrollIndicator: {
    type: Boolean,
    default: true
  }
})

defineEmits(['primary-click', 'secondary-click'])
</script>
