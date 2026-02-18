<script setup lang="ts"></script>

<template>
  <div class="space-y-6 animate-pulse">
    <!-- Stat Cards Row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3">
      <div
        v-for="i in 4"
        :key="i"
        class="bg-habit-card border border-habit-border rounded-habit p-3 xs:p-4 space-y-2 xs:space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="w-10 h-10 rounded-xl bg-habit-bg-light" />
          <div class="w-16 h-4 rounded bg-habit-bg-light" />
        </div>
        <div class="w-24 h-6 rounded bg-habit-bg-light" />
        <div class="w-full h-2 rounded-full bg-habit-bg-light" />
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="i in 2"
        :key="i"
        class="bg-habit-card border border-habit-border rounded-habit p-4 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="w-32 h-5 rounded bg-habit-bg-light" />
          <div class="w-20 h-4 rounded bg-habit-bg-light" />
        </div>
        <div
          class="w-full h-[180px] sm:h-[200px] rounded-lg bg-habit-bg-light"
        />
      </div>
    </div>

    <!-- Today's Appointments -->
    <div
      class="bg-habit-card border border-habit-border rounded-habit p-4 space-y-3"
    >
      <div class="w-40 h-5 rounded bg-habit-bg-light" />
      <div
        v-for="i in 3"
        :key="i"
        class="flex items-center gap-3 py-3 border-b border-habit-border last:border-0"
      >
        <div class="w-10 h-10 rounded-full bg-habit-bg-light" />
        <div class="flex-1 space-y-2">
          <div class="w-3/4 h-4 rounded bg-habit-bg-light" />
          <div class="w-1/2 h-3 rounded bg-habit-bg-light" />
        </div>
        <div class="w-16 h-6 rounded-full bg-habit-bg-light" />
      </div>
    </div>

    <!-- Recent Clients -->
    <div
      class="bg-habit-card border border-habit-border rounded-habit p-4 space-y-3"
    >
      <div class="w-32 h-5 rounded bg-habit-bg-light" />
      <div v-for="i in 4" :key="i" class="flex items-center gap-3 py-2">
        <div class="w-9 h-9 rounded-full bg-habit-bg-light" />
        <div class="flex-1 space-y-1.5">
          <div class="w-2/3 h-3.5 rounded bg-habit-bg-light" />
          <div class="w-1/3 h-3 rounded bg-habit-bg-light" />
        </div>
      </div>
    </div>
  </div>
</template>
