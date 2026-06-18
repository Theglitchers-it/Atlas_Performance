<script setup lang="ts">
import { computed } from "vue";
import { useThemeStore } from "@/store/theme";
import { SunIcon, MoonIcon } from "@heroicons/vue/24/outline";

defineProps<{
  inline?: boolean;
}>();

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);
const toggleTheme = () => themeStore.toggleTheme();
</script>

<template>
  <button
    @click="toggleTheme"
    :class="[
      'p-2.5 rounded-xl bg-habit-card/80 backdrop-blur-sm border border-habit-border hover:bg-habit-card-hover active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md',
      inline ? 'inline-flex items-center justify-center' : 'fixed top-4 right-4 z-50',
    ]"
    :title="isDark ? 'Modalità chiara' : 'Modalità scura'"
    :aria-label="isDark ? 'Attiva modalità chiara' : 'Attiva modalità scura'"
    :aria-pressed="isDark ? 'true' : 'false'"
  >
    <SunIcon v-if="isDark" class="w-5 h-5 text-habit-orange" />
    <MoonIcon v-else class="w-5 h-5 text-habit-text-muted" />
  </button>
</template>
