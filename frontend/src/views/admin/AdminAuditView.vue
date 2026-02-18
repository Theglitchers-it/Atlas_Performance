<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import api from "@/services/api";
import { useNative } from "@/composables/useNative";

interface AuditLog {
  id: number;
  user_email?: string;
  user_name?: string;
  action: string;
  entity_type?: string;
  details?: string;
  description?: string;
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
const perPage = 30;

onMounted(async () => {
  await loadLogs();
});

watch([filterAction, filterUser], () => {
  currentPage.value = 1;
  loadLogs();
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
    login: "Login",
    logout: "Logout",
    create: "Creazione",
    update: "Modifica",
    delete: "Eliminazione",
    export: "Export",
    payment: "Pagamento",
    subscription_change: "Cambio Piano",
    role_change: "Cambio Ruolo",
  };
  return labels[action] || action;
};

const actionClass = (action: string): string => {
  switch (action) {
    case "delete":
      return "bg-habit-red/20 text-habit-red";
    case "create":
      return "bg-habit-success/20 text-habit-success";
    case "login":
    case "logout":
      return "bg-habit-cyan/20 text-habit-cyan";
    default:
      return "bg-habit-orange/20 text-habit-orange";
  }
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
    <div class="flex flex-col sm:flex-row gap-4">
      <input
        v-model="filterUser"
        type="text"
        autocomplete="off"
        placeholder="Cerca per utente o email..."
        class="flex-1 px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
      />
      <select
        v-model="filterAction"
        class="px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan"
      >
        <option value="">Tutte le azioni</option>
        <option value="login">Login</option>
        <option value="create">Creazione</option>
        <option value="update">Modifica</option>
        <option value="delete">Eliminazione</option>
        <option value="export">Export</option>
        <option value="payment">Pagamento</option>
      </select>
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
              {{ log.entity_type || "-" }}
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
            v-if="log.details || log.description"
            class="text-xs text-habit-text-subtle mt-1 truncate"
          >
            {{ log.details || log.description }}
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
                Entita
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
                {{ log.entity_type || "-" }}
              </td>
              <td
                class="px-6 py-3 text-sm text-habit-text-subtle max-w-xs truncate"
              >
                {{ log.details || log.description || "-" }}
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
