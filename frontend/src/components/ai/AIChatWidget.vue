<script setup lang="ts">
import { ref, nextTick } from "vue";

interface ChatMessage {
  id: number;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface Props {
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Chiedi all'AI...",
});

const emit = defineEmits<{
  (e: "sendMessage", message: string): void;
}>();

const isExpanded = ref(false);
const messages = ref<ChatMessage[]>([]);
const inputMessage = ref("");
const messagesContainer = ref<HTMLDivElement | null>(null);
const isTyping = ref(false);

const toggleWidget = (): void => {
  isExpanded.value = !isExpanded.value;
};

const sendMessage = async (): Promise<void> => {
  if (!inputMessage.value.trim()) return;

  const userMessage: ChatMessage = {
    id: Date.now(),
    type: "user",
    content: inputMessage.value,
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  const messageToSend = inputMessage.value;
  inputMessage.value = "";

  await nextTick();
  scrollToBottom();

  emit("sendMessage", messageToSend);

  // Simulate AI typing
  isTyping.value = true;
  setTimeout(() => {
    isTyping.value = false;
  }, 1000);
};

const scrollToBottom = (): void => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Method to add AI response (can be called from parent)
const addAIMessage = (content: string): void => {
  const aiMessage: ChatMessage = {
    id: Date.now(),
    type: "ai",
    content,
    timestamp: new Date(),
  };
  messages.value.push(aiMessage);
  isTyping.value = false;
  nextTick(() => scrollToBottom());
};

// Expose method to parent
defineExpose({ addAIMessage });
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Expanded Chat Window -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isExpanded"
        class="mb-4 w-96 h-[600px] bg-habit-card rounded-2xl shadow-2xl border border-habit-border flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div
          class="bg-gradient-to-r from-habit-orange to-orange-500 p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-white font-semibold">Assistente AI</h3>
              <p class="text-white/80 text-xs">Online</p>
            </div>
          </div>
          <button
            @click="toggleWidget"
            class="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Messages Container -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4 bg-habit-bg-light"
        >
          <!-- Welcome Message -->
          <div v-if="messages.length === 0" class="text-center py-8">
            <div
              class="w-16 h-16 bg-habit-orange/10 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8 text-habit-orange"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h4 class="font-semibold text-habit-text mb-2">
              Ciao! Come posso aiutarti?
            </h4>
            <p class="text-sm text-habit-text-subtle">
              Chiedimi informazioni su allenamenti, nutrizione o qualsiasi altra
              cosa!
            </p>
          </div>

          <!-- Messages -->
          <div
            v-for="message in messages"
            :key="message.id"
            :class="[
              'flex',
              message.type === 'user' ? 'justify-end' : 'justify-start',
            ]"
          >
            <div
              :class="[
                'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
                message.type === 'user'
                  ? 'bg-habit-orange text-white rounded-br-sm'
                  : 'bg-habit-card text-habit-text rounded-bl-sm',
              ]"
            >
              <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
              <span
                :class="[
                  'text-xs mt-1 block',
                  message.type === 'user'
                    ? 'text-white/70'
                    : 'text-habit-text-subtle',
                ]"
              >
                {{ formatTime(message.timestamp) }}
              </span>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex justify-start">
            <div
              class="bg-habit-card rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"
            >
              <div class="flex gap-1">
                <div
                  class="w-2 h-2 bg-habit-text-subtle rounded-full animate-bounce"
                  style="animation-delay: 0ms"
                ></div>
                <div
                  class="w-2 h-2 bg-habit-text-subtle rounded-full animate-bounce"
                  style="animation-delay: 150ms"
                ></div>
                <div
                  class="w-2 h-2 bg-habit-text-subtle rounded-full animate-bounce"
                  style="animation-delay: 300ms"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-habit-card border-t border-habit-border">
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input
              v-model="inputMessage"
              type="text"
              :placeholder="placeholder"
              class="flex-1 px-4 py-3 border border-habit-border bg-habit-bg-light text-habit-text rounded-xl focus:outline-none focus:ring-2 focus:ring-habit-orange focus:border-transparent text-sm"
            />
            <button
              type="submit"
              :disabled="!inputMessage.trim()"
              class="px-6 py-3 bg-habit-orange text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm hover:shadow-md"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </transition>

    <!-- Floating Action Button -->
    <button
      @click="toggleWidget"
      class="w-16 h-16 bg-gradient-to-r from-habit-orange to-orange-500 text-white rounded-full shadow-2xl hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
    >
      <svg
        v-if="!isExpanded"
        class="w-7 h-7 group-hover:scale-110 transition-transform"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      <svg
        v-else
        class="w-7 h-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Notification Badge (optional) -->
    <div
      v-if="!isExpanded && messages.length > 0"
      class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse"
    >
      {{ messages.length }}
    </div>
  </div>
</template>
