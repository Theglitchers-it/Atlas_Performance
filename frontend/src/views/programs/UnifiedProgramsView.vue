<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { CalendarIcon, ClockIcon } from "@heroicons/vue/24/outline";
import { useRouteTabs } from "@/composables/useRouteTabs";
import RouteTabBar from "@/components/ui/RouteTabBar.vue";

const ProgramsView = defineAsyncComponent(
  () => import("@/views/programs/ProgramsView.vue"),
);
const SessionsView = defineAsyncComponent(
  () => import("@/views/sessions/SessionsView.vue"),
);

const tabs = [
  { key: "programmi", label: "Programmi", icon: CalendarIcon },
  { key: "sessioni", label: "Sessioni", icon: ClockIcon },
] as const;

const { activeTab, switchTab } = useRouteTabs(tabs, "/programs", "programmi");
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <RouteTabBar :tabs="tabs" :active-tab="activeTab" @switch="switchTab" />
    <KeepAlive>
      <ProgramsView v-if="activeTab === 'programmi'" />
    </KeepAlive>
    <KeepAlive>
      <SessionsView v-if="activeTab === 'sessioni'" />
    </KeepAlive>
  </div>
</template>
