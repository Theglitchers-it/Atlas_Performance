<script setup lang="ts">
import { computed } from "vue";

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MacroDisplay {
  name: string;
  value: number;
  target: number | undefined;
  unit: string;
  color: string;
  textColor: string;
}

const props = withDefaults(
  defineProps<{
    totals: MacroTotals;
    targets?: MacroTotals | null;
  }>(),
  {
    targets: null,
  },
);

const macros = computed<MacroDisplay[]>(() => [
  {
    name: "Calorie",
    value: props.totals.calories,
    target: props.targets?.calories,
    unit: "kcal",
    color: "bg-habit-orange",
    textColor: "text-habit-orange",
  },
  {
    name: "Proteine",
    value: props.totals.protein,
    target: props.targets?.protein,
    unit: "g",
    color: "bg-habit-cyan",
    textColor: "text-habit-cyan",
  },
  {
    name: "Carboidrati",
    value: props.totals.carbs,
    target: props.targets?.carbs,
    unit: "g",
    color: "bg-habit-success",
    textColor: "text-habit-success",
  },
  {
    name: "Grassi",
    value: props.totals.fat,
    target: props.targets?.fat,
    unit: "g",
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
  },
]);

const getPercentage = (value: number, target: number | undefined): number => {
  if (!target || target === 0) return 0;
  return Math.min((value / target) * 100, 100);
};
</script>

<template>
  <div class="bg-habit-card rounded-xl p-6 shadow-sm">
    <h3 class="text-lg font-semibold text-white mb-4">
      Riepilogo Macronutrienti
    </h3>

    <div class="space-y-4">
      <div v-for="macro in macros" :key="macro.name" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-white">{{ macro.name }}</span>
          <div class="flex items-baseline gap-1">
            <span :class="macro.textColor" class="text-lg font-bold">
              {{ Math.round(macro.value) }}
            </span>
            <span class="text-habit-text-subtle text-sm">{{ macro.unit }}</span>
            <template v-if="macro.target">
              <span class="text-habit-text-subtle text-sm mx-1">/</span>
              <span class="text-habit-text-subtle text-sm">
                {{ Math.round(macro.target) }} {{ macro.unit }}
              </span>
            </template>
          </div>
        </div>

        <div class="w-full bg-habit-surface rounded-full h-2.5 overflow-hidden">
          <div
            :class="macro.color"
            class="h-full rounded-full transition-all duration-300 ease-out"
            :style="{ width: `${getPercentage(macro.value, macro.target)}%` }"
          ></div>
        </div>

        <div v-if="macro.target" class="text-right">
          <span
            class="text-xs"
            :class="
              macro.value > macro.target
                ? 'text-red-400'
                : 'text-habit-text-subtle'
            "
          >
            {{ macro.value > macro.target ? "+" : ""
            }}{{ Math.round(macro.value - macro.target) }} {{ macro.unit }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
