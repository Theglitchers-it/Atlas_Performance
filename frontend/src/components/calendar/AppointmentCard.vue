<script setup lang="ts">
import { computed } from "vue";

interface AppointmentData {
  id: number;
  client_name: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: "confirmed" | "pending" | "cancelled";
  [key: string]: unknown;
}

interface StatusConfig {
  color: string;
  label: string;
}

interface Props {
  appointment: AppointmentData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "click", appointment: AppointmentData): void;
  (e: "cancel", appointment: AppointmentData): void;
}>();

const statusConfig = computed<StatusConfig>(() => {
  const configs: Record<string, StatusConfig> = {
    confirmed: {
      color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
      label: "Confermato",
    },
    pending: {
      color: "bg-orange-500/15 text-orange-500 border-orange-500/30",
      label: "In Attesa",
    },
    cancelled: {
      color: "bg-red-500/15 text-red-500 border-red-500/30",
      label: "Annullato",
    },
  };
  return configs[props.appointment.status] || configs.pending;
});

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const handleClick = (): void => {
  emit("click", props.appointment);
};

const handleCancel = (e: MouseEvent): void => {
  e.stopPropagation();
  emit("cancel", props.appointment);
};
</script>

<template>
  <div
    class="bg-habit-card rounded-xl p-6 border border-habit-border hover:border-habit-orange transition-all cursor-pointer hover:shadow-lg"
    @click="handleClick"
  >
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-habit-text mb-1">
          {{ appointment.client_name }}
        </h3>
        <p class="text-sm text-habit-text-subtle">
          {{ formatDate(appointment.date) }}
        </p>
      </div>
      <span
        :class="[
          'px-3 py-1 rounded-full text-xs font-medium border',
          statusConfig.color,
        ]"
      >
        {{ statusConfig.label }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="flex items-center gap-2">
        <svg
          class="w-5 h-5 text-habit-cyan"
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
        <span class="text-sm font-medium text-habit-text-muted">{{
          appointment.time
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <svg
          class="w-5 h-5 text-habit-cyan"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span class="text-sm font-medium text-habit-text-muted"
          >{{ appointment.duration }} min</span
        >
      </div>
    </div>

    <div
      class="flex items-center justify-between pt-4 border-t border-habit-border"
    >
      <div class="flex items-center gap-2">
        <span
          class="px-3 py-1 bg-habit-orange/10 text-habit-orange rounded-lg text-xs font-medium"
        >
          {{ appointment.type }}
        </span>
      </div>
      <button
        v-if="appointment.status !== 'cancelled'"
        @click="handleCancel"
        class="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
      >
        Annulla
      </button>
    </div>
  </div>
</template>
