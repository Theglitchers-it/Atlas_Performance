<script setup lang="ts">
interface Props {
  hoverable?: boolean;
}

withDefaults(defineProps<Props>(), {
  hoverable: true,
});
</script>

<template>
  <div
    class="bg-habit-bg border border-habit-border rounded-habit transition-all duration-300"
    :class="{ 'hover:border-habit-border-light hover:scale-[1.02]': hoverable }"
  >
    <slot />
  </div>
</template>
