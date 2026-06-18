<script setup lang="ts">
defineProps<{
  padding?: string;
  mb?: string;
}>();
</script>

<template>
  <div
    :class="[
      'relative overflow-hidden rounded-3xl bg-gradient-to-br from-habit-card via-habit-card to-habit-bg-light/40 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
      padding || 'p-5 sm:p-6',
      mb || 'mb-6',
    ]"
  >
    <slot name="orbs">
      <div
        class="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-habit-orange/15 blur-3xl"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-habit-cyan/10 blur-3xl"
      ></div>
    </slot>
    <div class="relative">
      <slot />
    </div>
  </div>
</template>
