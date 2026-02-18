<script setup lang="ts">
import { computed } from "vue";
import type { Client } from "@/types";
import ClientStatusBadge from "./ClientStatusBadge.vue";
import { EnvelopeIcon } from "@heroicons/vue/24/outline";

interface ClientCardData extends Client {
  avatar?: string;
  primary_goal?: string;
  last_workout_at?: string;
  streak_days?: number;
  level?: number;
  xp_points?: number;
}

const props = defineProps<{
  client: ClientCardData;
}>();

const emit = defineEmits<{
  (e: "click", client: ClientCardData): void;
  (e: "edit", client: ClientCardData): void;
  (e: "delete", client: ClientCardData): void;
}>();

const clientInitials = computed<string>(() => {
  const first = props.client.first_name?.[0] || "";
  const last = props.client.last_name?.[0] || "";
  return (first + last).toUpperCase();
});

const fullName = computed<string>(() => {
  return `${props.client.first_name || ""} ${props.client.last_name || ""}`.trim();
});

const goalLabel = computed<string>(() => {
  const goals: Record<string, string> = {
    weight_loss: "Perdita peso",
    muscle_gain: "Aumento massa",
    strength: "Forza",
    endurance: "Resistenza",
    flexibility: "Flessibilità",
    general_fitness: "Fitness generale",
    sport_specific: "Sport specifico",
  };
  return (
    goals[props.client.primary_goal || ""] ||
    props.client.primary_goal ||
    "Nessun obiettivo"
  );
});

const lastActivity = computed<string>(() => {
  if (!props.client.last_workout_at) return "Nessuna attività";

  const date = new Date(props.client.last_workout_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return `${Math.floor(diffDays / 30)} mesi fa`;
});

const handleClick = (): void => {
  emit("click", props.client);
};

const handleEdit = (e: Event): void => {
  e.stopPropagation();
  emit("edit", props.client);
};

const handleDelete = (e: Event): void => {
  e.stopPropagation();
  emit("delete", props.client);
};
</script>

<template>
  <div
    @click="handleClick"
    class="bg-habit-card rounded-xl p-5 cursor-pointer hover:ring-2 hover:ring-habit-orange/30 transition-all duration-200 group"
  >
    <!-- Header -->
    <div class="flex items-start gap-4 mb-4">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        <div
          v-if="client.avatar"
          class="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-habit-orange/20"
        >
          <img
            :src="client.avatar"
            :alt="fullName"
            class="w-full h-full object-cover"
          />
        </div>
        <div
          v-else
          class="w-14 h-14 rounded-xl bg-gradient-to-br from-habit-cyan to-habit-orange flex items-center justify-center"
        >
          <span class="text-white font-bold text-lg">{{ clientInitials }}</span>
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-lg font-semibold text-white truncate">
            {{ fullName }}
          </h3>
          <ClientStatusBadge :status="client.status" />
        </div>

        <div class="flex flex-col gap-1 text-sm text-habit-text-subtle">
          <div v-if="client.email" class="flex items-center gap-1.5">
            <EnvelopeIcon class="w-4 h-4 flex-shrink-0" />
            <span class="truncate">{{ client.email }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div
        class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          @click="handleEdit"
          class="p-2 rounded-lg hover:bg-habit-surface transition-colors"
          title="Modifica cliente"
        >
          <svg
            class="w-4 h-4 text-habit-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          @click="handleDelete"
          class="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
          title="Elimina cliente"
        >
          <svg
            class="w-4 h-4 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-habit-surface rounded-lg p-3">
        <div class="text-xs text-habit-text-subtle mb-1">Obiettivo</div>
        <div class="text-sm font-medium text-white truncate">
          {{ goalLabel }}
        </div>
      </div>
      <div class="bg-habit-surface rounded-lg p-3">
        <div class="text-xs text-habit-text-subtle mb-1">Ultima attività</div>
        <div class="text-sm font-medium text-white">{{ lastActivity }}</div>
      </div>
    </div>

    <!-- Footer -->
    <div
      class="flex items-center justify-between pt-3 border-t border-habit-border"
    >
      <div class="flex items-center gap-4 text-xs text-habit-text-subtle">
        <div class="flex items-center gap-1.5">
          <svg
            class="w-4 h-4 text-habit-orange"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
            />
          </svg>
          <span class="font-semibold text-habit-orange"
            >{{ client.streak_days || 0 }} giorni</span
          >
        </div>
        <div class="flex items-center gap-1.5">
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span>Livello {{ client.level || 1 }}</span>
        </div>
      </div>

      <div class="text-xs text-habit-text-subtle">
        {{ client.xp_points || 0 }} XP
      </div>
    </div>
  </div>
</template>
