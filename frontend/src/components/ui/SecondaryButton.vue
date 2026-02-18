<script setup lang="ts">
interface Props {
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

defineEmits<{
  (e: "click", event: MouseEvent): void;
}>();
</script>

<template>
  <button
    class="bg-transparent border border-habit-border text-habit-text px-8 py-3 rounded-full transition-all duration-300 hover:border-habit-border-light hover:bg-habit-card-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
