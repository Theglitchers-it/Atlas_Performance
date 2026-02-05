<script setup>
defineProps({
  hoverable: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <div
    class="bg-habit-bg border border-habit-border rounded-habit transition-all duration-300"
    :class="{ 'hover:border-white/20 hover:scale-[1.02]': hoverable }"
  >
    <slot />
  </div>
</template>
