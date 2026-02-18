<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

const router = useRouter();
const toast = useToast();

const workouts = ref<any[]>([]);
const isLoading = ref(true);
const searchQuery = ref("");
const categoryFilter = ref("");
const difficultyFilter = ref("");
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
});

// Modal duplicazione
const showDuplicateModal = ref(false);
const duplicatingWorkout = ref<any>(null);
const duplicateName = ref("");
const isDuplicating = ref(false);

// Modal eliminazione
const showDeleteModal = ref(false);
const deletingWorkout = ref<any>(null);
const isDeleting = ref(false);

const totalPages = computed(() => pagination.value.totalPages);

onMounted(() => {
  loadWorkouts();
});

watch([searchQuery, categoryFilter, difficultyFilter], () => {
  pagination.value.page = 1;
  loadWorkouts();
});

const loadWorkouts = async () => {
  isLoading.value = true;
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    if (categoryFilter.value) {
      params.category = categoryFilter.value;
    }
    if (difficultyFilter.value) {
      params.difficulty = difficultyFilter.value;
    }

    const response = await api.get("/workouts", { params });
    workouts.value = response.data.data.workouts || [];
    pagination.value = {
      ...pagination.value,
      ...response.data.data.pagination,
    };
  } catch (error: any) {
    console.error("Error loading workouts:", error);
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (page: any) => {
  if (page >= 1 && page <= totalPages.value) {
    pagination.value.page = page;
    loadWorkouts();
  }
};

const editWorkout = (id: any) => {
  router.push(`/workouts/builder/${id}`);
};

const openDuplicateModal = (workout: any) => {
  duplicatingWorkout.value = workout;
  duplicateName.value = `${workout.name} (copia)`;
  showDuplicateModal.value = true;
};

const closeDuplicateModal = () => {
  showDuplicateModal.value = false;
  duplicatingWorkout.value = null;
  duplicateName.value = "";
};

const confirmDuplicate = async () => {
  if (!duplicatingWorkout.value || !duplicateName.value.trim()) return;
  isDuplicating.value = true;
  try {
    await api.post(`/workouts/${duplicatingWorkout.value.id}/duplicate`, {
      name: duplicateName.value.trim(),
    });
    closeDuplicateModal();
    loadWorkouts();
    toast.success("Scheda duplicata");
  } catch (error: any) {
    console.error("Error duplicating workout:", error);
    toast.error("Errore durante la duplicazione della scheda");
  } finally {
    isDuplicating.value = false;
  }
};

const openDeleteModal = (workout: any) => {
  deletingWorkout.value = workout;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deletingWorkout.value = null;
};

const confirmDelete = async () => {
  if (!deletingWorkout.value) return;
  isDeleting.value = true;
  try {
    await api.delete(`/workouts/${deletingWorkout.value.id}`);
    closeDeleteModal();
    loadWorkouts();
    toast.success("Scheda eliminata");
  } catch (error: any) {
    console.error("Error deleting workout:", error);
    toast.error("Errore durante l'eliminazione della scheda");
  } finally {
    isDeleting.value = false;
  }
};

const getCategoryLabel = (category: any) => {
  const labels: Record<string, string> = {
    strength: "Forza",
    hypertrophy: "Ipertrofia",
    endurance: "Resistenza",
    flexibility: "Flessibilita",
    cardio: "Cardio",
    hiit: "HIIT",
    functional: "Funzionale",
    custom: "Personalizzato",
  };
  return labels[category] || category;
};

const getCategoryBadgeClass = (category: any) => {
  const classes: Record<string, string> = {
    strength: "bg-red-500/20 text-red-400",
    hypertrophy: "bg-purple-500/20 text-purple-400",
    endurance: "bg-blue-500/20 text-blue-400",
    flexibility: "bg-green-500/20 text-green-400",
    cardio: "bg-habit-orange/20 text-habit-orange",
    hiit: "bg-yellow-500/20 text-yellow-400",
    functional: "bg-habit-cyan/20 text-habit-cyan",
    custom: "bg-habit-skeleton text-habit-text-subtle",
  };
  return classes[category] || classes.custom;
};

const getDifficultyLabel = (difficulty: any) => {
  const labels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzato",
    elite: "Elite",
  };
  return labels[difficulty] || difficulty;
};

const getDifficultyBadgeClass = (difficulty: any) => {
  const classes: Record<string, string> = {
    beginner: "bg-habit-success/20 text-habit-success",
    intermediate: "bg-habit-cyan/20 text-habit-cyan",
    advanced: "bg-habit-orange/20 text-habit-orange",
    elite: "bg-red-500/20 text-red-400",
  };
  return classes[difficulty] || "bg-habit-skeleton text-habit-text-subtle";
};

const formatDuration = (minutes: any) => {
  if (!minutes) return "-";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const formatDate = (dateStr: any) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
          Schede Allenamento
        </h1>
        <p class="text-habit-text-subtle mt-1">
          Gestisci i template delle schede allenamento
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <router-link
          to="/exercises"
          class="flex sm:inline-flex items-center justify-center px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-card-hover hover:border-habit-cyan transition-all duration-300 w-full sm:w-auto"
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Libreria Esercizi
        </router-link>
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
          Nuova Scheda
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-habit-text-subtle"
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
              type="text"
              autocomplete="off"
              placeholder="Cerca per nome scheda..."
              class="w-full pl-10 pr-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text placeholder-habit-text-subtle"
            />
          </div>
        </div>

        <!-- Category Filter -->
        <div class="sm:w-48">
          <select
            v-model="categoryFilter"
            class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text"
          >
            <option value="">Tutte le categorie</option>
            <option value="strength">Forza</option>
            <option value="hypertrophy">Ipertrofia</option>
            <option value="endurance">Resistenza</option>
            <option value="cardio">Cardio</option>
            <option value="hiit">HIIT</option>
            <option value="functional">Funzionale</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>

        <!-- Difficulty Filter -->
        <div class="sm:w-48">
          <select
            v-model="difficultyFilter"
            class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text"
          >
            <option value="">Tutte le difficolta</option>
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzato</option>
            <option value="elite">Elite</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Workouts Grid -->
    <div>
      <!-- Loading -->
      <div
        v-if="isLoading"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="bg-habit-bg border border-habit-border rounded-habit p-6 animate-pulse"
        >
          <div class="h-5 bg-habit-skeleton rounded w-2/3 mb-3"></div>
          <div class="h-3 bg-habit-skeleton rounded w-full mb-2"></div>
          <div class="h-3 bg-habit-skeleton rounded w-1/2 mb-4"></div>
          <div class="flex gap-2">
            <div class="h-6 bg-habit-skeleton rounded-full w-20"></div>
            <div class="h-6 bg-habit-skeleton rounded-full w-16"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="workouts.length === 0"
        class="bg-habit-bg border border-habit-border rounded-habit p-8 text-center"
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
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 class="text-lg font-medium text-habit-text mb-2">
          {{
            searchQuery || categoryFilter || difficultyFilter
              ? "Nessun risultato"
              : "Nessuna scheda"
          }}
        </h3>
        <p class="text-habit-text-subtle mb-4">
          {{
            searchQuery || categoryFilter || difficultyFilter
              ? "Prova a modificare i filtri di ricerca"
              : "Inizia creando la tua prima scheda allenamento"
          }}
        </p>
        <router-link
          v-if="!searchQuery && !categoryFilter && !difficultyFilter"
          to="/workouts/builder"
          class="inline-flex items-center px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-habit-orange transition-all duration-300"
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

      <!-- Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="workout in workouts"
          :key="workout.id"
          class="bg-habit-bg border border-habit-border rounded-habit p-6 hover:border-habit-cyan/50 transition-all duration-300 cursor-pointer group"
          @click="editWorkout(workout.id)"
        >
          <!-- Card Header -->
          <div class="flex items-start justify-between mb-3">
            <h3
              class="text-lg font-semibold text-habit-text group-hover:text-habit-cyan transition-colors truncate pr-2"
            >
              {{ workout.name }}
            </h3>
            <!-- Actions Menu -->
            <div class="flex-shrink-0 flex gap-1" @click.stop>
              <button
                @click="openDuplicateModal(workout)"
                class="p-1.5 text-habit-text-subtle hover:text-habit-cyan hover:bg-habit-cyan/10 rounded-lg transition-colors"
                title="Duplica"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                @click="openDeleteModal(workout)"
                class="p-1.5 text-habit-text-subtle hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Elimina"
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
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-habit-text-subtle mb-4 line-clamp-2">
            {{ workout.description || "Nessuna descrizione" }}
          </p>

          <!-- Badges -->
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              class="px-2 py-1 text-xs rounded-full"
              :class="getCategoryBadgeClass(workout.category)"
            >
              {{ getCategoryLabel(workout.category) }}
            </span>
            <span
              class="px-2 py-1 text-xs rounded-full"
              :class="getDifficultyBadgeClass(workout.difficulty)"
            >
              {{ getDifficultyLabel(workout.difficulty) }}
            </span>
          </div>

          <!-- Meta Info -->
          <div
            class="flex items-center justify-between text-sm text-habit-text-subtle border-t border-habit-border pt-3"
          >
            <div class="flex items-center gap-3">
              <!-- Duration -->
              <div
                class="flex items-center"
                v-if="workout.estimated_duration_min"
              >
                <svg
                  class="w-4 h-4 mr-1"
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
                {{ formatDuration(workout.estimated_duration_min) }}
              </div>
            </div>
            <!-- Date -->
            <span class="text-xs">{{ formatDate(workout.created_at) }}</span>
          </div>

          <!-- Creator -->
          <div
            v-if="workout.creator_first_name"
            class="mt-2 text-xs text-habit-text-subtle"
          >
            Creata da {{ workout.creator_first_name }}
            {{ workout.creator_last_name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="workouts.length > 0 && totalPages > 1"
      class="bg-habit-bg border border-habit-border rounded-habit px-6 py-4"
    >
      <div class="flex items-center justify-between">
        <p class="text-sm text-habit-text-subtle">
          Pagina {{ pagination.page }} di {{ totalPages }} ({{
            pagination.total
          }}
          schede)
        </p>
        <div class="flex gap-2">
          <button
            @click="goToPage(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1 border border-habit-border rounded-xl text-sm text-habit-text-muted disabled:opacity-50 disabled:cursor-not-allowed hover:bg-habit-card-hover hover:border-habit-cyan transition-colors"
          >
            Precedente
          </button>
          <button
            @click="goToPage(pagination.page + 1)"
            :disabled="pagination.page >= totalPages"
            class="px-3 py-1 border border-habit-border rounded-xl text-sm text-habit-text-muted disabled:opacity-50 disabled:cursor-not-allowed hover:bg-habit-card-hover hover:border-habit-cyan transition-colors"
          >
            Successiva
          </button>
        </div>
      </div>
    </div>

    <!-- Duplicate Modal -->
    <Teleport to="body">
      <div
        v-if="showDuplicateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60"
          @click="closeDuplicateModal"
        ></div>
        <div
          class="relative bg-habit-bg border border-habit-border rounded-habit p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-lg font-semibold text-habit-text mb-4">
            Duplica Scheda
          </h3>
          <p class="text-sm text-habit-text-subtle mb-4">
            Stai duplicando:
            <span class="text-habit-text">{{ duplicatingWorkout?.name }}</span>
          </p>
          <div class="mb-6">
            <label class="block text-sm font-medium text-habit-text-muted mb-2"
              >Nome nuova scheda</label
            >
            <input
              v-model="duplicateName"
              type="text"
              class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text placeholder-habit-text-subtle"
              placeholder="Nome della scheda..."
              @keyup.enter="confirmDuplicate"
            />
          </div>
          <div class="flex gap-3 justify-end">
            <button
              @click="closeDuplicateModal"
              class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-card-hover transition-colors"
            >
              Annulla
            </button>
            <button
              @click="confirmDuplicate"
              :disabled="!duplicateName.trim() || isDuplicating"
              class="px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-habit-orange transition-all duration-300 disabled:opacity-50"
            >
              {{ isDuplicating ? "Duplicando..." : "Duplica" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Modal -->
    <ConfirmDialog
      :open="showDeleteModal"
      title="Elimina Scheda"
      :message="
        'Sei sicuro di voler eliminare ' +
        (deletingWorkout?.name || 'questa scheda') +
        '? Questa azione non puo\' essere annullata.'
      "
      confirmText="Elimina"
      variant="danger"
      :loading="isDeleting"
      @confirm="confirmDelete"
      @cancel="closeDeleteModal"
    />
  </div>
</template>
