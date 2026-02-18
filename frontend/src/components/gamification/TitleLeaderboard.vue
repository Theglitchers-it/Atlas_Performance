<script setup lang="ts">
/**
 * TitleLeaderboard - Mini classifica titoli sbloccati
 * Mostra chi ha piu titoli sbloccati
 */
import { ref, onMounted } from "vue";
import api from "@/services/api";

interface LeaderboardEntry {
  user_id: number;
  first_name?: string;
  last_name?: string;
  level?: number;
  total_xp?: number;
}

const loading = ref(false);
const leaderboard = ref<LeaderboardEntry[]>([]);

const fetchTitleLeaderboard = async (): Promise<void> => {
  loading.value = true;
  try {
    const response = await api.get("/gamification/leaderboard", {
      params: { limit: 10 },
    });
    leaderboard.value = response.data.data.leaderboard || [];
  } catch (err) {
    console.error("Errore fetch title leaderboard:", err);
  } finally {
    loading.value = false;
  }
};

const getMedalEmoji = (index: number): string => {
  if (index === 0) return "\u{1F947}"; // gold 🥇
  if (index === 1) return "\u{1F948}"; // silver 🥈
  if (index === 2) return "\u{1F949}"; // bronze 🥉
  return "";
};

onMounted(fetchTitleLeaderboard);
</script>

<template>
  <div class="bg-habit-card border border-habit-border rounded-habit p-5">
    <div class="flex items-center justify-between mb-4">
      <h3
        class="text-base font-semibold text-habit-text flex items-center gap-2"
      >
        <span>&#127942;</span> Classifica
      </h3>
      <router-link
        to="/leaderboard"
        class="text-xs text-habit-cyan hover:underline font-medium"
      >
        Classifica completa
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in 5"
        :key="i"
        class="h-10 bg-habit-skeleton rounded animate-pulse"
      ></div>
    </div>

    <!-- Empty -->
    <div v-else-if="leaderboard.length === 0" class="text-center py-6">
      <p class="text-habit-text-subtle text-sm">Nessun dato in classifica</p>
    </div>

    <!-- Leaderboard list -->
    <div v-else class="space-y-1">
      <div
        v-for="(entry, index) in leaderboard"
        :key="entry.user_id || index"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg transition',
          index < 3 ? 'bg-habit-bg-light' : '',
        ]"
      >
        <!-- Rank -->
        <div class="w-6 text-center shrink-0">
          <span v-if="index < 3" class="text-lg">{{
            getMedalEmoji(index)
          }}</span>
          <span v-else class="text-xs text-habit-text-subtle font-bold">{{
            index + 1
          }}</span>
        </div>

        <!-- User info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-habit-text truncate">
            {{ entry.first_name || "Utente" }} {{ entry.last_name || "" }}
          </div>
          <div class="text-[10px] text-habit-text-subtle">
            Lv. {{ entry.level || 1 }}
          </div>
        </div>

        <!-- XP -->
        <div class="text-right shrink-0">
          <div class="text-sm font-bold text-habit-cyan">
            {{ (entry.total_xp || 0).toLocaleString() }}
          </div>
          <div class="text-[10px] text-habit-text-subtle">XP</div>
        </div>
      </div>
    </div>
  </div>
</template>
