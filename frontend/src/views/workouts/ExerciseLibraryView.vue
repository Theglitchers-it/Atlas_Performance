<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useExerciseStore } from "@/store/exercise";
import { useNative } from "@/composables/useNative";
import ExerciseCard from "@/components/workouts/ExerciseCard.vue";
import ExerciseModal from "@/components/workouts/ExerciseModal.vue";
import MuscleMap from "@/components/workouts/MuscleMap.vue";

const router = useRouter();
const exerciseStore = useExerciseStore();

const showModal = ref(false);
const searchDebounce = ref<any>(null);
const gridKey = ref(0);
const hoveredExercise = ref<any>(null);
const previewVisible = ref(false);
const showMobilePreview = ref(false);
const { isMobile } = useNative();

const exercises = computed(() => exerciseStore.exercises);
const muscleGroups = computed(() => exerciseStore.muscleGroups);
const loading = computed(() => exerciseStore.loading);
const filters = computed(() => exerciseStore.filters);
const pagination = computed(() => exerciseStore.pagination);
const selectedExercise = computed(() => exerciseStore.selectedExercise);
const hasFilters = computed(() => exerciseStore.hasFilters);

// ── Muscle group ordering ──
const muscleGroupOrder = [
  "petto", "chest", "spalle", "shoulders", "deltoidi",
  "tricipiti", "triceps", "dorso", "back", "dorsali", "lats",
  "trapezio", "trapezius", "romboidi", "bicipiti", "biceps",
  "quadricipiti", "quads", "gambe", "legs", "femorali", "hamstrings",
  "glutei", "glutes", "polpacci", "calves", "adduttori", "abduttori",
  "addominali", "abs", "core", "obliqui", "obliques", "lombari", "lower back",
];

// ── Group exercises by primary muscle ──
const exercisesByMuscle = computed(() => {
  const grouped: Record<string, { name: string; exercises: any[] }> = {};
  exercises.value.forEach((ex: any) => {
    const primary = ex.muscleGroups?.find((m: any) => m.is_primary) || ex.muscleGroups?.[0];
    const groupName = primary ? (primary.name_it || primary.name) : "Altro";
    const key = groupName.toLowerCase();
    if (!grouped[key]) grouped[key] = { name: groupName, exercises: [] };
    grouped[key].exercises.push(ex);
  });
  return grouped;
});

const orderedMuscleKeys = computed(() => {
  return Object.keys(exercisesByMuscle.value).sort((a, b) => {
    const idxA = muscleGroupOrder.findIndex((m) => a.includes(m));
    const idxB = muscleGroupOrder.findIndex((m) => b.includes(m));
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });
});

// ── Section colors ──
const sectionColors: Record<string, { dot: string; border: string }> = {
  petto: { dot: "bg-red-400", border: "border-red-500/20" },
  chest: { dot: "bg-red-400", border: "border-red-500/20" },
  spalle: { dot: "bg-amber-400", border: "border-amber-500/20" },
  shoulders: { dot: "bg-amber-400", border: "border-amber-500/20" },
  deltoidi: { dot: "bg-amber-400", border: "border-amber-500/20" },
  tricipiti: { dot: "bg-orange-400", border: "border-orange-500/20" },
  triceps: { dot: "bg-orange-400", border: "border-orange-500/20" },
  dorso: { dot: "bg-blue-400", border: "border-blue-500/20" },
  back: { dot: "bg-blue-400", border: "border-blue-500/20" },
  dorsali: { dot: "bg-blue-400", border: "border-blue-500/20" },
  bicipiti: { dot: "bg-purple-400", border: "border-purple-500/20" },
  biceps: { dot: "bg-purple-400", border: "border-purple-500/20" },
  quadricipiti: { dot: "bg-emerald-400", border: "border-emerald-500/20" },
  quads: { dot: "bg-emerald-400", border: "border-emerald-500/20" },
  gambe: { dot: "bg-emerald-400", border: "border-emerald-500/20" },
  femorali: { dot: "bg-teal-400", border: "border-teal-500/20" },
  hamstrings: { dot: "bg-teal-400", border: "border-teal-500/20" },
  glutei: { dot: "bg-green-400", border: "border-green-500/20" },
  glutes: { dot: "bg-green-400", border: "border-green-500/20" },
  polpacci: { dot: "bg-lime-400", border: "border-lime-500/20" },
  calves: { dot: "bg-lime-400", border: "border-lime-500/20" },
  addominali: { dot: "bg-cyan-400", border: "border-cyan-500/20" },
  abs: { dot: "bg-cyan-400", border: "border-cyan-500/20" },
  core: { dot: "bg-cyan-400", border: "border-cyan-500/20" },
  obliqui: { dot: "bg-sky-400", border: "border-sky-500/20" },
  lombari: { dot: "bg-slate-400", border: "border-slate-500/20" },
};

const getSectionColor = (key: string) => {
  for (const [k, v] of Object.entries(sectionColors)) {
    if (key.includes(k)) return v;
  }
  return { dot: "bg-habit-text-subtle", border: "border-habit-border" };
};

// ── Muscle groups for dropdown ──
const muscleGroupsByCategory = computed(() => {
  const push: any[] = [], pull: any[] = [], legs: any[] = [], core: any[] = [], other: any[] = [];
  const pushNames = ["petto", "chest", "spalle", "shoulders", "tricipiti", "triceps", "deltoidi"];
  const pullNames = ["dorso", "back", "dorsali", "lats", "bicipiti", "biceps", "trapezio", "trapezius", "romboidi"];
  const legNames = ["quadricipiti", "quads", "femorali", "hamstrings", "glutei", "glutes", "polpacci", "calves", "gambe", "legs", "adduttori", "abduttori"];
  const coreNames = ["addominali", "abs", "core", "obliqui", "obliques", "lombari", "lower back"];

  muscleGroups.value.forEach((mg: any) => {
    const name = (mg.name_it || mg.name || "").toLowerCase();
    if (pushNames.some((p) => name.includes(p))) push.push(mg);
    else if (pullNames.some((p) => name.includes(p))) pull.push(mg);
    else if (legNames.some((p) => name.includes(p))) legs.push(mg);
    else if (coreNames.some((p) => name.includes(p))) core.push(mg);
    else other.push(mg);
  });
  return { push, pull, legs, core, other };
});

// ── Mobile muscle group chips ──
const orderedMuscleGroupsFlat = computed(() => {
  const { push, pull, legs, core, other } = muscleGroupsByCategory.value;
  return [...push, ...pull, ...legs, ...core, ...other];
});

const getChipDotColor = (mg: any): string => {
  const key = (mg.name_it || mg.name || '').toLowerCase();
  return getSectionColor(key).dot;
};

const handleChipFilter = (mgId: string | null) => {
  exerciseStore.setFilter('muscleGroup', mgId);
};

// ── Preview panel data ──
const previewMuscles = computed(() => {
  if (!hoveredExercise.value?.muscleGroups) return [];
  return hoveredExercise.value.muscleGroups
    .slice()
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
});

const previewDifficulty = computed(() => {
  switch (hoveredExercise.value?.difficulty) {
    case "beginner": return { label: "Principiante", color: "text-emerald-400", bg: "bg-emerald-400/10", bar: "bg-emerald-400", pct: 33 };
    case "intermediate": return { label: "Intermedio", color: "text-cyan-400", bg: "bg-cyan-400/10", bar: "bg-cyan-400", pct: 66 };
    case "advanced": return { label: "Avanzato", color: "text-orange-400", bg: "bg-orange-400/10", bar: "bg-orange-400", pct: 100 };
    default: return { label: "-", color: "text-gray-400", bg: "bg-gray-400/10", bar: "bg-gray-400", pct: 0 };
  }
});

const previewEquipment = computed(() => {
  const eqMap: Record<string, string> = {
    barbell: "Bilanciere", dumbbell: "Manubri", kettlebell: "Kettlebell",
    cable: "Cavi", machine: "Macchina", bodyweight: "Corpo libero",
    resistance_band: "Elastici", medicine_ball: "Palla medica", trx: "TRX", none: "Nessuno",
  };
  const eq = hoveredExercise.value?.equipment;
  if (!eq) return [];
  let arr: string[] = [];
  if (typeof eq === "string") {
    try { arr = JSON.parse(eq); } catch { arr = [eq]; }
  } else if (Array.isArray(eq)) {
    arr = eq;
  }
  return arr.map((e: string) => eqMap[e] || e);
});

const previewCategory = computed(() => {
  const labels: Record<string, string> = {
    strength: "Forza", cardio: "Cardio", flexibility: "Flessibilita'",
    balance: "Equilibrio", plyometric: "Pliometrico", compound: "Composto", isolation: "Isolamento",
  };
  return labels[hoveredExercise.value?.category] || hoveredExercise.value?.category || "";
});

// Precomputed prefix-sum for stagger animation (O(K) instead of O(N*K))
const muscleKeyOffset = computed(() => {
  const offsets: Record<string, number> = {};
  let count = 0;
  for (const key of orderedMuscleKeys.value) {
    offsets[key] = count;
    count += exercisesByMuscle.value[key].exercises.length;
  }
  return offsets;
});

const getGlobalIndex = (muscleKey: string, localIdx: number) => {
  return (muscleKeyOffset.value[muscleKey] ?? 0) + localIdx;
};

let hoverTimeout: any = null;

watch([() => filters.value.muscleGroup, () => filters.value.difficulty, () => filters.value.search], () => {
  gridKey.value++;
  hoveredExercise.value = null;
  previewVisible.value = false;
  showMobilePreview.value = false;
});

// Lock body scroll when mobile bottom sheet or modal is open
watch([showMobilePreview, showModal], ([mobileOpen, modalOpen]) => {
  if (mobileOpen || modalOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(async () => {
  await exerciseStore.initialize();
});

onUnmounted(() => {
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
  if (hoverTimeout) clearTimeout(hoverTimeout);
  document.body.style.overflow = '';
});

// ── Handlers ──
const handleExerciseClick = (exercise: any) => {
  if (isMobile.value) {
    hoveredExercise.value = exercise;
    showMobilePreview.value = true;
  } else {
    exerciseStore.selectExercise(exercise);
    showModal.value = true;
  }
};

const handleMobilePreviewDetail = () => {
  if (hoveredExercise.value) {
    exerciseStore.selectExercise(hoveredExercise.value);
    showMobilePreview.value = false;
    showModal.value = true;
  }
};

const closeMobilePreview = () => {
  showMobilePreview.value = false;
};

const handleExerciseHover = (exercise: any) => {
  if (isMobile.value) return;
  if (hoverTimeout) clearTimeout(hoverTimeout);
  // Immediate update if already showing preview, slight delay for first show
  if (previewVisible.value) {
    hoveredExercise.value = exercise;
  } else {
    hoverTimeout = setTimeout(() => {
      hoveredExercise.value = exercise;
      previewVisible.value = true;
    }, 80);
  }
};

const handleCloseModal = () => {
  showModal.value = false;
  exerciseStore.clearSelectedExercise();
};

const handleSelectExercise = (exercise: any) => {
  handleCloseModal();
  router.push({ path: '/workouts/builder', query: { addExercise: exercise?.id } });
};

const handleFilterMuscleGroup = (e: any) => exerciseStore.setFilter("muscleGroup", e.target.value || null);
const handleFilterDifficulty = (e: any) => exerciseStore.setFilter("difficulty", e.target.value || null);
const handleSearch = (e: any) => {
  const value = e.target.value;
  if (searchDebounce.value) clearTimeout(searchDebounce.value);
  searchDebounce.value = setTimeout(() => exerciseStore.setFilter("search", value), 300);
};
const handleResetFilters = () => exerciseStore.resetFilters();

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
const handlePrevPage = () => { if (pagination.value.page > 1) { exerciseStore.setPage(pagination.value.page - 1); scrollToTop(); } };
const handleNextPage = () => { if (pagination.value.page < pagination.value.totalPages) { exerciseStore.setPage(pagination.value.page + 1); scrollToTop(); } };
</script>

<template>
  <div class="bg-habit-bg pb-4 lg:pb-8 overflow-hidden">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-5">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text tracking-tight">
          Libreria Esercizi
        </h1>
        <p class="text-habit-text-subtle text-sm mt-0.5">
          <span class="text-habit-cyan font-semibold">{{ pagination.total }}</span> esercizi
        </p>
      </div>
      <router-link
        to="/workouts/builder"
        class="cta-btn group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm text-white overflow-hidden w-fit"
      >
        <div class="absolute inset-0 bg-habit-orange opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="absolute inset-0 bg-habit-orange opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500"></div>
        <svg class="relative w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span class="relative">Crea Scheda</span>
      </router-link>
    </div>

    <!-- Search & Filters -->
    <div class="glass-panel glass-panel-mobile search-panel-mobile rounded-xl sm:rounded-2xl p-2.5 sm:p-3 lg:p-4 mb-3 sm:mb-5 space-y-2">
      <!-- Search -->
      <div class="relative group/search">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle group-focus-within/search:text-habit-cyan transition-colors duration-300"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" autocomplete="off" placeholder="Cerca esercizio..."
          :value="filters.search" @input="handleSearch"
          class="w-full pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-habit-bg-light border border-habit-border rounded-lg sm:rounded-xl text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan/30 transition-all duration-300 text-sm"
        />
      </div>

      <!-- Mobile muscle group chips -->
      <div v-if="isMobile && orderedMuscleGroupsFlat.length" class="lg:hidden">
        <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          <button @click="handleChipFilter(null)"
            class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border"
            :class="!filters.muscleGroup
              ? 'bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30'
              : 'bg-habit-bg-light text-habit-text-subtle border-habit-border'">
            <span class="w-1.5 h-1.5 rounded-full bg-habit-cyan"></span>
            Tutti
          </button>
          <button v-for="mg in orderedMuscleGroupsFlat" :key="mg.id"
            @click="handleChipFilter(String(mg.id))"
            class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap"
            :class="String(filters.muscleGroup) === String(mg.id)
              ? 'bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30'
              : 'bg-habit-bg-light text-habit-text-subtle border-habit-border'">
            <span class="w-1.5 h-1.5 rounded-full" :class="getChipDotColor(mg)"></span>
            {{ mg.name_it || mg.name }}
          </button>
        </div>
      </div>

      <!-- Filter row -->
      <div class="flex flex-wrap items-center gap-2">
        <select
          :value="filters.muscleGroup || ''" @change="handleFilterMuscleGroup"
          class="hidden lg:block glass-select px-2.5 py-1.5 rounded-xl text-xs min-w-[120px]"
        >
          <option value="">Tutti i muscoli</option>
          <optgroup v-if="muscleGroupsByCategory.push.length" label="Push">
            <option v-for="mg in muscleGroupsByCategory.push" :key="mg.id" :value="mg.id">{{ mg.name_it || mg.name }}</option>
          </optgroup>
          <optgroup v-if="muscleGroupsByCategory.pull.length" label="Pull">
            <option v-for="mg in muscleGroupsByCategory.pull" :key="mg.id" :value="mg.id">{{ mg.name_it || mg.name }}</option>
          </optgroup>
          <optgroup v-if="muscleGroupsByCategory.legs.length" label="Gambe">
            <option v-for="mg in muscleGroupsByCategory.legs" :key="mg.id" :value="mg.id">{{ mg.name_it || mg.name }}</option>
          </optgroup>
          <optgroup v-if="muscleGroupsByCategory.core.length" label="Core">
            <option v-for="mg in muscleGroupsByCategory.core" :key="mg.id" :value="mg.id">{{ mg.name_it || mg.name }}</option>
          </optgroup>
          <optgroup v-if="muscleGroupsByCategory.other.length" label="Altro">
            <option v-for="mg in muscleGroupsByCategory.other" :key="mg.id" :value="mg.id">{{ mg.name_it || mg.name }}</option>
          </optgroup>
        </select>

        <select
          :value="filters.difficulty || ''" @change="handleFilterDifficulty"
          class="glass-select px-2.5 py-1.5 rounded-xl text-xs min-w-[100px]"
        >
          <option value="">Difficolta'</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzato</option>
        </select>

        <button
          v-if="hasFilters" @click="handleResetFilters"
          class="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-400/70 rounded-xl border border-red-400/15 hover:bg-red-400/10 hover:text-red-400 transition-all duration-300"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reset
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="animate-pulse">
        <div class="h-3.5 bg-habit-skeleton rounded w-24 mb-2"></div>
        <div class="glass-panel rounded-2xl overflow-hidden">
          <div v-for="j in 3" :key="j" class="flex items-center gap-3 px-4 py-3 border-b border-habit-border last:border-0">
            <div class="h-3 bg-habit-skeleton rounded flex-1 max-w-[180px]"></div>
            <div class="h-2.5 bg-habit-skeleton rounded w-10 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="exercises.length === 0" class="flex flex-col items-center justify-center py-20">
      <div class="w-20 h-20 rounded-3xl bg-habit-bg-light border border-habit-border flex items-center justify-center mb-5">
        <svg class="w-9 h-9 text-habit-text-subtle/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-habit-text mb-1">Nessun esercizio trovato</h3>
      <p class="text-habit-text-subtle text-sm mb-5">
        {{ hasFilters ? "Prova a modificare i filtri" : "Non ci sono esercizi nella libreria" }}
      </p>
      <button v-if="hasFilters" @click="handleResetFilters" class="text-sm text-habit-cyan/70 hover:text-habit-cyan transition-colors">
        Reset filtri
      </button>
    </div>

    <!-- Main content: List + Preview -->
    <div v-else class="flex gap-0 lg:gap-5">
      <!-- Exercise List -->
      <div :key="gridKey" class="flex-1 min-w-0 space-y-3 lg:space-y-4">
        <div
          v-for="(muscleKey, sIdx) in orderedMuscleKeys"
          :key="muscleKey"
          class="section-enter"
          :style="{ animationDelay: `${sIdx * 60}ms` }"
        >
          <!-- Section header -->
          <div class="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 px-0.5 sm:px-1">
            <div class="w-1.5 h-1.5 rounded-full shadow-sm" :class="getSectionColor(muscleKey).dot"></div>
            <h2 class="text-xs font-bold text-habit-text-subtle uppercase tracking-widest">
              {{ exercisesByMuscle[muscleKey].name }}
            </h2>
            <span class="text-[10px] text-habit-text-subtle/60 font-medium tabular-nums">
              {{ exercisesByMuscle[muscleKey].exercises.length }}
            </span>
            <div class="flex-1 h-px bg-habit-border ml-1"></div>
          </div>

          <!-- Rows in glass container -->
          <div
            class="glass-panel glass-panel-mobile exercise-list-mobile rounded-xl sm:rounded-2xl overflow-hidden divide-y divide-habit-border"
            :class="getSectionColor(muscleKey).border"
          >
            <ExerciseCard
              v-for="(exercise, idx) in exercisesByMuscle[muscleKey].exercises"
              :key="exercise.id"
              :exercise="exercise"
              :index="getGlobalIndex(muscleKey, idx)"
              :active="hoveredExercise?.id === exercise.id"
              @click="handleExerciseClick"
              @hover="handleExerciseHover"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="pagination.totalPages > 1"
          class="flex items-center justify-between mt-3 sm:mt-4 px-3 sm:px-4 py-2 sm:py-2.5 glass-panel glass-panel-mobile exercise-list-mobile rounded-xl sm:rounded-2xl"
        >
          <p class="text-xs text-habit-text-subtle">
            Pagina <span class="text-habit-text font-medium">{{ pagination.page }}</span> di <span class="text-habit-text font-medium">{{ pagination.totalPages }}</span>
          </p>
          <div class="flex gap-1.5">
            <button
              @click="handlePrevPage" :disabled="pagination.page <= 1"
              class="w-8 h-8 rounded-xl border border-habit-border flex items-center justify-center text-habit-text-subtle hover:bg-habit-card-hover hover:text-habit-text disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              @click="handleNextPage" :disabled="pagination.page >= pagination.totalPages"
              class="w-8 h-8 rounded-xl border border-habit-border flex items-center justify-center text-habit-text-subtle hover:bg-habit-card-hover hover:text-habit-text disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Panel (desktop only) -->
      <div class="hidden lg:block w-[340px] xl:w-[380px] flex-shrink-0">
        <div class="sticky top-4">
          <!-- Empty state -->
          <Transition name="preview-fade" mode="out-in">
            <div v-if="!previewVisible || !hoveredExercise" key="empty" class="glass-panel rounded-3xl p-8 text-center">
              <div class="w-14 h-14 rounded-2xl bg-habit-bg-light dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-habit-text-subtle/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p class="text-habit-text-subtle text-sm">Passa il mouse su un esercizio</p>
            </div>

            <!-- Preview content -->
            <div v-else :key="hoveredExercise.id" class="glass-panel rounded-3xl overflow-hidden">
              <!-- Image -->
              <div class="relative aspect-video overflow-hidden">
                <img
                  v-if="hoveredExercise.image_url"
                  :src="hoveredExercise.image_url"
                  :alt="hoveredExercise.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-gradient-to-br from-habit-cyan/5 to-habit-orange/5 dark:from-habit-cyan/10 dark:to-habit-orange/10 flex items-center justify-center">
                  <MuscleMap size="md" :muscleGroups="hoveredExercise.muscleGroups || []" />
                </div>

                <!-- Video badge -->
                <div v-if="hoveredExercise.video_url" class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md flex items-center gap-1.5">
                  <svg class="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <span class="text-[10px] text-white/70 font-medium">Video</span>
                </div>

                <!-- Bottom gradient -->
                <div class="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>

                <!-- Category + Compound -->
                <div class="absolute bottom-2.5 left-3 flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-[10px] text-white/80 font-medium">{{ previewCategory }}</span>
                  <span v-if="hoveredExercise.is_compound" class="px-2 py-0.5 rounded-md bg-habit-orange/20 backdrop-blur-md text-[10px] text-habit-orange font-semibold">Composto</span>
                </div>
              </div>

              <!-- Content -->
              <div class="p-4 space-y-4">
                <!-- Title -->
                <h3 class="text-base font-bold text-habit-text leading-tight">{{ hoveredExercise.name }}</h3>

                <!-- Difficulty bar -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] text-habit-text-subtle uppercase tracking-wider font-semibold">Difficolta'</span>
                    <span class="text-xs font-semibold" :class="previewDifficulty.color">{{ previewDifficulty.label }}</span>
                  </div>
                  <div class="h-1 rounded-full bg-habit-bg dark:bg-white/[0.08] overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-700 ease-out"
                      :class="previewDifficulty.bar"
                      :style="{ width: previewDifficulty.pct + '%' }"
                    ></div>
                  </div>
                </div>

                <!-- Muscles -->
                <div v-if="previewMuscles.length">
                  <span class="text-[10px] text-habit-text-subtle uppercase tracking-wider font-semibold">Muscoli</span>
                  <div class="mt-1.5 space-y-1">
                    <div
                      v-for="m in previewMuscles"
                      :key="m.id"
                      class="flex items-center gap-2"
                    >
                      <div
                        class="w-1 h-1 rounded-full flex-shrink-0"
                        :class="m.is_primary ? 'bg-habit-cyan' : 'bg-habit-text-subtle/30 dark:bg-habit-text-subtle/50'"
                      ></div>
                      <span class="text-xs flex-1" :class="m.is_primary ? 'text-habit-text font-medium' : 'text-habit-text-subtle'">
                        {{ m.name_it || m.name }}
                      </span>
                      <div v-if="m.activation_percentage" class="flex items-center gap-1.5">
                        <div class="w-12 h-[3px] rounded-full bg-habit-bg dark:bg-white/[0.08] overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="m.is_primary ? 'bg-habit-cyan/60' : 'bg-habit-text-subtle/20 dark:bg-habit-text-subtle/40'"
                            :style="{ width: m.activation_percentage + '%' }"
                          ></div>
                        </div>
                        <span class="text-[10px] text-habit-text-subtle tabular-nums w-7 text-right">{{ m.activation_percentage }}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Equipment -->
                <div v-if="previewEquipment.length">
                  <span class="text-[10px] text-habit-text-subtle uppercase tracking-wider font-semibold">Attrezzatura</span>
                  <div class="flex flex-wrap gap-1.5 mt-1.5">
                    <span
                      v-for="eq in previewEquipment"
                      :key="eq"
                      class="px-2 py-0.5 rounded-lg bg-habit-bg-light dark:bg-white/[0.07] text-[11px] text-habit-text-subtle font-medium"
                    >
                      {{ eq }}
                    </span>
                  </div>
                </div>

                <!-- Description preview -->
                <p
                  v-if="hoveredExercise.description"
                  class="text-xs text-habit-text-subtle line-clamp-3 leading-relaxed"
                >
                  {{ hoveredExercise.description }}
                </p>

                <!-- CTA -->
                <button
                  @click="handleExerciseClick(hoveredExercise)"
                  class="w-full py-2 rounded-xl bg-habit-bg-light dark:bg-white/[0.06] border border-habit-border dark:border-white/[0.12] text-xs text-habit-text-subtle font-medium hover:bg-habit-card-hover hover:text-habit-text hover:border-habit-cyan/30 transition-all duration-300"
                >
                  Vedi dettagli completi
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <ExerciseModal
      :exercise="selectedExercise"
      :show="showModal"
      select-label="Usa nel Builder"
      @close="handleCloseModal"
      @select="handleSelectExercise"
    />

    <!-- Mobile Preview Bottom Sheet -->
    <Teleport to="body">
      <Transition name="mobile-preview">
        <div
          v-if="showMobilePreview && hoveredExercise"
          class="fixed inset-0 z-50 flex items-end"
          @click.self="closeMobilePreview"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeMobilePreview"></div>

          <!-- Bottom sheet -->
          <div class="relative w-full max-h-[85vh] bg-habit-card dark:bg-[#1a1a2e] rounded-t-3xl overflow-hidden pb-safe">
            <!-- Drag handle -->
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-10 h-1 rounded-full bg-habit-text-subtle/20"></div>
            </div>

            <div class="overflow-y-auto max-h-[calc(85vh-3rem)]">
              <!-- Image / MuscleMap -->
              <div class="relative aspect-video overflow-hidden mx-4 rounded-2xl">
                <img
                  v-if="hoveredExercise.image_url"
                  :src="hoveredExercise.image_url"
                  :alt="hoveredExercise.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-gradient-to-br from-habit-cyan/5 to-habit-orange/5 dark:from-habit-cyan/10 dark:to-habit-orange/10 flex items-center justify-center">
                  <MuscleMap size="md" :muscleGroups="hoveredExercise.muscleGroups || []" />
                </div>

                <!-- Video badge -->
                <div v-if="hoveredExercise.video_url" class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md flex items-center gap-1.5">
                  <svg class="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <span class="text-[10px] text-white/70 font-medium">Video</span>
                </div>

                <!-- Bottom gradient -->
                <div class="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>

                <!-- Category badges -->
                <div class="absolute bottom-2.5 left-3 flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-[10px] text-white/80 font-medium">{{ previewCategory }}</span>
                  <span v-if="hoveredExercise.is_compound" class="px-2 py-0.5 rounded-md bg-habit-orange/20 backdrop-blur-md text-[10px] text-habit-orange font-semibold">Composto</span>
                </div>
              </div>

              <!-- Content -->
              <div class="p-4 space-y-4">
                <!-- Title -->
                <h3 class="text-lg font-bold text-habit-text leading-tight">{{ hoveredExercise.name }}</h3>

                <!-- Difficulty bar -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] text-habit-text-subtle uppercase tracking-wider font-semibold">Difficolta'</span>
                    <span class="text-xs font-semibold" :class="previewDifficulty.color">{{ previewDifficulty.label }}</span>
                  </div>
                  <div class="h-1 rounded-full bg-habit-bg dark:bg-white/[0.08] overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-700 ease-out"
                      :class="previewDifficulty.bar"
                      :style="{ width: previewDifficulty.pct + '%' }"
                    ></div>
                  </div>
                </div>

                <!-- Muscles -->
                <div v-if="previewMuscles.length">
                  <span class="text-[10px] text-habit-text-subtle uppercase tracking-wider font-semibold">Muscoli</span>
                  <div class="mt-1.5 space-y-1">
                    <div v-for="m in previewMuscles" :key="m.id" class="flex items-center gap-2">
                      <div
                        class="w-1 h-1 rounded-full flex-shrink-0"
                        :class="m.is_primary ? 'bg-habit-cyan' : 'bg-habit-text-subtle/30 dark:bg-habit-text-subtle/50'"
                      ></div>
                      <span class="text-xs flex-1" :class="m.is_primary ? 'text-habit-text font-medium' : 'text-habit-text-subtle'">
                        {{ m.name_it || m.name }}
                      </span>
                      <div v-if="m.activation_percentage" class="flex items-center gap-1.5">
                        <div class="w-12 h-[3px] rounded-full bg-habit-bg dark:bg-white/[0.08] overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="m.is_primary ? 'bg-habit-cyan/60' : 'bg-habit-text-subtle/20 dark:bg-habit-text-subtle/40'"
                            :style="{ width: m.activation_percentage + '%' }"
                          ></div>
                        </div>
                        <span class="text-[10px] text-habit-text-subtle tabular-nums w-7 text-right">{{ m.activation_percentage }}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Equipment -->
                <div v-if="previewEquipment.length">
                  <span class="text-[10px] text-habit-text-subtle uppercase tracking-wider font-semibold">Attrezzatura</span>
                  <div class="flex flex-wrap gap-1.5 mt-1.5">
                    <span
                      v-for="eq in previewEquipment"
                      :key="eq"
                      class="px-2 py-0.5 rounded-lg bg-habit-bg-light dark:bg-white/[0.07] text-[11px] text-habit-text-subtle font-medium"
                    >
                      {{ eq }}
                    </span>
                  </div>
                </div>

                <!-- Description -->
                <p
                  v-if="hoveredExercise.description"
                  class="text-xs text-habit-text-subtle line-clamp-3 leading-relaxed"
                >
                  {{ hoveredExercise.description }}
                </p>

                <!-- CTA -->
                <button
                  @click="handleMobilePreviewDetail"
                  class="w-full py-3 rounded-2xl bg-gradient-to-r from-habit-cyan to-blue-500 text-white text-sm font-semibold shadow-lg shadow-habit-cyan/20 active:scale-[0.98] transition-transform duration-150"
                >
                  Vedi dettagli completi
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
/* Liquid Glass panels — theme-aware */
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

/* Mobile: lighter glass effect */
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

/* Mobile: search panel flat/transparent */
@media (max-width: 639px) {
  .search-panel-mobile {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    padding-left: 0;
    padding-right: 0;
  }
}

/* Mobile: exercise list panels — solid bg, no glass */
@media (max-width: 639px) {
  .exercise-list-mobile {
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

.glass-select optgroup {
  background: #12121e;
  color: #8a8a9a;
  font-style: normal;
}

:root:not(.dark) .glass-select option {
  background: #ffffff;
  color: #333333;
}

:root:not(.dark) .glass-select optgroup {
  background: #f5f5f5;
  color: #666666;
}

/* CTA button glow */
.cta-btn {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 32px -4px rgba(255, 120, 50, 0.25);
}

/* Section enter */
.section-enter {
  animation: sectionFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes sectionFade {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

/* Preview panel transition */
.preview-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.preview-fade-leave-active {
  transition: all 0.15s ease-out;
}
.preview-fade-enter-from {
  opacity: 0;
  transform: translate3d(0, 6px, 0) scale(0.98);
}
.preview-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}


/* Mobile preview bottom sheet */
.mobile-preview-enter-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.mobile-preview-enter-active > :last-child {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.mobile-preview-leave-active {
  transition: opacity 0.25s ease-in;
}
.mobile-preview-leave-active > :last-child {
  transition: transform 0.25s ease-in;
}
.mobile-preview-enter-from,
.mobile-preview-leave-to {
  opacity: 0;
}
.mobile-preview-enter-from > :last-child,
.mobile-preview-leave-to > :last-child {
  transform: translateY(100%);
}

/* Hide scrollbar for muscle group chips */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Safe area bottom padding for notched phones */
.pb-safe {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}
</style>
