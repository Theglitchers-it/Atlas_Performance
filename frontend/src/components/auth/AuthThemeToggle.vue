<script setup lang="ts">
import { computed } from "vue";
import { useThemeStore } from "@/store/theme";
import { SunIcon, MoonIcon } from "@heroicons/vue/24/outline";

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);
const toggleTheme = () => themeStore.toggleTheme();
</script>

<template>
  <button
    @click="toggleTheme"
    class="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-habit-card/80 backdrop-blur-sm border border-habit-border hover:bg-habit-card-hover transition-all duration-200 shadow-sm hover:shadow-md"
    :title="isDark ? 'Modalita chiara' : 'Modalita scura'"
    :aria-label="isDark ? 'Attiva modalita chiara' : 'Attiva modalita scura'"
  >
    <SunIcon v-if="isDark" class="w-5 h-5 text-habit-orange" />
    <MoonIcon v-else class="w-5 h-5 text-habit-text-muted" />
  </button>
</template>
