<script setup lang="ts">
import { computed } from "vue";

interface StatusConfig {
  label: string;
  class: string;
}

const props = defineProps<{
  status: string;
}>();

const statusConfig = computed<StatusConfig>(() => {
  const configs: Record<string, StatusConfig> = {
    active: {
      label: "Attivo",
      class: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
    },
    inactive: {
      label: "Inattivo",
      class: "bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/30",
    },
    paused: {
      label: "In pausa",
      class: "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30",
    },
    cancelled: {
      label: "Cancellato",
      class: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30",
    },
  };
  return configs[props.status] || configs.inactive;
});
</script>

<template>
  <span
    :class="statusConfig.class"
    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all"
  >
    <span class="relative flex h-2 w-2">
      <span
        v-if="status === 'active'"
        class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"
      ></span>
      <span
        class="relative inline-flex rounded-full h-2 w-2"
        :class="{
          'bg-emerald-400': status === 'active',
          'bg-gray-400': status === 'inactive',
          'bg-orange-400': status === 'paused',
          'bg-red-400': status === 'cancelled',
        }"
      ></span>
    </span>
    {{ statusConfig.label }}
  </span>
</template>
