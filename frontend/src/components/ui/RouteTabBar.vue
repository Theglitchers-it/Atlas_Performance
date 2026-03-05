<script setup lang="ts">
import type { TabDefinition } from "@/composables/useRouteTabs";

defineProps<{
  tabs: readonly TabDefinition[];
  activeTab: string;
}>();

const emit = defineEmits<{
  (e: "switch", key: string): void;
}>();
</script>

<template>
  <div class="mb-4 sm:mb-6">
    <div
      class="flex gap-1 border-b border-habit-border overflow-x-auto scrollbar-hide"
    >
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px"
        :class="
          activeTab === tab.key
            ? 'border-habit-cyan text-habit-cyan'
            : 'border-transparent text-habit-text-subtle hover:text-habit-text hover:border-habit-border'
        "
        @click="emit('switch', tab.key)"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>
