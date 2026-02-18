<template>
  <div
    class="bg-habit-card border border-habit-border rounded-habit p-6 animate-pulse"
  >
    <!-- Header -->
    <div v-if="type === 'stats'" class="space-y-3">
      <div class="flex items-start justify-between">
        <div class="w-10 h-10 bg-habit-skeleton rounded-xl"></div>
        <div class="w-12 h-5 bg-habit-skeleton rounded-md"></div>
      </div>
      <div class="h-8 bg-habit-skeleton rounded w-1/2"></div>
      <div class="h-4 bg-habit-skeleton rounded w-3/4"></div>
    </div>

    <div v-else-if="type === 'chart'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="h-5 bg-habit-skeleton rounded w-1/3"></div>
        <div class="h-5 bg-habit-skeleton rounded w-20"></div>
      </div>
      <div class="h-48 bg-habit-skeleton rounded-xl skeleton-shimmer"></div>
    </div>

    <div v-else-if="type === 'list'" class="space-y-4">
      <div class="h-5 bg-habit-skeleton rounded w-1/3 mb-4"></div>
      <div v-for="i in lines || 4" :key="i" class="flex items-center space-x-3">
        <div
          class="w-10 h-10 bg-habit-skeleton rounded-full flex-shrink-0"
        ></div>
        <div class="flex-1 space-y-2">
          <div
            class="h-4 bg-habit-skeleton rounded"
            :style="{ width: `${60 + Math.random() * 30}%` }"
          ></div>
          <div class="h-3 bg-habit-skeleton rounded w-1/3"></div>
        </div>
      </div>
    </div>

    <!-- Default/generic -->
    <div v-else class="space-y-3">
      <div class="h-5 bg-habit-skeleton rounded w-2/3"></div>
      <div class="h-4 bg-habit-skeleton rounded w-full"></div>
      <div class="h-4 bg-habit-skeleton rounded w-3/4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: "default" | "stats" | "chart" | "list";
  lines?: number;
}

withDefaults(defineProps<Props>(), {
  type: "default",
  lines: 4,
});
</script>
