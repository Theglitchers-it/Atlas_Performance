<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNutritionStore } from "@/store/nutrition";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

const router = useRouter();
const nutritionStore = useNutritionStore();
const toast = useToast();

// Local state
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const deletePlanId = ref<any>(null);
const deletePlanName = ref("");
const createLoading = ref(false);
const deleteLoading = ref(false);

// Create form
const newPlan = ref<any>({
  clientId: null,
  name: "",
  startDate: "",
  endDate: "",
  targetCalories: null,
  targetProteinG: null,
  targetCarbsG: null,
  targetFatG: null,
  notes: "",
});

// Computed from store
const plans = computed(() => nutritionStore.plans as any[]);
const clients = computed(() => nutritionStore.clients);
const summary = computed(() => nutritionStore.summary);
const loading = computed(() => nutritionStore.loading);
const summaryLoading = computed(() => nutritionStore.summaryLoading);
const error = computed(() => nutritionStore.error);
const filters = computed(() => nutritionStore.filters);
const hasFilters = computed(() => nutritionStore.hasFilters);
const pagination = computed(() => nutritionStore.pagination);

// Initialize on mount
onMounted(async () => {
  await nutritionStore.initialize();
});

// Filter handlers
const handleClientFilter = (e: any) => {
  const value = e.target.value;
  nutritionStore.setClientFilter(value ? parseInt(value) : null);
};

const handleStatusFilter = (e: any) => {
  nutritionStore.setFilter("status", e.target.value || null);
};

const handleResetFilters = () => {
  nutritionStore.resetFilters();
};

// Pagination
const handlePrevPage = () => {
  if (pagination.value.page > 1) {
    nutritionStore.setPage(pagination.value.page - 1);
  }
};

const handleNextPage = () => {
  if (pagination.value.hasMore) {
    nutritionStore.setPage(pagination.value.page + 1);
  }
};

// Navigate to planner
const goToPlan = (planId: any) => {
  router.push(`/nutrition/planner/${planId}`);
};

// Status actions
const handleActivate = async (e: any, planId: any) => {
  e.stopPropagation();
  const result = (await nutritionStore.updatePlanStatus(
    planId,
    "active",
  )) as any;
  if (result.success) {
    toast.success("Piano attivato con successo");
  } else {
    toast.error(result.error || "Errore durante l'attivazione del piano");
  }
};

const handleArchive = async (e: any, planId: any) => {
  e.stopPropagation();
  const result = (await nutritionStore.updatePlanStatus(
    planId,
    "archived",
  )) as any;
  if (result.success) {
    toast.success("Piano archiviato con successo");
  } else {
    toast.error(result.error || "Errore durante l'archiviazione del piano");
  }
};

// Create modal
const openCreateModal = () => {
  newPlan.value = {
    clientId: filters.value.clientId || null,
    name: "",
    startDate: "",
    endDate: "",
    targetCalories: null,
    targetProteinG: null,
    targetCarbsG: null,
    targetFatG: null,
    notes: "",
  };
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const handleCreatePlan = async () => {
  if (!newPlan.value.clientId || !newPlan.value.name.trim()) return;

  createLoading.value = true;
  const payload = {
    clientId: parseInt(newPlan.value.clientId),
    name: newPlan.value.name.trim(),
    startDate: newPlan.value.startDate || null,
    endDate: newPlan.value.endDate || null,
    targetCalories: newPlan.value.targetCalories
      ? parseInt(newPlan.value.targetCalories)
      : null,
    targetProteinG: newPlan.value.targetProteinG
      ? parseInt(newPlan.value.targetProteinG)
      : null,
    targetCarbsG: newPlan.value.targetCarbsG
      ? parseInt(newPlan.value.targetCarbsG)
      : null,
    targetFatG: newPlan.value.targetFatG
      ? parseInt(newPlan.value.targetFatG)
      : null,
    notes: newPlan.value.notes || null,
  };

  const result = (await nutritionStore.createPlan(payload)) as any;
  createLoading.value = false;

  if (result.success) {
    toast.success("Piano alimentare creato con successo");
    closeCreateModal();
  } else {
    toast.error(result.error || "Errore durante la creazione del piano");
  }
};

// Delete modal
const openDeleteModal = (e: any, planId: any, planName: any) => {
  e.stopPropagation();
  deletePlanId.value = planId;
  deletePlanName.value = planName;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deletePlanId.value = null;
  deletePlanName.value = "";
};

const handleDeletePlan = async () => {
  if (!deletePlanId.value) return;

  deleteLoading.value = true;
  const result = (await nutritionStore.deletePlan(deletePlanId.value)) as any;
  deleteLoading.value = false;

  if (result.success) {
    toast.success("Piano alimentare eliminato con successo");
    closeDeleteModal();
  } else {
    toast.error(result.error || "Errore durante l'eliminazione del piano");
  }
};

const confirmDelete = handleDeletePlan;

// Helpers
const formatDate = (dateStr: any) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusLabel = (status: any) => {
  const map: Record<string, string> = {
    draft: "Bozza",
    active: "Attivo",
    completed: "Completato",
    archived: "Archiviato",
  };
  return map[status] || status;
};

const getStatusClasses = (status: any) => {
  const map: Record<string, string> = {
    draft: "bg-habit-skeleton/50 text-habit-text-muted",
    active: "bg-emerald-500/20 text-emerald-400",
    completed: "bg-cyan-500/20 text-cyan-400",
    archived: "bg-orange-500/20 text-orange-400",
  };
  return map[status] || "bg-habit-skeleton/50 text-habit-text-muted";
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
          Piani Alimentari
        </h1>
        <p class="text-habit-text-subtle mt-1">
          Crea e gestisci i piani alimentari dei tuoi clienti
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="flex sm:inline-flex items-center justify-center px-4 py-2.5 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 font-medium w-full sm:w-auto"
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
        Nuovo Piano
      </button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="bg-red-500/10 border border-red-500/30 rounded-habit p-4 flex items-center gap-3"
    >
      <svg
        class="w-5 h-5 text-red-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <!-- Filters -->
    <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Client Filter -->
        <div class="w-full lg:w-64">
          <select
            :value="filters.clientId || ''"
            @change="handleClientFilter"
            class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
          >
            <option value="">Tutti i clienti</option>
            <option
              v-for="client in clients"
              :key="client.id"
              :value="client.id"
            >
              {{ client.first_name }} {{ client.last_name }}
            </option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="w-full lg:w-48">
          <select
            :value="filters.status || ''"
            @change="handleStatusFilter"
            class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
          >
            <option value="">Tutti gli stati</option>
            <option value="draft">Bozza</option>
            <option value="active">Attivo</option>
            <option value="completed">Completato</option>
            <option value="archived">Archiviato</option>
          </select>
        </div>

        <!-- Reset -->
        <button
          v-if="hasFilters"
          @click="handleResetFilters"
          class="px-4 py-2.5 text-habit-cyan hover:text-habit-orange transition-colors flex items-center gap-2"
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
          Reset
        </button>
      </div>
    </div>

    <!-- Summary Cards (solo con cliente selezionato) -->
    <div v-if="filters.clientId" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Piani Totali -->
      <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-habit-text">
              <template v-if="summaryLoading">
                <span
                  class="inline-block w-8 h-6 bg-habit-skeleton rounded animate-pulse"
                ></span>
              </template>
              <template v-else>{{ summary?.totalPlans || 0 }}</template>
            </p>
            <p class="text-xs text-habit-text-subtle">Piani Totali</p>
          </div>
        </div>
      </div>

      <!-- Calorie Target -->
      <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-habit-text">
              <template v-if="summaryLoading">
                <span
                  class="inline-block w-12 h-6 bg-habit-skeleton rounded animate-pulse"
                ></span>
              </template>
              <template v-else>
                {{ summary?.targets?.calories || "-" }}
                <span
                  class="text-sm font-normal text-habit-text-subtle"
                  v-if="summary?.targets?.calories"
                  >kcal</span
                >
              </template>
            </p>
            <p class="text-xs text-habit-text-subtle">Calorie Target</p>
          </div>
        </div>
      </div>

      <!-- Proteine Target -->
      <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-habit-text">
              <template v-if="summaryLoading">
                <span
                  class="inline-block w-10 h-6 bg-habit-skeleton rounded animate-pulse"
                ></span>
              </template>
              <template v-else>
                {{ summary?.targets?.protein || "-" }}
                <span
                  class="text-sm font-normal text-habit-text-subtle"
                  v-if="summary?.targets?.protein"
                  >g</span
                >
              </template>
            </p>
            <p class="text-xs text-habit-text-subtle">Proteine Target</p>
          </div>
        </div>
      </div>

      <!-- Macro Split -->
      <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-habit-orange/20 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-habit-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          </div>
          <div>
            <template v-if="summaryLoading">
              <span
                class="inline-block w-20 h-6 bg-habit-skeleton rounded animate-pulse"
              ></span>
            </template>
            <template v-else-if="summary?.targets">
              <p class="text-lg font-bold text-habit-text">
                <span class="text-cyan-400"
                  >{{ summary.targets.carbs || 0 }}g</span
                >
                <span class="text-habit-text-subtle mx-1">/</span>
                <span class="text-orange-400"
                  >{{ summary.targets.fat || 0 }}g</span
                >
              </p>
            </template>
            <template v-else>
              <p class="text-2xl font-bold text-habit-text">-</p>
            </template>
            <p class="text-xs text-habit-text-subtle">Carbo / Grassi</p>
          </div>
        </div>
      </div>
    </div>

    <!-- No active plan notice -->
    <div
      v-if="
        filters.clientId && !summaryLoading && summary && !summary.activePlan
      "
      class="bg-yellow-500/10 border border-yellow-500/20 rounded-habit p-3 flex items-center gap-3"
    >
      <svg
        class="w-5 h-5 text-yellow-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <p class="text-yellow-400 text-sm">
        Nessun piano alimentare attivo per questo cliente. Crea un nuovo piano o
        attiva una bozza esistente.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-habit-bg border border-habit-border rounded-habit p-4 animate-pulse"
      >
        <div class="flex items-center justify-between">
          <div class="space-y-3 flex-1">
            <div class="h-5 bg-habit-skeleton rounded w-1/3"></div>
            <div class="flex gap-3">
              <div class="h-4 bg-habit-skeleton rounded w-32"></div>
              <div class="h-4 bg-habit-skeleton rounded w-24"></div>
            </div>
            <div class="flex gap-2">
              <div class="h-5 bg-habit-skeleton rounded-full w-16"></div>
              <div class="h-5 bg-habit-skeleton rounded-full w-14"></div>
              <div class="h-5 bg-habit-skeleton rounded-full w-14"></div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-6 bg-habit-skeleton rounded-full w-20"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="plans.length === 0"
      class="bg-habit-bg border border-habit-border rounded-habit p-12 text-center"
    >
      <svg
        class="w-16 h-16 mx-auto mb-4 text-habit-text-subtle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Nessun piano alimentare
      </h3>
      <p class="text-habit-text-subtle mb-6">
        {{
          hasFilters
            ? "Prova a modificare i filtri di ricerca"
            : "Non hai ancora creato piani alimentari"
        }}
      </p>
      <div class="flex justify-center gap-3">
        <button
          v-if="hasFilters"
          @click="handleResetFilters"
          class="inline-flex items-center px-4 py-2 text-habit-cyan hover:text-habit-orange transition-colors"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset filtri
        </button>
        <button
          @click="openCreateModal"
          class="inline-flex items-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300"
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
          Crea il primo piano
        </button>
      </div>
    </div>

    <!-- Plans List -->
    <div v-else class="space-y-3">
      <div
        v-for="plan in plans"
        :key="plan.id"
        @click="goToPlan(plan.id)"
        class="bg-habit-bg border border-habit-border rounded-habit p-4 cursor-pointer hover:border-habit-cyan/50 hover:bg-habit-card-hover/20 transition-all duration-300 group"
      >
        <div
          class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
        >
          <!-- Left: Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <h3
                class="text-habit-text font-medium truncate group-hover:text-habit-cyan transition-colors"
              >
                {{ plan.name }}
              </h3>
              <span
                :class="[
                  'px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap',
                  getStatusClasses(plan.status),
                ]"
              >
                {{ getStatusLabel(plan.status) }}
              </span>
            </div>

            <!-- Client name (if no client filter active) -->
            <div
              v-if="!filters.clientId"
              class="flex items-center gap-1.5 text-sm text-habit-text-subtle mb-1.5"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {{ plan.client_first_name }} {{ plan.client_last_name }}
            </div>

            <!-- Dates & creator -->
            <div
              class="flex flex-wrap items-center gap-4 text-sm text-habit-text-subtle mb-2"
            >
              <span
                v-if="plan.start_date || plan.end_date"
                class="flex items-center gap-1.5"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ formatDate(plan.start_date) || "..." }} -
                {{ formatDate(plan.end_date) || "..." }}
              </span>
              <span
                v-if="plan.created_by_first_name"
                class="flex items-center gap-1.5"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                {{ plan.created_by_first_name }} {{ plan.created_by_last_name }}
              </span>
              <span class="flex items-center gap-1.5">
                <svg
                  class="w-4 h-4"
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
                {{ formatDate(plan.created_at) }}
              </span>
            </div>

            <!-- Macro targets -->
            <div
              v-if="plan.target_calories || plan.target_protein_g"
              class="flex flex-wrap gap-2"
            >
              <span
                v-if="plan.target_calories"
                class="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400"
              >
                {{ plan.target_calories }} kcal
              </span>
              <span
                v-if="plan.target_protein_g"
                class="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400"
              >
                P {{ plan.target_protein_g }}g
              </span>
              <span
                v-if="plan.target_carbs_g"
                class="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-400"
              >
                C {{ plan.target_carbs_g }}g
              </span>
              <span
                v-if="plan.target_fat_g"
                class="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-400"
              >
                F {{ plan.target_fat_g }}g
              </span>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Activate (if draft) -->
            <button
              v-if="plan.status === 'draft'"
              @click="handleActivate($event, plan.id)"
              class="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors"
              title="Attiva piano"
            >
              Attiva
            </button>

            <!-- Archive (if active or completed) -->
            <button
              v-if="plan.status === 'active' || plan.status === 'completed'"
              @click="handleArchive($event, plan.id)"
              class="px-3 py-1.5 text-xs font-medium text-orange-400 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-colors"
              title="Archivia piano"
            >
              Archivia
            </button>

            <!-- Delete -->
            <button
              @click="openDeleteModal($event, plan.id, plan.name)"
              class="p-2 text-habit-text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
              title="Elimina piano"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>

            <!-- Arrow -->
            <svg
              class="w-5 h-5 text-habit-text-subtle group-hover:text-habit-cyan transition-colors"
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
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="!loading && (pagination.page > 1 || pagination.hasMore)"
      class="flex items-center justify-between bg-habit-bg border border-habit-border rounded-habit p-4"
    >
      <p class="text-sm text-habit-text-subtle">Pagina {{ pagination.page }}</p>

      <div class="flex gap-2">
        <button
          @click="handlePrevPage"
          :disabled="pagination.page <= 1"
          class="px-4 py-2 rounded-xl border border-habit-border text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          @click="handleNextPage"
          :disabled="!pagination.hasMore"
          class="px-4 py-2 rounded-xl border border-habit-border text-habit-text-muted hover:bg-habit-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>

    <!-- Modal: Nuovo Piano Alimentare -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="closeCreateModal"
        ></div>

        <!-- Modal Content -->
        <div
          class="relative bg-habit-card border border-habit-border rounded-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-habit-text">
              Nuovo Piano Alimentare
            </h3>
            <button
              @click="closeCreateModal"
              class="p-1 text-habit-text-subtle hover:text-habit-text transition-colors"
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

          <!-- Cliente -->
          <div>
            <label
              class="block text-sm font-medium text-habit-text-muted mb-1.5"
              >Cliente *</label
            >
            <select
              v-model="newPlan.clientId"
              class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
            >
              <option :value="null">Seleziona cliente...</option>
              <option
                v-for="client in clients"
                :key="client.id"
                :value="client.id"
              >
                {{ client.first_name }} {{ client.last_name }}
              </option>
            </select>
          </div>

          <!-- Nome -->
          <div>
            <label
              class="block text-sm font-medium text-habit-text-muted mb-1.5"
              >Nome Piano *</label
            >
            <input
              v-model="newPlan.name"
              type="text"
              placeholder="Es: Piano Definizione Estate 2026"
              class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors"
            />
          </div>

          <!-- Date -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1.5"
                >Data Inizio</label
              >
              <input
                v-model="newPlan.startDate"
                type="date"
                class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors"
              />
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1.5"
                >Data Fine</label
              >
              <input
                v-model="newPlan.endDate"
                type="date"
                class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text focus:outline-none focus:border-habit-cyan transition-colors"
              />
            </div>
          </div>

          <!-- Target Macro -->
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-2"
              >Target Macro Giornalieri</label
            >
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-habit-text-subtle mb-1"
                  >Calorie (kcal)</label
                >
                <input
                  v-model.number="newPlan.targetCalories"
                  type="number"
                  min="0"
                  placeholder="2000"
                  class="w-full px-3 py-2 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors text-sm"
                />
              </div>
              <div>
                <label class="block text-xs text-habit-text-subtle mb-1"
                  >Proteine (g)</label
                >
                <input
                  v-model.number="newPlan.targetProteinG"
                  type="number"
                  min="0"
                  placeholder="150"
                  class="w-full px-3 py-2 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors text-sm"
                />
              </div>
              <div>
                <label class="block text-xs text-habit-text-subtle mb-1"
                  >Carboidrati (g)</label
                >
                <input
                  v-model.number="newPlan.targetCarbsG"
                  type="number"
                  min="0"
                  placeholder="250"
                  class="w-full px-3 py-2 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors text-sm"
                />
              </div>
              <div>
                <label class="block text-xs text-habit-text-subtle mb-1"
                  >Grassi (g)</label
                >
                <input
                  v-model.number="newPlan.targetFatG"
                  type="number"
                  min="0"
                  placeholder="65"
                  class="w-full px-3 py-2 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors text-sm"
                />
              </div>
            </div>
          </div>

          <!-- Note -->
          <div>
            <label
              class="block text-sm font-medium text-habit-text-muted mb-1.5"
              >Note</label
            >
            <textarea
              v-model="newPlan.notes"
              rows="2"
              placeholder="Note aggiuntive..."
              class="w-full px-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors resize-none"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              @click="closeCreateModal"
              class="flex-1 px-4 py-2.5 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors"
            >
              Annulla
            </button>
            <button
              @click="handleCreatePlan"
              :disabled="
                !newPlan.clientId || !newPlan.name.trim() || createLoading
              "
              class="flex-1 px-4 py-2.5 bg-habit-orange text-white rounded-xl hover:bg-habit-cyan transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg
                v-if="createLoading"
                class="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              {{ createLoading ? "Creazione..." : "Crea Piano" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      :open="showDeleteModal"
      title="Elimina Piano Nutrizionale"
      :message="'Sei sicuro di voler eliminare questo piano? Questa azione non puo essere annullata.'"
      confirmText="Elimina"
      variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
