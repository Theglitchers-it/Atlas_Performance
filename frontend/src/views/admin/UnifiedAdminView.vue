<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import {
  ShieldCheckIcon,
  BuildingOfficeIcon,
} from "@heroicons/vue/24/outline";
import { useRouteTabs } from "@/composables/useRouteTabs";
import RouteTabBar from "@/components/ui/RouteTabBar.vue";

const AdminDashboardView = defineAsyncComponent(
  () => import("@/views/admin/AdminDashboardView.vue"),
);
const AdminTenantsView = defineAsyncComponent(
  () => import("@/views/admin/AdminTenantsView.vue"),
);

const tabs = [
  { key: "panoramica", label: "Panoramica", icon: ShieldCheckIcon },
  { key: "tenant", label: "Tenant", icon: BuildingOfficeIcon },
] as const;

const { activeTab, switchTab } = useRouteTabs(tabs, "/admin", "panoramica");
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <RouteTabBar :tabs="tabs" :active-tab="activeTab" @switch="switchTab" />
    <KeepAlive>
      <AdminDashboardView v-if="activeTab === 'panoramica'" />
    </KeepAlive>
    <KeepAlive>
      <AdminTenantsView v-if="activeTab === 'tenant'" />
    </KeepAlive>
  </div>
</template>
