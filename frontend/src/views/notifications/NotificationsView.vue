<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/store/notification";
import {
  BellIcon,
  BellSlashIcon,
  CheckIcon,
  CheckCircleIcon,
  TrashIcon as _TrashIcon,
  FunnelIcon as _FunnelIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const notificationStore = useNotificationStore();

const activeFilter = ref("all"); // 'all' | 'unread' | 'read'
const isInitialized = ref(false);

// Computed
const notifications = computed(() => notificationStore.notifications);
const unreadCount = computed(() => notificationStore.unreadCount);
const loading = computed(() => notificationStore.loading);
const hasMore = computed(() => notificationStore.pagination.hasMore);

const filteredNotifications = computed(() => {
  if (activeFilter.value === "unread") {
    return notifications.value.filter((n: any) => !n.read_at);
  }
  if (activeFilter.value === "read") {
    return notifications.value.filter((n: any) => !!n.read_at);
  }
  return notifications.value;
});

// Init — full load (notifications list + unread count)
onMounted(async () => {
  await notificationStore.initializeFull();
  isInitialized.value = true;
});

// Actions
const handleNotificationClick = async (notification: any) => {
  if (!notification.read_at) {
    await notificationStore.markAsRead(notification.id);
  }
  if (notification.action_url) {
    router.push(notification.action_url);
  }
};

const markAsRead = async (notification: any) => {
  if (!notification.read_at) {
    await notificationStore.markAsRead(notification.id);
  }
};

const markAllRead = async () => {
  await notificationStore.markAllAsRead();
};

const loadMore = async () => {
  await notificationStore.loadMore();
};

const refreshNotifications = async () => {
  await notificationStore.initialize();
};

// Helpers
const getNotificationIcon = (type: any) => {
  const icons: Record<string, string> = {
    workout_assigned: "💪",
    program_updated: "📋",
    chat_message: "💬",
    achievement_unlocked: "🏆",
    reminder: "⏰",
    alert: "🔔",
    measurement: "📏",
    nutrition: "🥗",
    booking: "📅",
    system: "⚙️",
    welcome: "👋",
    streak: "🔥",
    goal_reached: "🎯",
    new_client: "👤",
    video: "🎬",
  };
  return icons[type] || "🔔";
};

const formatTimeAgo = (dateString: any) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Adesso";
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDate = (dateString: any) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
void formatDate;

// Group notifications by date
const groupedNotifications = computed(() => {
  const groups: Record<string, any[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  filteredNotifications.value.forEach((notification: any) => {
    const date = new Date(notification.created_at);
    date.setHours(0, 0, 0, 0);

    let key;
    if (date.getTime() >= today.getTime()) {
      key = "Oggi";
    } else if (date.getTime() >= yesterday.getTime()) {
      key = "Ieri";
    } else if (date.getTime() >= weekAgo.getTime()) {
      key = "Questa settimana";
    } else {
      key = "Precedenti";
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(notification);
  });

  return groups;
});

const groupOrder = ["Oggi", "Ieri", "Questa settimana", "Precedenti"];
const sortedGroups = computed(() => {
  return groupOrder.filter(
    (key: any) => groupedNotifications.value[key]?.length > 0,
  );
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1
            class="text-2xl sm:text-3xl font-display font-bold text-habit-text flex items-center gap-3"
          >
            <div
              class="w-10 h-10 bg-habit-orange/20 rounded-xl flex items-center justify-center"
            >
              <BellIcon class="w-6 h-6 text-habit-orange" />
            </div>
            Notifiche
          </h1>
          <p class="text-habit-text-muted mt-1">
            <span v-if="unreadCount > 0"
              >Hai {{ unreadCount }} notifiche non lette</span
            >
            <span v-else>Nessuna notifica non letta</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Refresh -->
          <button
            @click="refreshNotifications"
            class="p-2 rounded-xl hover:bg-habit-card-hover transition-colors"
            :class="{ 'animate-spin': loading }"
            title="Aggiorna"
          >
            <ArrowPathIcon class="w-5 h-5 text-habit-text-muted" />
          </button>

          <!-- Mark all as read -->
          <button
            v-if="unreadCount > 0"
            @click="markAllRead"
            class="flex items-center gap-2 px-4 py-2 bg-habit-orange text-white rounded-xl hover:bg-habit-orange/90 transition-colors text-sm font-medium"
          >
            <CheckCircleIcon class="w-4 h-4" />
            Segna tutte come lette
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2 mt-4">
        <button
          @click="activeFilter = 'all'"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          :class="
            activeFilter === 'all'
              ? 'bg-habit-orange text-white shadow-habit-glow'
              : 'bg-habit-card text-habit-text-muted hover:bg-habit-card-hover border border-habit-border'
          "
        >
          Tutte
        </button>
        <button
          @click="activeFilter = 'unread'"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
          :class="
            activeFilter === 'unread'
              ? 'bg-habit-orange text-white shadow-habit-glow'
              : 'bg-habit-card text-habit-text-muted hover:bg-habit-card-hover border border-habit-border'
          "
        >
          Non lette
          <span
            v-if="unreadCount > 0"
            class="px-1.5 py-0.5 text-xs rounded-full"
            :class="
              activeFilter === 'unread'
                ? 'bg-white/20'
                : 'bg-habit-orange/20 text-habit-orange'
            "
          >
            {{ unreadCount }}
          </span>
        </button>
        <button
          @click="activeFilter = 'read'"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          :class="
            activeFilter === 'read'
              ? 'bg-habit-orange text-white shadow-habit-glow'
              : 'bg-habit-card text-habit-text-muted hover:bg-habit-card-hover border border-habit-border'
          "
        >
          Lette
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading && !isInitialized"
      class="flex flex-col items-center justify-center py-20"
    >
      <div
        class="w-12 h-12 border-3 border-habit-orange border-t-transparent rounded-full animate-spin mb-4"
      ></div>
      <p class="text-habit-text-muted">Caricamento notifiche...</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredNotifications.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <div
        class="w-20 h-20 bg-habit-card rounded-2xl flex items-center justify-center mb-4 border border-habit-border"
      >
        <BellSlashIcon class="w-10 h-10 text-habit-text-subtle" />
      </div>
      <h3 class="text-habit-text font-semibold text-lg mb-1">
        <span v-if="activeFilter === 'all'">Nessuna notifica</span>
        <span v-else-if="activeFilter === 'unread'"
          >Nessuna notifica non letta</span
        >
        <span v-else>Nessuna notifica letta</span>
      </h3>
      <p class="text-habit-text-muted text-sm">
        <span v-if="activeFilter === 'all'"
          >Le notifiche appariranno qui quando riceverai aggiornamenti</span
        >
        <span v-else-if="activeFilter === 'unread'"
          >Ottimo! Sei in pari con tutte le notifiche</span
        >
        <span v-else>Non hai ancora letto nessuna notifica</span>
      </p>
    </div>

    <!-- Notification list grouped by date -->
    <div v-else class="space-y-6">
      <div v-for="groupKey in sortedGroups" :key="groupKey">
        <!-- Group header -->
        <div class="flex items-center gap-3 mb-3">
          <h3
            class="text-sm font-semibold text-habit-text-subtle uppercase tracking-wider"
          >
            {{ groupKey }}
          </h3>
          <div class="flex-1 h-px bg-habit-border"></div>
        </div>

        <!-- Notifications in group -->
        <div class="space-y-2">
          <div
            v-for="notification in groupedNotifications[groupKey]"
            :key="notification.id"
            @click="handleNotificationClick(notification)"
            class="group relative bg-habit-card rounded-2xl border border-habit-border p-4 sm:p-5 hover:border-habit-orange/30 transition-all duration-200 cursor-pointer"
            :class="{
              'border-l-4 border-l-habit-orange bg-habit-orange/5':
                !notification.read_at,
            }"
          >
            <div class="flex gap-4">
              <!-- Icon -->
              <div class="flex-shrink-0">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  :class="
                    !notification.read_at
                      ? 'bg-habit-orange/20'
                      : 'bg-habit-bg-light'
                  "
                >
                  {{ getNotificationIcon(notification.type) }}
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h4
                    class="text-habit-text font-semibold text-sm sm:text-base"
                    :class="{ 'font-bold': !notification.read_at }"
                  >
                    {{ notification.title }}
                  </h4>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <!-- Unread indicator -->
                    <div
                      v-if="!notification.read_at"
                      class="w-2.5 h-2.5 bg-habit-orange rounded-full"
                    ></div>
                    <!-- Mark as read button -->
                    <button
                      v-if="!notification.read_at"
                      @click.stop="markAsRead(notification)"
                      class="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-habit-card-hover transition-all"
                      title="Segna come letta"
                    >
                      <CheckIcon class="w-4 h-4 text-habit-text-muted" />
                    </button>
                  </div>
                </div>
                <p class="text-habit-text-muted text-sm mt-1 line-clamp-2">
                  {{ notification.message || notification.body }}
                </p>
                <div class="flex items-center gap-3 mt-2">
                  <span
                    class="text-habit-text-subtle text-xs flex items-center gap-1"
                  >
                    <ClockIcon class="w-3.5 h-3.5" />
                    {{ formatTimeAgo(notification.created_at) }}
                  </span>
                  <span
                    v-if="notification.type"
                    class="text-xs px-2 py-0.5 bg-habit-bg-light rounded-full text-habit-text-subtle capitalize"
                  >
                    {{ notification.type?.replace(/_/g, " ") }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center pt-4 pb-8">
        <button
          @click="loadMore"
          :disabled="loading"
          class="flex items-center gap-2 px-6 py-3 bg-habit-card border border-habit-border rounded-xl text-habit-text-muted hover:bg-habit-card-hover hover:text-habit-text transition-all duration-200 text-sm font-medium"
        >
          <ArrowPathIcon v-if="loading" class="w-4 h-4 animate-spin" />
          <span>{{
            loading ? "Caricamento..." : "Carica altre notifiche"
          }}</span>
        </button>
      </div>

      <!-- End of list -->
      <div
        v-else-if="filteredNotifications.length > 5"
        class="text-center py-6"
      >
        <p class="text-habit-text-subtle text-sm">
          Hai visto tutte le notifiche
        </p>
      </div>
    </div>
  </div>
</template>
