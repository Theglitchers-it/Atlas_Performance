<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useNative } from "@/composables/useNative";

interface BillingStats {
  monthlyRevenue: number;
  yearlyRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
}

interface Invoice {
  id: number;
  tenant_id: string;
  business_name?: string;
  plan_name?: string;
  amount: number;
  status: string;
  issued_at?: string;
  period_start?: string;
}

const { isMobile } = useNative();

const invoices = ref<Invoice[]>([]);
const stats = ref<BillingStats>({
  monthlyRevenue: 0,
  yearlyRevenue: 0,
  pendingPayments: 0,
  activeSubscriptions: 0,
});
const isLoading = ref<boolean>(true);
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);
const filterStatus = ref<string>("");

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(val || 0);
};

onMounted(async () => {
  await Promise.all([loadInvoices(), loadBillingStats()]);
});

const loadInvoices = async () => {
  isLoading.value = true;
  try {
    const params: Record<string, any> = { page: currentPage.value, limit: 20 };
    if (filterStatus.value) params.status = filterStatus.value;

    const res = await api.get("/admin/invoices", { params });
    invoices.value = res.data.data?.invoices || [];
    totalPages.value = res.data.data?.pagination?.totalPages || 1;
  } catch (error) {
    console.error("Error loading invoices:", error);
  } finally {
    isLoading.value = false;
  }
};

const loadBillingStats = async () => {
  try {
    const res = await api.get("/admin/billing/stats");
    const data = res.data.data || {};
    stats.value.monthlyRevenue = data.monthlyRevenue || 0;
    stats.value.yearlyRevenue = data.yearlyRevenue || 0;
    stats.value.pendingPayments = data.pendingPayments || 0;
    stats.value.activeSubscriptions = data.activeSubscriptions || 0;
  } catch (error) {
    console.error("Error loading billing stats:", error);
  }
};

const getStatusClass = (status: string): string => {
  switch (status) {
    case "paid":
      return "bg-habit-success/20 text-habit-success";
    case "open":
      return "bg-habit-orange/20 text-habit-orange";
    case "draft":
      return "bg-habit-skeleton text-habit-text-subtle";
    case "void":
      return "bg-habit-red/20 text-habit-red";
    default:
      return "bg-habit-skeleton text-habit-text-subtle";
  }
};

const statusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    paid: "Pagato",
    open: "In attesa",
    draft: "Bozza",
    void: "Annullato",
    uncollectible: "Non riscosso",
  };
  return labels[status] || status;
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadInvoices();
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
          Fatturazione Piattaforma
        </h1>
        <p class="text-habit-text-subtle mt-1">
          Gestione revenue e fatture dei tenant
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

    <!-- Revenue Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-habit-text-subtle">Revenue Mensile</p>
            <p class="text-xl sm:text-2xl font-bold text-habit-success mt-1">
              {{ formatCurrency(stats.monthlyRevenue) }}
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-habit-success/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 sm:w-6 sm:h-6 text-habit-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
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
            <p class="text-sm text-habit-text-subtle">Revenue Annuale</p>
            <p class="text-xl sm:text-2xl font-bold text-habit-cyan mt-1">
              {{ formatCurrency(stats.yearlyRevenue) }}
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-habit-cyan/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 sm:w-6 sm:h-6 text-habit-cyan"
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

      <div
        class="bg-habit-bg border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-habit-text-subtle">In Attesa</p>
            <p class="text-xl sm:text-2xl font-bold text-habit-orange mt-1">
              {{ stats.pendingPayments }}
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-habit-orange/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 sm:w-6 sm:h-6 text-habit-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
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
            <p class="text-sm text-habit-text-subtle">Abbonamenti Attivi</p>
            <p class="text-xl sm:text-2xl font-bold text-habit-text mt-1">
              {{ stats.activeSubscriptions }}
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 sm:w-6 sm:h-6 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Invoices -->
    <div
      class="bg-habit-bg border border-habit-border rounded-habit overflow-hidden"
    >
      <div
        class="p-6 border-b border-habit-border flex items-center justify-between"
      >
        <h2 class="text-lg font-semibold text-habit-text">Fatture</h2>
        <select
          v-model="filterStatus"
          @change="loadInvoices"
          class="px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-text focus:outline-none focus:border-habit-cyan transition-colors"
        >
          <option value="">Tutte</option>
          <option value="paid">Pagate</option>
          <option value="open">In attesa</option>
          <option value="draft">Bozza</option>
          <option value="void">Annullate</option>
        </select>
      </div>

      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div
            v-for="i in 5"
            :key="i"
            class="h-12 bg-habit-skeleton rounded"
          ></div>
        </div>
      </div>

      <div
        v-else-if="invoices.length === 0"
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p>Nessuna fattura trovata</p>
      </div>

      <!-- Mobile: Card Layout -->
      <div v-else-if="isMobile" class="divide-y divide-habit-border">
        <div
          v-for="invoice in invoices"
          :key="invoice.id"
          class="p-4 hover:bg-habit-card-hover transition-colors"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-habit-text truncate">
                {{ invoice.business_name || `Tenant #${invoice.tenant_id}` }}
              </p>
              <p class="text-xs text-habit-text-subtle mt-0.5">
                {{ invoice.plan_name || "-" }} &middot; #{{ invoice.id }}
              </p>
            </div>
            <span
              class="px-2 py-1 text-xs rounded-full font-medium ml-2 flex-shrink-0"
              :class="getStatusClass(invoice.status)"
            >
              {{ statusLabel(invoice.status) }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-base font-semibold text-habit-text">
              {{ formatCurrency(invoice.amount) }}
            </p>
            <p class="text-xs text-habit-text-subtle">
              <template v-if="invoice.issued_at">{{
                new Date(invoice.issued_at).toLocaleDateString("it-IT")
              }}</template>
              <template v-else>-</template>
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
                ID
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Tenant
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Piano
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Importo
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Periodo
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Stato
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-habit-text-subtle uppercase"
              >
                Data
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-habit-border">
            <tr
              v-for="invoice in invoices"
              :key="invoice.id"
              class="hover:bg-habit-card-hover transition-colors"
            >
              <td class="px-6 py-4 text-sm text-habit-text-muted font-mono">
                #{{ invoice.id }}
              </td>
              <td class="px-6 py-4 text-sm font-medium text-habit-text">
                {{ invoice.business_name || `Tenant #${invoice.tenant_id}` }}
              </td>
              <td class="px-6 py-4 text-sm text-habit-text-muted">
                {{ invoice.plan_name || "-" }}
              </td>
              <td class="px-6 py-4 text-sm font-semibold text-habit-text">
                {{ formatCurrency(invoice.amount) }}
              </td>
              <td class="px-6 py-4 text-sm text-habit-text-subtle">
                <template v-if="invoice.period_start">
                  {{
                    new Date(invoice.period_start).toLocaleDateString("it-IT", {
                      month: "short",
                      year: "numeric",
                    })
                  }}
                </template>
                <template v-else>-</template>
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="getStatusClass(invoice.status)"
                >
                  {{ statusLabel(invoice.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-habit-text-subtle">
                {{
                  invoice.issued_at
                    ? new Date(invoice.issued_at).toLocaleDateString("it-IT")
                    : "-"
                }}
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
  </div>
</template>
