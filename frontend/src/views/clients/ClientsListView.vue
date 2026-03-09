<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useClientStore } from "@/store/client";
import ClientGlassCard from "@/components/clients/ClientGlassCard.vue";
import ClientListSkeleton from "@/components/skeleton/ClientListSkeleton.vue";
import FloatingActionButton from "@/components/mobile/FloatingActionButton.vue";
import { useViewShortcuts } from "@/composables/useKeyboardShortcuts";

const router = useRouter();
const clientStore = useClientStore();

useViewShortcuts({ n: () => router.push("/clients/new") });

const initialLoadDone = ref(false);
const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null);

const clients = computed(() => clientStore.clients);
const loading = computed(() => clientStore.loading);
const filters = computed(() => clientStore.filters);
const pagination = computed(() => clientStore.pagination);
const programSummaries = computed(() => clientStore.programSummaries);
const hasFilters = computed(() => clientStore.hasFilters);
const totalPages = computed(() => pagination.value.totalPages);

// Mobile search/filter state
const mobileSearchExpanded = ref(false);
const mobileFiltersExpanded = ref(false);
const mobileSearchInput = ref<HTMLInputElement | null>(null);

const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.value.status) count++;
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

// Status chips
const statusChips = [
  { value: null, label: "Tutti" },
  { value: "active", label: "Attivi" },
  { value: "inactive", label: "Inattivi" },
  { value: "paused", label: "In pausa" },
];

onMounted(async () => {
  await clientStore.initialize();
  initialLoadDone.value = true;
});

onUnmounted(() => {
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
});

const handleSearch = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
  searchDebounce.value = setTimeout(() => {
    clientStore.setSearch(value);
  }, 300);
};

const handleStatusFilter = (status: string | null) => {
  clientStore.setFilter("status", status);
};

const handleResetFilters = () => {
  clientStore.resetFilters();
};

const viewClient = (client: any) => {
  router.push(`/clients/${client.id}`);
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handlePrevPage = () => {
  if (pagination.value.page > 1) {
    clientStore.setPage(pagination.value.page - 1);
    scrollToTop();
  }
};

const handleNextPage = () => {
  if (pagination.value.page < totalPages.value) {
    clientStore.setPage(pagination.value.page + 1);
    scrollToTop();
  }
};
</script>

<template>
  <div class="bg-habit-bg pb-4 lg:pb-8 overflow-hidden">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-5"
    >
      <div>
        <h1
          class="text-xl sm:text-2xl font-bold text-habit-text tracking-tight"
        >
          Clienti
        </h1>
        <p class="text-habit-text-subtle text-sm mt-0.5">
          <span class="text-habit-cyan font-semibold">{{
            pagination.total
          }}</span>
          clienti
        </p>
        <p class="text-habit-text-subtle text-sm mt-1">
          Visualizza e gestisci i tuoi clienti, monitora i programmi attivi e tieni sotto controllo progressi e scadenze.
        </p>
      </div>
      <router-link
        to="/clients/new"
        class="cta-btn group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm text-white overflow-hidden w-fit"
      >
        <div
          class="absolute inset-0 bg-habit-orange opacity-90 group-hover:opacity-100 transition-opacity duration-500"
        ></div>
        <div
          class="absolute inset-0 bg-habit-orange opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500"
        ></div>
        <svg
          class="relative w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="relative">Nuovo Cliente</span>
      </router-link>
    </div>

    <!-- Search & Filters -->
    <div class="mb-3 sm:mb-5">

      <!-- === DESKTOP (sm+) === -->
      <div class="hidden sm:block glass-panel search-filter-bar rounded-2xl p-3">
        <div class="flex items-center gap-2">
          <div class="relative max-w-xs group/search">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle group-focus-within/search:text-habit-cyan transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" autocomplete="off" placeholder="Cerca cliente..."
              :value="filters.search" @input="handleSearch"
              class="w-full pl-9 pr-4 py-1.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan/30 transition-all duration-300 text-sm"
            />
          </div>

          <select
            :value="filters.status || ''"
            @change="handleStatusFilter(($event.target as HTMLSelectElement).value || null)"
            class="glass-select px-2.5 py-1.5 rounded-xl text-xs min-w-[120px]"
          >
            <option value="">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="inactive">Inattivi</option>
            <option value="paused">In pausa</option>
          </select>

          <button v-if="hasFilters" @click="handleResetFilters"
            class="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-400/70 rounded-xl border border-red-400/15 hover:bg-red-400/10 hover:text-red-400 transition-all duration-300">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        </div>
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
                <input ref="mobileSearchInput" type="text" autocomplete="off" placeholder="Cerca cliente..."
                  :value="filters.search" @input="handleSearch"
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
          <div v-if="mobileFiltersExpanded" class="space-y-2 overflow-hidden">
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar">
              <button
                v-for="chip in statusChips" :key="chip.value ?? 'all'"
                @click="handleStatusFilter(chip.value)"
                class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap"
                :class="filters.status === chip.value
                  ? 'bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30'
                  : 'bg-habit-bg-light text-habit-text-subtle border-habit-border'"
              >
                {{ chip.label }}
              </button>
            </div>
            <button v-if="hasFilters" @click="handleResetFilters"
              class="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-400/70 rounded-xl border border-red-400/15 hover:bg-red-400/10 hover:text-red-400 transition-all duration-300">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset filtri
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Loading skeleton -->
    <ClientListSkeleton v-if="!initialLoadDone" />

    <!-- Empty state -->
    <div
      v-else-if="clients.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <div
        class="w-20 h-20 rounded-3xl bg-habit-bg-light border border-habit-border flex items-center justify-center mb-5"
      >
        <svg
          class="w-9 h-9 text-habit-text-subtle/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-habit-text mb-1">
        {{ hasFilters ? "Nessun risultato" : "Nessun cliente" }}
      </h3>
      <p class="text-habit-text-subtle text-sm mb-5">
        {{
          hasFilters
            ? "Prova a modificare i filtri"
            : "Aggiungi il primo cliente per iniziare"
        }}
      </p>
      <button
        v-if="hasFilters"
        @click="handleResetFilters"
        class="text-sm text-habit-cyan/70 hover:text-habit-cyan transition-colors"
      >
        Reset filtri
      </button>
      <router-link
        v-else
        to="/clients/new"
        class="inline-flex items-center px-4 py-2 bg-habit-cyan text-white rounded-xl text-sm font-medium hover:bg-habit-cyan/90 transition-colors"
      >
        Aggiungi Cliente
      </router-link>
    </div>

    <!-- Client list -->
    <div v-else>
      <div
        class="glass-panel glass-panel-mobile client-list-mobile rounded-xl sm:rounded-2xl overflow-hidden divide-y divide-habit-border"
      >
        <ClientGlassCard
          v-for="(client, idx) in clients"
          :key="client.id"
          :client="client"
          :program-summary="programSummaries[client.id]"
          :index="idx"
          @click="viewClient"
        />
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between mt-3 sm:mt-4 px-3 sm:px-4 py-2 sm:py-2.5 glass-panel glass-panel-mobile client-list-mobile rounded-xl sm:rounded-2xl"
      >
        <p class="text-xs text-habit-text-subtle">
          Pagina
          <span class="text-habit-text font-medium">{{
            pagination.page
          }}</span>
          di
          <span class="text-habit-text font-medium">{{ totalPages }}</span>
        </p>
        <div class="flex gap-1.5">
          <button
            @click="handlePrevPage"
            :disabled="pagination.page <= 1"
            class="w-8 h-8 rounded-xl border border-habit-border flex items-center justify-center text-habit-text-subtle hover:bg-habit-card-hover hover:text-habit-text disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            @click="handleNextPage"
            :disabled="pagination.page >= totalPages"
            class="w-8 h-8 rounded-xl border border-habit-border flex items-center justify-center text-habit-text-subtle hover:bg-habit-card-hover hover:text-habit-text disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
          >
            <svg
              class="w-3.5 h-3.5"
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
        </div>
      </div>
    </div>

    <!-- FAB mobile -->
    <FloatingActionButton
      label="Nuovo Cliente"
      @click="router.push('/clients/new')"
    />
  </div>
</template>

<style scoped>
/* Liquid Glass panels */
.glass-panel {
  background: var(--glass-bg, rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.09));
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.3);
}

:root:not(.dark) .glass-panel {
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.06);
}

@media (max-width: 639px) {
  .glass-panel-mobile {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 1px 6px -1px rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.05);
  }
}

@media (max-width: 639px) {
  :root:not(.dark) .glass-panel-mobile {
    box-shadow: 0 1px 4px -1px rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.05);
  }
}

/* Search/filter bar: allow dropdowns to overflow */
.search-filter-bar {
  position: relative;
  z-index: 20;
  overflow: visible;
}

/* Filter expand transition (mobile) */
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

@media (max-width: 639px) {
  .client-list-mobile {
    background: rgb(var(--color-habit-bg));
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
    border-color: var(--color-habit-border);
  }
}

.glass-select {
  background: var(--glass-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.09));
  color: inherit;
  cursor: pointer;
  appearance: none;
  transition: all 0.3s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: 12px;
  background-position: right 8px center;
  padding-right: 1.75rem;
}

:root:not(.dark) .glass-select {
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 0, 0, 0.1);
}

.glass-select:focus {
  outline: none;
  border-color: rgba(0, 200, 255, 0.25);
}

.glass-select option {
  background: #12121e;
  color: #d0d0d0;
}

:root:not(.dark) .glass-select option {
  background: #ffffff;
  color: #333333;
}

.cta-btn {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 32px -4px rgba(255, 120, 50, 0.25);
}

</style>
