<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useCommunityStore } from "@/store/community";
import { useAuthStore } from "@/store/auth";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

const community = useCommunityStore() as any;
const auth = useAuthStore();
const toast = useToast();

const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as string),
);

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
const deleteTarget = ref<any>(null);
const isDeleting = ref(false);

// Form
const newPost = ref({ content: "", postType: "announcement" });
const newComment = ref("");
const selectedImage = ref<any>(null);
const imagePreview = ref<any>(null);
const imageInput = ref<any>(null);

// Gestione immagine
const handleImageSelect = (event: any) => {
  const file = (event.target as any).files[0];
  if (!file) return;
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
const handleCreatePost = async () => {
  if (!newPost.value.content.trim()) return;
  const result = await community.createPost(newPost.value, selectedImage.value);
  if (result.success) {
    showCreateModal.value = false;
    newPost.value = { content: "", postType: "announcement" };
    removeImage();
    toast.success("Post pubblicato con successo");
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
const confirmDeletePost = (post: any) => {
  deleteTarget.value = { type: "post", id: post.id, label: "questo post" };
  showDeleteModal.value = true;
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
  <div class="p-4 md:p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Community</h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Condividi, motiva e interagisci con il tuo team
        </p>
      </div>
      <button
        @click="showCreateModal = true"
        class="bg-habit-cyan text-habit-bg px-4 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition flex items-center gap-2"
      >
        <span class="text-lg">+</span> Nuovo Post
      </button>
    </div>

    <!-- Filtri tipo -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button
        v-for="type in postTypes"
        :key="type.value"
        @click="community.setFilterType(type.value)"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition',
          community.filterType === type.value
            ? 'bg-habit-cyan text-habit-bg'
            : 'bg-habit-card text-habit-text-subtle hover:text-habit-text border border-habit-border',
        ]"
      >
        <span v-if="type.icon" class="mr-1">{{ type.icon }}</span>
        {{ type.label }}
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="community.loading && community.posts.length === 0"
      class="space-y-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="bg-habit-card rounded-habit p-6 animate-pulse"
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
      class="bg-habit-card rounded-habit p-12 text-center"
    >
      <div class="text-4xl mb-3">💬</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">Nessun post</h3>
      <p class="text-habit-text-subtle text-sm mb-4">
        Sii il primo a pubblicare qualcosa nella community!
      </p>
      <button
        @click="showCreateModal = true"
        class="bg-habit-cyan text-habit-bg px-4 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition"
      >
        Crea il primo post
      </button>
    </div>

    <!-- Feed Post -->
    <div v-else class="space-y-4">
      <div
        v-for="post in community.posts"
        :key="post.id"
        :class="[
          'bg-habit-card rounded-habit border transition hover:border-habit-border',
          post.is_pinned ? 'border-habit-cyan/30' : 'border-habit-border',
        ]"
      >
        <!-- Pin badge -->
        <div
          v-if="post.is_pinned"
          class="px-4 pt-3 flex items-center gap-1 text-habit-cyan text-xs font-medium"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M10 2a1 1 0 011 1v1.323l3.954 1.582a1 1 0 01.588.978V9a1 1 0 01-.293.707L12 13l1 7-3-2-3 2 1-7-3.249-3.293A1 1 0 014 9V6.883a1 1 0 01.588-.978L8.542 4.323V3a1 1 0 011-1h.458z"
            />
          </svg>
          Fissato in alto
        </div>

        <div class="p-4">
          <!-- Autore & Meta -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-sm"
              >
                {{ (post.author_first_name || "?")[0]
                }}{{ (post.author_last_name || "?")[0] }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-habit-text text-sm">
                    {{ post.author_first_name }} {{ post.author_last_name }}
                  </span>
                  <span
                    v-if="
                      post.author_role === 'tenant_owner' ||
                      post.author_role === 'staff'
                    "
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-habit-cyan/20 text-habit-cyan uppercase"
                  >
                    Trainer
                  </span>
                </div>
                <span class="text-xs text-habit-text-subtle">{{
                  formatDate(post.created_at)
                }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <!-- Post type badge -->
              <span
                :class="[
                  getPostType(post.post_type).bg,
                  getPostType(post.post_type).color,
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                ]"
              >
                {{ getPostType(post.post_type).icon }}
                {{ getPostType(post.post_type).label }}
              </span>
              <!-- Pin button (trainer+) -->
              <button
                v-if="isTrainer"
                @click.stop="handleTogglePin(post.id)"
                :class="[
                  'text-xs p-1 rounded transition',
                  post.is_pinned
                    ? 'text-habit-cyan'
                    : 'text-habit-text-subtle hover:text-habit-text-muted',
                ]"
                :title="post.is_pinned ? 'Rimuovi pin' : 'Fissa in alto'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M10 2a1 1 0 011 1v1.323l3.954 1.582a1 1 0 01.588.978V9a1 1 0 01-.293.707L12 13l1 7-3-2-3 2 1-7-3.249-3.293A1 1 0 014 9V6.883a1 1 0 01.588-.978L8.542 4.323V3a1 1 0 011-1h.458z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Contenuto -->
          <p
            class="text-habit-text-muted text-sm whitespace-pre-wrap mb-4 leading-relaxed"
          >
            {{ post.content }}
          </p>

          <!-- Immagine allegata -->
          <div v-if="getPostImages(post).length" class="mb-4">
            <img
              v-for="(img, idx) in getPostImages(post)"
              :key="idx"
              :src="img.url"
              :alt="img.originalName || 'Immagine post'"
              class="w-full max-h-96 object-cover rounded-lg border border-habit-border cursor-pointer hover:opacity-90 transition"
              @click="openDetail(post.id)"
            />
          </div>

          <!-- Azioni -->
          <div
            class="flex items-center gap-4 pt-3 border-t border-habit-border"
          >
            <!-- Like -->
            <button
              @click="toggleLike(post)"
              :class="[
                'flex items-center gap-1.5 text-sm transition',
                post.user_liked
                  ? 'text-red-400'
                  : 'text-habit-text-subtle hover:text-red-400',
              ]"
            >
              <svg
                class="w-4 h-4"
                :fill="post.user_liked ? 'currentColor' : 'none'"
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
              <span>{{ post.likes_count || 0 }}</span>
            </button>

            <!-- Commenti -->
            <button
              @click="openDetail(post.id)"
              class="flex items-center gap-1.5 text-sm text-habit-text-subtle hover:text-habit-cyan transition"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>{{ post.comments_count || 0 }}</span>
            </button>

            <!-- Elimina (trainer+) -->
            <button
              v-if="isTrainer"
              @click="confirmDeletePost(post)"
              class="ml-auto text-xs text-habit-text-subtle hover:text-red-400 transition"
            >
              Elimina
            </button>
          </div>
        </div>
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
        class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
      >
        Prec
      </button>
      <span class="text-sm text-habit-text-subtle">
        {{ community.pagination.page }} / {{ community.pagination.totalPages }}
      </span>
      <button
        @click="community.goToPage(community.pagination.page + 1)"
        :disabled="community.pagination.page >= community.pagination.totalPages"
        class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
      >
        Succ
      </button>
    </div>

    <!-- Modale Crea Post -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showCreateModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <div
            class="p-4 border-b border-habit-border flex justify-between items-center"
          >
            <h3 class="text-lg font-semibold text-habit-text">Nuovo Post</h3>
            <button
              @click="showCreateModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>
          <div class="p-4 space-y-4">
            <!-- Tipo post -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-2"
                >Tipo</label
              >
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="type in postTypes.filter((t) => t.value)"
                  :key="type.value"
                  @click="newPost.postType = type.value"
                  :class="[
                    'px-3 py-1.5 rounded-full text-xs font-medium transition border',
                    newPost.postType === type.value
                      ? type.bg + ' ' + type.color + ' border-current'
                      : 'bg-habit-bg text-habit-text-subtle border-habit-border hover:text-habit-text',
                  ]"
                >
                  {{ type.icon }} {{ type.label }}
                </button>
              </div>
            </div>

            <!-- Contenuto -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Contenuto</label
              >
              <textarea
                v-model="newPost.content"
                rows="5"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none resize-none"
                placeholder="Scrivi qualcosa per la community..."
              ></textarea>
            </div>

            <!-- Upload Immagine -->
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-2"
                >Immagine (opzionale)</label
              >
              <div v-if="!imagePreview" class="flex items-center gap-3">
                <label
                  class="flex items-center gap-2 px-4 py-2 bg-habit-bg border border-habit-border rounded-habit text-sm text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan cursor-pointer transition"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  Carica immagine
                  <input
                    ref="imageInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="hidden"
                    @change="handleImageSelect"
                  />
                </label>
                <span class="text-xs text-habit-text-subtle"
                  >JPG, PNG, WebP, GIF (max 10MB)</span
                >
              </div>
              <div v-else class="relative">
                <img
                  :src="imagePreview"
                  alt="Anteprima"
                  class="w-full max-h-48 object-cover rounded-lg border border-habit-border"
                />
                <button
                  @click="removeImage"
                  type="button"
                  class="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-lg text-sm font-bold"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
          <div class="p-4 border-t border-habit-border flex justify-end gap-2">
            <button
              @click="showCreateModal = false"
              class="px-4 py-2 rounded-habit text-sm text-habit-text-subtle hover:text-habit-text transition"
            >
              Annulla
            </button>
            <button
              @click="handleCreatePost"
              :disabled="!newPost.content.trim()"
              class="bg-habit-cyan text-habit-bg px-4 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              Pubblica
            </button>
          </div>
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
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-lg max-h-[85vh] flex flex-col"
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
                class="flex-1 bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                placeholder="Scrivi un commento..."
                @keyup.enter="handleAddComment"
              />
              <button
                @click="handleAddComment"
                :disabled="!newComment.trim()"
                class="bg-habit-cyan text-habit-bg px-4 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
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
      title="Conferma eliminazione"
      message="Sei sicuro? Questa azione non puo essere annullata."
      confirmText="Elimina"
      variant="danger"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
