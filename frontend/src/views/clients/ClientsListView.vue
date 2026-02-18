<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import DataTable from "@/components/ui/DataTable.vue";
import PullToRefresh from "@/components/mobile/PullToRefresh.vue";
import FloatingActionButton from "@/components/mobile/FloatingActionButton.vue";
import SwipeableCard from "@/components/mobile/SwipeableCard.vue";
import ClientListSkeleton from "@/components/skeleton/ClientListSkeleton.vue";
import { UserGroupIcon } from "@heroicons/vue/24/outline";
import { useViewShortcuts } from "@/composables/useKeyboardShortcuts";
import { useNative } from "@/composables/useNative";

const router = useRouter();
const { isMobile } = useNative();

// Keyboard shortcut: N → nuovo cliente
useViewShortcuts({ n: () => router.push("/clients/new") });

const clients = ref<any[]>([]);
const isLoading = ref(true);
const initialLoadDone = ref(false);
const searchQuery = ref("");
const statusFilter = ref("");
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

const totalPages = computed(() => pagination.value.totalPages);

// DataTable columns definition
const columns = [
  { key: "client", label: "Cliente", sortable: false },
  {
    key: "fitness_level",
    label: "Livello",
    sortable: false,
    hideBelow: "sm" as const,
  },
  {
    key: "primary_goal",
    label: "Obiettivo",
    sortable: false,
    hideBelow: "md" as const,
  },
  { key: "status", label: "Stato", sortable: false },
  {
    key: "streak_days",
    label: "Streak",
    sortable: false,
    hideBelow: "lg" as const,
  },
];

onMounted(() => {
  loadClients();
});

watch([searchQuery, statusFilter], () => {
  pagination.value.page = 1;
  loadClients();
});

const loadClients = async () => {
  isLoading.value = true;
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    const response = await api.get("/clients", { params });
    clients.value = response.data.data.clients || [];
    pagination.value = {
      ...pagination.value,
      ...response.data.data.pagination,
    };
  } catch (error: any) {
    console.error("Error loading clients:", error);
  } finally {
    isLoading.value = false;
    initialLoadDone.value = true;
  }
};

const onRefresh = async (resolve: any) => {
  await loadClients();
  resolve();
};

const goToPage = (page: any) => {
  if (page >= 1 && page <= totalPages.value) {
    pagination.value.page = page;
    loadClients();
  }
};

const viewClient = (row: any) => {
  router.push(`/clients/${row.id}`);
};

const onSearch = (query: any) => {
  searchQuery.value = query;
};

const getStatusBadgeClass = (status: any) => {
  const classes: Record<string, string> = {
    active: "bg-habit-success/20 text-habit-success",
    inactive: "bg-habit-skeleton text-habit-text-subtle",
    paused: "bg-habit-orange/20 text-habit-orange",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return classes[status] || classes.inactive;
};

const getStatusLabel = (status: any) => {
  const labels: Record<string, string> = {
    active: "Attivo",
    inactive: "Inattivo",
    paused: "In pausa",
    cancelled: "Cancellato",
  };
  return labels[status] || status;
};

const getFitnessLevelLabel = (level: any) => {
  const labels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzato",
    elite: "Elite",
  };
  return labels[level] || level || "-";
};
</script>

<template>
  <PullToRefresh @refresh="onRefresh">
    <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Clienti</h1>
          <p class="text-habit-text-subtle mt-1">Gestisci i tuoi clienti</p>
        </div>
        <!-- Desktop button (hidden on mobile, FAB replaces it) -->
        <router-link
          to="/clients/new"
          class="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuovo Cliente
        </router-link>
      </div>

      <!-- Skeleton on initial load -->
      <ClientListSkeleton v-if="!initialLoadDone" />

      <!-- Mobile Card View -->
      <template v-else-if="isMobile">
        <!-- Search + Filter -->
        <div class="flex items-center gap-2">
          <div class="flex-1 relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              autocomplete="off"
              placeholder="Cerca clienti..."
              class="w-full pl-9 pr-3 py-2.5 bg-habit-card border border-habit-border rounded-xl text-sm text-habit-text placeholder-habit-text-subtle focus:ring-2 focus:ring-habit-orange/50 focus:border-transparent"
            />
          </div>
          <select
            v-model="statusFilter"
            class="px-3 py-2.5 border border-habit-border rounded-xl bg-habit-card text-habit-text text-sm min-w-[100px]"
          >
            <option value="">Tutti</option>
            <option value="active">Attivi</option>
            <option value="inactive">Inattivi</option>
            <option value="paused">In pausa</option>
          </select>
        </div>

        <!-- Client Cards List -->
        <div v-if="clients.length > 0" class="space-y-2">
          <SwipeableCard
            v-for="client in clients"
            :key="client.id"
            swipe-left
            @swipe-left="viewClient(client)"
          >
            <template #left-action>
              <div class="flex items-center gap-2 text-white">
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span class="text-sm font-medium">Vedi</span>
              </div>
            </template>

            <div
              class="flex items-center gap-3 p-3 active:bg-habit-card-hover transition-colors"
              @click="viewClient(client)"
            >
              <!-- Avatar -->
              <div
                class="flex-shrink-0 w-11 h-11 bg-habit-cyan/20 rounded-full flex items-center justify-center"
              >
                <span class="text-habit-cyan font-semibold text-sm">
                  {{ client.first_name?.charAt(0)
                  }}{{ client.last_name?.charAt(0) }}
                </span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-habit-text truncate">
                    {{ client.first_name }} {{ client.last_name }}
                  </span>
                  <span
                    class="px-1.5 py-0.5 text-[10px] rounded-full flex-shrink-0"
                    :class="getStatusBadgeClass(client.status)"
                  >
                    {{ getStatusLabel(client.status) }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-habit-text-subtle truncate">{{
                    client.email || "Nessuna email"
                  }}</span>
                  <span
                    v-if="client.streak_days"
                    class="flex items-center text-xs text-habit-orange flex-shrink-0"
                  >
                    <svg
                      class="w-3 h-3 mr-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      />
                    </svg>
                    {{ client.streak_days }}
                  </span>
                </div>
              </div>

              <!-- Arrow -->
              <svg
                class="w-4 h-4 text-habit-text-subtle flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </SwipeableCard>
        </div>

        <!-- Empty state mobile -->
        <div
          v-else
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <UserGroupIcon class="w-12 h-12 text-habit-text-subtle mb-3" />
          <p class="text-habit-text font-medium">
            {{
              searchQuery || statusFilter
                ? "Nessun risultato"
                : "Nessun cliente"
            }}
          </p>
          <p class="text-habit-text-subtle text-sm mt-1">
            {{
              searchQuery || statusFilter
                ? "Prova a modificare i filtri"
                : "Aggiungi il primo cliente per iniziare"
            }}
          </p>
          <router-link
            v-if="!searchQuery && !statusFilter"
            to="/clients/new"
            class="mt-4 inline-flex items-center px-4 py-2 bg-habit-cyan text-white rounded-habit text-sm font-medium hover:bg-habit-cyan/90 transition-colors"
          >
            Aggiungi Cliente
          </router-link>
        </div>

        <!-- Pagination mobile -->
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between py-3"
        >
          <button
            :disabled="pagination.page <= 1"
            class="px-4 py-2 text-sm rounded-xl bg-habit-card border border-habit-border text-habit-text disabled:opacity-40"
            @click="goToPage(pagination.page - 1)"
          >
            Indietro
          </button>
          <span class="text-sm text-habit-text-muted"
            >{{ pagination.page }} / {{ totalPages }}</span
          >
          <button
            :disabled="pagination.page >= totalPages"
            class="px-4 py-2 text-sm rounded-xl bg-habit-card border border-habit-border text-habit-text disabled:opacity-40"
            @click="goToPage(pagination.page + 1)"
          >
            Avanti
          </button>
        </div>
      </template>

      <!-- Desktop DataTable View -->
      <DataTable
        v-else
        :columns="columns"
        :data="clients"
        :loading="isLoading"
        searchable
        search-placeholder="Cerca per nome, email..."
        paginated
        server-pagination
        :current-page="pagination.page"
        :total-items="pagination.total"
        :total-pages="totalPages"
        :page-size="pagination.limit"
        hoverable
        :empty-icon="UserGroupIcon"
        :empty-title="
          searchQuery || statusFilter ? 'Nessun risultato' : 'Nessun cliente'
        "
        :empty-description="
          searchQuery || statusFilter
            ? 'Prova a modificare i filtri di ricerca'
            : 'Inizia aggiungendo il tuo primo cliente. Premi N per creare.'
        "
        :empty-action-text="
          !searchQuery && !statusFilter ? 'Aggiungi Cliente' : ''
        "
        :empty-action-to="!searchQuery && !statusFilter ? '/clients/new' : ''"
        @row-click="viewClient"
        @page-change="goToPage"
        @search="onSearch"
      >
        <!-- Toolbar: status filter -->
        <template #toolbar>
          <div class="sm:w-48">
            <select
              v-model="statusFilter"
              class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text"
            >
              <option value="">Tutti gli stati</option>
              <option value="active">Attivi</option>
              <option value="inactive">Inattivi</option>
              <option value="paused">In pausa</option>
            </select>
          </div>
        </template>

        <!-- Custom cell: Client name with avatar -->
        <template #cell-client="{ row }: { row: any }">
          <div class="flex items-center">
            <div
              class="flex-shrink-0 w-10 h-10 bg-habit-cyan/20 rounded-full flex items-center justify-center"
            >
              <span class="text-habit-cyan font-medium">
                {{ row.first_name?.charAt(0) }}{{ row.last_name?.charAt(0) }}
              </span>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-habit-text">
                {{ row.first_name }} {{ row.last_name }}
              </div>
              <div class="text-sm text-habit-text-subtle">
                {{ row.email || "Nessuna email" }}
              </div>
            </div>
          </div>
        </template>

        <!-- Custom cell: Fitness level -->
        <template #cell-fitness_level="{ value }: { value: any }">
          <span class="text-sm text-habit-text-muted">
            {{ getFitnessLevelLabel(value) }}
          </span>
        </template>

        <!-- Custom cell: Goal -->
        <template #cell-primary_goal="{ value }: { value: any }">
          <span class="text-sm text-habit-text-muted capitalize">
            {{ value?.replace("_", " ") || "-" }}
          </span>
        </template>

        <!-- Custom cell: Status -->
        <template #cell-status="{ value }: { value: any }">
          <span
            class="px-2 py-1 text-xs rounded-full"
            :class="getStatusBadgeClass(value)"
          >
            {{ getStatusLabel(value) }}
          </span>
        </template>

        <!-- Custom cell: Streak -->
        <template #cell-streak_days="{ value }: { value: any }">
          <div class="flex items-center">
            <svg
              class="w-4 h-4 text-habit-orange mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
              />
            </svg>
            <span class="text-sm text-habit-text">{{ value || 0 }}</span>
          </div>
        </template>

        <!-- Actions column -->
        <template #actions="{ row }">
          <button
            @click="viewClient(row)"
            class="text-habit-cyan hover:text-habit-orange transition-colors"
            v-tooltip="'Visualizza'"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </template>
      </DataTable>

      <!-- FAB for mobile (new client) -->
      <FloatingActionButton
        label="Nuovo Cliente"
        @click="router.push('/clients/new')"
      />
    </div>
  </PullToRefresh>
</template>
