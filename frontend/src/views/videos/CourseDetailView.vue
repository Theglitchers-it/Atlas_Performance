<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useVideoStore } from "@/store/video";
import { useAuthStore } from "@/store/auth";
import { useRoute, useRouter } from "vue-router";

const store = useVideoStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const courseId = computed(() => parseInt((route.params.id as any) || "0"));
const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as any),
);
const loading = ref(true);

// Modale gestione moduli
const showAddModuleModal = ref(false);
const showEditModuleModal = ref(false);
const activeModuleId = ref<any>(null);

// Form nuovo modulo
const newModule = ref<any>({
  videoId: "",
  title: "",
  description: "",
  isPreview: false,
});
void showAddModuleModal;
void showEditModuleModal;
void newModule;

// Config difficoltà
const difficultyConfig: Record<string, any> = {
  beginner: {
    label: "Principiante",
    color: "text-green-400",
    bg: "bg-green-500/20",
  },
  intermediate: {
    label: "Intermedio",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  advanced: { label: "Avanzato", color: "text-red-400", bg: "bg-red-500/20" },
};

const getDifficulty = (d: any) =>
  difficultyConfig[d] || difficultyConfig.intermediate;

const formatDuration = (seconds: any) => {
  if (!seconds) return "-";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

const formatDurationMin = (min: any) => {
  if (!min) return "-";
  if (min >= 60) {
    const hours = Math.floor(min / 60);
    const remainMin = min % 60;
    return `${hours}h ${remainMin > 0 ? remainMin + "min" : ""}`;
  }
  return `${min} min`;
};

const formatDate = (d: any) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (price: any) => {
  if (!price || price === 0) return "Gratuito";
  return `€${parseFloat(price).toFixed(2)}`;
};

// Progresso
const completedModules = computed(() => {
  return store.courseProgress.filter((p: any) => p.is_completed).length;
});

const totalModules = computed(() => {
  return store.currentCourse?.modules?.length || 0;
});

const progressPercent = computed(() => {
  if (totalModules.value === 0) return 0;
  return Math.round((completedModules.value / totalModules.value) * 100);
});

// Modulo attivo per riproduzione
const activeModule = computed(() => {
  if (!store.currentCourse?.modules) return null;
  if (activeModuleId.value) {
    return store.currentCourse.modules.find(
      (m: any) => m.id === activeModuleId.value,
    );
  }
  // Primo modulo non completato
  const progressMap = new Map(
    store.courseProgress.map((p: any) => [p.module_id, p]),
  );
  const nextIncomplete = store.currentCourse.modules.find((m: any) => {
    const prog = progressMap.get(m.id);
    return !prog || !prog.is_completed;
  });
  return nextIncomplete || store.currentCourse.modules[0];
});

const isModuleCompleted = (moduleId: any) => {
  return store.courseProgress.some(
    (p: any) => p.module_id === moduleId && p.is_completed,
  );
};

const getModuleProgress = (moduleId: any) => {
  return store.courseProgress.find((p: any) => p.module_id === moduleId);
};
void getModuleProgress;

// Handlers
const selectModule = (moduleId: any) => {
  activeModuleId.value = moduleId;
};

const markModuleComplete = async (moduleId: any) => {
  const result = await store.updateModuleProgress(courseId.value, moduleId, {
    isCompleted: true,
  });
  if (result.success) {
    await store.fetchCourseProgress(courseId.value);
  }
};

const goBack = () => {
  router.push({ name: "Videos" });
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    store.fetchCourseById(courseId.value),
    store.fetchCourseProgress(courseId.value),
  ]);
  // Carica video disponibili per aggiungere moduli
  if (isTrainer.value) {
    await store.fetchVideos({ page: 1 } as any);
  }
  loading.value = false;
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">
    <!-- Back Button -->
    <button
      @click="goBack"
      class="flex items-center gap-2 text-habit-text-muted hover:text-habit-text mb-4 transition-colors"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Torna alla libreria
    </button>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="card-dark p-6 animate-pulse">
        <div class="h-6 bg-habit-skeleton rounded w-1/2 mb-3"></div>
        <div class="h-4 bg-habit-skeleton rounded w-3/4 mb-4"></div>
        <div class="h-48 bg-habit-skeleton rounded-xl"></div>
      </div>
    </div>

    <!-- Corso non trovato -->
    <div v-else-if="!store.currentCourse" class="card-dark p-12 text-center">
      <div class="text-5xl mb-4">🔍</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Corso non trovato
      </h3>
      <p class="text-habit-text-muted text-sm mb-6">
        Il corso richiesto non esiste o non hai accesso
      </p>
      <button @click="goBack" class="btn-primary btn-sm">
        Torna alla libreria
      </button>
    </div>

    <!-- Course Detail -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Colonna Sinistra: Player + Moduli -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Video Player Area -->
        <div class="card-dark overflow-hidden">
          <div
            class="relative h-64 md:h-96 bg-habit-bg-light flex items-center justify-center"
          >
            <img
              v-if="
                activeModule?.thumbnail_path ||
                store.currentCourse.thumbnail_url
              "
              :src="
                activeModule?.thumbnail_path ||
                store.currentCourse.thumbnail_url
              "
              :alt="activeModule?.title || store.currentCourse.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="text-6xl">📚</div>
            <!-- Play Overlay -->
            <div
              class="absolute inset-0 bg-black/30 flex items-center justify-center"
            >
              <div
                class="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all"
              >
                <svg
                  class="w-10 h-10 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- Module Info -->
          <div class="p-4">
            <div
              v-if="activeModule"
              class="flex items-start justify-between gap-4"
            >
              <div>
                <h3 class="font-semibold text-habit-text">
                  {{ activeModule.title }}
                </h3>
                <p
                  v-if="activeModule.description"
                  class="text-habit-text-muted text-sm mt-1"
                >
                  {{ activeModule.description }}
                </p>
                <div
                  class="flex items-center gap-3 mt-2 text-xs text-habit-text-subtle"
                >
                  <span v-if="activeModule.duration_seconds">{{
                    formatDuration(activeModule.duration_seconds)
                  }}</span>
                  <span v-if="activeModule.is_preview" class="text-green-400"
                    >Anteprima gratuita</span
                  >
                </div>
              </div>
              <button
                v-if="!isModuleCompleted(activeModule.id)"
                @click="markModuleComplete(activeModule.id)"
                class="btn-primary btn-sm whitespace-nowrap"
              >
                Completato ✓
              </button>
              <span
                v-else
                class="text-green-400 text-sm font-medium whitespace-nowrap flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Completato
              </span>
            </div>
          </div>
        </div>

        <!-- Moduli Lista -->
        <div class="card-dark p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-habit-text">Moduli del corso</h3>
            <span class="text-habit-text-subtle text-sm"
              >{{ completedModules }}/{{ totalModules }} completati</span
            >
          </div>

          <div
            v-if="
              store.currentCourse.modules && store.currentCourse.modules.length
            "
            class="space-y-2"
          >
            <div
              v-for="(mod, index) in store.currentCourse.modules"
              :key="mod.id"
              @click="selectModule(mod.id)"
              class="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
              :class="[
                activeModule?.id === mod.id
                  ? 'bg-habit-orange/10 border border-habit-orange/30'
                  : 'bg-habit-bg-light hover:bg-habit-card-hover',
              ]"
            >
              <!-- Numero / Check -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                :class="
                  isModuleCompleted(mod.id)
                    ? 'bg-green-500/20 text-green-400'
                    : activeModule?.id === mod.id
                      ? 'bg-habit-orange/20 text-habit-orange'
                      : 'bg-habit-bg-light text-habit-text-subtle'
                "
              >
                <svg
                  v-if="isModuleCompleted(mod.id)"
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span v-else>{{ index + 1 }}</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-habit-text truncate">
                  {{ mod.title }}
                </h4>
                <div
                  class="flex items-center gap-2 text-xs text-habit-text-subtle mt-0.5"
                >
                  <span v-if="mod.duration_seconds">{{
                    formatDuration(mod.duration_seconds)
                  }}</span>
                  <span v-if="mod.is_preview" class="text-green-400"
                    >Anteprima</span
                  >
                </div>
              </div>

              <!-- Playing indicator -->
              <div v-if="activeModule?.id === mod.id" class="flex-shrink-0">
                <div class="flex items-center gap-0.5">
                  <div
                    class="w-0.5 h-3 bg-habit-orange rounded-full animate-pulse"
                  ></div>
                  <div
                    class="w-0.5 h-4 bg-habit-orange rounded-full animate-pulse"
                    style="animation-delay: 0.2s"
                  ></div>
                  <div
                    class="w-0.5 h-2 bg-habit-orange rounded-full animate-pulse"
                    style="animation-delay: 0.4s"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <p class="text-habit-text-muted text-sm">
              Nessun modulo ancora aggiunto
            </p>
          </div>
        </div>
      </div>

      <!-- Colonna Destra: Info Corso -->
      <div class="space-y-6">
        <!-- Corso Info Card -->
        <div class="card-dark p-6">
          <h2 class="text-xl font-bold text-habit-text mb-2">
            {{ store.currentCourse.title }}
          </h2>

          <div class="flex flex-wrap gap-2 mb-4">
            <span
              :class="[
                getDifficulty(store.currentCourse.difficulty).bg,
                getDifficulty(store.currentCourse.difficulty).color,
              ]"
              class="text-xs px-2 py-1 rounded-full"
            >
              {{ getDifficulty(store.currentCourse.difficulty).label }}
            </span>
            <span
              v-if="store.currentCourse.category"
              class="text-xs px-2 py-1 rounded-full bg-habit-bg-light text-habit-text-muted"
            >
              {{ store.currentCourse.category }}
            </span>
            <span
              class="text-xs px-2 py-1 rounded-full"
              :class="
                store.currentCourse.is_published
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              "
            >
              {{ store.currentCourse.is_published ? "Pubblicato" : "Bozza" }}
            </span>
          </div>

          <p
            v-if="store.currentCourse.description"
            class="text-habit-text-muted text-sm mb-4"
          >
            {{ store.currentCourse.description }}
          </p>

          <!-- Prezzo -->
          <div class="mb-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-habit-orange">
                {{
                  formatPrice(
                    store.currentCourse.sale_price || store.currentCourse.price,
                  )
                }}
              </span>
              <span
                v-if="store.currentCourse.sale_price"
                class="text-habit-text-subtle line-through text-sm"
              >
                €{{ parseFloat(store.currentCourse.price).toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="space-y-3 pt-4 border-t border-habit-border">
            <div class="flex justify-between text-sm">
              <span class="text-habit-text-muted">Moduli</span>
              <span class="text-habit-text font-medium">{{
                totalModules
              }}</span>
            </div>
            <div
              v-if="store.currentCourse.duration_total_min"
              class="flex justify-between text-sm"
            >
              <span class="text-habit-text-muted">Durata totale</span>
              <span class="text-habit-text font-medium">{{
                formatDurationMin(store.currentCourse.duration_total_min)
              }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-habit-text-muted">Creato da</span>
              <span class="text-habit-text font-medium"
                >{{ store.currentCourse.creator_first_name }}
                {{ store.currentCourse.creator_last_name }}</span
              >
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-habit-text-muted">Data creazione</span>
              <span class="text-habit-text font-medium">{{
                formatDate(store.currentCourse.created_at)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Progresso Card -->
        <div class="card-dark p-6">
          <h3 class="font-semibold text-habit-text mb-4">Il tuo progresso</h3>

          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-habit-text-muted">Completamento</span>
              <span class="text-habit-text font-medium"
                >{{ progressPercent }}%</span
              >
            </div>
            <div class="h-3 bg-habit-bg-light rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="
                  progressPercent === 100 ? 'bg-green-500' : 'bg-habit-orange'
                "
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="text-center p-3 bg-habit-bg-light rounded-xl">
              <div class="text-xl font-bold text-habit-text">
                {{ completedModules }}
              </div>
              <div class="text-habit-text-subtle text-xs">Completati</div>
            </div>
            <div class="text-center p-3 bg-habit-bg-light rounded-xl">
              <div class="text-xl font-bold text-habit-text">
                {{ totalModules - completedModules }}
              </div>
              <div class="text-habit-text-subtle text-xs">Rimanenti</div>
            </div>
          </div>

          <!-- Completamento -->
          <div
            v-if="progressPercent === 100"
            class="mt-4 p-3 bg-green-500/10 rounded-xl text-center"
          >
            <div class="text-2xl mb-1">🎉</div>
            <p class="text-green-400 font-semibold text-sm">
              Corso completato!
            </p>
            <p class="text-habit-text-muted text-xs mt-1">
              Hai completato tutti i moduli
            </p>
          </div>
        </div>

        <!-- Azioni Trainer -->
        <div v-if="isTrainer" class="card-dark p-4">
          <h3 class="font-semibold text-habit-text mb-3 text-sm">
            Azioni Trainer
          </h3>
          <div class="space-y-2">
            <button
              @click="router.push({ name: 'Videos' })"
              class="btn-ghost btn-sm w-full text-left flex items-center gap-2"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Modifica dalla libreria
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
