<script setup lang="ts"></script>

<template>
  <div class="space-y-3">
    <!-- Glass panel skeleton -->
    <div class="skeleton-glass rounded-xl sm:rounded-2xl overflow-hidden divide-y divide-habit-border">
      <div
        v-for="i in 6"
        :key="i"
        class="animate-pulse flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-3 sm:px-4 lg:px-5 py-3 sm:py-3.5 lg:py-4"
      >
        <!-- Top row -->
        <div class="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <!-- Avatar -->
          <div class="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-habit-skeleton flex-shrink-0" />
          <!-- Name + meta -->
          <div class="flex-1 min-w-0 space-y-2">
            <div class="flex items-center gap-2">
              <div class="h-4 rounded bg-habit-skeleton w-32" />
              <div class="h-4 rounded-full bg-habit-skeleton w-14" />
            </div>
            <div class="flex items-center gap-2">
              <div class="h-3 rounded bg-habit-skeleton w-36" />
              <div class="hidden sm:block h-3 rounded bg-habit-skeleton w-20" />
            </div>
          </div>
        </div>
        <!-- Stats -->
        <div class="flex items-center gap-3 pl-[46px] sm:pl-0">
          <div class="h-3 rounded bg-habit-skeleton w-10" />
          <div class="h-3 rounded bg-habit-skeleton w-8" />
          <div class="hidden lg:block h-3 rounded bg-habit-skeleton w-28" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-glass {
  background: var(--glass-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.09));
}

:root:not(.dark) .skeleton-glass {
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(0, 0, 0, 0.08);
}
</style>
