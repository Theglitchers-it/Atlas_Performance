<script setup lang="ts">
import { computed } from "vue";

interface MealItem {
  name?: string;
  food_name?: string;
  calories?: number;
}

interface MealData {
  name: string;
  time: string;
  items: MealItem[];
}

const props = defineProps<{
  meal: MealData;
}>();

const emit = defineEmits<{
  (e: "edit", meal: MealData): void;
  (e: "delete", meal: MealData): void;
  (e: "addItem", meal: MealData): void;
}>();

const totalCalories = computed<number>(() => {
  return props.meal.items.reduce((sum: number, item: MealItem) => {
    return sum + (item.calories || 0);
  }, 0);
});

const itemCount = computed<number>(() => props.meal.items.length);

const formatTime = (time: string): string => {
  if (!time) return "";
  // Se è già in formato HH:MM, ritorna così
  if (typeof time === "string" && time.includes(":")) {
    return time;
  }
  // Altrimenti prova a formattare
  const date = new Date(time);
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const handleEdit = (): void => {
  emit("edit", props.meal);
};

const handleDelete = (): void => {
  emit("delete", props.meal);
};

const handleAddItem = (): void => {
  emit("addItem", props.meal);
};
</script>

<template>
  <div
    class="bg-habit-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-white mb-1">{{ meal.name }}</h3>
        <p class="text-sm text-habit-text-subtle">
          {{ formatTime(meal.time) }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="handleEdit"
          class="p-2 text-habit-text-subtle hover:text-habit-orange transition-colors rounded-lg hover:bg-habit-surface"
          title="Modifica pasto"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        <button
          @click="handleDelete"
          class="p-2 text-habit-text-subtle hover:text-red-400 transition-colors rounded-lg hover:bg-habit-surface"
          title="Elimina pasto"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Calorie e Alimenti -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold text-habit-orange">{{
          Math.round(totalCalories)
        }}</span>
        <span class="text-sm text-habit-text-subtle">kcal</span>
      </div>

      <div class="flex items-center gap-2 text-habit-text-subtle">
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span class="text-sm"
          >{{ itemCount }} {{ itemCount === 1 ? "alimento" : "alimenti" }}</span
        >
      </div>
    </div>

    <!-- Lista Alimenti -->
    <div v-if="itemCount > 0" class="space-y-2 mb-4">
      <div
        v-for="(item, index) in meal.items"
        :key="index"
        class="flex items-center justify-between py-2 px-3 bg-habit-surface rounded-lg"
      >
        <span class="text-sm text-white truncate flex-1">{{
          item.name || item.food_name
        }}</span>
        <span class="text-sm text-habit-text-subtle ml-2">
          {{ Math.round(item.calories || 0) }} kcal
        </span>
      </div>
    </div>

    <div v-else class="py-4 text-center">
      <p class="text-sm text-habit-text-subtle">Nessun alimento aggiunto</p>
    </div>

    <!-- Pulsante Aggiungi Alimento -->
    <button
      @click="handleAddItem"
      class="w-full py-2.5 px-4 bg-habit-surface hover:bg-habit-orange text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      Aggiungi Alimento
    </button>
  </div>
</template>
