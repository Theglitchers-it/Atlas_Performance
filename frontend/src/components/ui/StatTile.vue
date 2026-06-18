<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  icon?: string;
  value: string | number;
  label: string;
  orbColor?: string;
  highlight?: boolean;
  valueClass?: string;
  formatNumber?: boolean;
}>();

const formatter = new Intl.NumberFormat("it-IT");
const displayValue = computed(() => {
  if (!props.formatNumber) return props.value;
  if (typeof props.value === "number") return formatter.format(props.value);
  const n = Number(props.value);
  if (!Number.isNaN(n) && props.value !== "") return formatter.format(n);
  return props.value;
});
</script>

<template>
  <div
    :class="[
      'relative overflow-hidden bg-habit-card border border-white/10 rounded-3xl p-3 sm:p-4 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]',
      highlight ? 'ring-2 ring-orange-500/30 animate-pulse-slow' : '',
    ]"
  >
    <div
      :class="[
        'pointer-events-none absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl',
        orbColor ?? 'bg-habit-orange/15',
      ]"
    ></div>
    <div class="relative">
      <div v-if="icon" class="text-2xl sm:text-3xl mb-1">{{ icon }}</div>
      <div
        :class="[
          'text-xl sm:text-2xl font-bold',
          valueClass ?? 'text-habit-text',
        ]"
      >
        <slot name="value">{{ displayValue }}</slot>
      </div>
      <div class="text-habit-text-subtle text-xs">{{ label }}</div>
      <slot name="extra" />
    </div>
  </div>
</template>
