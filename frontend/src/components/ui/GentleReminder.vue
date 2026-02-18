<template>
  <div
    class="card-dark p-4 relative overflow-hidden"
    :class="{ 'animate-card-appear': animate }"
    :style="{ animationDelay: `${delay}s` }"
  >
    <!-- Background emoji -->
    <div
      class="absolute -right-4 -bottom-4 text-8xl opacity-20 transform rotate-12"
    >
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
      <h4 class="text-habit-text font-semibold mb-2">{{ title }}</h4>

      <!-- Description -->
      <p class="text-habit-text-muted text-sm mb-4">{{ description }}</p>

      <!-- Actions -->
      <div class="flex gap-2">
        <button class="btn-secondary btn-sm flex-1" @click="$emit('dismiss')">
          {{ dismissText }}
        </button>
        <button class="btn-primary btn-sm flex-1" @click="$emit('accept')">
          {{ acceptText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  emoji?: string;
  timeLabel?: string;
  category?: string;
  title?: string;
  description?: string;
  dismissText?: string;
  acceptText?: string;
  animate?: boolean;
  delay?: number;
}

withDefaults(defineProps<Props>(), {
  emoji: "\uD83E\uDDD8",
  timeLabel: "8:00 PM",
  category: "Evening Wind Down",
  title: "Take a 5-minute break",
  description: "Time to stretch and refresh before your next task.",
  dismissText: "Later",
  acceptText: "I'm on it",
  animate: true,
  delay: 0,
});

defineEmits<{
  (e: "accept"): void;
  (e: "dismiss"): void;
}>();
</script>
