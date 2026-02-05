<template>
  <div
    class="testimonial-card"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Quote -->
    <p class="text-white text-lg leading-relaxed pl-8 mb-6">
      {{ quote }}
    </p>

    <!-- Author -->
    <div class="flex items-center gap-4">
      <!-- Avatar -->
      <div class="relative">
        <img
          v-if="avatar"
          :src="avatar"
          :alt="name"
          class="avatar avatar-lg"
        />
        <div
          v-else
          class="avatar avatar-lg bg-habit-orange flex items-center justify-center text-white font-semibold text-lg"
        >
          {{ initials }}
        </div>
        <!-- Online indicator -->
        <div v-if="online" class="absolute bottom-0 right-0 w-3 h-3 bg-habit-success rounded-full border-2 border-habit-card"></div>
      </div>

      <!-- Info -->
      <div class="flex-1">
        <h4 class="text-white font-semibold">{{ name }}</h4>
        <p class="text-habit-text-muted text-sm">{{ role }}</p>
      </div>

      <!-- Rating -->
      <div v-if="rating" class="flex gap-1">
        <svg
          v-for="star in 5"
          :key="star"
          class="w-5 h-5"
          :class="star <= rating ? 'text-habit-orange' : 'text-habit-border'"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
    </div>

    <!-- Video preview (optional) -->
    <div v-if="videoThumbnail" class="mt-6 relative rounded-xl overflow-hidden cursor-pointer group" @click="$emit('play-video')">
      <img :src="videoThumbnail" :alt="`Video di ${name}`" class="w-full h-40 object-cover" />
      <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div class="w-14 h-14 rounded-full bg-habit-orange flex items-center justify-center">
          <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
      <!-- Duration badge -->
      <div v-if="videoDuration" class="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs">
        {{ videoDuration }}
      </div>
    </div>

    <!-- Stats (optional) -->
    <div v-if="stats && stats.length" class="mt-6 pt-6 border-t border-habit-border grid grid-cols-3 gap-4">
      <div v-for="(stat, index) in stats" :key="index" class="text-center">
        <div class="text-xl font-bold text-white">{{ stat.value }}</div>
        <div class="text-habit-text-subtle text-xs">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  quote: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: null,
    validator: (value) => value >= 1 && value <= 5
  },
  online: {
    type: Boolean,
    default: false
  },
  videoThumbnail: {
    type: String,
    default: ''
  },
  videoDuration: {
    type: String,
    default: ''
  },
  stats: {
    type: Array,
    default: () => []
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

defineEmits(['play-video'])

const initials = computed(() => {
  return props.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>
