<script setup lang="ts">
import { computed } from "vue";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
} from "@heroicons/vue/24/outline";

interface TabItem {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  tabs: TabItem[];
  activeValue: string;
  sortBy: "recent" | "trending";
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "select", value: string): void;
  (e: "toggle-sort"): void;
  (e: "open-filters"): void;
}>();

const sortLabel = computed(() =>
  props.sortBy === "trending" ? "Trending" : "Recenti",
);
</script>

<template>
  <div class="mb-4">
    <!-- Header: title + sort + filters -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-bold text-habit-text">Sfoglia per</h2>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="emit('toggle-sort')"
          class="flex items-center gap-1 text-xs text-habit-text-muted hover:text-habit-text px-2 py-1 rounded-lg hover:bg-habit-bg-light transition-colors"
        >
          <AdjustmentsHorizontalIcon class="w-3.5 h-3.5" />
          <span class="font-medium">{{ sortLabel }}</span>
          <ChevronDownIcon class="w-3 h-3" />
        </button>
        <button
          type="button"
          @click="emit('open-filters')"
          class="md:hidden p-1.5 rounded-lg text-habit-text-muted hover:text-habit-text hover:bg-habit-bg-light transition-colors"
          aria-label="Apri filtri"
        >
          <AdjustmentsHorizontalIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Chip orizzontali scrollabili -->
    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        @click="emit('select', tab.value)"
        :class="[
          'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
          activeValue === tab.value
            ? 'bg-habit-orange text-white'
            : 'bg-habit-bg-light text-habit-text-muted hover:text-habit-text',
        ]"
      >
        <span v-if="tab.icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
