<script setup lang="ts"></script>

<template>
  <div class="animate-pulse space-y-3">
    <!-- Filters bar -->
    <div class="flex items-center gap-3">
      <div class="w-24 h-9 rounded-lg bg-habit-bg-light" />
      <div class="w-28 h-9 rounded-lg bg-habit-bg-light" />
      <div class="flex-1" />
      <div class="w-10 h-9 rounded-lg bg-habit-bg-light" />
    </div>

    <!-- Session Cards -->
    <div class="space-y-3">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-habit-card border border-habit-border rounded-habit p-4 space-y-3"
      >
        <!-- Header row -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-habit-bg-light" />
            <div class="space-y-1.5">
              <div class="w-36 h-4 rounded bg-habit-bg-light" />
              <div class="w-24 h-3 rounded bg-habit-bg-light" />
            </div>
          </div>
          <div class="w-20 h-6 rounded-full bg-habit-bg-light" />
        </div>

        <!-- Progress bar -->
        <div class="w-full h-2 rounded-full bg-habit-bg-light" />

        <!-- Stats row -->
        <div class="flex items-center gap-4">
          <div class="w-20 h-3 rounded bg-habit-bg-light" />
          <div class="w-16 h-3 rounded bg-habit-bg-light" />
          <div class="w-24 h-3 rounded bg-habit-bg-light" />
        </div>
      </div>
    </div>
  </div>
</template>
