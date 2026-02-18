<script setup lang="ts">
import { ref, onBeforeUnmount } from "vue";

interface ProgressPayload {
  currentTime: number;
  progress: number;
}

interface Props {
  src: string;
  poster?: string;
}

withDefaults(defineProps<Props>(), {
  poster: "",
});

const emit = defineEmits<{
  (e: "ended"): void;
  (e: "progress", payload: ProgressPayload): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const showControls = ref(true);
let controlsTimeout: ReturnType<typeof setTimeout> | null = null;

const togglePlay = (): void => {
  if (videoRef.value) {
    if (isPlaying.value) {
      videoRef.value.pause();
    } else {
      videoRef.value.play();
    }
  }
};

const handleTimeUpdate = (): void => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
    const progress = (currentTime.value / duration.value) * 100;
    emit("progress", { currentTime: currentTime.value, progress });
  }
};

const handleLoadedMetadata = (): void => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration;
  }
};

const handleEnded = (): void => {
  isPlaying.value = false;
  emit("ended");
};

const handlePlay = (): void => {
  isPlaying.value = true;
};

const handlePause = (): void => {
  isPlaying.value = false;
};

const seek = (event: MouseEvent): void => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const pos = (event.clientX - rect.left) / rect.width;
  if (videoRef.value) {
    videoRef.value.currentTime = pos * duration.value;
  }
};

const toggleMute = (): void => {
  if (videoRef.value) {
    isMuted.value = !isMuted.value;
    videoRef.value.muted = isMuted.value;
  }
};

const changeVolume = (event: Event): void => {
  const newVolume = parseFloat((event.target as HTMLInputElement).value);
  volume.value = newVolume;
  if (videoRef.value) {
    videoRef.value.volume = newVolume;
    isMuted.value = newVolume === 0;
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const toggleFullscreen = (): void => {
  if (videoRef.value) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.value.requestFullscreen();
    }
  }
};

const handleMouseMove = (): void => {
  showControls.value = true;
  if (controlsTimeout) {
    clearTimeout(controlsTimeout);
  }
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false;
    }
  }, 3000);
};

onBeforeUnmount(() => {
  if (controlsTimeout) {
    clearTimeout(controlsTimeout);
  }
});
</script>

<template>
  <div
    class="relative bg-black rounded-xl overflow-hidden group"
    @mousemove="handleMouseMove"
    @mouseleave="isPlaying && (showControls = false)"
  >
    <video
      ref="videoRef"
      :src="src"
      :poster="poster"
      class="w-full h-full"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @ended="handleEnded"
      @play="handlePlay"
      @pause="handlePause"
      @click="togglePlay"
    ></video>

    <!-- Custom Controls -->
    <div
      :class="[
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
        showControls ? 'opacity-100' : 'opacity-0',
      ]"
    >
      <!-- Progress Bar -->
      <div
        class="w-full h-1 bg-white/30 rounded-full mb-4 cursor-pointer hover:h-2 transition-all"
        @click="seek"
      >
        <div
          class="h-full bg-habit-orange rounded-full transition-all relative"
          :style="{ width: `${(currentTime / duration) * 100}%` }"
        >
          <div
            class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
          ></div>
        </div>
      </div>

      <div class="flex items-center justify-between text-white">
        <div class="flex items-center gap-4">
          <!-- Play/Pause Button -->
          <button
            @click="togglePlay"
            class="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              v-if="!isPlaying"
              class="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>

          <!-- Volume Controls -->
          <div class="flex items-center gap-2">
            <button
              @click="toggleMute"
              class="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
            >
              <svg
                v-if="!isMuted && volume > 0.5"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                />
              </svg>
              <svg
                v-else-if="!isMuted && volume > 0"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7 9v6h4l5 5V4l-5 5H7z" />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                />
              </svg>
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              :value="volume"
              @input="changeVolume"
              class="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <!-- Time Display -->
          <span class="text-sm font-medium">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>
        </div>

        <!-- Fullscreen Button -->
        <button
          @click="toggleFullscreen"
          class="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
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
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Center Play Button (when paused) -->
    <div
      v-if="!isPlaying"
      class="absolute inset-0 flex items-center justify-center"
      @click="togglePlay"
    >
      <div
        class="w-20 h-20 bg-habit-orange rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-2xl"
      >
        <svg
          class="w-10 h-10 text-white ml-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}
</style>
