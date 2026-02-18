<script setup lang="ts">
import {} from "vue";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Props {
  slots: TimeSlot[];
  selectedSlot?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedSlot: null,
});

const emit = defineEmits<{
  (e: "select", time: string): void;
}>();

const handleSlotClick = (slot: TimeSlot): void => {
  if (slot.available) {
    emit("select", slot.time);
  }
};

const isSelected = (time: string): boolean => {
  return props.selectedSlot === time;
};

const getSlotClasses = (slot: TimeSlot): string => {
  const baseClasses =
    "px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200";

  if (!slot.available) {
    return `${baseClasses} bg-habit-bg-light text-habit-text-subtle cursor-not-allowed opacity-50`;
  }

  if (isSelected(slot.time)) {
    return `${baseClasses} bg-habit-orange text-white shadow-lg transform scale-105`;
  }

  return `${baseClasses} bg-habit-card text-habit-text-muted hover:bg-habit-cyan hover:text-white cursor-pointer border-2 border-habit-border hover:border-habit-cyan hover:shadow-md`;
};
</script>

<template>
  <div class="bg-habit-card rounded-xl p-6 border border-habit-border">
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Seleziona un Orario
      </h3>
      <p class="text-sm text-habit-text-subtle">
        Scegli uno slot disponibile per il tuo appuntamento
      </p>
    </div>

    <div
      v-if="slots.length > 0"
      class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3"
    >
      <button
        v-for="slot in slots"
        :key="slot.time"
        :class="getSlotClasses(slot)"
        :disabled="!slot.available"
        @click="handleSlotClick(slot)"
      >
        {{ slot.time }}
      </button>
    </div>

    <div v-else class="text-center py-8">
      <svg
        class="w-12 h-12 text-habit-text-subtle mx-auto mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-habit-text-subtle">Nessuno slot disponibile</p>
    </div>

    <div class="mt-6 flex items-center gap-3 sm:gap-6 flex-wrap text-xs">
      <div class="flex items-center gap-2">
        <div
          class="w-4 h-4 bg-habit-card border-2 border-habit-border rounded"
        ></div>
        <span class="text-habit-text-subtle">Disponibile</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-habit-orange rounded"></div>
        <span class="text-habit-text-subtle">Selezionato</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-habit-bg-light rounded opacity-50"></div>
        <span class="text-habit-text-subtle">Non disponibile</span>
      </div>
    </div>
  </div>
</template>
