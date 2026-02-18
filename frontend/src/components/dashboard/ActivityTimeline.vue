<template>
  <div
    class="bg-habit-card border border-habit-border rounded-habit p-4 xs:p-6"
  >
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <div
        class="w-8 h-8 rounded-full bg-habit-orange/15 flex items-center justify-center"
      >
        <svg
          class="w-4 h-4 text-habit-orange"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-habit-text">
        Attivit&agrave; Recente
      </h3>
    </div>

    <!-- Empty state -->
    <div
      v-if="!activities || activities.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <div
        class="w-14 h-14 rounded-full bg-habit-bg-light flex items-center justify-center mb-4"
      >
        <svg
          class="w-7 h-7 text-habit-text-subtle"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <p class="text-habit-text-muted text-sm">
        Nessuna attivit&agrave; recente
      </p>
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div
        class="absolute left-4 top-4 bottom-0 w-0.5 bg-habit-border"
        aria-hidden="true"
      ></div>

      <div class="space-y-0">
        <div
          v-for="(activity, index) in visibleActivities"
          :key="activity.id"
          class="timeline-item relative flex items-start gap-4 pb-6 last:pb-0"
          :style="{ animationDelay: `${index * 80}ms` }"
        >
          <!-- Circle icon -->
          <div
            class="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
            :class="activityStyle(activity.type).bgClass"
          >
            {{ activityStyle(activity.type).icon }}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 pt-0.5">
            <p class="font-medium text-habit-text text-sm leading-snug">
              {{ activity.title }}
            </p>
            <p
              v-if="activity.description"
              class="text-sm text-habit-text-muted mt-0.5 leading-relaxed"
            >
              {{ activity.description }}
            </p>
            <span class="text-xs text-habit-text-subtle mt-1 inline-block">
              {{ relativeTime(activity.timestamp) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Show all link -->
      <div
        v-if="activities.length > maxItems"
        class="mt-4 pt-4 border-t border-habit-border text-center"
      >
        <button
          class="text-sm text-habit-orange hover:text-habit-orange-light transition-colors font-medium"
          @click="$emit('view-all')"
        >
          Vedi tutto ({{ activities.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Activity {
  id: number | string;
  type: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  metadata?: Record<string, unknown>;
}

interface ActivityStyleConfig {
  icon: string;
  bgClass: string;
}

interface Props {
  activities?: Activity[];
  maxItems?: number;
}

const props = withDefaults(defineProps<Props>(), {
  activities: () => [],
  maxItems: 10,
});

defineEmits<{
  (e: "view-all"): void;
}>();

const visibleActivities = computed(() => {
  return props.activities.slice(0, props.maxItems);
});

const activityStyles: Record<string, ActivityStyleConfig> = {
  session_completed: { icon: "\u2705", bgClass: "bg-green-500/15" },
  client_added: { icon: "\uD83D\uDC64", bgClass: "bg-cyan-500/15" },
  payment_received: { icon: "\uD83D\uDCB0", bgClass: "bg-purple-500/15" },
  alert: { icon: "\u26A0\uFE0F", bgClass: "bg-orange-500/15" },
  workout_created: { icon: "\uD83D\uDCAA", bgClass: "bg-blue-500/15" },
  appointment: { icon: "\uD83D\uDCC5", bgClass: "bg-indigo-500/15" },
  default: { icon: "\uD83D\uDCCC", bgClass: "bg-gray-500/15" },
};

function activityStyle(type: string): ActivityStyleConfig {
  return activityStyles[type] || activityStyles.default;
}

function relativeTime(timestamp: string | Date): string {
  if (!timestamp) return "";

  const now = Date.now();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const diffMs = now - date.getTime();

  if (diffMs < 0) return "adesso";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "adesso";
  if (diffMin === 1) return "1 min fa";
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHour === 1) return "1 ora fa";
  if (diffHour < 24) return `${diffHour} ore fa`;
  if (diffDay === 1) return "ieri";
  if (diffDay < 30) return `${diffDay} giorni fa`;
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return months === 1 ? "1 mese fa" : `${months} mesi fa`;
  }
  const years = Math.floor(diffDay / 365);
  return years === 1 ? "1 anno fa" : `${years} anni fa`;
}
</script>

<style scoped>
.timeline-item {
  opacity: 0;
  animation: fadeInUp 0.4s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
