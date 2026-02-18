<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useNative } from "@/composables/useNative";

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalRevenue: number;
}

interface Tenant {
  id: number;
  business_name: string;
  owner_email: string;
  subscription_plan: string;
  subscription_status: string;
  status: string;
  client_count: number;
  max_clients: number;
  created_at: string;
}

const { isMobile } = useNative();

const stats = ref<AdminStats>({
  totalTenants: 0,
  activeTenants: 0,
  totalUsers: 0,
  totalRevenue: 0,
});
const recentTenants = ref<Tenant[]>([]);
const platformHealth = ref<Record<string, any>>({});
const isLoading = ref<boolean>(true);

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(val || 0);
};

onMounted(async () => {
  await loadAdminData();
});

const loadAdminData = async () => {
  isLoading.value = true;
  try {
    const [tenantsRes, statsRes] = await Promise.allSettled([
      api.get("/admin/tenants", { params: { limit: 10 } }),
      api.get("/admin/stats"),
    ]);

    if (tenantsRes.status === "fulfilled") {
      recentTenants.value = tenantsRes.value.data.data?.tenants || [];
      stats.value.totalTenants =
        tenantsRes.value.data.data?.pagination?.total ||
        recentTenants.value.length;
      stats.value.activeTenants = recentTenants.value.filter(
        (t: Tenant) => t.status === "active",
      ).length;
    }

    if (statsRes.status === "fulfilled") {
      const s = statsRes.value.data.data || {};
      stats.value.totalUsers = s.totalUsers || 0;
      stats.value.totalRevenue = s.totalRevenue || 0;
      platformHealth.value = s.health || {};
    }
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
  } finally {
    isLoading.value = false;
  }
};

const getPlanBadgeClass = (plan: string): string => {
  switch (plan) {
    case "enterprise":
      return "bg-purple-500/20 text-purple-400";
    case "professional":
      return "bg-habit-cyan/20 text-habit-cyan";
    case "starter":
      return "bg-habit-success/20 text-habit-success";
    default:
      return "bg-habit-skeleton text-habit-text-subtle";
  }
};

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case "active":
      return "bg-habit-success/20 text-habit-success";
    case "trial":
      return "bg-habit-orange/20 text-habit-orange";
    case "paused":
      return "bg-yellow-500/20 text-yellow-400";
    default:
      return "bg-habit-red/20 text-habit-red";
  }
};

const statusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: "Attivo",
    trial: "Trial",
    paused: "Sospeso",
    cancelled: "Cancellato",
  };
  return labels[status] || status;
};
</script>

<template>
  <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Super Admin Panel
        </h1>
        <p class="text-habit-text-subtle mt-1">Panoramica della piattaforma</p>
      </div>
      <div class="flex gap-3">
        <router-link
          to="/admin/tenants"
          class="inline-flex items-center px-4 py-2 bg-habit-card border border-habit-border text-habit-text rounded-habit hover:bg-habit-card-hover transition-all"
        >
          Gestisci Tenant
        </router-link>
        <router-link
          to="/admin/billing"
          class="inline-flex items-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300"
        >
          Fatturazione
        </router-link>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-habit-text-subtle">Tenant Totali</p>
            <p class="text-2xl sm:text-3xl font-bold text-habit-text mt-1">
              {{ stats.totalTenants }}
            </p>
          </div>
          <div
            class="w-12 h-12 bg-habit-cyan/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-habit-cyan"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>
      </div>

      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-habit-text-subtle">Tenant Attivi</p>
            <p class="text-2xl sm:text-3xl font-bold text-habit-success mt-1">
              {{ stats.activeTenants }}
            </p>
          </div>
          <div
            class="w-12 h-12 bg-habit-success/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-habit-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-habit-text-subtle">Utenti Totali</p>
            <p class="text-2xl sm:text-3xl font-bold text-habit-cyan mt-1">
              {{ stats.totalUsers }}
            </p>
          </div>
          <div
            class="w-12 h-12 bg-habit-cyan/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-habit-cyan"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-habit-text-subtle">Revenue Totale</p>
            <p class="text-2xl sm:text-3xl font-bold text-habit-orange mt-1">
              {{ formatCurrency(stats.totalRevenue) }}
            </p>
          </div>
          <div
            class="w-12 h-12 bg-habit-orange/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-habit-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Tenant List -->
    <div class="bg-habit-bg border border-habit-border rounded-habit">
      <div
        class="p-6 border-b border-habit-border flex items-center justify-between"
      >
        <h2 class="text-lg font-semibold text-habit-text">Tenant Recenti</h2>
        <router-link
          to="/admin/tenants"
          class="text-sm text-habit-cyan hover:text-habit-orange transition-colors"
        >
          Vedi tutti
        </router-link>
      </div>

      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 5" :key="i" class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-habit-skeleton rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
              <div class="h-3 bg-habit-skeleton rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="recentTenants.length === 0"
        class="p-6 text-center text-habit-text-subtle"
      >
        <p>Nessun tenant registrato</p>
      </div>

      <!-- Mobile: Card Layout -->
      <div v-else-if="isMobile" class="divide-y divide-habit-border">
        <div
          v-for="tenant in recentTenants"
          :key="tenant.id"
          class="p-4 hover:bg-habit-card-hover transition-colors"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-9 h-9 bg-habit-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <span class="text-habit-cyan font-semibold text-sm">{{
                tenant.business_name?.charAt(0) || "T"
              }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-habit-text truncate">
                {{ tenant.business_name }}
              </p>
              <p class="text-xs text-habit-text-subtle truncate">
                {{ tenant.owner_email }}
              </p>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 text-xs rounded-full font-medium"
                :class="getPlanBadgeClass(tenant.subscription_plan)"
              >
                {{ tenant.subscription_plan }}
              </span>
              <span
                class="px-2 py-0.5 text-xs rounded-full font-medium"
                :class="getStatusBadgeClass(tenant.subscription_status)"
              >
                {{ statusLabel(tenant.subscription_status) }}
              </span>
            </div>
            <p class="text-xs text-habit-text-subtle">
              {{ tenant.client_count || 0 }}/{{ tenant.max_clients }} clienti
            </p>
          </div>
        </div>
      </div>

      <!-- Desktop: Table Layout -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-habit-border text-left">
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Business
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Email Owner
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Piano
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Stato
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Clienti
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Creato
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-habit-border">
            <tr
              v-for="tenant in recentTenants"
              :key="tenant.id"
              class="hover:bg-habit-card-hover transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 bg-habit-cyan/20 rounded-lg flex items-center justify-center"
                  >
                    <span class="text-habit-cyan font-semibold text-sm">{{
                      tenant.business_name?.charAt(0) || "T"
                    }}</span>
                  </div>
                  <span class="text-sm font-medium text-habit-text">{{
                    tenant.business_name
                  }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-habit-text-muted">
                {{ tenant.owner_email }}
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="getPlanBadgeClass(tenant.subscription_plan)"
                >
                  {{ tenant.subscription_plan }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="getStatusBadgeClass(tenant.subscription_status)"
                >
                  {{ statusLabel(tenant.subscription_status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-habit-text-muted">
                {{ tenant.client_count || 0 }}/{{ tenant.max_clients }}
              </td>
              <td class="px-6 py-4 text-sm text-habit-text-subtle">
                {{ new Date(tenant.created_at).toLocaleDateString("it-IT") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
