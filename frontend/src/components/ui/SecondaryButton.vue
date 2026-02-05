<script setup>
defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<template>
  <button
    class="bg-transparent border border-habit-border text-white px-8 py-3 rounded-full transition-all duration-300 hover:border-white/30 hover:bg-white/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
