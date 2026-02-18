<script setup lang="ts">
import {} from "vue";

interface Post {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  is_liked: boolean;
  likes_count: number;
  comments_count: number;
  [key: string]: unknown;
}

interface Props {
  post: Post;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "like", post: Post): void;
  (e: "comment", post: Post): void;
  (e: "click", post: Post): void;
}>();

const timeAgo = (date: string): string => {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000,
  );

  const intervals = {
    anno: 31536000,
    mese: 2592000,
    settimana: 604800,
    giorno: 86400,
    ora: 3600,
    minuto: 60,
  };

  for (const [name, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return interval === 1 ? `1 ${name} fa` : `${interval} ${name}i fa`;
    }
  }

  return "Adesso";
};

const handleLike = (): void => {
  emit("like", props.post);
};

const handleComment = (): void => {
  emit("comment", props.post);
};

const handleClick = (): void => {
  emit("click", props.post);
};

const formatCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};
</script>

<template>
  <article
    class="bg-habit-card rounded-xl p-6 border border-habit-border hover:border-habit-orange transition-all hover:shadow-lg cursor-pointer"
    @click="handleClick"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 bg-gradient-to-br from-habit-orange to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-lg"
        >
          {{ post.author_name.charAt(0).toUpperCase() }}
        </div>
        <div>
          <h3 class="font-semibold text-habit-text">{{ post.author_name }}</h3>
          <p class="text-sm text-habit-text-subtle">
            {{ timeAgo(post.created_at) }}
          </p>
        </div>
      </div>

      <button
        aria-label="Altre opzioni"
        class="w-8 h-8 flex items-center justify-center hover:bg-habit-card-hover rounded-full transition-colors"
        @click.stop
      >
        <svg
          class="w-5 h-5 text-habit-text-subtle"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
          />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="mb-4">
      <p class="text-habit-text-muted whitespace-pre-wrap leading-relaxed">
        {{ post.content }}
      </p>
    </div>

    <!-- Actions -->
    <div
      class="flex items-center gap-3 sm:gap-6 pt-4 border-t border-habit-border"
    >
      <button
        @click.stop="handleLike"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-habit-card-hover',
          post.is_liked
            ? 'text-red-500'
            : 'text-habit-text-muted hover:text-red-500',
        ]"
      >
        <svg
          :class="[
            'w-5 h-5 transition-transform',
            post.is_liked ? 'scale-110' : '',
          ]"
          :fill="post.is_liked ? 'currentColor' : 'none'"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span class="text-sm font-medium">
          {{
            post.likes_count > 0 ? formatCount(post.likes_count) : "Mi piace"
          }}
        </span>
      </button>

      <button
        @click.stop="handleComment"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-habit-text-muted hover:text-habit-cyan hover:bg-habit-card-hover transition-all"
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span class="text-sm font-medium">
          {{
            post.comments_count > 0
              ? formatCount(post.comments_count)
              : "Commenta"
          }}
        </span>
      </button>

      <button
        @click.stop
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-habit-text-muted hover:text-habit-orange hover:bg-habit-card-hover transition-all ml-auto"
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
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span class="text-sm font-medium">Condividi</span>
      </button>
    </div>
  </article>
</template>
