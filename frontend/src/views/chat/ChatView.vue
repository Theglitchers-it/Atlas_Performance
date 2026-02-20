<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { useNative } from "@/composables/useNative";
import { useToast } from "vue-toastification";

const route = useRoute();
const router = useRouter();
const chat = useChatStore();
const auth = useAuthStore();
const { isMobile } = useNative();
const toast = useToast();

const currentUserId = computed(() => auth.user?.id);

// Input messaggio
const messageInput = ref("");
const messagesContainer = ref<any>(null);
const showNewConversationModal = ref(false);
const selectedUserId = ref("");
const searchQuery = ref("");
const typingTimeout = ref<any>(null);

// Mobile: mostra/nascondi sidebar
const showSidebar = ref(true);

const roleLabels: Record<string, string> = {
  tenant_owner: "Trainer",
  staff: "Staff",
  super_admin: "Admin",
  client: "Cliente",
};

const getRoleLabel = (role: any) => roleLabels[role] || role;
const getRoleColor = (role: any) => {
  if (role === "client") return "text-blue-400";
  if (role === "tenant_owner" || role === "staff") return "text-habit-cyan";
  return "text-purple-400";
};

const getConversationName = (conv: any) => {
  if (conv.name) return conv.name;
  if (conv.other_participants && conv.other_participants.length > 0) {
    return conv.other_participants
      .map((p: any) => `${p.firstName} ${p.lastName}`)
      .join(", ");
  }
  return "Conversazione";
};

const getConversationInitials = (conv: any) => {
  if (conv.other_participants && conv.other_participants.length > 0) {
    const p = conv.other_participants[0];
    return `${(p.firstName || "?")[0]}${(p.lastName || "?")[0]}`;
  }
  return "?";
};

const formatTime = (d: any) => {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0)
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7)
    return date.toLocaleDateString("it-IT", { weekday: "short" });
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};

const formatMessageTime = (d: any) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isNewDay = (msg: any, idx: any) => {
  if (idx === 0) return true;
  const prev = new Date(chat.messages[idx - 1].created_at).toDateString();
  const curr = new Date(msg.created_at).toDateString();
  return prev !== curr;
};

const formatDayLabel = (d: any) => {
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Oggi";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Ieri";
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const filteredConversations = computed(() => {
  if (!searchQuery.value) return chat.conversations;
  const q = searchQuery.value.toLowerCase();
  return chat.conversations.filter((c: any) =>
    getConversationName(c).toLowerCase().includes(q),
  );
});

// Sender preview per anteprime conversazioni
const getLastMessagePreview = (conv: any) => {
  if (!conv.last_message) return "Nessun messaggio";
  const isMine = conv.last_message_sender_id === currentUserId.value;
  if (isMine) return `Tu: ${conv.last_message}`;
  // Per conversazioni dirette, non serve il nome (e' l'altra persona)
  if (conv.type === "direct") return conv.last_message;
  // Per gruppi, mostra il nome del mittente
  const sender = conv.other_participants?.find(
    (p: any) => p.userId === conv.last_message_sender_id,
  );
  return sender
    ? `${sender.firstName}: ${conv.last_message}`
    : conv.last_message;
};

// Online status helpers
const getOnlineStatus = (conv: any) => {
  if (!conv.other_participants?.length) return false;
  if (conv.type === "direct") {
    return chat.isOnline(conv.other_participants[0]?.userId);
  }
  // Per group: almeno un partecipante online
  return conv.other_participants.some((p: any) => chat.isOnline(p.userId));
};

const getHeaderOnlineStatus = () => {
  if (!chat.currentConversation?.participants) return false;
  const others = chat.currentConversation.participants.filter(
    (p: any) => p.userId !== currentUserId.value,
  );
  if (chat.currentConversation.type === "direct") {
    return others.length > 0 && chat.isOnline(others[0]?.userId);
  }
  return others.some((p: any) => chat.isOnline(p.userId));
};

// Scroll in fondo
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Invio messaggio
const handleSend = async () => {
  const content = messageInput.value.trim();
  if (!content || !chat.currentConversation) return;

  messageInput.value = "";
  if (chat.currentConversation) {
    chat.emitStopTyping(chat.currentConversation.id);
  }

  const result = await chat.sendMessage(chat.currentConversation.id, content);
  if (!result.success) {
    toast.error("Errore nell'invio del messaggio. Riprova.");
  }
  scrollToBottom();
};

// Typing indicator
const handleTyping = () => {
  if (!chat.currentConversation) return;
  chat.emitTyping(chat.currentConversation.id);
  clearTimeout(typingTimeout.value);
  typingTimeout.value = setTimeout(() => {
    if (chat.currentConversation) {
      chat.emitStopTyping(chat.currentConversation.id);
    }
  }, 2000);
};

// Seleziona conversazione
const selectConversation = async (convId: any) => {
  await chat.openConversation(convId);
  showSidebar.value = false;
  scrollToBottom();
  router.replace({
    name: "ChatConversation",
    params: { conversationId: convId },
  });
};

// Nuova conversazione
const handleNewConversation = async () => {
  if (!selectedUserId.value) return;
  const result = await chat.createConversation({
    type: "direct",
    participantIds: [parseInt(selectedUserId.value)],
  });
  if (result.success) {
    showNewConversationModal.value = false;
    selectedUserId.value = "";
    await selectConversation(result.conversation.id);
  } else {
    toast.error(result.message || "Errore nella creazione della conversazione");
  }
};

// Torna alla lista (mobile)
const backToList = () => {
  chat.closeConversation();
  showSidebar.value = true;
  router.replace({ name: "Chat" });
};

// Watch per scroll
watch(
  () => chat.messages.length,
  () => {
    scrollToBottom();
  },
);

onMounted(async () => {
  chat.connectSocket();
  await Promise.all([
    chat.fetchConversations(),
    chat.fetchAvailableUsers(),
    chat.fetchOnlineUsers(),
  ]);

  // Se c'e' un conversationId nell'URL, aprila
  if (route.params.conversationId) {
    await selectConversation(parseInt(route.params.conversationId as any));
  }
});

onUnmounted(() => {
  chat.closeConversation();
});
</script>

<template>
  <div
    class="flex overflow-hidden"
    :class="isMobile ? 'fixed inset-x-0 top-16 bottom-20 z-30' : 'h-[calc(100dvh-64px)]'"
  >
    <!-- Sidebar conversazioni -->
    <div
      :class="[
        'w-full md:w-72 lg:w-80 border-r border-habit-border bg-habit-bg flex flex-col shrink-0',
        chat.currentConversation && !showSidebar ? 'hidden md:flex' : 'flex',
      ]"
    >
      <!-- Header sidebar -->
      <div class="p-4 border-b border-habit-border">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-lg font-bold text-habit-text">Messaggi</h1>
          <button
            @click="
              showNewConversationModal = true;
              chat.fetchAvailableUsers();
            "
            class="w-8 h-8 rounded-full bg-habit-cyan text-habit-bg flex items-center justify-center text-sm font-bold hover:bg-habit-cyan/80 transition"
            title="Nuova conversazione"
          >
            +
          </button>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          autocomplete="off"
          placeholder="Cerca conversazione..."
          class="w-full bg-habit-card border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none placeholder-habit-text-subtle"
        />
      </div>

      <!-- Lista conversazioni -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="chat.conversations.length === 0" class="p-6 text-center">
          <div class="text-3xl mb-2">&#128172;</div>
          <p class="text-sm text-habit-text-subtle">Nessuna conversazione</p>
          <button
            @click="showNewConversationModal = true"
            class="text-xs text-habit-cyan hover:underline mt-2"
          >
            Inizia una chat
          </button>
        </div>

        <div
          v-for="conv in filteredConversations"
          :key="conv.id"
          @click="selectConversation(conv.id)"
          :class="[
            'flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-habit-border transition',
            chat.currentConversation?.id === conv.id
              ? 'bg-habit-card'
              : 'hover:bg-habit-card/50',
          ]"
        >
          <!-- Avatar -->
          <div
            class="w-10 h-10 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 relative"
          >
            {{ getConversationInitials(conv) }}
            <div
              v-if="conv.unread_count > 0"
              class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold"
            >
              {{ conv.unread_count > 9 ? "9+" : conv.unread_count }}
            </div>
            <!-- Online indicator -->
            <div
              v-if="getOnlineStatus(conv)"
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-habit-bg"
            ></div>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3
                :class="[
                  'text-sm truncate',
                  conv.unread_count > 0
                    ? 'font-bold text-habit-text'
                    : 'font-medium text-habit-text-muted',
                ]"
              >
                {{ getConversationName(conv) }}
              </h3>
              <span class="text-[10px] text-habit-text-subtle shrink-0 ml-2">{{
                formatTime(conv.last_message_at)
              }}</span>
            </div>
            <p
              :class="[
                'text-xs truncate mt-0.5',
                conv.unread_count > 0
                  ? 'text-habit-text-muted'
                  : 'text-habit-text-subtle',
              ]"
            >
              {{ getLastMessagePreview(conv) }}
            </p>
          </div>
          <!-- Muted -->
          <span
            v-if="conv.is_muted"
            class="text-habit-text-subtle text-xs"
            title="Silenziata"
            >&#128263;</span
          >
        </div>
      </div>
    </div>

    <!-- Area chat -->
    <div
      :class="[
        'flex-1 flex flex-col bg-habit-bg',
        !chat.currentConversation && showSidebar ? 'hidden md:flex' : 'flex',
      ]"
    >
      <!-- Nessuna conversazione selezionata -->
      <div
        v-if="!chat.currentConversation"
        class="flex-1 flex items-center justify-center"
      >
        <div class="text-center">
          <div class="text-5xl mb-3">&#128172;</div>
          <h3 class="text-lg font-semibold text-habit-text mb-1">Messaggi</h3>
          <p class="text-sm text-habit-text-subtle">
            Seleziona una conversazione o iniziane una nuova
          </p>
        </div>
      </div>

      <!-- Conversazione attiva -->
      <template v-else>
        <!-- Header conversazione -->
        <div
          class="px-4 py-3 border-b border-habit-border flex items-center gap-3 bg-habit-card"
        >
          <button
            @click="backToList"
            class="md:hidden text-habit-text-subtle hover:text-habit-text text-lg mr-1"
          >
            &#8592;
          </button>
          <div
            class="w-9 h-9 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 relative"
          >
            {{ getConversationInitials(chat.currentConversation) }}
            <div
              v-if="getHeaderOnlineStatus()"
              class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-habit-card"
            ></div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-habit-text truncate">
              {{ getConversationName(chat.currentConversation) }}
            </h3>
            <div
              class="text-[10px]"
              :class="
                getHeaderOnlineStatus()
                  ? 'text-emerald-400'
                  : 'text-habit-text-subtle'
              "
            >
              <template v-if="getHeaderOnlineStatus()">Online</template>
              <template v-else-if="chat.currentConversation.participants">
                {{
                  chat.currentConversation.participants
                    .map((p: any) => getRoleLabel(p.role))
                    .join(", ")
                }}
              </template>
            </div>
          </div>
          <button
            @click="chat.toggleMute(chat.currentConversation.id)"
            :class="[
              'text-sm transition',
              chat.currentConversation.is_muted
                ? 'text-habit-text-subtle'
                : 'text-habit-text-subtle hover:text-habit-text',
            ]"
            :title="
              chat.currentConversation.is_muted
                ? 'Riattiva notifiche'
                : 'Silenzia'
            "
          >
            {{ chat.currentConversation.is_muted ? "&#128263;" : "&#128264;" }}
          </button>
        </div>

        <!-- Messaggi -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          <!-- Loading -->
          <div
            v-if="chat.loading && chat.messages.length === 0"
            class="flex justify-center py-8"
          >
            <div class="text-habit-text-subtle text-sm">
              Caricamento messaggi...
            </div>
          </div>

          <!-- Load more -->
          <div
            v-if="
              chat.messagesPagination.page < chat.messagesPagination.totalPages
            "
            class="text-center pb-3"
          >
            <button
              @click="
                chat.fetchMessages(
                  chat.currentConversation.id,
                  chat.messagesPagination.page + 1,
                )
              "
              class="text-xs text-habit-cyan hover:underline"
            >
              Carica precedenti
            </button>
          </div>

          <!-- Empty -->
          <div
            v-if="!chat.loading && chat.messages.length === 0"
            class="flex justify-center py-12"
          >
            <div class="text-center">
              <div class="text-3xl mb-2">&#128075;</div>
              <p class="text-sm text-habit-text-subtle">
                Inizia la conversazione!
              </p>
            </div>
          </div>

          <!-- Messaggi -->
          <template v-for="(msg, idx) in chat.messages" :key="msg.id">
            <!-- Separatore giorno -->
            <div v-if="isNewDay(msg, idx)" class="flex items-center gap-3 py-3">
              <div class="flex-1 h-px bg-habit-border"></div>
              <span
                class="text-[10px] text-habit-text-subtle uppercase font-medium"
                >{{ formatDayLabel(msg.created_at) }}</span
              >
              <div class="flex-1 h-px bg-habit-border"></div>
            </div>

            <!-- Messaggio -->
            <div
              :class="[
                'flex mb-1',
                msg.sender_id === currentUserId
                  ? 'justify-end'
                  : 'justify-start',
              ]"
            >
              <div
                :class="[
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-3.5 py-2 relative group',
                  msg.sender_id === currentUserId
                    ? 'bg-habit-cyan text-habit-bg rounded-br-md'
                    : 'bg-habit-card text-habit-text rounded-bl-md border border-habit-border',
                ]"
              >
                <!-- Nome mittente (solo in gruppi) -->
                <div
                  v-if="
                    msg.sender_id !== currentUserId &&
                    chat.currentConversation?.type === 'group'
                  "
                  :class="[
                    'text-[10px] font-semibold mb-0.5',
                    getRoleColor(msg.sender_role),
                  ]"
                >
                  {{ msg.sender_first_name }} {{ msg.sender_last_name }}
                </div>
                <p class="text-sm whitespace-pre-wrap break-words">
                  {{ msg.content }}
                </p>
                <div
                  :class="[
                    'text-[9px] mt-1 text-right',
                    msg.sender_id === currentUserId
                      ? 'text-habit-bg/60'
                      : 'text-habit-text-subtle',
                  ]"
                >
                  {{ formatMessageTime(msg.created_at) }}
                </div>
              </div>
            </div>
          </template>

          <!-- Typing indicator -->
          <div
            v-if="
              chat.currentConversation &&
              chat.typingUsers[chat.currentConversation.id]?.length > 0
            "
            class="flex justify-start"
          >
            <div
              class="bg-habit-card rounded-2xl rounded-bl-md px-4 py-2 border border-habit-border"
            >
              <div class="flex gap-1">
                <span
                  class="w-1.5 h-1.5 bg-habit-text-subtle rounded-full animate-bounce"
                  style="animation-delay: 0ms"
                ></span>
                <span
                  class="w-1.5 h-1.5 bg-habit-text-subtle rounded-full animate-bounce"
                  style="animation-delay: 200ms"
                ></span>
                <span
                  class="w-1.5 h-1.5 bg-habit-text-subtle rounded-full animate-bounce"
                  style="animation-delay: 400ms"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="px-4 py-3 border-t border-habit-border bg-habit-card">
          <div class="flex items-end gap-2">
            <textarea
              v-model="messageInput"
              @keydown.enter.exact.prevent="handleSend"
              @input="handleTyping"
              placeholder="Scrivi un messaggio..."
              rows="1"
              class="flex-1 bg-habit-bg border border-habit-border rounded-2xl px-4 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:outline-none resize-none max-h-32 placeholder-habit-text-subtle"
            ></textarea>
            <button
              @click="handleSend"
              :disabled="!messageInput.trim()"
              class="w-10 h-10 rounded-full bg-habit-cyan text-habit-bg flex items-center justify-center shrink-0 hover:bg-habit-cyan/80 disabled:opacity-30 transition"
            >
              <span class="text-lg">&#10148;</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Modale nuova conversazione -->
    <Teleport to="body">
      <div
        v-if="showNewConversationModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="showNewConversationModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-sm p-6"
        >
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-lg font-bold text-habit-text">
              Nuova Conversazione
            </h3>
            <button
              @click="showNewConversationModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Seleziona utente</label
              >
              <select
                v-model="selectedUserId"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              >
                <option value="">Scegli destinatario</option>
                <option
                  v-for="user in chat.availableUsers"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ chat.isOnline(user.id) ? "🟢" : "⚫" }}
                  {{ user.first_name }} {{ user.last_name }} ({{
                    getRoleLabel(user.role)
                  }})
                </option>
              </select>
            </div>
            <button
              @click="handleNewConversation"
              :disabled="!selectedUserId"
              class="w-full py-2.5 rounded-habit text-sm font-medium bg-habit-cyan text-habit-bg hover:bg-habit-cyan/80 disabled:opacity-40 transition"
            >
              Inizia Chat
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
