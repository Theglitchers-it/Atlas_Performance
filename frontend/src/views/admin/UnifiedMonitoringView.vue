<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import {
  CurrencyEuroIcon,
  DocumentTextIcon,
} from "@heroicons/vue/24/outline";
import { useRouteTabs } from "@/composables/useRouteTabs";
import RouteTabBar from "@/components/ui/RouteTabBar.vue";

const AdminBillingView = defineAsyncComponent(
  () => import("@/views/admin/AdminBillingView.vue"),
);
const AdminAuditView = defineAsyncComponent(
  () => import("@/views/admin/AdminAuditView.vue"),
);

const tabs = [
  { key: "fatturazione", label: "Fatturazione", icon: CurrencyEuroIcon },
  { key: "audit", label: "Audit Log", icon: DocumentTextIcon },
] as const;

const { activeTab, switchTab } = useRouteTabs(tabs, "/admin/monitoraggio", "fatturazione");
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <RouteTabBar :tabs="tabs" :active-tab="activeTab" @switch="switchTab" />
    <KeepAlive>
      <AdminBillingView v-if="activeTab === 'fatturazione'" />
    </KeepAlive>
    <KeepAlive>
      <AdminAuditView v-if="activeTab === 'audit'" />
    </KeepAlive>
  </div>
</template>
