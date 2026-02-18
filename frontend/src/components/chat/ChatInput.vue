<script setup lang="ts">
import { ref, computed, watch } from "vue";

const emit = defineEmits<{
  (e: "send", message: string): void;
  (e: "typing", isTyping: boolean): void;
}>();

const message = ref<string>("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isTyping = ref<boolean>(false);
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

const canSend = computed<boolean>(() => message.value.trim().length > 0);

const handleInput = (): void => {
  // Emetti evento typing
  if (!isTyping.value) {
    isTyping.value = true;
    emit("typing", true);
  }

  // Reset del timeout
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping.value = false;
    emit("typing", false);
  }, 1000);

  // Auto-resize della textarea
  adjustTextareaHeight();
};

const adjustTextareaHeight = (): void => {
  const textarea = textareaRef.value;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
  }
};

const handleSend = (): void => {
  const trimmedMessage = message.value.trim();
  if (!trimmedMessage) return;

  emit("send", trimmedMessage);
  message.value = "";
  isTyping.value = false;
  emit("typing", false);

  // Reset altezza textarea
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
  }
};

const handleKeydown = (event: KeyboardEvent): void => {
  // Invia con Enter (senza Shift)
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
};

// Cleanup timeout quando il componente viene distrutto
watch(
  () => isTyping.value,
  () => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  },
);
</script>

<template>
  <div class="bg-habit-card border-t border-habit-surface p-4">
    <div class="flex items-end gap-3">
      <!-- Textarea -->
      <div class="flex-1 relative">
        <textarea
          ref="textareaRef"
          v-model="message"
          @input="handleInput"
          @keydown="handleKeydown"
          placeholder="Scrivi un messaggio..."
          rows="1"
          class="w-full bg-habit-surface text-white placeholder-habit-text-subtle rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-habit-orange transition-all duration-200 max-h-[150px] overflow-y-auto"
        ></textarea>

        <!-- Contatore caratteri (opzionale, mostrato solo quando si avvicina al limite) -->
        <div
          v-if="message.length > 400"
          class="absolute bottom-2 right-2 text-xs"
          :class="
            message.length > 500 ? 'text-red-400' : 'text-habit-text-subtle'
          "
        >
          {{ message.length }}/500
        </div>
      </div>

      <!-- Pulsante Invia -->
      <button
        @click="handleSend"
        :disabled="!canSend"
        :class="[
          'flex-shrink-0',
          'w-12',
          'h-12',
          'rounded-xl',
          'flex',
          'items-center',
          'justify-center',
          'transition-all',
          'duration-200',
          canSend
            ? 'bg-habit-orange hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            : 'bg-habit-surface text-habit-text-subtle cursor-not-allowed',
        ]"
        title="Invia messaggio"
      >
        <svg
          class="w-6 h-6"
          :class="canSend ? 'animate-bounce-subtle' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </div>

    <!-- Suggerimento -->
    <div class="mt-2 text-xs text-habit-text-subtle px-1">
      Premi
      <kbd class="px-1.5 py-0.5 bg-habit-surface rounded text-xs">Enter</kbd>
      per inviare,
      <kbd class="px-1.5 py-0.5 bg-habit-surface rounded text-xs"
        >Shift + Enter</kbd
      >
      per andare a capo
    </div>
  </div>
</template>

<style scoped>
/* Stile per la scrollbar della textarea */
textarea::-webkit-scrollbar {
  width: 6px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Animazione sottile per il pulsante invia */
@keyframes bounce-subtle {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

.animate-bounce-subtle {
  animation: bounce-subtle 2s infinite;
}

/* Stile per kbd */
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
