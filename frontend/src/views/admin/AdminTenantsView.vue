<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useNative } from "@/composables/useNative";

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

const toast = useToast();
const { isMobile } = useNative();

const tenants = ref<Tenant[]>([]);
const isLoading = ref<boolean>(true);
const searchQuery = ref<string>("");
const filterPlan = ref<string>("");
const filterStatus = ref<string>("");
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);
const totalCount = ref<number>(0);
const perPage = 20;

// Modal
const showModal = ref<boolean>(false);
const selectedTenant = ref<Tenant | null>(null);

onMounted(async () => {
  await loadTenants();
});

watch([searchQuery, filterPlan, filterStatus], () => {
  currentPage.value = 1;
  loadTenants();
});

const loadTenants = async () => {
  isLoading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: perPage,
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (filterPlan.value) params.plan = filterPlan.value;
    if (filterStatus.value) params.status = filterStatus.value;

    const res = await api.get("/admin/tenants", { params });
    tenants.value = res.data.data?.tenants || [];
    totalCount.value = res.data.data?.pagination?.total || 0;
    totalPages.value = Math.ceil(totalCount.value / perPage) || 1;
  } catch (error) {
    console.error("Error loading tenants:", error);
    toast.error("Errore nel caricamento dei tenant");
  } finally {
    isLoading.value = false;
  }
};

const openTenantModal = (tenant: Tenant) => {
  selectedTenant.value = { ...tenant };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedTenant.value = null;
};

const updateTenantStatus = async (tenantId: number, newStatus: string) => {
  try {
    await api.put(`/admin/tenants/${tenantId}/status`, { status: newStatus });
    toast.success("Stato aggiornato con successo");
    await loadTenants();
    closeModal();
  } catch (error) {
    console.error("Error updating tenant:", error);
    toast.error("Errore nell'aggiornamento");
  }
};

const updateTenantPlan = async (
  tenantId: number,
  newPlan: string,
  maxClients: number,
) => {
  try {
    await api.put(`/admin/tenants/${tenantId}/plan`, {
      subscription_plan: newPlan,
      max_clients: maxClients,
    });
    toast.success("Piano aggiornato con successo");
    await loadTenants();
    closeModal();
  } catch (error) {
    console.error("Error updating plan:", error);
    toast.error("Errore nell'aggiornamento del piano");
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

const planLimits: Record<string, number> = {
  free: 5,
  starter: 20,
  professional: 50,
  enterprise: 999,
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadTenants();
  }
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
          Gestione Tenant
        </h1>
        <p class="text-habit-text-subtle mt-1">
          {{ totalCount }} tenant registrati sulla piattaforma
        </p>
      </div>
      <router-link
        to="/admin"
        class="inline-flex items-center px-4 py-2 bg-habit-card border border-habit-border text-habit-text rounded-habit hover:bg-habit-card-hover transition-all"
      >
        <svg
          class="w-4 h-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Dashboard Admin
      </router-link>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          autocomplete="off"
          placeholder="Cerca per nome o email..."
          class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors"
        />
      </div>
      <select
        v-model="filterPlan"
        class="px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan transition-colors"
      >
        <option value="">Tutti i piani</option>
        <option value="free">Free</option>
        <option value="starter">Starter</option>
        <option value="professional">Professional</option>
        <option value="enterprise">Enterprise</option>
      </select>
      <select
        v-model="filterStatus"
        class="px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan transition-colors"
      >
        <option value="">Tutti gli stati</option>
        <option value="active">Attivo</option>
        <option value="trial">Trial</option>
        <option value="paused">Sospeso</option>
        <option value="cancelled">Cancellato</option>
      </select>
    </div>

    <!-- Table -->
    <div
      class="bg-habit-bg border border-habit-border rounded-habit overflow-hidden"
    >
      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 5" :key="i" class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-habit-skeleton rounded-lg"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
              <div class="h-3 bg-habit-skeleton rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="tenants.length === 0"
        class="p-12 text-center text-habit-text-subtle"
      >
        <svg
          class="w-12 h-12 mx-auto mb-4 text-habit-text-subtle"
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
        <p>Nessun tenant trovato</p>
      </div>

      <!-- Mobile: Card Layout -->
      <div v-else-if="isMobile" class="divide-y divide-habit-border">
        <div
          v-for="tenant in tenants"
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
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 flex-wrap">
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
              <span class="text-xs text-habit-text-subtle"
                >{{ tenant.client_count || 0 }}/{{ tenant.max_clients }}</span
              >
            </div>
            <button
              @click="openTenantModal(tenant)"
              class="px-3 py-1 text-xs bg-habit-card border border-habit-border rounded-lg text-habit-cyan hover:bg-habit-card-hover transition-colors flex-shrink-0"
            >
              Gestisci
            </button>
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
                Email
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
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Azioni
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-habit-border">
            <tr
              v-for="tenant in tenants"
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
              <td class="px-6 py-4">
                <button
                  @click="openTenantModal(tenant)"
                  class="px-3 py-1 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-cyan hover:bg-habit-card-hover transition-colors"
                >
                  Gestisci
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="px-3 sm:px-6 py-4 border-t border-habit-border flex items-center justify-between"
      >
        <p class="text-sm text-habit-text-subtle">
          Pagina {{ currentPage }} di {{ totalPages }} ({{ totalCount }} totali)
        </p>
        <div class="flex gap-2">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Precedente
          </button>
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Successiva
          </button>
        </div>
      </div>
    </div>

    <!-- Tenant Detail Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="fixed inset-0 bg-black/60" @click="closeModal"></div>
        <div
          class="relative bg-habit-bg border border-habit-border rounded-2xl w-full max-w-lg mx-4 p-6 space-y-6 max-h-[80vh] overflow-y-auto"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-habit-text">Gestione Tenant</h3>
            <button
              @click="closeModal"
              class="text-habit-text-subtle hover:text-habit-text"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div v-if="selectedTenant" class="space-y-4">
            <!-- Info -->
            <div
              class="p-4 bg-habit-card rounded-xl border border-habit-border space-y-2"
            >
              <p class="text-habit-text font-semibold">
                {{ selectedTenant.business_name }}
              </p>
              <p class="text-sm text-habit-text-muted">
                {{ selectedTenant.owner_email }}
              </p>
              <p class="text-sm text-habit-text-subtle">
                Registrato il
                {{
                  new Date(selectedTenant.created_at).toLocaleDateString(
                    "it-IT",
                  )
                }}
              </p>
            </div>

            <!-- Cambia Stato -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-2"
                >Stato Abbonamento</label
              >
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="status in ['active', 'trial', 'paused', 'cancelled']"
                  :key="status"
                  @click="updateTenantStatus(selectedTenant.id, status)"
                  class="px-3 py-2 text-sm rounded-lg border transition-colors"
                  :class="
                    selectedTenant.subscription_status === status
                      ? 'border-habit-cyan bg-habit-cyan/20 text-habit-cyan'
                      : 'border-habit-border bg-habit-card text-habit-text-muted hover:bg-habit-card-hover'
                  "
                >
                  {{ statusLabel(status) }}
                </button>
              </div>
            </div>

            <!-- Cambia Piano -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-2"
                >Piano</label
              >
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="plan in [
                    'free',
                    'starter',
                    'professional',
                    'enterprise',
                  ]"
                  :key="plan"
                  @click="
                    updateTenantPlan(selectedTenant.id, plan, planLimits[plan])
                  "
                  class="px-3 py-2 text-sm rounded-lg border transition-colors"
                  :class="
                    selectedTenant.subscription_plan === plan
                      ? 'border-habit-orange bg-habit-orange/20 text-habit-orange'
                      : 'border-habit-border bg-habit-card text-habit-text-muted hover:bg-habit-card-hover'
                  "
                >
                  {{ plan }} ({{ planLimits[plan] }} clienti)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
