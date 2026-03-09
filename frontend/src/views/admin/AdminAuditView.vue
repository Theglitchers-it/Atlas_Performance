<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import api from "@/services/api";
import { useNative } from "@/composables/useNative";

interface AuditLog {
  id: number;
  user_email?: string;
  user_name?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

const { isMobile } = useNative();

const logs = ref<AuditLog[]>([]);
const isLoading = ref<boolean>(true);
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);
const totalCount = ref<number>(0);
const filterAction = ref<string>("");
const filterUser = ref<string>("");
const searchDebounce = ref<any>(null);
const perPage = 30;

// Mobile search/filter state
const mobileSearchExpanded = ref(false);
const mobileFiltersExpanded = ref(false);
const mobileSearchInput = ref<HTMLInputElement | null>(null);

const activeFilterCount = computed(() => {
  let count = 0;
  if (filterAction.value) count++;
  return count;
});

const toggleMobileSearch = () => {
  mobileSearchExpanded.value = !mobileSearchExpanded.value;
  mobileFiltersExpanded.value = false;
  if (mobileSearchExpanded.value) {
    nextTick(() => mobileSearchInput.value?.focus());
  }
};

const toggleMobileFilters = () => {
  mobileFiltersExpanded.value = !mobileFiltersExpanded.value;
  mobileSearchExpanded.value = false;
};

onMounted(async () => {
  await loadLogs();
});

watch(filterAction, () => {
  currentPage.value = 1;
  loadLogs();
});

watch(filterUser, () => {
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
  searchDebounce.value = setTimeout(() => {
    currentPage.value = 1;
    loadLogs();
  }, 300);
});

onUnmounted(() => {
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
});

const loadLogs = async () => {
  isLoading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: perPage,
    };
    if (filterAction.value) params.action = filterAction.value;
    if (filterUser.value) params.search = filterUser.value;

    const res = await api.get("/admin/audit-logs", { params });
    logs.value = res.data.data?.logs || [];
    totalCount.value = res.data.data?.pagination?.total || logs.value.length;
    totalPages.value = Math.ceil(totalCount.value / perPage) || 1;
  } catch (error) {
    console.error("Error loading audit logs:", error);
    logs.value = [];
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadLogs();
  }
};

const actionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: "Login",
    LOGIN_FAILED: "Login fallito",
    LOGOUT: "Logout",
    REGISTER: "Registrazione",
    PASSWORD_CHANGE: "Cambio password",
    USER_CREATE: "Creazione utente",
    USER_UPDATE: "Modifica utente",
    USER_DELETE: "Eliminazione utente",
    CLIENT_CREATE: "Creazione cliente",
    CLIENT_UPDATE: "Modifica cliente",
    CLIENT_DELETE: "Eliminazione cliente",
    TENANT_STATUS_CHANGE: "Cambio stato",
    TENANT_PLAN_CHANGE: "Cambio piano",
  };
  return labels[action] || action;
};

const actionClass = (action: string): string => {
  if (action === "LOGIN_FAILED" || action.endsWith("_DELETE"))
    return "bg-habit-red/20 text-habit-red";
  if (action.endsWith("_CREATE") || action === "REGISTER")
    return "bg-habit-success/20 text-habit-success";
  if (action === "LOGIN_SUCCESS" || action === "LOGOUT")
    return "bg-habit-cyan/20 text-habit-cyan";
  if (action === "PASSWORD_CHANGE")
    return "bg-habit-orange/20 text-habit-orange";
  if (action.endsWith("_UPDATE") || action.endsWith("_CHANGE"))
    return "bg-habit-orange/20 text-habit-orange";
  return "bg-habit-card-hover text-habit-text-muted";
};

const formatDetails = (details: string | null | undefined): string => {
  if (!details) return "-";
  try {
    const parsed = JSON.parse(details);
    return Object.entries(parsed)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  } catch {
    return details;
  }
};

const resourceTypeLabel = (type: string | undefined): string => {
  if (!type) return "-";
  const labels: Record<string, string> = {
    user: "Utente",
    client: "Cliente",
    tenant: "Tenant",
  };
  return labels[type] || type;
};
</script>

<template>
  <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Audit Log</h1>
        <p class="text-habit-text-subtle mt-1">
          {{ totalCount }} azioni registrate
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
    <div class="mb-4">

      <!-- === DESKTOP (sm+) === -->
      <div class="hidden sm:flex items-center gap-2">
        <div class="relative max-w-xs group/search">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle group-focus-within/search:text-habit-cyan transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="filterUser" type="text" autocomplete="off" placeholder="Cerca per utente o email..."
            class="w-full pl-9 pr-4 py-1.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan/30 transition-all duration-300 text-sm"
          />
        </div>
        <select v-model="filterAction"
          class="px-3 py-1.5 border border-habit-border rounded-xl text-xs bg-habit-card text-habit-text focus:outline-none focus:border-habit-cyan/30 transition-all">
          <option value="">Tutte le azioni</option>
          <optgroup label="Autenticazione">
            <option value="LOGIN_SUCCESS">Login riuscito</option>
            <option value="LOGIN_FAILED">Login fallito</option>
            <option value="LOGOUT">Logout</option>
            <option value="REGISTER">Registrazione</option>
            <option value="PASSWORD_CHANGE">Cambio password</option>
          </optgroup>
          <optgroup label="Utenti">
            <option value="USER_CREATE">Creazione utente</option>
            <option value="USER_UPDATE">Modifica utente</option>
            <option value="USER_DELETE">Eliminazione utente</option>
          </optgroup>
          <optgroup label="Clienti">
            <option value="CLIENT_CREATE">Creazione cliente</option>
            <option value="CLIENT_UPDATE">Modifica cliente</option>
            <option value="CLIENT_DELETE">Eliminazione cliente</option>
          </optgroup>
          <optgroup label="Tenant">
            <option value="TENANT_STATUS_CHANGE">Cambio stato</option>
            <option value="TENANT_PLAN_CHANGE">Cambio piano</option>
          </optgroup>
        </select>
      </div>

      <!-- === MOBILE (<sm) === -->
      <div class="sm:hidden space-y-2">
        <div class="flex items-center gap-2">
          <div class="flex-1 flex items-center">
            <template v-if="!mobileSearchExpanded">
              <button @click="toggleMobileSearch"
                class="flex items-center gap-2 px-3 py-2 rounded-xl bg-habit-card border border-habit-border shadow-sm text-habit-text-subtle text-xs transition-all duration-200 hover:border-habit-cyan/30">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Cerca...
              </button>
            </template>
            <template v-else>
              <div class="flex-1 relative flex items-center gap-2">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input ref="mobileSearchInput" v-model="filterUser" type="text" autocomplete="off" placeholder="Cerca utente o email..."
                  class="flex-1 pl-9 pr-3 py-2 bg-habit-card border border-habit-cyan/30 rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan/50 transition-all duration-300 text-sm"
                />
                <button @click="toggleMobileSearch"
                  class="flex items-center justify-center w-9 h-9 rounded-xl bg-habit-card border border-habit-border text-habit-text-subtle transition-all duration-200 hover:text-habit-text">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </template>
          </div>

          <button @click="toggleMobileFilters"
            class="relative flex items-center justify-center w-9 h-9 rounded-xl bg-habit-card border shadow-sm transition-all duration-200"
            :class="mobileFiltersExpanded || activeFilterCount > 0 ? 'border-habit-cyan/40 text-habit-cyan' : 'border-habit-border text-habit-text-subtle'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span v-if="activeFilterCount > 0"
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-habit-cyan text-white text-[10px] font-bold flex items-center justify-center">
              {{ activeFilterCount }}
            </span>
          </button>
        </div>

        <Transition name="filter-expand">
          <div v-if="mobileFiltersExpanded" class="overflow-hidden">
            <select v-model="filterAction"
              class="w-full px-3 py-2 border border-habit-border rounded-xl text-sm bg-habit-card text-habit-text focus:outline-none focus:border-habit-cyan/30">
              <option value="">Tutte le azioni</option>
              <optgroup label="Autenticazione">
                <option value="LOGIN_SUCCESS">Login riuscito</option>
                <option value="LOGIN_FAILED">Login fallito</option>
                <option value="LOGOUT">Logout</option>
                <option value="REGISTER">Registrazione</option>
                <option value="PASSWORD_CHANGE">Cambio password</option>
              </optgroup>
              <optgroup label="Utenti">
                <option value="USER_CREATE">Creazione utente</option>
                <option value="USER_UPDATE">Modifica utente</option>
                <option value="USER_DELETE">Eliminazione utente</option>
              </optgroup>
              <optgroup label="Clienti">
                <option value="CLIENT_CREATE">Creazione cliente</option>
                <option value="CLIENT_UPDATE">Modifica cliente</option>
                <option value="CLIENT_DELETE">Eliminazione cliente</option>
              </optgroup>
              <optgroup label="Tenant">
                <option value="TENANT_STATUS_CHANGE">Cambio stato</option>
                <option value="TENANT_PLAN_CHANGE">Cambio piano</option>
              </optgroup>
            </select>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Table -->
    <div
      class="bg-habit-bg border border-habit-border rounded-habit overflow-hidden"
    >
      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div
            v-for="i in 8"
            :key="i"
            class="h-10 bg-habit-skeleton rounded"
          ></div>
        </div>
      </div>
      <div
        v-else-if="logs.length === 0"
        class="p-12 text-center text-habit-text-subtle"
      >
        <p>Nessun log trovato</p>
      </div>
      <!-- Mobile: Card Layout -->
      <div v-else-if="isMobile" class="divide-y divide-habit-border">
        <div
          v-for="log in logs"
          :key="log.id"
          class="p-4 hover:bg-habit-card-hover transition-colors"
        >
          <div class="flex items-start justify-between mb-1.5">
            <p class="text-sm font-medium text-habit-text truncate">
              {{ log.user_email || log.user_name || "-" }}
            </p>
            <span
              class="px-2 py-0.5 text-xs rounded-full font-medium ml-2 flex-shrink-0"
              :class="actionClass(log.action)"
              >{{ actionLabel(log.action) }}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <p class="text-xs text-habit-text-muted">
              {{ resourceTypeLabel(log.resource_type) }}
            </p>
            <p class="text-xs text-habit-text-subtle">
              {{
                new Date(log.created_at).toLocaleString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }}
            </p>
          </div>
          <p
            v-if="log.details"
            class="text-xs text-habit-text-subtle mt-1 truncate"
          >
            {{ formatDetails(log.details) }}
          </p>
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
                Data
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Utente
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Azione
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Tipo
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Dettagli
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                IP
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-habit-border">
            <tr
              v-for="log in logs"
              :key="log.id"
              class="hover:bg-habit-card-hover transition-colors"
            >
              <td
                class="px-6 py-3 text-sm text-habit-text-subtle whitespace-nowrap"
              >
                {{ new Date(log.created_at).toLocaleString("it-IT") }}
              </td>
              <td class="px-6 py-3 text-sm text-habit-text">
                {{ log.user_email || log.user_name || "-" }}
              </td>
              <td class="px-6 py-3">
                <span
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="actionClass(log.action)"
                  >{{ actionLabel(log.action) }}</span
                >
              </td>
              <td class="px-6 py-3 text-sm text-habit-text-muted">
                {{ resourceTypeLabel(log.resource_type) }}
              </td>
              <td
                class="px-6 py-3 text-sm text-habit-text-subtle max-w-xs truncate"
              >
                {{ formatDetails(log.details) }}
              </td>
              <td class="px-6 py-3 text-sm text-habit-text-subtle font-mono">
                {{ log.ip_address || "-" }}
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
          Pagina {{ currentPage }} di {{ totalPages }}
        </p>
        <div class="flex gap-2">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-40 transition-colors"
          >
            Precedente
          </button>
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-40 transition-colors"
          >
            Successiva
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-expand-enter-active {
  transition: all 0.25s ease-out;
}
.filter-expand-leave-active {
  transition: all 0.2s ease-in;
}
.filter-expand-enter-from,
.filter-expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}
.filter-expand-enter-to,
.filter-expand-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
