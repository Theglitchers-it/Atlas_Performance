<script setup lang="ts"></script>

<template>
  <div class="animate-pulse space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row items-center gap-3">
      <!-- Navigation row -->
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-habit-bg-light" />
        <div class="w-9 h-9 rounded-lg bg-habit-bg-light" />
        <div class="w-24 h-6 rounded bg-habit-bg-light mx-2" />
        <div class="w-16 h-8 rounded-lg bg-habit-bg-light" />
      </div>
      <!-- View toggle -->
      <div class="flex gap-1 bg-habit-bg-light rounded-lg p-1">
        <div class="w-16 h-8 rounded-md bg-habit-card" />
        <div class="w-20 h-8 rounded-md bg-habit-bg-light" />
        <div class="w-14 h-8 rounded-md bg-habit-bg-light" />
      </div>
    </div>

    <!-- Calendar Grid -->
    <div
      class="bg-habit-card border border-habit-border rounded-habit overflow-hidden"
    >
      <!-- Header (days) -->
      <div class="grid grid-cols-7 border-b border-habit-border">
        <div v-for="i in 7" :key="i" class="p-2 sm:p-3 text-center">
          <div class="w-8 h-3 rounded bg-habit-bg-light mx-auto mb-1" />
          <div class="w-6 h-5 rounded bg-habit-bg-light mx-auto" />
        </div>
      </div>

      <!-- Time slots -->
      <div class="divide-y divide-habit-border/50">
        <div
          v-for="hour in 8"
          :key="hour"
          class="grid grid-cols-7 min-h-[3rem] sm:min-h-[4rem]"
        >
          <div
            v-for="day in 7"
            :key="day"
            class="border-r border-habit-border/30 p-0.5"
          >
            <!-- Random events placeholder -->
            <div
              v-if="(hour + day) % 3 === 0"
              class="h-8 sm:h-10 rounded bg-habit-bg-light"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
