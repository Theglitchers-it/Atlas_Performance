<script setup lang="ts">
interface VideoData {
  id: number;
  title: string;
  thumbnail_url?: string;
  duration: number;
  is_free: boolean;
  views_count: number;
  [key: string]: unknown;
}

interface Props {
  video: VideoData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "click", video: VideoData): void;
  (e: "buy", video: VideoData): void;
}>();

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatViews = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const handleClick = (): void => {
  emit("click", props.video);
};

const handleBuy = (e: MouseEvent): void => {
  e.stopPropagation();
  emit("buy", props.video);
};
</script>

<template>
  <div
    class="bg-habit-card rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
    @click="handleClick"
  >
    <div class="relative aspect-video bg-gray-900 overflow-hidden">
      <img
        :src="video.thumbnail_url"
        :alt="video.title"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      <!-- Play Icon Overlay -->
      <div
        class="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center"
      >
        <div
          class="w-16 h-16 bg-habit-orange rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
        >
          <svg
            class="w-8 h-8 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      <!-- Duration Badge -->
      <div
        class="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium"
      >
        {{ formatDuration(video.duration) }}
      </div>

      <!-- Free/Premium Badge -->
      <div class="absolute top-2 left-2">
        <span
          v-if="video.is_free"
          class="bg-habit-success text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
        >
          GRATIS
        </span>
        <span
          v-else
          class="bg-gradient-to-r from-habit-orange to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
        >
          PREMIUM
        </span>
      </div>
    </div>

    <div class="p-4">
      <h3
        class="text-lg font-semibold text-habit-text mb-2 line-clamp-2 group-hover:text-habit-orange transition-colors"
      >
        {{ video.title }}
      </h3>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-habit-text-subtle text-sm">
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>{{ formatViews(video.views_count) }} visualizzazioni</span>
        </div>

        <button
          v-if="!video.is_free"
          @click="handleBuy"
          class="px-4 py-2 bg-habit-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm hover:shadow-md"
        >
          Acquista
        </button>
      </div>
    </div>
  </div>
</template>
