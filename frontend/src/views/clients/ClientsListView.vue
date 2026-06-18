<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useClientStore } from "@/store/client";
import ClientGlassCard from "@/components/clients/ClientGlassCard.vue";
import ClientListSkeleton from "@/components/skeleton/ClientListSkeleton.vue";
import FloatingActionButton from "@/components/mobile/FloatingActionButton.vue";
import BulkActionToolbar from "@/components/clients/BulkActionToolbar.vue";
import BulkMessageModal from "@/components/clients/BulkMessageModal.vue";
import SortSelector from "@/components/clients/SortSelector.vue";
import {
  bulkActivate as apiBulkActivate,
  bulkDeactivate as apiBulkDeactivate,
  bulkChangeStatus as apiBulkChangeStatus,
  exportCSV as csvExportUrl,
} from "@/services/client-bulk-csv.service";
import SubscriptionRenewalModal from "@/components/scadenze/SubscriptionRenewalModal.vue";
import ScheduleCheckModal from "@/components/scadenze/ScheduleCheckModal.vue";
import api from "@/services/api";
import { CLIENT_AUTO_TAGS } from "@/types";
import type { ActionItem, ActionItemsCounts, Client } from "@/types";

const TAG_FILTER_OPTIONS = ["all", ...CLIENT_AUTO_TAGS] as const;
import { useViewShortcuts } from "@/composables/useKeyboardShortcuts";

const router = useRouter();
const route = useRoute();
const clientStore = useClientStore();
const toast = useToast();

useViewShortcuts({ n: () => router.push("/clients/new") });

const initialLoadDone = ref(false);
const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null);

const clients = computed(() => clientStore.clients);
const filters = computed(() => clientStore.filters);
const pagination = computed(() => clientStore.pagination);
const programSummaries = computed(() => clientStore.programSummaries);
const hasFilters = computed(() => clientStore.hasFilters);
const totalPages = computed(() => pagination.value.totalPages);

// ── Action items (azioni richieste) ──
type ActionFilter = "all" | "with_actions" | "new_no_check" | "subscription_expiring" | "checkin_overdue";

const actionItems = ref<ActionItem[]>([]);
const actionCounts = ref<ActionItemsCounts | null>(null);
const initialAction = route.query.filter as ActionFilter;
const validActionFilters: ActionFilter[] = ["all", "with_actions", "new_no_check", "subscription_expiring", "checkin_overdue"];
const activeActionFilter = ref<ActionFilter>(
  validActionFilters.includes(initialAction) ? initialAction : "all",
);

// Mappa clientId → azione più urgente (usata sia per badge sulle card che per sort)
const actionsByClientId = computed(() => {
  const map: Record<number, ActionItem> = {};
  for (const it of actionItems.value) {
    if (!map[it.client_id] || it.urgency > map[it.client_id].urgency) {
      map[it.client_id] = it;
    }
  }
  return map;
});

const displayedClients = computed<Client[]>(() => {
  if (activeActionFilter.value === "all") return clients.value;

  const matches =
    activeActionFilter.value === "with_actions"
      ? actionItems.value
      : actionItems.value.filter(
          (a) => a.action_type === activeActionFilter.value,
        );
  const targetIds = new Set(matches.map((a) => a.client_id));

  const storedById: Record<number, Client> = {};
  for (const c of clientStore.clients) storedById[c.id] = c;

  return Array.from(targetIds)
    .map((id) => {
      const stored = storedById[id];
      if (stored) return stored;
      const a = actionItems.value.find((x) => x.client_id === id);
      if (!a) return null;
      return {
        id,
        tenant_id: "",
        first_name: a.first_name,
        last_name: a.last_name,
        email: "",
        status: "active",
        created_at: "",
        updated_at: "",
      } as Client;
    })
    .filter((c): c is Client => c !== null)
    .sort(
      (a, b) =>
        (actionsByClientId.value[b.id]?.urgency ?? 0) -
        (actionsByClientId.value[a.id]?.urgency ?? 0),
    );
});

const loadActionItems = async () => {
  const res = await api.get("/analytics/action-items").catch(() => null);
  if (res?.data?.data) {
    actionItems.value = res.data.data.items || [];
    actionCounts.value = res.data.data.counts || null;
  }
};

// ── Filtro tag fidelizzazione ──
const initialTag = (route.query.tag as string) || "all";
const activeTagFilter = ref<string>(initialTag);

const displayedClientsWithTag = computed<Client[]>(() => {
  if (activeTagFilter.value === "all") return displayedClients.value;
  return displayedClients.value.filter((c) =>
    (c.tags || []).includes(activeTagFilter.value),
  );
});

watch(activeTagFilter, (f) => {
  const q = { ...route.query };
  if (f === "all") delete q.tag;
  else q.tag = f;
  router.replace({ path: "/clients", query: q });
});
watch(
  () => route.query.tag,
  (t) => {
    activeTagFilter.value = (t as string) || "all";
  },
);

// Sync filtro azione nell'URL
watch(activeActionFilter, (f) => {
  const q = { ...route.query };
  if (f === "all") delete q.filter;
  else q.filter = f;
  router.replace({ path: "/clients", query: q });
});

watch(
  () => route.query.filter,
  (f) => {
    const val = f as ActionFilter;
    if (validActionFilters.includes(val)) activeActionFilter.value = val;
    else activeActionFilter.value = "all";
  },
);

// ── Modali Rinnova/Programma check ──
const showRenewal = ref(false);
const showScheduleCheck = ref(false);
const selectedActionItem = ref<ActionItem | null>(null);

const handleActionClick = (action: ActionItem) => {
  selectedActionItem.value = action;
  if (action.action_type === "subscription_expiring") {
    showRenewal.value = true;
  } else {
    showScheduleCheck.value = true;
  }
};

const onActionSaved = async () => {
  showRenewal.value = false;
  showScheduleCheck.value = false;
  selectedActionItem.value = null;
  await loadActionItems();
};

onMounted(async () => {
  await Promise.all([clientStore.initialize(), loadActionItems()]);
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

// ============================================
// Fase 8: Bulk operations + CSV
// ============================================
const selectMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const showBulkMessageModal = ref(false);

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) selectedIds.value.clear();
};

const toggleSelectClient = (id: number) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const clearSelection = () => {
  selectedIds.value = new Set();
  selectMode.value = false;
};

const selectAllVisible = () => {
  const ids = new Set<number>();
  for (const c of displayedClientsWithTag.value) ids.add(c.id);
  selectedIds.value = ids;
};

const onBulkActivate = async () => {
  const ids = Array.from(selectedIds.value);
  try {
    const res = await apiBulkActivate(ids);
    toast.success(`✓ Attivati ${res.data.data.success} / ${ids.length} clienti`);
    if (res.data.data.failed > 0) {
      toast.warning(`${res.data.data.failed} non attivati (vedi errori)`);
    }
    clearSelection();
    clientStore.fetchClients();
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Errore attivazione');
  }
};

const onBulkDeactivate = async () => {
  const ids = Array.from(selectedIds.value);
  try {
    const res = await apiBulkDeactivate(ids);
    toast.success(`⏸ Disattivati ${res.data.data.success} / ${ids.length} clienti`);
    clearSelection();
    clientStore.fetchClients();
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Errore disattivazione');
  }
};

const onBulkChangeStatus = async () => {
  // Toast-driven: presenta opzioni inline via toast con HTML, oppure usa il modal dedicato (out of scope)
  // Per ora: cicla i 4 status come quick action.
  const cycle = ['active', 'inactive', 'paused', 'cancelled'];
  const newStatus = cycle[0]; // default attivo; in futuro: dropdown nel toolbar
  const ids = Array.from(selectedIds.value);
  try {
    const res = await apiBulkChangeStatus(ids, newStatus);
    toast.success(`Status "${newStatus}" applicato a ${res.data.data.success} / ${ids.length}`);
    clearSelection();
    clientStore.fetchClients();
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Errore cambio status');
  }
};

const onBulkExport = () => {
  // Genera CSV solo con i selezionati: per ora redirige all'export filtrato
  // (l'API export attuale supporta filtri ma non selezione esplicita: per ora esporta lista filtrata corrente)
  window.location.href = csvExportUrl({ status: filters.value.status || undefined, search: filters.value.search || undefined });
};

const goToImport = () => router.push('/clients/import');

// Filtri collassabili: default chiuso, counter totale filtri attivi
const showFilters = ref(false);
const activeFiltersCount = computed(() => {
  let n = 0;
  if (activeActionFilter.value !== 'all') n++;
  if (activeTagFilter.value !== 'all') n++;
  if (filters.value.status) n++;
  return n;
});
const toggleFilters = () => { showFilters.value = !showFilters.value; };

// Aggiorna in-memory via action store (evita refetch lista completo).
const onClientPhotoUpdated = ({ id, photoUrl }: { id: number; photoUrl: string | null }) => {
  clientStore.patchClient(id, { photo_url: photoUrl });
};
const onClientStatusChanged = ({ id, status }: { id: number; status: 'active' | 'inactive' }) => {
  clientStore.patchClient(id, { status });
};

// Fase 10: sort
const sortValue = computed({
  get: () => (clientStore.sort as any) || 'created_desc',
  set: (v: string) => clientStore.setSort(v)
});

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
    <!-- Header pagina (glass-mesh 2026): titolo+counter + sottotitolo + toolbar/CTA -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-habit-card via-habit-card to-habit-bg-light/40 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-4 sm:p-5 mb-4 sm:mb-5">
      <div class="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-habit-orange/15 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-habit-cyan/10 blur-3xl"></div>
      <div class="relative flex items-start justify-between gap-3 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text tracking-tight flex items-center gap-2">
          Clienti
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-habit-cyan/15 text-habit-cyan text-sm font-semibold tabular-nums">
            {{ pagination.total }}
          </span>
        </h1>
        <p class="text-habit-text-subtle text-sm mt-1">
          Gestisci i tuoi clienti: rinnova abbonamenti, programma check e monitora i programmi attivi.
        </p>
      </div>

      <!-- Toolbar + CTA: tutto a destra in una sola riga -->
      <div class="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
        <SortSelector v-model="sortValue" />
        <button
          @click="toggleSelectMode"
          :class="[
            'inline-flex items-center justify-center w-9 h-9 rounded-lg transition',
            selectMode
              ? 'bg-habit-cyan/15 text-habit-cyan border border-habit-cyan/30'
              : 'bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text'
          ]"
          :title="selectMode ? 'Esci selezione (' + selectedIds.size + ' selezionati)' : 'Selezione multipla'"
          aria-label="Selezione"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path v-if="selectMode" stroke-linecap="round" stroke-linejoin="round" d="M8 12l3 3 5-6" />
          </svg>
        </button>
        <button
          v-if="selectMode"
          @click="selectAllVisible"
          class="inline-flex items-center gap-1 px-2.5 h-9 text-xs font-medium rounded-lg bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text transition"
        >
          Tutti
        </button>
        <button
          @click="goToImport"
          class="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text transition"
          title="Importa clienti da CSV"
          aria-label="Importa CSV"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
          </svg>
        </button>
        <button
          @click="onBulkExport"
          class="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text transition"
          title="Esporta lista in CSV"
          aria-label="Esporta CSV"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 20V8m0 0l-4 4m4-4l4 4" />
          </svg>
        </button>
        <!-- Separatore verticale -->
        <span class="hidden sm:inline-block w-px h-6 bg-habit-border mx-1" aria-hidden="true"></span>
        <!-- CTA primaria -->
        <router-link
          to="/clients/new"
          class="new-client-btn inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 bg-habit-orange text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow-md hover:bg-habit-orange/90 active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Nuovo Cliente</span>
          <span class="sm:hidden">Nuovo</span>
        </router-link>
      </div>
      </div>
    </div>

    <!-- Search bar + bottone Filtri (sempre visibili) -->
    <div class="flex items-center gap-2 mb-3 sm:mb-4">
      <!-- Search -->
      <div class="relative flex-1 max-w-sm group/search">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle group-focus-within/search:text-habit-cyan transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="search" name="clients-search-q" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-form-type="other" data-lpignore="true" data-1p-ignore data-bwignore placeholder="Cerca cliente..."
          :value="filters.search" @input="handleSearch"
          class="w-full pl-9 pr-4 py-2 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan/30 transition text-sm" />
      </div>

      <!-- Bottone Filtri con counter badge -->
      <button
        @click="toggleFilters"
        :class="[
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition',
          showFilters || activeFiltersCount > 0
            ? 'bg-habit-cyan/15 border-habit-cyan/40 text-habit-cyan'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        ]"
        :aria-expanded="showFilters"
        :aria-label="`Filtri (${activeFiltersCount} attivi)`"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filtri</span>
        <span
          v-if="activeFiltersCount > 0"
          class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-habit-cyan text-white text-[11px] font-bold tabular-nums"
        >{{ activeFiltersCount }}</span>
        <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': showFilters }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Reset (visibile solo se filtri attivi) -->
      <button v-if="activeFiltersCount > 0" @click="() => { activeActionFilter = 'all'; activeTagFilter = 'all'; handleResetFilters(); }"
        class="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-red-400/70 rounded-xl border border-red-400/15 hover:bg-red-400/10 hover:text-red-400 transition"
        :title="`Resetta ${activeFiltersCount} filtri attivi`">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span class="hidden sm:inline">Reset</span>
      </button>
    </div>

    <!-- Pannello filtri collassabile -->
    <Transition name="filter-expand">
      <div v-show="showFilters" class="filters-panel space-y-3 mb-3 sm:mb-5 p-3 bg-habit-card/50 border border-habit-border rounded-xl">

    <!-- Action filter chips (scadenze e azioni integrate) -->
    <div
      v-if="actionCounts && actionCounts.total > 0"
      class="flex flex-wrap gap-1.5"
    >
      <button
        @click="activeActionFilter = 'all'"
        class="px-3 py-1.5 text-xs rounded-full border transition-colors"
        :class="
          activeActionFilter === 'all'
            ? 'bg-habit-bg border-habit-cyan text-habit-cyan'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        Tutti
      </button>
      <button
        @click="activeActionFilter = 'with_actions'"
        class="px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5"
        :class="
          activeActionFilter === 'with_actions'
            ? 'bg-habit-orange/15 border-habit-orange text-habit-orange'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Con azioni
        <span class="font-semibold">{{ actionCounts.total }}</span>
      </button>
      <button
        @click="activeActionFilter = 'new_no_check'"
        class="px-3 py-1.5 text-xs rounded-full border transition-colors"
        :class="
          activeActionFilter === 'new_no_check'
            ? 'bg-habit-orange/15 border-habit-orange text-habit-orange'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        Nuovi senza check
        <span class="font-semibold">{{ actionCounts.new_no_check }}</span>
      </button>
      <button
        @click="activeActionFilter = 'subscription_expiring'"
        class="px-3 py-1.5 text-xs rounded-full border transition-colors"
        :class="
          activeActionFilter === 'subscription_expiring'
            ? 'bg-habit-cyan/15 border-habit-cyan text-habit-cyan'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        In scadenza
        <span class="font-semibold">{{ actionCounts.expiring_subscriptions }}</span>
      </button>
      <button
        @click="activeActionFilter = 'checkin_overdue'"
        class="px-3 py-1.5 text-xs rounded-full border transition-colors"
        :class="
          activeActionFilter === 'checkin_overdue'
            ? 'bg-habit-cyan/15 border-habit-cyan text-habit-cyan'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        Check da fare
        <span class="font-semibold">{{ actionCounts.checkin_overdue }}</span>
      </button>
    </div>

    <!-- Tag filter (fidelizzazione) -->
    <div class="flex flex-wrap items-center gap-1.5 text-xs">
      <span class="text-habit-text-subtle mr-1">Segmento:</span>
      <button
        v-for="t in TAG_FILTER_OPTIONS"
        :key="t"
        @click="activeTagFilter = t"
        class="px-2.5 py-1 rounded-full border transition-colors capitalize"
        :class="
          activeTagFilter === t
            ? 'bg-habit-cyan/15 border-habit-cyan text-habit-cyan font-medium'
            : 'bg-habit-card border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        {{ t === "all" ? "Tutti" : t }}
      </button>
    </div>

        <!-- Dropdown stato -->
        <div class="flex items-center gap-2 text-xs">
          <span class="text-habit-text-subtle">Stato:</span>
          <select
            :value="filters.status || ''"
            @change="handleStatusFilter(($event.target as HTMLSelectElement).value || null)"
            class="glass-select px-2.5 py-1.5 rounded-lg text-xs min-w-[140px]"
          >
            <option value="">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="inactive">Inattivi</option>
            <option value="paused">In pausa</option>
          </select>
        </div>

      </div>
    </Transition>

    <!-- Loading skeleton -->
    <ClientListSkeleton v-if="!initialLoadDone" />

    <!-- Empty state -->
    <div
      v-else-if="displayedClientsWithTag.length === 0"
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
          v-for="(client, idx) in displayedClientsWithTag"
          :key="client.id"
          :client="client"
          :program-summary="programSummaries[client.id]"
          :pending-action="actionsByClientId[client.id] || null"
          :index="idx"
          :selectable="selectMode"
          :selected="selectedIds.has(client.id)"
          @click="viewClient"
          @action-click="handleActionClick"
          @toggle-select="toggleSelectClient"
          @photo-updated="onClientPhotoUpdated"
          @status-changed="onClientStatusChanged"
        />
      </div>

      <!-- Pagination (solo quando non c'e filtro azione attivo) -->
      <div
        v-if="activeActionFilter === 'all' && totalPages > 1"
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

    <!-- Modali azioni rapide -->
    <SubscriptionRenewalModal
      v-if="showRenewal && selectedActionItem"
      :item="selectedActionItem"
      @close="showRenewal = false"
      @saved="onActionSaved"
    />
    <ScheduleCheckModal
      v-if="showScheduleCheck && selectedActionItem"
      :item="selectedActionItem"
      @close="showScheduleCheck = false"
      @saved="onActionSaved"
    />

    <!-- Fase 8: Bulk action toolbar floating -->
    <BulkActionToolbar
      :selected-count="selectedIds.size"
      @notify="showBulkMessageModal = true"
      @activate="onBulkActivate"
      @deactivate="onBulkDeactivate"
      @change-status="onBulkChangeStatus"
      @export="onBulkExport"
      @clear="clearSelection"
    />

    <!-- Fase 8: Modale messaggio di gruppo -->
    <BulkMessageModal
      :visible="showBulkMessageModal"
      :client-ids="Array.from(selectedIds)"
      @close="showBulkMessageModal = false"
      @sent="clearSelection"
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
  max-height: 500px;
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
