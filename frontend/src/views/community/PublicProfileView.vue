<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useCommunityStore } from "@/store/community";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import Avatar from "@/components/ui/Avatar.vue";
import PostCard from "@/components/community/PostCard.vue";
import {
  ArrowLeftIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";

interface PublicProfile {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl: string | null;
    bio: string | null;
    city: string | null;
    isVerified: boolean;
  };
  stats: { posts: number; followers: number; following: number };
  isFollowing: boolean;
  isSelf: boolean;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const community = useCommunityStore() as any;
const toast = useToast();

const profile = ref<PublicProfile | null>(null);
const loading = ref(true);
const followBusy = ref(false);
const activeTab = ref<"all" | "posts" | "videos">("all");
const userPosts = ref<any[]>([]);
const postsLoading = ref(false);

const userId = computed(() => parseInt(route.params.id as string, 10));

const fetchProfile = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/users/${userId.value}/profile`);
    profile.value = res.data.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      toast.error("Profilo non trovato");
      router.push("/community");
    } else {
      toast.error("Errore nel caricamento del profilo");
    }
  } finally {
    loading.value = false;
  }
};

const fetchUserPosts = async () => {
  postsLoading.value = true;
  try {
    const res = await api.get("/community/posts", {
      params: { authorId: userId.value, limit: 20 },
    });
    userPosts.value = res.data.data.posts || [];
  } catch {
    userPosts.value = [];
  } finally {
    postsLoading.value = false;
  }
};

const toggleFollow = async () => {
  if (!profile.value || profile.value.isSelf || followBusy.value) return;
  followBusy.value = true;
  try {
    if (profile.value.isFollowing) {
      const res = await api.delete(`/users/${userId.value}/follow`);
      profile.value.isFollowing = false;
      profile.value.stats.followers = res.data.data.followers;
    } else {
      const res = await api.post(`/users/${userId.value}/follow`);
      profile.value.isFollowing = true;
      profile.value.stats.followers = res.data.data.followers;
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Operazione fallita");
  } finally {
    followBusy.value = false;
  }
};

const onPostLike = async (post: any) => {
  if (post.user_liked) {
    await community.unlikePost(post.id);
  } else {
    await community.likePost(post.id);
  }
  fetchUserPosts();
};

const onPostSave = async (post: any) => {
  if (post.user_saved) {
    await community.unsavePost(post.id);
  } else {
    await community.savePost(post.id);
  }
};

const onMessage = () => {
  router.push(`/chat?to=${userId.value}`);
};

// Edit profile state
const showEditModal = ref(false);
const editForm = ref({ firstName: "", lastName: "", bio: "", city: "" });
const editSaving = ref(false);

const openEdit = () => {
  if (!profile.value) return;
  editForm.value = {
    firstName: profile.value.user.firstName || "",
    lastName: profile.value.user.lastName || "",
    bio: profile.value.user.bio || "",
    city: profile.value.user.city || "",
  };
  showEditModal.value = true;
};

const saveEdit = async () => {
  if (editSaving.value) return;
  editSaving.value = true;
  try {
    await api.put("/users/me/profile", editForm.value);
    toast.success("Profilo aggiornato");
    showEditModal.value = false;
    fetchProfile();
    if (auth.user) {
      (auth.user as any).firstName = editForm.value.firstName;
      (auth.user as any).lastName = editForm.value.lastName;
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore aggiornamento profilo");
  } finally {
    editSaving.value = false;
  }
};

watch(userId, () => {
  fetchProfile();
  fetchUserPosts();
});

onMounted(() => {
  fetchProfile();
  fetchUserPosts();
});
</script>

<template>
  <div class="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto">
    <!-- Back button -->
    <div class="mb-4">
      <button
        type="button"
        @click="router.back()"
        class="flex items-center gap-1 text-sm text-habit-text-muted hover:text-habit-text transition-colors"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Indietro
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="card-dark p-6 flex flex-col items-center animate-pulse">
        <div class="w-24 h-24 rounded-full bg-habit-skeleton mb-3"></div>
        <div class="h-5 w-40 bg-habit-skeleton rounded mb-2"></div>
        <div class="h-4 w-32 bg-habit-skeleton rounded"></div>
      </div>
    </div>

    <!-- Profile -->
    <div v-else-if="profile" class="card-dark p-6 mb-6">
      <div class="flex flex-col items-center text-center">
        <Avatar
          :src="profile.user.avatarUrl"
          :first-name="profile.user.firstName"
          :last-name="profile.user.lastName"
          :verified="profile.user.isVerified"
          size="2xl"
          ring
        />
        <h1 class="text-xl font-bold text-habit-text mt-3 flex items-center gap-1.5">
          {{ profile.user.firstName }} {{ profile.user.lastName }}
        </h1>

        <!-- Follow + Message (per altri utenti) -->
        <div v-if="!profile.isSelf" class="flex gap-2 mt-3">
          <button
            type="button"
            @click="toggleFollow"
            :disabled="followBusy"
            :class="[
              'px-5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 min-w-[110px] justify-center',
              profile.isFollowing
                ? 'bg-habit-bg-light text-habit-text border border-habit-border'
                : 'bg-habit-orange text-white',
            ]"
          >
            <span v-if="!profile.isFollowing">+</span>
            {{ profile.isFollowing ? "Seguito" : "Segui" }}
          </button>
          <button
            type="button"
            @click="onMessage"
            class="px-5 py-2 rounded-xl text-sm font-medium bg-habit-bg-light text-habit-text border border-habit-border flex items-center gap-1.5"
          >
            <ChatBubbleLeftRightIcon class="w-4 h-4" />
            Messaggio
          </button>
        </div>

        <!-- Modifica profilo (self) -->
        <div v-else class="mt-3">
          <button
            type="button"
            @click="openEdit"
            class="px-5 py-2 rounded-xl text-sm font-semibold bg-habit-bg-light text-habit-text border border-habit-border flex items-center gap-1.5"
          >
            <PencilSquareIcon class="w-4 h-4" />
            Modifica profilo
          </button>
        </div>

        <!-- Meta row: city + counters -->
        <div class="flex items-center gap-4 mt-4 text-xs text-habit-text-muted flex-wrap justify-center">
          <span v-if="profile.user.city" class="flex items-center gap-1">
            <MapPinIcon class="w-3.5 h-3.5" />
            {{ profile.user.city }}
          </span>
          <span><strong class="text-habit-text">{{ profile.stats.following }}</strong> Seguiti</span>
          <span><strong class="text-habit-text">{{ profile.stats.followers }}</strong> Follower</span>
          <span><strong class="text-habit-text">{{ profile.stats.posts }}</strong> Post</span>
        </div>

        <!-- Bio -->
        <p
          v-if="profile.user.bio"
          class="text-sm text-habit-text-muted mt-4 leading-relaxed max-w-md whitespace-pre-wrap"
        >
          {{ profile.user.bio }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="profile" class="flex gap-2 mb-4 border-b border-habit-border">
      <button
        v-for="tab in [
          { value: 'all', label: 'Tutto' },
          { value: 'posts', label: 'Post' },
          { value: 'videos', label: 'Video' },
        ]"
        :key="tab.value"
        type="button"
        @click="activeTab = tab.value as 'all' | 'posts' | 'videos'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === tab.value
            ? 'border-habit-orange text-habit-text'
            : 'border-transparent text-habit-text-muted hover:text-habit-text',
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Videos: empty state (no video support yet) -->
    <div v-if="profile && activeTab === 'videos'" class="card-dark p-12 text-center">
      <p class="text-sm text-habit-text-muted">
        I video saranno disponibili presto.
      </p>
    </div>

    <!-- Posts list -->
    <div v-else-if="profile" class="space-y-4">
      <div v-if="postsLoading" class="card-dark p-6 animate-pulse">
        <div class="h-4 w-1/3 bg-habit-skeleton rounded mb-2"></div>
        <div class="h-4 w-full bg-habit-skeleton rounded"></div>
      </div>
      <div
        v-else-if="userPosts.length === 0"
        class="card-dark p-12 text-center"
      >
        <p class="text-sm text-habit-text-muted">
          Nessun post pubblicato.
        </p>
      </div>
      <PostCard
        v-for="post in userPosts"
        :key="post.id"
        :post="post"
        :show-menu="false"
        @like="onPostLike"
        @save="onPostSave"
        @comment="router.push(`/community?post=${post.id}`)"
        @open="router.push(`/community?post=${post.id}`)"
      />
    </div>

    <!-- Modale Modifica Profilo -->
    <Teleport to="body">
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-habit-card rounded-2xl border border-habit-border w-full max-w-md p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-habit-text">Modifica profilo</h3>
            <button
              type="button"
              @click="showEditModal = false"
              class="p-1 rounded-lg text-habit-text-subtle hover:text-habit-text hover:bg-habit-bg-light transition-colors"
              aria-label="Chiudi"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-habit-text mb-1 uppercase tracking-wide">
              Nome
            </label>
            <input
              v-model="editForm.firstName"
              type="text"
              maxlength="100"
              class="w-full px-4 py-2.5 bg-habit-bg-light border-0 rounded-xl text-habit-text text-sm focus:ring-2 focus:ring-habit-orange/50"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-habit-text mb-1 uppercase tracking-wide">
              Cognome
            </label>
            <input
              v-model="editForm.lastName"
              type="text"
              maxlength="100"
              class="w-full px-4 py-2.5 bg-habit-bg-light border-0 rounded-xl text-habit-text text-sm focus:ring-2 focus:ring-habit-orange/50"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-habit-text mb-1 uppercase tracking-wide">
              Città
            </label>
            <input
              v-model="editForm.city"
              type="text"
              maxlength="120"
              placeholder="es. Olbia"
              class="w-full px-4 py-2.5 bg-habit-bg-light border-0 rounded-xl text-habit-text text-sm focus:ring-2 focus:ring-habit-orange/50"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-habit-text mb-1 uppercase tracking-wide">
              Bio
            </label>
            <textarea
              v-model="editForm.bio"
              rows="4"
              maxlength="1000"
              placeholder="Raccontaci qualcosa di te..."
              class="w-full px-4 py-2.5 bg-habit-bg-light border-0 rounded-xl text-habit-text text-sm focus:ring-2 focus:ring-habit-orange/50 resize-none"
            ></textarea>
            <p class="text-xs text-habit-text-subtle mt-1 text-right">
              {{ editForm.bio.length }}/1000
            </p>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              @click="showEditModal = false"
              :disabled="editSaving"
              class="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-habit-bg-light text-habit-text-muted"
            >
              Annulla
            </button>
            <button
              type="button"
              @click="saveEdit"
              :disabled="editSaving"
              class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-habit-orange text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {{ editSaving ? "Salvataggio..." : "Salva" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
