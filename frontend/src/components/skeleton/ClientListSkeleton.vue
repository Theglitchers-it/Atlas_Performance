<script setup lang="ts"></script>

<template>
  <div class="animate-pulse space-y-3">
    <!-- Search + Filter bar -->
    <div class="flex items-center gap-3">
      <div class="flex-1 h-10 rounded-habit bg-habit-bg-light" />
      <div class="w-10 h-10 rounded-habit bg-habit-bg-light" />
    </div>

    <!-- Client Cards -->
    <div class="space-y-2">
      <div
        v-for="i in 8"
        :key="i"
        class="bg-habit-card border border-habit-border rounded-habit p-4 flex items-center gap-3"
      >
        <!-- Avatar -->
        <div class="w-11 h-11 rounded-full bg-habit-bg-light flex-shrink-0" />

        <!-- Info -->
        <div class="flex-1 min-w-0 space-y-2">
          <div class="flex items-center gap-2">
            <div class="w-32 h-4 rounded bg-habit-bg-light" />
            <div class="w-14 h-5 rounded-full bg-habit-bg-light" />
          </div>
          <div class="flex items-center gap-3">
            <div class="w-36 h-3 rounded bg-habit-bg-light" />
            <div class="w-20 h-3 rounded bg-habit-bg-light" />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-1">
          <div class="w-8 h-8 rounded-lg bg-habit-bg-light" />
          <div class="w-8 h-8 rounded-lg bg-habit-bg-light" />
        </div>
      </div>
    </div>
  </div>
</template>
