<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import {
  ChartBarIcon,
  BeakerIcon,
  TrophyIcon,
} from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/store/auth";
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

const authStore = useAuthStore();
const isClient = computed(() => authStore.userRole === "client");

const allTabs = [
  { key: "panoramica", label: "Panoramica", icon: ChartBarIcon },
  { key: "volume", label: "Volume", icon: BeakerIcon },
  { key: "gamification", label: "Goals", icon: TrophyIcon },
] as const;

// I client vedono solo la sezione Successi (gamification: leaderboard + sfide + titoli)
const tabs = computed(() =>
  isClient.value
    ? allTabs.filter((t) => t.key === "gamification")
    : [...allTabs],
);

const defaultTab = isClient.value ? "gamification" : "panoramica";
const { activeTab, switchTab } = useRouteTabs(tabs.value, "/insights", defaultTab);
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <RouteTabBar v-if="tabs.length > 1" :tabs="tabs" :active-tab="activeTab" @switch="switchTab" />
    <KeepAlive>
      <AnalyticsView v-if="activeTab === 'panoramica' && !isClient" />
    </KeepAlive>
    <KeepAlive>
      <VolumeAnalyticsView v-if="activeTab === 'volume' && !isClient" />
    </KeepAlive>
    <KeepAlive>
      <GamificationView v-if="activeTab === 'gamification'" />
    </KeepAlive>
  </div>
</template>
