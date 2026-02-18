<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useVideoStore } from "@/store/video";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

const __toast = useToast();

const store = useVideoStore();
const auth = useAuthStore();
const router = useRouter();

const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as string),
);

// Tab attiva: 'videos' | 'courses'
const activeTab = ref("videos");

// Filtri
const searchQuery = ref("");
const videoTypeFilter = ref("");
const difficultyFilter = ref("");

// Modali
const showCreateVideoModal = ref(false);
const showCreateCourseModal = ref(false);
const showVideoDetailModal = ref(false);
const showEditVideoModal = ref(false);
const showEditCourseModal = ref(false);
const showDeleteConfirm = ref(false);
const deleteTarget = ref<any>(null);

// Form nuovo video
const newVideo = ref({
  title: "",
  description: "",
  filePath: "",
  thumbnailPath: "",
  durationSeconds: null,
  videoType: "exercise_demo",
  isPublic: false,
  price: 0,
});

// Form nuovo corso
const newCourse = ref({
  title: "",
  description: "",
  thumbnailUrl: "",
  price: 0,
  salePrice: null,
  difficulty: "intermediate",
  category: "",
  durationTotalMin: null,
  isPublished: false,
});

// Form edit
const editVideoData = ref<Record<string, any>>({});
const editCourseData = ref<Record<string, any>>({});

// Config tipi video
const videoTypeConfig: Record<string, any> = {
  exercise_demo: {
    label: "Demo Esercizio",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    icon: "🏋️",
  },
  course_content: {
    label: "Contenuto Corso",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    icon: "📚",
  },
  free_content: {
    label: "Contenuto Gratuito",
    color: "text-green-400",
    bg: "bg-green-500/20",
    icon: "🎁",
  },
};

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

const getVideoType = (t: any) =>
  videoTypeConfig[t] || videoTypeConfig.exercise_demo;
const getDifficulty = (d: any) =>
  difficultyConfig[d] || difficultyConfig.intermediate;

const formatDuration = (seconds: any) => {
  if (!seconds) return "-";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
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

// Handlers
const loadVideos = (page = 1) => {
  store.fetchVideos({
    page,
    videoType: videoTypeFilter.value || undefined,
    search: searchQuery.value || undefined,
  });
};

const loadCourses = (page = 1) => {
  store.fetchCourses({
    page,
    difficulty: difficultyFilter.value || undefined,
    search: searchQuery.value || undefined,
  });
};

const handleTabChange = (tab: any) => {
  activeTab.value = tab;
  searchQuery.value = "";
  videoTypeFilter.value = "";
  difficultyFilter.value = "";
  if (tab === "videos") loadVideos();
  else loadCourses();
};

const handleSearch = () => {
  if (activeTab.value === "videos") loadVideos();
  else loadCourses();
};

const handleVideoTypeFilter = (type: any) => {
  videoTypeFilter.value = type;
  loadVideos();
};

const handleDifficultyFilter = (diff: any) => {
  difficultyFilter.value = diff;
  loadCourses();
};

// CRUD Video
const handleCreateVideo = async () => {
  const result = await store.createVideo(newVideo.value);
  if (result.success) {
    showCreateVideoModal.value = false;
    newVideo.value = {
      title: "",
      description: "",
      filePath: "",
      thumbnailPath: "",
      durationSeconds: null,
      videoType: "exercise_demo",
      isPublic: false,
      price: 0,
    };
    __toast.success("Video creato");
    loadVideos();
  } else {
    __toast.error(result.message || "Errore nella creazione");
  }
};

const openEditVideo = (video: any) => {
  editVideoData.value = {
    id: video.id,
    title: video.title,
    description: video.description || "",
    filePath: video.file_path,
    thumbnailPath: video.thumbnail_path || "",
    durationSeconds: video.duration_seconds,
    videoType: video.video_type,
    isPublic: video.is_public,
    price: video.price || 0,
  };
  showEditVideoModal.value = true;
};

const handleUpdateVideo = async () => {
  const result = await store.updateVideo(
    editVideoData.value.id,
    editVideoData.value,
  );
  if (result.success) {
    showEditVideoModal.value = false;
    __toast.success("Video aggiornato");
    loadVideos();
  } else {
    __toast.error(result.message || "Errore nell'aggiornamento");
  }
};

const openVideoDetail = async (videoId: any) => {
  await store.fetchVideoById(videoId);
  showVideoDetailModal.value = true;
};

// CRUD Corso
const handleCreateCourse = async () => {
  const result = await store.createCourse(newCourse.value);
  if (result.success) {
    showCreateCourseModal.value = false;
    newCourse.value = {
      title: "",
      description: "",
      thumbnailUrl: "",
      price: 0,
      salePrice: null,
      difficulty: "intermediate",
      category: "",
      durationTotalMin: null,
      isPublished: false,
    };
    __toast.success("Corso creato");
    loadCourses();
  } else {
    __toast.error(result.message || "Errore nella creazione");
  }
};

const openEditCourse = (course: any) => {
  editCourseData.value = {
    id: course.id,
    title: course.title,
    description: course.description || "",
    thumbnailUrl: course.thumbnail_url || "",
    price: course.price || 0,
    salePrice: course.sale_price || null,
    difficulty: course.difficulty,
    category: course.category || "",
    durationTotalMin: course.duration_total_min,
    isPublished: course.is_published,
  };
  showEditCourseModal.value = true;
};

const handleUpdateCourse = async () => {
  const result = await store.updateCourse(
    editCourseData.value.id,
    editCourseData.value,
  );
  if (result.success) {
    showEditCourseModal.value = false;
    __toast.success("Corso aggiornato");
    loadCourses();
  } else {
    __toast.error(result.message || "Errore nell'aggiornamento");
  }
};

const goToCourseDetail = (courseId: any) => {
  router.push({ name: "CourseDetail", params: { id: courseId } });
};

// Elimina
const confirmDelete = (type: any, id: any, title: any) => {
  deleteTarget.value = { type, id, title };
  showDeleteConfirm.value = true;
};

const isDeletingVideo = ref(false);

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  isDeletingVideo.value = true;
  const { type, id } = deleteTarget.value;
  let result;
  if (type === "video") {
    result = await store.deleteVideo(id);
    if (result.success) {
      __toast.success("Video eliminato");
      loadVideos();
    }
  } else {
    result = await store.deleteCourse(id);
    if (result.success) {
      __toast.success("Corso eliminato");
      loadCourses();
    }
  }
  if (!result?.success)
    __toast.error(result?.message || "Errore nell'eliminazione");
  isDeletingVideo.value = false;
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
};

onMounted(() => {
  loadVideos();
  if (isTrainer.value) store.fetchStats();
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Video Library
        </h1>
        <p class="text-habit-text-muted text-sm mt-1">
          Gestisci video formativi e corsi per i tuoi clienti
        </p>
      </div>
      <div v-if="isTrainer" class="flex gap-2">
        <button
          @click="showCreateVideoModal = true"
          class="btn-secondary btn-sm flex items-center gap-2"
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
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Nuovo Video
        </button>
        <button
          @click="showCreateCourseModal = true"
          class="btn-primary btn-sm flex items-center gap-2"
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Nuovo Corso
        </button>
      </div>
    </div>

    <!-- Stats Cards (Trainer) -->
    <div
      v-if="isTrainer && store.stats"
      class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
    >
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-text">
          {{ store.stats.videos?.total_videos || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Video Totali</div>
      </div>
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-text">
          {{ store.stats.videos?.total_views || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Visualizzazioni</div>
      </div>
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-text">
          {{ store.stats.courses?.total_courses || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Corsi</div>
      </div>
      <div class="card-dark p-4 text-center">
        <div class="text-2xl font-bold text-habit-orange">
          {{ store.stats.courses?.published_courses || 0 }}
        </div>
        <div class="text-habit-text-subtle text-xs mt-1">Pubblicati</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-habit-bg-light rounded-xl p-1">
      <button
        @click="handleTabChange('videos')"
        class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
        :class="
          activeTab === 'videos'
            ? 'bg-habit-card text-habit-text shadow-sm'
            : 'text-habit-text-muted hover:text-habit-text'
        "
      >
        🎬 Video
      </button>
      <button
        @click="handleTabChange('courses')"
        class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
        :class="
          activeTab === 'courses'
            ? 'bg-habit-card text-habit-text shadow-sm'
            : 'text-habit-text-muted hover:text-habit-text'
        "
      >
        📚 Corsi
      </button>
    </div>

    <!-- Search & Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="flex-1 relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
          @input="handleSearch"
          type="text"
          autocomplete="off"
          :placeholder="
            activeTab === 'videos' ? 'Cerca video...' : 'Cerca corsi...'
          "
          class="input-dark w-full pl-10"
        />
      </div>

      <!-- Video Type Filter -->
      <div v-if="activeTab === 'videos'" class="flex gap-2 flex-wrap">
        <button
          @click="handleVideoTypeFilter('')"
          class="pill text-xs"
          :class="!videoTypeFilter ? 'pill-active' : ''"
        >
          Tutti
        </button>
        <button
          v-for="(config, key) in videoTypeConfig"
          :key="key"
          @click="handleVideoTypeFilter(key)"
          class="pill text-xs"
          :class="videoTypeFilter === key ? 'pill-active' : ''"
        >
          {{ config.icon }} {{ config.label }}
        </button>
      </div>

      <!-- Difficulty Filter -->
      <div v-if="activeTab === 'courses'" class="flex gap-2 flex-wrap">
        <button
          @click="handleDifficultyFilter('')"
          class="pill text-xs"
          :class="!difficultyFilter ? 'pill-active' : ''"
        >
          Tutti
        </button>
        <button
          v-for="(config, key) in difficultyConfig"
          :key="key"
          @click="handleDifficultyFilter(key)"
          class="pill text-xs"
          :class="difficultyFilter === key ? 'pill-active' : ''"
        >
          {{ config.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="card-dark p-4 animate-pulse">
        <div class="flex gap-4">
          <div class="w-32 h-20 bg-habit-skeleton rounded-lg"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-habit-skeleton rounded w-3/4"></div>
            <div class="h-3 bg-habit-skeleton rounded w-1/2"></div>
            <div class="h-3 bg-habit-skeleton rounded w-1/4"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== -->
    <!-- TAB: VIDEO -->
    <!-- ===================== -->
    <div v-else-if="activeTab === 'videos'">
      <!-- Empty State -->
      <div v-if="store.videos.length === 0" class="card-dark p-12 text-center">
        <div class="text-5xl mb-4">🎬</div>
        <h3 class="text-lg font-semibold text-habit-text mb-2">
          Nessun video presente
        </h3>
        <p class="text-habit-text-muted text-sm mb-6">
          Carica il tuo primo video per iniziare la libreria
        </p>
        <button
          v-if="isTrainer"
          @click="showCreateVideoModal = true"
          class="btn-primary btn-sm"
        >
          Carica Video
        </button>
      </div>

      <!-- Video Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="video in store.videos"
          :key="video.id"
          class="card-dark overflow-hidden group cursor-pointer hover:border-habit-orange/30 transition-all"
          @click="openVideoDetail(video.id)"
        >
          <!-- Thumbnail -->
          <div
            class="relative h-40 bg-habit-bg-light flex items-center justify-center"
          >
            <img
              v-if="video.thumbnail_path"
              :src="video.thumbnail_path"
              :alt="video.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="text-4xl">🎬</div>
            <!-- Overlay Play -->
            <div
              class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div
                class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                  />
                </svg>
              </div>
            </div>
            <!-- Duration Badge -->
            <div
              v-if="video.duration_seconds"
              class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded"
            >
              {{ formatDuration(video.duration_seconds) }}
            </div>
            <!-- Type Badge -->
            <div class="absolute top-2 left-2">
              <span
                :class="[
                  getVideoType(video.video_type).bg,
                  getVideoType(video.video_type).color,
                ]"
                class="text-xs px-2 py-0.5 rounded-full"
              >
                {{ getVideoType(video.video_type).icon }}
                {{ getVideoType(video.video_type).label }}
              </span>
            </div>
          </div>

          <!-- Info -->
          <div class="p-4">
            <h3 class="font-semibold text-habit-text mb-1 line-clamp-1">
              {{ video.title }}
            </h3>
            <p
              v-if="video.description"
              class="text-habit-text-muted text-sm mb-3 line-clamp-2"
            >
              {{ video.description }}
            </p>

            <div
              class="flex items-center justify-between text-xs text-habit-text-subtle"
            >
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  {{ video.views_count || 0 }}
                </span>
                <span>{{ formatDate(video.created_at) }}</span>
              </div>
              <span
                class="font-medium"
                :class="
                  video.price > 0 ? 'text-habit-orange' : 'text-green-400'
                "
              >
                {{ formatPrice(video.price) }}
              </span>
            </div>

            <!-- Trainer Actions -->
            <div
              v-if="isTrainer"
              class="flex gap-2 mt-3 pt-3 border-t border-habit-border"
              @click.stop
            >
              <button
                @click="openEditVideo(video)"
                class="btn-ghost btn-sm flex-1 text-xs"
              >
                Modifica
              </button>
              <button
                @click="confirmDelete('video', video.id, video.title)"
                class="btn-ghost btn-sm flex-1 text-xs text-red-400 hover:text-red-300"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Paginazione -->
      <div
        v-if="store.videosPagination.totalPages > 1"
        class="flex justify-center gap-2 mt-6"
      >
        <button
          v-for="page in store.videosPagination.totalPages"
          :key="page"
          @click="loadVideos(page)"
          class="w-8 h-8 rounded-lg text-sm font-medium transition-all"
          :class="
            page === store.videosPagination.page
              ? 'bg-habit-orange text-white'
              : 'bg-habit-bg-light text-habit-text-muted hover:text-habit-text'
          "
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- ===================== -->
    <!-- TAB: CORSI -->
    <!-- ===================== -->
    <div v-else-if="activeTab === 'courses'">
      <!-- Empty State -->
      <div v-if="store.courses.length === 0" class="card-dark p-12 text-center">
        <div class="text-5xl mb-4">📚</div>
        <h3 class="text-lg font-semibold text-habit-text mb-2">
          Nessun corso presente
        </h3>
        <p class="text-habit-text-muted text-sm mb-6">
          Crea il tuo primo corso per offrire formazione strutturata
        </p>
        <button
          v-if="isTrainer"
          @click="showCreateCourseModal = true"
          class="btn-primary btn-sm"
        >
          Crea Corso
        </button>
      </div>

      <!-- Course Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="course in store.courses"
          :key="course.id"
          class="card-dark overflow-hidden group cursor-pointer hover:border-habit-orange/30 transition-all"
          @click="goToCourseDetail(course.id)"
        >
          <!-- Thumbnail -->
          <div
            class="relative h-40 bg-habit-bg-light flex items-center justify-center"
          >
            <img
              v-if="course.thumbnail_url"
              :src="course.thumbnail_url"
              :alt="course.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="text-4xl">📚</div>
            <!-- Published Badge -->
            <div class="absolute top-2 right-2">
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="
                  course.is_published
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                "
              >
                {{ course.is_published ? "Pubblicato" : "Bozza" }}
              </span>
            </div>
            <!-- Difficulty Badge -->
            <div class="absolute top-2 left-2">
              <span
                :class="[
                  getDifficulty(course.difficulty).bg,
                  getDifficulty(course.difficulty).color,
                ]"
                class="text-xs px-2 py-0.5 rounded-full"
              >
                {{ getDifficulty(course.difficulty).label }}
              </span>
            </div>
          </div>

          <!-- Info -->
          <div class="p-4">
            <h3 class="font-semibold text-habit-text mb-1 line-clamp-1">
              {{ course.title }}
            </h3>
            <p
              v-if="course.description"
              class="text-habit-text-muted text-sm mb-3 line-clamp-2"
            >
              {{ course.description }}
            </p>

            <div
              class="flex items-center justify-between text-xs text-habit-text-subtle mb-3"
            >
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  {{ course.modules_count || 0 }} moduli
                </span>
                <span v-if="course.duration_total_min"
                  >{{ course.duration_total_min }} min</span
                >
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="course.sale_price"
                  class="line-through text-habit-text-subtle"
                  >€{{ parseFloat(course.price).toFixed(2) }}</span
                >
                <span
                  class="font-medium"
                  :class="
                    (course.sale_price || course.price) > 0
                      ? 'text-habit-orange'
                      : 'text-green-400'
                  "
                >
                  {{ formatPrice(course.sale_price || course.price) }}
                </span>
              </div>
            </div>

            <div v-if="course.category" class="mb-3">
              <span
                class="text-xs bg-habit-bg-light text-habit-text-muted px-2 py-1 rounded-full"
                >{{ course.category }}</span
              >
            </div>

            <!-- Trainer Actions -->
            <div
              v-if="isTrainer"
              class="flex gap-2 pt-3 border-t border-habit-border"
              @click.stop
            >
              <button
                @click="openEditCourse(course)"
                class="btn-ghost btn-sm flex-1 text-xs"
              >
                Modifica
              </button>
              <button
                @click="confirmDelete('course', course.id, course.title)"
                class="btn-ghost btn-sm flex-1 text-xs text-red-400 hover:text-red-300"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Paginazione -->
      <div
        v-if="store.coursesPagination.totalPages > 1"
        class="flex justify-center gap-2 mt-6"
      >
        <button
          v-for="page in store.coursesPagination.totalPages"
          :key="page"
          @click="loadCourses(page)"
          class="w-8 h-8 rounded-lg text-sm font-medium transition-all"
          :class="
            page === store.coursesPagination.page
              ? 'bg-habit-orange text-white'
              : 'bg-habit-bg-light text-habit-text-muted hover:text-habit-text'
          "
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- ===================== -->
    <!-- MODALE: CREA VIDEO -->
    <!-- ===================== -->
    <div
      v-if="showCreateVideoModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60"
        @click="showCreateVideoModal = false"
      ></div>
      <div
        class="relative card-dark p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-habit-text">Nuovo Video</h2>
          <button
            @click="showCreateVideoModal = false"
            class="text-habit-text-muted hover:text-habit-text"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <div class="space-y-4">
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Titolo *</label
            >
            <input
              v-model="newVideo.title"
              type="text"
              class="input-dark w-full"
              placeholder="Nome del video"
            />
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Descrizione</label
            >
            <textarea
              v-model="newVideo.description"
              rows="3"
              class="input-dark w-full"
              placeholder="Descrizione del video"
            ></textarea>
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >URL File Video *</label
            >
            <input
              v-model="newVideo.filePath"
              type="text"
              class="input-dark w-full"
              placeholder="https://... o percorso file"
            />
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >URL Thumbnail</label
            >
            <input
              v-model="newVideo.thumbnailPath"
              type="text"
              class="input-dark w-full"
              placeholder="URL immagine di anteprima"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Durata (secondi)</label
              >
              <input
                v-model.number="newVideo.durationSeconds"
                type="number"
                class="input-dark w-full"
                placeholder="120"
              />
            </div>
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Tipo</label
              >
              <select v-model="newVideo.videoType" class="input-dark w-full">
                <option value="exercise_demo">Demo Esercizio</option>
                <option value="course_content">Contenuto Corso</option>
                <option value="free_content">Contenuto Gratuito</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Prezzo (€)</label
              >
              <input
                v-model.number="newVideo.price"
                type="number"
                step="0.01"
                class="input-dark w-full"
                placeholder="0.00"
              />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="newVideo.isPublic"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-orange focus:ring-habit-orange"
                />
                <span class="text-habit-text-muted text-sm"
                  >Video pubblico</span
                >
              </label>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showCreateVideoModal = false"
            class="btn-secondary btn-sm flex-1"
          >
            Annulla
          </button>
          <button
            @click="handleCreateVideo"
            class="btn-primary btn-sm flex-1"
            :disabled="!newVideo.title || !newVideo.filePath"
          >
            Crea Video
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== -->
    <!-- MODALE: CREA CORSO -->
    <!-- ===================== -->
    <div
      v-if="showCreateCourseModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60"
        @click="showCreateCourseModal = false"
      ></div>
      <div
        class="relative card-dark p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-habit-text">Nuovo Corso</h2>
          <button
            @click="showCreateCourseModal = false"
            class="text-habit-text-muted hover:text-habit-text"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <div class="space-y-4">
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Titolo *</label
            >
            <input
              v-model="newCourse.title"
              type="text"
              class="input-dark w-full"
              placeholder="Nome del corso"
            />
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Descrizione</label
            >
            <textarea
              v-model="newCourse.description"
              rows="3"
              class="input-dark w-full"
              placeholder="Descrizione del corso"
            ></textarea>
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >URL Thumbnail</label
            >
            <input
              v-model="newCourse.thumbnailUrl"
              type="text"
              class="input-dark w-full"
              placeholder="URL immagine di copertina"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Difficoltà</label
              >
              <select v-model="newCourse.difficulty" class="input-dark w-full">
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzato</option>
              </select>
            </div>
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Categoria</label
              >
              <input
                v-model="newCourse.category"
                type="text"
                class="input-dark w-full"
                placeholder="Es. Fitness, Yoga"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Prezzo (€) *</label
              >
              <input
                v-model.number="newCourse.price"
                type="number"
                step="0.01"
                class="input-dark w-full"
                placeholder="29.99"
              />
            </div>
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Prezzo Scontato (€)</label
              >
              <input
                v-model.number="newCourse.salePrice"
                type="number"
                step="0.01"
                class="input-dark w-full"
                placeholder="19.99"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Durata totale (min)</label
              >
              <input
                v-model.number="newCourse.durationTotalMin"
                type="number"
                class="input-dark w-full"
                placeholder="120"
              />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="newCourse.isPublished"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-orange focus:ring-habit-orange"
                />
                <span class="text-habit-text-muted text-sm"
                  >Pubblica subito</span
                >
              </label>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showCreateCourseModal = false"
            class="btn-secondary btn-sm flex-1"
          >
            Annulla
          </button>
          <button
            @click="handleCreateCourse"
            class="btn-primary btn-sm flex-1"
            :disabled="!newCourse.title"
          >
            Crea Corso
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== -->
    <!-- MODALE: EDIT VIDEO -->
    <!-- ===================== -->
    <div
      v-if="showEditVideoModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60"
        @click="showEditVideoModal = false"
      ></div>
      <div
        class="relative card-dark p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-habit-text">Modifica Video</h2>
          <button
            @click="showEditVideoModal = false"
            class="text-habit-text-muted hover:text-habit-text"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <div class="space-y-4">
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Titolo</label
            >
            <input
              v-model="editVideoData.title"
              type="text"
              class="input-dark w-full"
            />
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Descrizione</label
            >
            <textarea
              v-model="editVideoData.description"
              rows="3"
              class="input-dark w-full"
            ></textarea>
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >URL File Video</label
            >
            <input
              v-model="editVideoData.filePath"
              type="text"
              class="input-dark w-full"
            />
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >URL Thumbnail</label
            >
            <input
              v-model="editVideoData.thumbnailPath"
              type="text"
              class="input-dark w-full"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Durata (secondi)</label
              >
              <input
                v-model.number="editVideoData.durationSeconds"
                type="number"
                class="input-dark w-full"
              />
            </div>
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Tipo</label
              >
              <select
                v-model="editVideoData.videoType"
                class="input-dark w-full"
              >
                <option value="exercise_demo">Demo Esercizio</option>
                <option value="course_content">Contenuto Corso</option>
                <option value="free_content">Contenuto Gratuito</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Prezzo (€)</label
              >
              <input
                v-model.number="editVideoData.price"
                type="number"
                step="0.01"
                class="input-dark w-full"
              />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="editVideoData.isPublic"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-orange focus:ring-habit-orange"
                />
                <span class="text-habit-text-muted text-sm"
                  >Video pubblico</span
                >
              </label>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showEditVideoModal = false"
            class="btn-secondary btn-sm flex-1"
          >
            Annulla
          </button>
          <button @click="handleUpdateVideo" class="btn-primary btn-sm flex-1">
            Salva Modifiche
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== -->
    <!-- MODALE: EDIT CORSO -->
    <!-- ===================== -->
    <div
      v-if="showEditCourseModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60"
        @click="showEditCourseModal = false"
      ></div>
      <div
        class="relative card-dark p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-habit-text">Modifica Corso</h2>
          <button
            @click="showEditCourseModal = false"
            class="text-habit-text-muted hover:text-habit-text"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <div class="space-y-4">
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Titolo</label
            >
            <input
              v-model="editCourseData.title"
              type="text"
              class="input-dark w-full"
            />
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >Descrizione</label
            >
            <textarea
              v-model="editCourseData.description"
              rows="3"
              class="input-dark w-full"
            ></textarea>
          </div>
          <div>
            <label class="block text-habit-text-muted text-sm mb-1"
              >URL Thumbnail</label
            >
            <input
              v-model="editCourseData.thumbnailUrl"
              type="text"
              class="input-dark w-full"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Difficoltà</label
              >
              <select
                v-model="editCourseData.difficulty"
                class="input-dark w-full"
              >
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzato</option>
              </select>
            </div>
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Categoria</label
              >
              <input
                v-model="editCourseData.category"
                type="text"
                class="input-dark w-full"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Prezzo (€)</label
              >
              <input
                v-model.number="editCourseData.price"
                type="number"
                step="0.01"
                class="input-dark w-full"
              />
            </div>
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Prezzo Scontato (€)</label
              >
              <input
                v-model.number="editCourseData.salePrice"
                type="number"
                step="0.01"
                class="input-dark w-full"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-habit-text-muted text-sm mb-1"
                >Durata totale (min)</label
              >
              <input
                v-model.number="editCourseData.durationTotalMin"
                type="number"
                class="input-dark w-full"
              />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="editCourseData.isPublished"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-orange focus:ring-habit-orange"
                />
                <span class="text-habit-text-muted text-sm">Pubblicato</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showEditCourseModal = false"
            class="btn-secondary btn-sm flex-1"
          >
            Annulla
          </button>
          <button @click="handleUpdateCourse" class="btn-primary btn-sm flex-1">
            Salva Modifiche
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== -->
    <!-- MODALE: DETTAGLIO VIDEO -->
    <!-- ===================== -->
    <div
      v-if="showVideoDetailModal && store.currentVideo"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60"
        @click="showVideoDetailModal = false"
      ></div>
      <div
        class="relative card-dark p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-habit-text">
            {{ store.currentVideo.title }}
          </h2>
          <button
            @click="showVideoDetailModal = false"
            class="text-habit-text-muted hover:text-habit-text"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        <!-- Video Player Placeholder -->
        <div
          class="relative h-64 md:h-80 bg-habit-bg-light rounded-xl flex items-center justify-center mb-4 overflow-hidden"
        >
          <img
            v-if="store.currentVideo.thumbnail_path"
            :src="store.currentVideo.thumbnail_path"
            :alt="store.currentVideo.title"
            class="w-full h-full object-cover"
          />
          <div
            class="absolute inset-0 bg-black/30 flex items-center justify-center"
          >
            <div
              class="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all"
            >
              <svg
                class="w-8 h-8 text-white ml-1"
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

        <!-- Info -->
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <span
              :class="[
                getVideoType(store.currentVideo.video_type).bg,
                getVideoType(store.currentVideo.video_type).color,
              ]"
              class="text-xs px-2 py-1 rounded-full"
            >
              {{ getVideoType(store.currentVideo.video_type).icon }}
              {{ getVideoType(store.currentVideo.video_type).label }}
            </span>
            <span
              v-if="store.currentVideo.is_public"
              class="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400"
              >Pubblico</span
            >
            <span
              v-if="store.currentVideo.duration_seconds"
              class="text-xs px-2 py-1 rounded-full bg-habit-bg-light text-habit-text-muted"
            >
              {{ formatDuration(store.currentVideo.duration_seconds) }}
            </span>
          </div>

          <p
            v-if="store.currentVideo.description"
            class="text-habit-text-muted text-sm"
          >
            {{ store.currentVideo.description }}
          </p>

          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-habit-border"
          >
            <div class="text-center">
              <div class="text-lg font-bold text-habit-text">
                {{ store.currentVideo.views_count || 0 }}
              </div>
              <div class="text-habit-text-subtle text-xs">Visualizzazioni</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-habit-orange">
                {{ formatPrice(store.currentVideo.price) }}
              </div>
              <div class="text-habit-text-subtle text-xs">Prezzo</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-medium text-habit-text">
                {{ store.currentVideo.creator_first_name }}
                {{ store.currentVideo.creator_last_name }}
              </div>
              <div class="text-habit-text-subtle text-xs">Creato da</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-medium text-habit-text">
                {{ formatDate(store.currentVideo.created_at) }}
              </div>
              <div class="text-habit-text-subtle text-xs">Data</div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showVideoDetailModal = false"
            class="btn-secondary btn-sm flex-1"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Conferma Eliminazione"
      :message="
        'Sei sicuro di voler eliminare ' +
        (deleteTarget?.title || 'questo elemento') +
        '? Questa azione non puo\' essere annullata.'
      "
      confirmText="Elimina"
      variant="danger"
      :loading="isDeletingVideo"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
