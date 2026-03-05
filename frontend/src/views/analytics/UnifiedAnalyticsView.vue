<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import {
  ChartBarIcon,
  BeakerIcon,
  TrophyIcon,
} from "@heroicons/vue/24/outline";
import { useRouteTabs } from "@/composables/useRouteTabs";
import RouteTabBar from "@/components/ui/RouteTabBar.vue";

const AnalyticsView = defineAsyncComponent(
  () => import("@/views/analytics/AnalyticsView.vue"),
);
const VolumeAnalyticsView = defineAsyncComponent(
  () => import("@/views/volume/VolumeAnalyticsView.vue"),
);
const GamificationView = defineAsyncComponent(
  () => import("@/views/gamification/GamificationView.vue"),
);

const tabs = [
  { key: "panoramica", label: "Panoramica", icon: ChartBarIcon },
  { key: "volume", label: "Volume", icon: BeakerIcon },
  { key: "gamification", label: "Gamification", icon: TrophyIcon },
] as const;

const { activeTab, switchTab } = useRouteTabs(tabs, "/insights", "panoramica");
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <RouteTabBar :tabs="tabs" :active-tab="activeTab" @switch="switchTab" />
    <KeepAlive>
      <AnalyticsView v-if="activeTab === 'panoramica'" />
    </KeepAlive>
    <KeepAlive>
      <VolumeAnalyticsView v-if="activeTab === 'volume'" />
    </KeepAlive>
    <KeepAlive>
      <GamificationView v-if="activeTab === 'gamification'" />
    </KeepAlive>
  </div>
</template>
