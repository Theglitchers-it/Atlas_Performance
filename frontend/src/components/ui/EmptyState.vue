<script setup lang="ts">
import type { Component } from "vue";

interface Props {
  icon?: Component | null;
  title: string;
  description?: string;
  actionText?: string;
  actionTo?: string;
}

withDefaults(defineProps<Props>(), {
  icon: null,
  description: "",
  actionText: "",
  actionTo: "",
});

defineEmits<{
  (e: "action"): void;
}>();
</script>

<template>
  <div
    class="bg-habit-card border border-habit-border rounded-habit p-8 sm:p-12 text-center"
  >
    <!-- Icon -->
    <div
      v-if="icon"
      class="mx-auto w-16 h-16 rounded-2xl bg-habit-bg-light flex items-center justify-center mb-4"
    >
      <component :is="icon" class="w-8 h-8 text-habit-text-subtle" />
    </div>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-habit-text mb-2">
      {{ title }}
    </h3>

    <!-- Description -->
    <p
      v-if="description"
      class="text-sm text-habit-text-muted max-w-sm mx-auto mb-6"
    >
      {{ description }}
    </p>

    <!-- CTA Button -->
    <router-link
      v-if="actionText && actionTo"
      :to="actionTo"
      class="inline-flex items-center gap-2 px-5 py-2.5 bg-habit-orange text-white text-sm font-medium rounded-xl hover:bg-habit-orange-dark transition-all duration-200 shadow-sm hover:shadow-habit-glow"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      {{ actionText }}
    </router-link>

    <button
      v-else-if="actionText"
      @click="$emit('action')"
      class="inline-flex items-center gap-2 px-5 py-2.5 bg-habit-orange text-white text-sm font-medium rounded-xl hover:bg-habit-orange-dark transition-all duration-200 shadow-sm hover:shadow-habit-glow"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      {{ actionText }}
    </button>
  </div>
</template>
