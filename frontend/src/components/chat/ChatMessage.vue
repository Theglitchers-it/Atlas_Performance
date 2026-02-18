<script setup lang="ts">
import { computed } from "vue";

interface ChatMessageData {
  content: string;
  sender_name: string;
  created_at: string;
  is_mine: boolean;
  type?: "text" | "image" | "file";
}

const props = defineProps<{
  message: ChatMessageData;
}>();

const messageAlignment = computed<string>(() => {
  return props.message.is_mine ? "justify-end" : "justify-start";
});

const messageBgColor = computed<string>(() => {
  return props.message.is_mine ? "bg-habit-orange" : "bg-habit-surface";
});

const messageTextColor = computed<string>(() => {
  return props.message.is_mine ? "text-white" : "text-white";
});

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    // Oggi: mostra solo l'ora
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffInHours < 48) {
    // Ieri
    return `Ieri ${date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    // Data completa
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};
</script>

<template>
  <div :class="['flex', messageAlignment, 'mb-4', 'animate-fadeIn']">
    <div
      :class="[
        'flex',
        'max-w-[70%]',
        message.is_mine ? 'flex-row-reverse' : 'flex-row',
        'gap-3',
      ]"
    >
      <!-- Avatar -->
      <div
        v-if="!message.is_mine"
        class="flex-shrink-0 w-10 h-10 rounded-full bg-habit-cyan flex items-center justify-center text-white font-semibold text-sm"
      >
        {{ getInitials(message.sender_name) }}
      </div>

      <!-- Messaggio -->
      <div
        :class="[
          'flex',
          'flex-col',
          message.is_mine ? 'items-end' : 'items-start',
        ]"
      >
        <!-- Nome mittente (solo per messaggi non propri) -->
        <span
          v-if="!message.is_mine"
          class="text-xs text-habit-text-subtle mb-1 px-1"
        >
          {{ message.sender_name }}
        </span>

        <!-- Bolla messaggio -->
        <div
          :class="[
            messageBgColor,
            messageTextColor,
            'rounded-2xl',
            'px-4',
            'py-3',
            'shadow-sm',
            message.is_mine ? 'rounded-tr-sm' : 'rounded-tl-sm',
          ]"
        >
          <p class="text-sm whitespace-pre-wrap break-words">
            {{ message.content }}
          </p>
        </div>

        <!-- Timestamp -->
        <span class="text-xs text-habit-text-subtle mt-1 px-1">
          {{ formatTime(message.created_at) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
