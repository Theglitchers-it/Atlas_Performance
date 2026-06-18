<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import Avatar from "@/components/ui/Avatar.vue";
import {
  HeartIcon as HeartOutline,
  ChatBubbleOvalLeftIcon,
  BookmarkIcon as BookmarkOutline,
  EllipsisHorizontalIcon,
  EyeIcon,
} from "@heroicons/vue/24/outline";
import {
  HeartIcon as HeartSolid,
  BookmarkIcon as BookmarkSolid,
} from "@heroicons/vue/24/solid";

interface PostAttachment {
  type: string;
  url: string;
  originalName?: string;
}

interface Post {
  id: number;
  author_id?: number;
  author_first_name?: string | null;
  author_last_name?: string | null;
  author_role?: string | null;
  author_avatar_url?: string | null;
  content?: string;
  post_type?: string;
  attachments?: PostAttachment[] | string | null;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  user_liked?: boolean;
  user_saved?: boolean;
  is_pinned?: boolean;
  visibility_type?: string;
  created_at?: string;
}

interface Props {
  post: Post;
  showMenu?: boolean;
  saveable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showMenu: true,
  saveable: true,
});

const emit = defineEmits<{
  (e: "like", post: Post): void;
  (e: "comment", post: Post): void;
  (e: "save", post: Post): void;
  (e: "menu", post: Post, target: HTMLElement): void;
  (e: "open", post: Post): void;
}>();

const router = useRouter();

const fullName = computed(
  () => `${props.post.author_first_name || ""} ${props.post.author_last_name || ""}`.trim() || "Utente",
);

const isVerified = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(props.post.author_role || ""),
);

const timeAgo = computed(() => {
  if (!props.post.created_at) return "";
  const d = new Date(props.post.created_at);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ora";
  if (min < 60) return `${min}m fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}g fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
});

const attachments = computed<PostAttachment[]>(() => {
  const raw = props.post.attachments;
  if (!raw) return [];
  try {
    const list = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list.filter((a) => a?.type === "image") : [];
  } catch {
    return [];
  }
});

const gridClass = computed(() => {
  const n = attachments.value.length;
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  return "grid-cols-2 grid-rows-2";
});

const aspectClass = computed(() => {
  const n = attachments.value.length;
  if (n === 1) return "aspect-[16/10]";
  if (n === 2) return "aspect-[4/3]";
  return "aspect-square";
});

const contentHtml = computed(() => {
  const text = props.post.content || "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /#([\p{L}\p{N}_]+)/gu,
    '<span class="text-habit-orange font-medium">#$1</span>',
  );
});

const goToProfile = () => {
  if (props.post.author_id) {
    router.push(`/community/users/${props.post.author_id}`);
  }
};

const onMenu = (e: MouseEvent) => {
  emit("menu", props.post, e.currentTarget as HTMLElement);
};
</script>

<template>
  <article
    :class="[
      'bg-habit-card rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden',
      post.is_pinned ? 'border-habit-orange/40' : 'border-habit-border',
    ]"
  >
    <!-- Pin badge -->
    <div
      v-if="post.is_pinned"
      class="px-4 pt-3 flex items-center gap-1.5 text-habit-orange text-xs font-semibold"
    >
      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582a1 1 0 01.588.978V9a1 1 0 01-.293.707L12 13l1 7-3-2-3 2 1-7-3.249-3.293A1 1 0 014 9V6.883a1 1 0 01.588-.978L8.542 4.323V3a1 1 0 011-1h.458z" />
      </svg>
      In evidenza
    </div>

    <div class="p-3 sm:p-4">
      <!-- Header autore -->
      <header class="flex items-start justify-between gap-3 mb-3 min-w-0">
        <button
          type="button"
          class="flex items-start gap-3 min-w-0 flex-1 text-left"
          @click="goToProfile"
        >
          <Avatar
            :src="post.author_avatar_url"
            :first-name="post.author_first_name"
            :last-name="post.author_last_name"
            :verified="isVerified"
            size="md"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-semibold text-habit-text text-sm truncate">{{ fullName }}</span>
            </div>
            <span class="text-xs text-habit-text-subtle">Pubblicato {{ timeAgo }}</span>
          </div>
        </button>
        <button
          v-if="showMenu"
          type="button"
          @click="onMenu"
          class="p-1 rounded-lg text-habit-text-subtle hover:text-habit-text hover:bg-habit-bg-light transition-colors"
          aria-label="Apri menu post"
        >
          <EllipsisHorizontalIcon class="w-5 h-5" />
        </button>
      </header>

      <!-- Contenuto con hashtag highlight -->
      <p
        v-if="post.content"
        class="text-habit-text text-sm whitespace-pre-wrap leading-relaxed mb-3"
        v-html="contentHtml"
      ></p>

      <!-- Gallery / immagini -->
      <div
        v-if="attachments.length"
        :class="['grid gap-1 mb-3 rounded-xl overflow-hidden', gridClass]"
      >
        <button
          v-for="(img, idx) in attachments.slice(0, 4)"
          :key="idx"
          type="button"
          @click="emit('open', post)"
          :class="[
            'relative bg-habit-bg-light',
            attachments.length === 3 && idx === 0 ? 'row-span-2' : '',
          ]"
        >
          <img
            :src="img.url"
            :alt="img.originalName || 'Immagine post'"
            :class="['w-full h-full object-cover', aspectClass]"
            loading="lazy"
          />
          <span
            v-if="idx === 3 && attachments.length > 4"
            class="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xl font-bold"
          >
            +{{ attachments.length - 4 }}
          </span>
        </button>
      </div>

      <!-- Footer azioni stile mockup -->
      <footer class="flex items-center gap-3 sm:gap-4 text-xs flex-wrap">
        <span
          v-if="post.views_count != null"
          class="flex items-center gap-1 text-habit-text-muted"
        >
          <EyeIcon class="w-4 h-4" />
          <span class="font-semibold">{{ (post.views_count || 0).toLocaleString("it-IT") }}</span>
        </span>
        <button
          type="button"
          @click="emit('like', post)"
          :class="[
            'flex items-center gap-1 transition-colors',
            post.user_liked ? 'text-red-500' : 'text-habit-text-muted hover:text-red-500',
          ]"
          :aria-pressed="post.user_liked"
        >
          <HeartSolid v-if="post.user_liked" class="w-4 h-4 text-red-500" />
          <HeartOutline v-else class="w-4 h-4" />
          <span class="font-semibold">{{ (post.likes_count || 0).toLocaleString("it-IT") }}</span>
        </button>
        <button
          type="button"
          @click="emit('comment', post)"
          class="flex items-center gap-1 text-habit-text-muted hover:text-habit-orange transition-colors"
        >
          <ChatBubbleOvalLeftIcon class="w-4 h-4" />
          <span class="font-semibold">{{ (post.comments_count || 0).toLocaleString("it-IT") }}</span>
        </button>
        <button
          v-if="saveable"
          type="button"
          @click="emit('save', post)"
          :class="[
            'ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
            post.user_saved
              ? 'bg-habit-orange text-white'
              : 'bg-habit-bg-light text-habit-text hover:bg-habit-text hover:text-habit-card',
          ]"
          :aria-pressed="post.user_saved"
        >
          <BookmarkSolid v-if="post.user_saved" class="w-3.5 h-3.5" />
          <BookmarkOutline v-else class="w-3.5 h-3.5" />
          {{ post.user_saved ? 'Salvato' : 'Salva' }}
        </button>
      </footer>
    </div>
  </article>
</template>
