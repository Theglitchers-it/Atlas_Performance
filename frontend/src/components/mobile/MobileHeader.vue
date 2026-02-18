<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ChevronLeftIcon } from "@heroicons/vue/24/outline";

const props = withDefaults(
  defineProps<{
    title?: string;
    showBack?: boolean;
    transparent?: boolean;
  }>(),
  {
    title: "",
    showBack: true,
    transparent: false,
  },
);

const router = useRouter();
const route = useRoute();

// Mostra back button solo se c'e una pagina precedente e non siamo su home
const canGoBack = computed(() => {
  if (!props.showBack) return false;
  const homeRoutes = ["/", "/my-dashboard"];
  return !homeRoutes.includes(route.path);
});

const goBack = (): void => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
};
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 safe-top z-40 transition-colors duration-200"
    :class="{
      'bg-habit-card/95 backdrop-blur-xl border-b border-habit-border':
        !transparent,
      'bg-transparent': transparent,
    }"
  >
    <div class="flex items-center h-14 px-4">
      <!-- Back button -->
      <button
        v-if="canGoBack"
        @click="goBack"
        class="p-2 -ml-2 rounded-full hover:bg-habit-hover transition-colors touch-target"
      >
        <ChevronLeftIcon class="w-6 h-6 text-habit-text" />
      </button>

      <!-- Spacer se non c'e back -->
      <div v-else class="w-2" />

      <!-- Titolo -->
      <h1 class="flex-1 font-semibold text-habit-text truncate text-lg">
        <slot name="title">{{ title }}</slot>
      </h1>

      <!-- Azioni a destra -->
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
