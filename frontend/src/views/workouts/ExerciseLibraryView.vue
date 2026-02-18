<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useExerciseStore } from "@/store/exercise";
import ExerciseCard from "@/components/workouts/ExerciseCard.vue";
import ExerciseModal from "@/components/workouts/ExerciseModal.vue";

const exerciseStore = useExerciseStore();

// Local state
const showModal = ref(false);
const searchDebounce = ref<any>(null);

// Computed from store
const exercises = computed(() => exerciseStore.exercises);
const muscleGroups = computed(() => exerciseStore.muscleGroups);
const loading = computed(() => exerciseStore.loading);
const filters = computed(() => exerciseStore.filters);
const pagination = computed(() => exerciseStore.pagination);
const selectedExercise = computed(() => exerciseStore.selectedExercise);
const hasFilters = computed(() => exerciseStore.hasFilters);

// ── Category labels & ordering ──
const categoryLabels: Record<string, any> = {
  strength: {
    label: "Forza",
    icon: "\uD83D\uDCAA",
    color: "text-habit-orange",
  },
  cardio: { label: "Cardio", icon: "\u2764\uFE0F", color: "text-red-400" },
  flexibility: {
    label: "Flessibilita'",
    icon: "\uD83E\uDDD8",
    color: "text-purple-400",
  },
  balance: {
    label: "Equilibrio",
    icon: "\u2696\uFE0F",
    color: "text-blue-400",
  },
  plyometric: {
    label: "Pliometrico",
    icon: "\u26A1",
    color: "text-yellow-400",
  },
  compound: {
    label: "Composto",
    icon: "\uD83D\uDD17",
    color: "text-habit-cyan",
  },
  isolation: {
    label: "Isolamento",
    icon: "\uD83C\uDFAF",
    color: "text-green-400",
  },
};

const categoryOrder = [
  "strength",
  "cardio",
  "compound",
  "isolation",
  "plyometric",
  "flexibility",
  "balance",
];

// ── Client-side grouping per categoria ──
const exercisesByCategory = computed(() => {
  const grouped: Record<string, any[]> = {};
  exercises.value.forEach((ex: any) => {
    const cat = ex.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ex);
  });
  return grouped;
});

const orderedCategories = computed(() => {
  return categoryOrder.filter(
    (cat: any) => exercisesByCategory.value[cat]?.length > 0,
  );
});

// ── Muscle groups by category for dropdown optgroups ──
const muscleGroupsByCategory = computed(() => {
  const push: any[] = [];
  const pull: any[] = [];
  const legs: any[] = [];
  const core: any[] = [];
  const other: any[] = [];

  const pushNames = [
    "petto",
    "chest",
    "spalle",
    "shoulders",
    "tricipiti",
    "triceps",
    "deltoidi",
  ];
  const pullNames = [
    "dorso",
    "back",
    "dorsali",
    "lats",
    "bicipiti",
    "biceps",
    "trapezio",
    "trapezius",
    "romboidi",
  ];
  const legNames = [
    "quadricipiti",
    "quads",
    "femorali",
    "hamstrings",
    "glutei",
    "glutes",
    "polpacci",
    "calves",
    "gambe",
    "legs",
    "adduttori",
    "abduttori",
  ];
  const coreNames = [
    "addominali",
    "abs",
    "core",
    "obliqui",
    "obliques",
    "lombari",
    "lower back",
  ];

  muscleGroups.value.forEach((mg: any) => {
    const name = (mg.name_it || mg.name || "").toLowerCase();
    if (pushNames.some((p: any) => name.includes(p))) push.push(mg);
    else if (pullNames.some((p: any) => name.includes(p))) pull.push(mg);
    else if (legNames.some((p: any) => name.includes(p))) legs.push(mg);
    else if (coreNames.some((p: any) => name.includes(p))) core.push(mg);
    else other.push(mg);
  });

  return { push, pull, legs, core, other };
});

// ── Initialize store ──
onMounted(async () => {
  await exerciseStore.initialize();
});

// ── Modal handlers ──
const handleExerciseClick = (exercise: any) => {
  exerciseStore.selectExercise(exercise);
  showModal.value = true;
};

const handleCloseModal = () => {
  showModal.value = false;
  exerciseStore.clearSelectedExercise();
};

const handleSelectExercise = (_exercise: any) => {
  handleCloseModal();
};

// ── Filter handlers ──
const handleFilterMuscleGroup = (e: any) => {
  const val = e.target.value;
  exerciseStore.setFilter("muscleGroup", val || null);
};

const handleFilterDifficulty = (e: any) => {
  const val = e.target.value;
  exerciseStore.setFilter("difficulty", val || null);
};

const handleFilterCategory = (e: any) => {
  const val = e.target.value;
  exerciseStore.setFilter("category", val || null);
};

const handleSearch = (e: any) => {
  const value = e.target.value;
  if (searchDebounce.value) {
    clearTimeout(searchDebounce.value);
  }
  searchDebounce.value = setTimeout(() => {
    exerciseStore.setFilter("search", value);
  }, 300);
};

const handleResetFilters = () => {
  exerciseStore.resetFilters();
};

// ── Pagination ──
const handlePrevPage = () => {
  if (pagination.value.page > 1) {
    exerciseStore.setPage(pagination.value.page - 1);
  }
};

const handleNextPage = () => {
  if (pagination.value.page < pagination.value.totalPages) {
    exerciseStore.setPage(pagination.value.page + 1);
  }
};

// ── Cleanup ──
onUnmounted(() => {
  if (searchDebounce.value) {
    clearTimeout(searchDebounce.value);
  }
});
</script>

<template>
  <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Libreria Esercizi
        </h1>
        <p class="text-habit-text-subtle mt-1">
          {{ pagination.total }} esercizi disponibili
        </p>
      </div>
      <router-link
        to="/workouts/builder"
        class="flex sm:inline-flex items-center justify-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 w-full sm:w-auto"
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
        Crea Scheda
      </router-link>
    </div>

    <!-- Filters Bar — Dropdown Style -->
    <div
      class="bg-habit-bg border border-habit-border rounded-habit-sm sm:rounded-habit p-3 sm:p-4"
    >
      <div class="space-y-3">
        <!-- Search — full width -->
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-habit-text-subtle pointer-events-none"
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
            type="text"
            autocomplete="off"
            placeholder="Cerca esercizio..."
            :value="filters.search"
            @input="handleSearch"
            class="w-full pl-10 pr-4 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan transition-colors text-sm"
          />
        </div>

        <!-- Dropdowns — responsive grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <!-- Muscle Group Dropdown -->
          <select
            :value="filters.muscleGroup || ''"
            @change="handleFilterMuscleGroup"
            class="w-full px-3 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-sm text-habit-text focus:outline-none focus:border-habit-cyan transition-colors cursor-pointer appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center]"
            style="
              background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E&quot;);
              padding-right: 2.5rem;
            "
          >
            <option value="">Tutti i muscoli</option>
            <optgroup v-if="muscleGroupsByCategory.push.length" label="Push">
              <option
                v-for="mg in muscleGroupsByCategory.push"
                :key="mg.id"
                :value="mg.id"
              >
                {{ mg.name_it || mg.name }}
              </option>
            </optgroup>
            <optgroup v-if="muscleGroupsByCategory.pull.length" label="Pull">
              <option
                v-for="mg in muscleGroupsByCategory.pull"
                :key="mg.id"
                :value="mg.id"
              >
                {{ mg.name_it || mg.name }}
              </option>
            </optgroup>
            <optgroup v-if="muscleGroupsByCategory.legs.length" label="Gambe">
              <option
                v-for="mg in muscleGroupsByCategory.legs"
                :key="mg.id"
                :value="mg.id"
              >
                {{ mg.name_it || mg.name }}
              </option>
            </optgroup>
            <optgroup v-if="muscleGroupsByCategory.core.length" label="Core">
              <option
                v-for="mg in muscleGroupsByCategory.core"
                :key="mg.id"
                :value="mg.id"
              >
                {{ mg.name_it || mg.name }}
              </option>
            </optgroup>
            <optgroup v-if="muscleGroupsByCategory.other.length" label="Altro">
              <option
                v-for="mg in muscleGroupsByCategory.other"
                :key="mg.id"
                :value="mg.id"
              >
                {{ mg.name_it || mg.name }}
              </option>
            </optgroup>
          </select>

          <!-- Difficulty Dropdown -->
          <select
            :value="filters.difficulty || ''"
            @change="handleFilterDifficulty"
            class="w-full px-3 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-sm text-habit-text focus:outline-none focus:border-habit-cyan transition-colors cursor-pointer appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center]"
            style="
              background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E&quot;);
              padding-right: 2.5rem;
            "
          >
            <option value="">Difficolta'</option>
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzato</option>
          </select>

          <!-- Category Dropdown -->
          <select
            :value="filters.category || ''"
            @change="handleFilterCategory"
            class="w-full px-3 py-2.5 bg-habit-bg-light border border-habit-border rounded-xl text-sm text-habit-text focus:outline-none focus:border-habit-cyan transition-colors cursor-pointer appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center]"
            style="
              background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E&quot;);
              padding-right: 2.5rem;
            "
          >
            <option value="">Categoria</option>
            <option value="strength">Forza</option>
            <option value="cardio">Cardio</option>
            <option value="compound">Composto</option>
            <option value="isolation">Isolamento</option>
            <option value="plyometric">Pliometrico</option>
            <option value="flexibility">Flessibilita'</option>
            <option value="balance">Equilibrio</option>
          </select>

          <!-- Reset -->
          <button
            v-if="hasFilters"
            @click="handleResetFilters"
            class="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-red-400 border border-red-400/30 rounded-xl hover:bg-red-400/10 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State — Skeleton Rows -->
    <div v-if="loading" class="space-y-5 sm:space-y-6">
      <div v-for="i in 2" :key="i" class="space-y-2 sm:space-y-3">
        <!-- Row title skeleton -->
        <div class="flex items-center gap-1.5 sm:gap-2 animate-pulse">
          <div class="w-5 h-5 sm:w-6 sm:h-6 bg-habit-skeleton rounded"></div>
          <div class="h-4 sm:h-5 bg-habit-skeleton rounded w-24 sm:w-32"></div>
          <div class="h-3 sm:h-4 bg-habit-skeleton rounded w-6 sm:w-8"></div>
        </div>
        <!-- Cards skeleton — responsive grid -->
        <div
          class="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3"
        >
          <div v-for="j in 6" :key="j" class="animate-pulse">
            <div
              class="bg-habit-bg border border-habit-border rounded-habit-sm sm:rounded-habit p-2.5 sm:p-3"
            >
              <div
                class="aspect-video rounded-lg sm:rounded-xl bg-habit-skeleton mb-2 sm:mb-3"
              ></div>
              <div
                class="h-3.5 sm:h-4 bg-habit-skeleton rounded w-3/4 mb-1.5 sm:mb-2"
              ></div>
              <div class="flex gap-1.5 sm:gap-2">
                <div
                  class="h-4 sm:h-5 bg-habit-skeleton rounded-full w-12 sm:w-14"
                ></div>
                <div
                  class="h-4 sm:h-5 bg-habit-skeleton rounded-full w-14 sm:w-16"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="exercises.length === 0"
      class="bg-habit-bg border border-habit-border rounded-habit-sm sm:rounded-habit p-6 sm:p-12 text-center"
    >
      <svg
        class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-habit-text-subtle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <h3 class="text-base sm:text-lg font-semibold text-habit-text mb-2">
        Nessun esercizio trovato
      </h3>
      <p class="text-habit-text-subtle mb-4">
        {{
          hasFilters
            ? "Prova a modificare i filtri di ricerca"
            : "Non ci sono esercizi nella libreria"
        }}
      </p>
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
    </div>

    <!-- Category Rows — Raggruppate per Categoria -->
    <div v-else class="space-y-5 sm:space-y-6">
      <div
        v-for="cat in orderedCategories"
        :key="cat"
        class="space-y-2 sm:space-y-3"
      >
        <!-- Row Header -->
        <div class="flex items-center justify-between">
          <h2
            class="text-base sm:text-lg font-bold text-habit-text flex items-center gap-1.5 sm:gap-2"
          >
            <span class="text-base sm:text-xl">{{
              categoryLabels[cat]?.icon
            }}</span>
            <span :class="categoryLabels[cat]?.color">{{
              categoryLabels[cat]?.label || cat
            }}</span>
            <span class="text-xs sm:text-sm font-normal text-habit-text-subtle">
              ({{ exercisesByCategory[cat].length }})
            </span>
          </h2>
        </div>

        <!-- Responsive Grid -->
        <div
          class="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3"
        >
          <ExerciseCard
            v-for="exercise in exercisesByCategory[cat]"
            :key="exercise.id"
            :exercise="exercise"
            @click="handleExerciseClick"
          />
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="!loading && pagination.totalPages > 1"
      class="flex items-center justify-between bg-habit-bg border border-habit-border rounded-habit p-4"
    >
      <p class="text-sm text-habit-text-subtle">
        Pagina {{ pagination.page }} di {{ pagination.totalPages }}
        <span class="hidden sm:inline">
          ({{ exercises.length }} di {{ pagination.total }} esercizi)
        </span>
      </p>

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
          :disabled="pagination.page >= pagination.totalPages"
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

    <!-- Exercise Modal -->
    <ExerciseModal
      :exercise="selectedExercise"
      :show="showModal"
      @close="handleCloseModal"
      @select="handleSelectExercise"
    />
  </div>
</template>
