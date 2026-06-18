<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useCommunityStore } from "@/store/community";
import { useAuthStore } from "@/store/auth";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import PostCard from "@/components/community/PostCard.vue";
import BrowseByTabs from "@/components/community/BrowseByTabs.vue";
import PostFiltersSheet from "@/components/community/PostFiltersSheet.vue";
import PostCategoryPicker from "@/components/community/PostCategoryPicker.vue";
import PostComposer from "@/components/community/PostComposer.vue";
import PostReportModal from "@/components/community/PostReportModal.vue";
import type { VisibilityType } from "@/services/community-moderation.service";

const community = useCommunityStore() as any;
const auth = useAuthStore();
const toast = useToast();

// Array-aware (ruolo primario + roles[] V2 mappati): coerente con backend e router,
// così un gym_admin/community_moderator (definito in roles[]) vede gli strumenti di moderazione.
const isTrainer = computed(() => auth.canModerate);

// Fase 5: Report modal state
const showReportModal = ref(false);
const reportTargetPostId = ref<number>(0);
const openReport = (postId: number) => {
  reportTargetPostId.value = postId;
  showReportModal.value = true;
};
const onReported = () => {
  toast.success("Segnalazione inviata. Grazie!");
};

// Post types con colori
const postTypes = [
  { value: "", label: "Tutti" },
  {
    value: "announcement",
    label: "Annunci",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    icon: "📢",
  },
  {
    value: "tip",
    label: "Consigli",
    color: "text-green-400",
    bg: "bg-green-500/20",
    icon: "💡",
  },
  {
    value: "motivation",
    label: "Motivazione",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    icon: "🔥",
  },
  {
    value: "achievement",
    label: "Traguardi",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    icon: "🏆",
  },
  {
    value: "question",
    label: "Domande",
    color: "text-cyan-400",
    bg: "bg-cyan-500/20",
    icon: "❓",
  },
];

const getPostType = (value: any) =>
  postTypes.find((t) => t.value === value) || postTypes[1];

// Modali
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showDeleteModal = ref(false);
const showFiltersSheet = ref(false);
const deleteTarget = ref<any>(null);
const isDeleting = ref(false);

// Form (Fase 5: visibilityType per scope per-trainer)
const newPost = ref<{ content: string; postType: string; visibilityType: VisibilityType }>({
  content: "",
  postType: "announcement",
  visibilityType: "global",
});
const newComment = ref("");
const selectedImage = ref<any>(null);
const imagePreview = ref<any>(null);
const imageInput = ref<any>(null);

const removeImage = () => {
  selectedImage.value = null;
  imagePreview.value = null;
  if (imageInput.value) imageInput.value.value = "";
};

// Helper per estrarre immagini dagli attachments
const getPostImages = (post: any) => {
  if (!post.attachments) return [];
  try {
    const att =
      typeof post.attachments === "string"
        ? JSON.parse(post.attachments)
        : post.attachments;
    return Array.isArray(att) ? att.filter((a) => a.type === "image") : [];
  } catch {
    return [];
  }
};

// Crea post
const showSuccessModal = ref(false);
const createStep = ref<"category" | "compose">("category");
const creatingPost = ref(false);

const onComposerImage = (file: File) => {
  if (file.size > 10 * 1024 * 1024) {
    toast.error("Immagine troppo grande (max 10MB)");
    return;
  }
  selectedImage.value = file;
  const reader = new FileReader();
  reader.onload = (e: any) => {
    imagePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const openCreateWizard = () => {
  createStep.value = "category";
  newPost.value = { content: "", postType: "announcement", visibilityType: "global" };
  removeImage();
  showCreateModal.value = true;
};

const closeCreateWizard = () => {
  showCreateModal.value = false;
  createStep.value = "category";
  newPost.value = { content: "", postType: "announcement", visibilityType: "global" };
  removeImage();
};

const handleCreatePost = async () => {
  if (!newPost.value.content.trim() || creatingPost.value) return;
  creatingPost.value = true;
  const result = await community.createPost(newPost.value, selectedImage.value);
  creatingPost.value = false;
  if (result.success) {
    closeCreateWizard();
    showSuccessModal.value = true;
  } else {
    toast.error(
      (result as any).error || "Errore durante la pubblicazione del post",
    );
  }
};

// Apri dettaglio
const openDetail = async (postId: any) => {
  await community.fetchPostById(postId);
  newComment.value = "";
  showDetailModal.value = true;
};

// Like/Unlike
const toggleLike = async (post: any) => {
  if (post.user_liked) {
    await community.unlikePost(post.id);
  } else {
    await community.likePost(post.id);
  }
};

// Save/Unsave
const toggleSave = async (post: any) => {
  if (post.user_saved) {
    await community.unsavePost(post.id);
  } else {
    await community.savePost(post.id);
  }
};

// Commenta
const handleAddComment = async () => {
  if (!newComment.value.trim() || !community.currentPost) return;
  const result = await community.addComment(community.currentPost.id, {
    content: newComment.value,
  });
  if (result.success) {
    newComment.value = "";
    toast.success("Commento aggiunto");
  } else {
    toast.error(
      (result as any).error || "Errore durante l'aggiunta del commento",
    );
  }
};

// Elimina post
const confirmDeletePostById = (postId: number) => {
  deleteTarget.value = { type: "post", id: postId, label: "questo post" };
  showDeleteModal.value = true;
};

// Popup menu PostCard
const menuOpenForId = ref<number | null>(null);
const menuPosition = ref({ top: 0, left: 0 });
const menuPostAuthorId = ref<number | null>(null);
const menuPostIsPinned = ref(false);
const openPostMenu = (post: any, target: HTMLElement) => {
  const rect = target.getBoundingClientRect();
  menuPosition.value = {
    top: rect.bottom + 4,
    left: Math.max(8, rect.right - 170),
  };
  menuPostAuthorId.value = post.author_id ?? null;
  menuPostIsPinned.value = !!post.is_pinned;
  menuOpenForId.value = post.id;
};

// Elimina commento
const confirmDeleteComment = (comment: any) => {
  deleteTarget.value = {
    type: "comment",
    id: comment.id,
    label: "questo commento",
  };
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    if (deleteTarget.value.type === "post") {
      await community.deletePost(deleteTarget.value.id);
      showDetailModal.value = false;
      toast.success("Post eliminato con successo");
    } else {
      await community.deleteComment(deleteTarget.value.id);
      toast.success("Commento eliminato con successo");
    }
  } catch (err: any) {
    toast.error("Errore durante l'eliminazione");
  }
  isDeleting.value = false;
  showDeleteModal.value = false;
  deleteTarget.value = null;
};

// Pin
const handleTogglePin = async (postId: any) => {
  await community.togglePin(postId);
};

// Formattazione
const formatDate = (dateStr: any) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Adesso";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} giorni fa`;
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

onMounted(() => {
  community.initialize();
});
</script>

<template>
  <div class="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto overflow-x-hidden">
    <!-- Header -->
    <div
      class="flex flex-row justify-between items-center gap-3 mb-4 sm:mb-6"
    >
      <div class="min-w-0 flex-1">
        <h1 class="text-lg sm:text-2xl font-bold text-habit-text truncate">Community</h1>
        <p class="hidden sm:block text-sm text-habit-text-subtle mt-1">
          Condividi, motiva e interagisci con il tuo team
        </p>
      </div>
      <div class="shrink-0 flex items-center gap-2">
        <router-link
          v-if="isTrainer"
          to="/community/moderation"
          title="Moderazione community"
          class="shrink-0 bg-habit-card border border-white/10 text-habit-text-muted hover:text-habit-text px-3 py-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="hidden sm:inline">Moderazione</span>
        </router-link>
        <button
          @click="openCreateWizard"
          class="shrink-0 bg-gradient-to-r from-habit-cyan to-blue-600 text-white px-3 py-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-semibold hover:shadow-lg hover:shadow-habit-cyan/30 transition-all flex items-center gap-1.5"
        >
          <span class="text-base sm:text-lg leading-none">+</span>
          <span class="hidden sm:inline">Nuovo Post</span>
          <span class="sm:hidden">Post</span>
        </button>
      </div>
    </div>

    <!-- Browse By chip + sort + filtri trigger -->
    <BrowseByTabs
      :tabs="postTypes"
      :active-value="community.filterType"
      :sort-by="community.sortBy"
      @select="community.setFilterType($event)"
      @toggle-sort="community.setSortBy(community.sortBy === 'trending' ? 'recent' : 'trending')"
      @open-filters="showFiltersSheet = true"
    />

    <!-- BottomSheet filtri (mobile-first) -->
    <PostFiltersSheet
      v-model:open="showFiltersSheet"
      :initial="{ postType: community.filterType, from: community.filterFrom, sortBy: community.sortBy }"
      :categories="postTypes.filter(t => t.value)"
      :total-count="community.pagination.total"
      @apply="community.applyFilters($event)"
      @reset="community.resetFilters()"
    />

    <!-- Loading -->
    <div
      v-if="community.loading && community.posts.length === 0"
      class="space-y-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="bg-habit-card border border-white/10 rounded-3xl p-6 animate-pulse"
      >
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-habit-skeleton rounded-full"></div>
          <div class="space-y-2">
            <div class="h-4 w-32 bg-habit-skeleton rounded"></div>
            <div class="h-3 w-20 bg-habit-skeleton rounded"></div>
          </div>
        </div>
        <div class="h-4 w-full bg-habit-skeleton rounded mb-2"></div>
        <div class="h-4 w-2/3 bg-habit-skeleton rounded"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!community.loading && community.posts.length === 0"
      class="bg-habit-card border border-white/10 rounded-3xl p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
    >
      <div class="text-4xl mb-3">💬</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">Nessun post</h3>
      <p class="text-habit-text-subtle text-sm mb-4">
        Sii il primo a pubblicare qualcosa nella community!
      </p>
      <button
        @click="openCreateWizard"
        class="bg-gradient-to-r from-habit-cyan to-blue-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-habit-cyan/30 transition-all"
      >
        Crea il primo post
      </button>
    </div>

    <!-- Feed Post -->
    <div v-else class="space-y-4">
      <PostCard
        v-for="post in community.posts"
        :key="post.id"
        :post="post"
        @like="toggleLike"
        @comment="openDetail($event.id)"
        @open="openDetail($event.id)"
        @save="toggleSave"
        @menu="openPostMenu"
      />
    </div>

    <!-- Popup menu post -->
    <div
      v-if="menuOpenForId"
      class="fixed inset-0 z-40"
      @click="menuOpenForId = null"
    >
      <div
        class="absolute bg-habit-card border border-habit-border rounded-xl shadow-lg py-1 min-w-[160px]"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        @click.stop
      >
        <button
          v-if="isTrainer"
          @click="
            handleTogglePin(menuOpenForId);
            menuOpenForId = null;
          "
          class="block w-full text-left px-4 py-2 text-sm text-habit-text hover:bg-habit-bg-light"
        >
          {{ menuPostIsPinned ? "Rimuovi pin" : "Fissa in alto" }}
        </button>
        <button
          v-if="
            menuOpenForId &&
            (isTrainer || auth.user?.id === menuPostAuthorId)
          "
          @click="
            confirmDeletePostById(menuOpenForId);
            menuOpenForId = null;
          "
          class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-habit-bg-light"
        >
          Elimina post
        </button>
        <button
          v-if="auth.user?.id !== menuPostAuthorId"
          @click="
            openReport(menuOpenForId);
            menuOpenForId = null;
          "
          class="block w-full text-left px-4 py-2 text-sm text-habit-text hover:bg-habit-bg-light"
        >
          Segnala
        </button>
      </div>
    </div>

    <!-- Paginazione -->
    <div
      v-if="community.pagination.totalPages > 1"
      class="flex justify-center items-center gap-3 mt-6"
    >
      <button
        @click="community.goToPage(community.pagination.page - 1)"
        :disabled="community.pagination.page <= 1"
        class="px-3 py-1.5 rounded-2xl text-sm bg-habit-card border border-white/10 text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition-colors"
      >
        Prec
      </button>
      <span class="text-sm text-habit-text-subtle">
        {{ community.pagination.page }} / {{ community.pagination.totalPages }}
      </span>
      <button
        @click="community.goToPage(community.pagination.page + 1)"
        :disabled="community.pagination.page >= community.pagination.totalPages"
        class="px-3 py-1.5 rounded-2xl text-sm bg-habit-card border border-white/10 text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition-colors"
      >
        Succ
      </button>
    </div>

    <!-- Wizard Crea Post (mockup #3) -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4"
        @click.self="closeCreateWizard"
      >
        <div
          class="bg-habit-card rounded-2xl border border-habit-border w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5"
        >
          <PostCategoryPicker
            v-if="createStep === 'category'"
            v-model="newPost.postType"
            @continue="createStep = 'compose'"
            @cancel="closeCreateWizard"
          />
          <PostComposer
            v-else
            :category="getPostType(newPost.postType).label"
            :content="newPost.content"
            :visibility-type="newPost.visibilityType"
            :image-preview="imagePreview"
            :submitting="creatingPost"
            @update:content="newPost.content = $event"
            @update:visibility-type="newPost.visibilityType = $event"
            @select-image="onComposerImage"
            @remove-image="removeImage"
            @back="createStep = 'category'"
            @submit="handleCreatePost"
          />
        </div>
      </div>
    </Teleport>

    <!-- Modale Dettaglio Post -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && community.currentPost"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showDetailModal = false"
      >
        <div
          class="bg-habit-card rounded-3xl border border-white/10 w-full max-w-lg max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
        >
          <!-- Header -->
          <div
            class="p-4 border-b border-habit-border flex justify-between items-center shrink-0"
          >
            <h3 class="text-lg font-semibold text-habit-text">Post</h3>
            <button
              @click="showDetailModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>

          <!-- Contenuto scrollabile -->
          <div class="overflow-y-auto flex-1 p-4 space-y-4">
            <!-- Post -->
            <div>
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-10 h-10 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-sm"
                >
                  {{ (community.currentPost.author_first_name || "?")[0]
                  }}{{ (community.currentPost.author_last_name || "?")[0] }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-habit-text text-sm">
                      {{ community.currentPost.author_first_name }}
                      {{ community.currentPost.author_last_name }}
                    </span>
                    <span
                      :class="[
                        getPostType(community.currentPost.post_type).bg,
                        getPostType(community.currentPost.post_type).color,
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                      ]"
                    >
                      {{ getPostType(community.currentPost.post_type).icon }}
                      {{ getPostType(community.currentPost.post_type).label }}
                    </span>
                  </div>
                  <span class="text-xs text-habit-text-subtle">{{
                    formatDate(community.currentPost.created_at)
                  }}</span>
                </div>
              </div>
              <p
                class="text-habit-text-muted text-sm whitespace-pre-wrap leading-relaxed"
              >
                {{ community.currentPost.content }}
              </p>

              <!-- Immagine allegata nel dettaglio -->
              <div
                v-if="getPostImages(community.currentPost).length"
                class="mt-3"
              >
                <img
                  v-for="(img, idx) in getPostImages(community.currentPost)"
                  :key="idx"
                  :src="img.url"
                  :alt="img.originalName || 'Immagine post'"
                  class="w-full max-h-[500px] object-contain rounded-lg border border-habit-border"
                />
              </div>

              <!-- Like nel dettaglio -->
              <div
                class="flex items-center gap-4 mt-3 pt-3 border-t border-habit-border"
              >
                <button
                  @click="toggleLike(community.currentPost)"
                  :class="[
                    'flex items-center gap-1.5 text-sm transition',
                    community.currentPost.user_liked
                      ? 'text-red-400'
                      : 'text-habit-text-subtle hover:text-red-400',
                  ]"
                >
                  <svg
                    class="w-4 h-4"
                    :fill="
                      community.currentPost.user_liked ? 'currentColor' : 'none'
                    "
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span
                    >{{ community.currentPost.likes_count || 0 }} Mi piace</span
                  >
                </button>
                <span class="text-sm text-habit-text-subtle">
                  {{ community.currentPost.comments_count || 0 }} commenti
                </span>
              </div>
            </div>

            <!-- Commenti -->
            <div>
              <h4 class="text-sm font-semibold text-habit-text mb-3">
                Commenti
              </h4>

              <div
                v-if="
                  !community.currentPost.comments ||
                  community.currentPost.comments.length === 0
                "
                class="text-center py-4 text-habit-text-subtle text-sm"
              >
                Nessun commento. Sii il primo!
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="comment in community.currentPost.comments"
                  :key="comment.id"
                  class="bg-habit-bg rounded-lg p-3"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2 mb-1">
                      <div
                        class="w-6 h-6 rounded-full bg-habit-skeleton flex items-center justify-center text-habit-text font-bold text-[10px]"
                      >
                        {{ (comment.author_first_name || "?")[0]
                        }}{{ (comment.author_last_name || "?")[0] }}
                      </div>
                      <span class="text-xs font-semibold text-habit-text">
                        {{ comment.author_first_name }}
                        {{ comment.author_last_name }}
                      </span>
                      <span class="text-[10px] text-habit-text-subtle">{{
                        formatDate(comment.created_at)
                      }}</span>
                    </div>
                    <button
                      v-if="comment.author_id === auth.user?.id || isTrainer"
                      @click="confirmDeleteComment(comment)"
                      class="text-habit-text-subtle hover:text-red-400 transition text-xs"
                    >
                      &times;
                    </button>
                  </div>
                  <p class="text-habit-text-muted text-sm ml-8">
                    {{ comment.content }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Input commento -->
          <div class="p-4 border-t border-habit-border shrink-0">
            <div class="flex gap-2">
              <input
                v-model="newComment"
                type="text"
                class="flex-1 bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-cyan/60 focus:ring-2 focus:ring-habit-cyan/20 outline-none transition-all"
                placeholder="Scrivi un commento..."
                @keyup.enter="handleAddComment"
              />
              <button
                @click="handleAddComment"
                :disabled="!newComment.trim()"
                class="bg-gradient-to-r from-habit-cyan to-blue-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-habit-cyan/30 transition-all disabled:opacity-50"
              >
                Invia
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modale Conferma Elimina -->
    <ConfirmDialog
      :open="showDeleteModal"
      title="Eliminare il post?"
      message="Sei sicuro di voler eliminare questo post? L'operazione non puo essere annullata."
      confirm-text="Sì, elimina"
      cancel-text="No, annulla"
      variant="danger"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Modale Success Post -->
    <ConfirmDialog
      :open="showSuccessModal"
      title="Post pubblicato!"
      message="Il tuo post è online. Vuoi dare un'occhiata adesso?"
      confirm-text="Vedi il mio post"
      variant="success"
      hide-cancel
      @confirm="showSuccessModal = false"
      @cancel="showSuccessModal = false"
    />

    <!-- Modale Segnala Post (Fase 5) -->
    <PostReportModal
      :visible="showReportModal"
      :post-id="reportTargetPostId"
      @close="showReportModal = false"
      @reported="onReported"
    />
  </div>
</template>
