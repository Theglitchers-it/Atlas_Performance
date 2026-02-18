<script setup lang="ts">
import { computed } from "vue";

interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  [key: string]: unknown;
}

interface Props {
  comment: Comment;
}

const props = defineProps<Props>();

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

const authorInitial = computed(() => {
  return props.comment.author_name.charAt(0).toUpperCase();
});
</script>

<template>
  <div
    class="flex items-start gap-3 p-4 hover:bg-habit-card-hover rounded-lg transition-colors"
  >
    <!-- Author Avatar -->
    <div
      class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-habit-cyan to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold"
    >
      {{ authorInitial }}
    </div>

    <!-- Comment Content -->
    <div class="flex-1 min-w-0">
      <div class="bg-habit-bg-light rounded-2xl rounded-tl-sm px-4 py-3">
        <h4 class="font-semibold text-habit-text text-sm mb-1">
          {{ comment.author_name }}
        </h4>
        <p
          class="text-habit-text-muted text-sm whitespace-pre-wrap leading-relaxed"
        >
          {{ comment.content }}
        </p>
      </div>

      <!-- Comment Meta -->
      <div class="flex items-center gap-4 mt-2 px-2">
        <span class="text-xs text-habit-text-subtle">
          {{ timeAgo(comment.created_at) }}
        </span>
        <button
          class="text-xs font-medium text-habit-text-subtle hover:text-habit-orange transition-colors"
        >
          Rispondi
        </button>
        <button
          class="text-xs font-medium text-habit-text-subtle hover:text-red-500 transition-colors"
        >
          Mi piace
        </button>
      </div>
    </div>
  </div>
</template>
