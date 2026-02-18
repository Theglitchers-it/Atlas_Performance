<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  userName: string;
}>();

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const displayText = computed<string>(
  () => `${props.userName} sta scrivendo...`,
);
</script>

<template>
  <div class="flex justify-start mb-4 animate-fadeIn">
    <div class="flex max-w-[70%] gap-3">
      <!-- Avatar -->
      <div
        class="flex-shrink-0 w-10 h-10 rounded-full bg-habit-cyan flex items-center justify-center text-white font-semibold text-sm"
      >
        {{ getInitials(userName) }}
      </div>

      <!-- Indicatore di digitazione -->
      <div class="flex flex-col items-start">
        <!-- Nome utente -->
        <span class="text-xs text-habit-text-subtle mb-1 px-1">
          {{ userName }}
        </span>

        <!-- Bolla con animazione -->
        <div
          class="bg-habit-surface rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm"
        >
          <div class="flex items-center gap-1.5">
            <div class="flex gap-1">
              <span class="typing-dot bg-habit-text-subtle"></span>
              <span
                class="typing-dot bg-habit-text-subtle animation-delay-200"
              ></span>
              <span
                class="typing-dot bg-habit-text-subtle animation-delay-400"
              ></span>
            </div>
            <span class="text-sm text-habit-text-subtle ml-1">{{
              displayText
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animazione fade in per l'intero componente */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

/* Animazione dei puntini */
@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-400 {
  animation-delay: 0.4s;
}

/* Animazione pulsante alternativa (opzionale) */
@keyframes typing-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
</style>
