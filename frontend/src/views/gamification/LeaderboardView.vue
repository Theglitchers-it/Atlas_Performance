<script setup lang="ts">
import { onMounted } from "vue";
import { useGamificationStore } from "@/store/gamification";

interface RankMedal {
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

const gamification = useGamificationStore();

// Medaglie per top 3
const rankMedals: Record<number, RankMedal> = {
  1: {
    emoji: "\u{1F947}",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  2: {
    emoji: "\u{1F948}",
    color: "text-habit-text-muted",
    bg: "bg-gray-400/10",
    border: "border-gray-400/30",
  },
  3: {
    emoji: "\u{1F949}",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
};

const getRankStyle = (rank: number): RankMedal | null =>
  rankMedals[rank] || null;

const getLevelColor = (level: number): string => {
  if (level >= 20) return "text-yellow-400";
  if (level >= 10) return "text-purple-400";
  if (level >= 5) return "text-blue-400";
  return "text-habit-text-subtle";
};

onMounted(async () => {
  await gamification.fetchLeaderboard(1);
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Classifica
        </h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Ranking dei clienti per punti esperienza
        </p>
      </div>
      <router-link
        to="/gamification"
        class="px-3 py-2 rounded-habit text-xs font-medium bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan transition"
      >
        &larr; Gamification
      </router-link>
    </div>

    <!-- Loading -->
    <div
      v-if="gamification.loading && gamification.leaderboard.length === 0"
      class="space-y-3"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="bg-habit-card rounded-habit p-4 animate-pulse flex items-center gap-4"
      >
        <div class="w-8 h-8 bg-habit-skeleton rounded-full"></div>
        <div class="w-10 h-10 bg-habit-skeleton rounded-full"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 w-32 bg-habit-skeleton rounded"></div>
          <div class="h-3 w-20 bg-habit-skeleton rounded"></div>
        </div>
        <div class="h-6 w-16 bg-habit-skeleton rounded"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="gamification.leaderboard.length === 0"
      class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
    >
      <div class="text-4xl mb-3">&#127942;</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">Nessun dato</h3>
      <p class="text-habit-text-subtle text-sm">
        La classifica apparira quando i clienti inizieranno a guadagnare XP
      </p>
    </div>

    <div v-else>
      <!-- Podio Top 3 -->
      <div
        v-if="gamification.leaderboard.length >= 3"
        class="grid grid-cols-3 gap-1.5 sm:gap-3 mb-6"
      >
        <!-- 2° posto -->
        <div
          class="bg-habit-card rounded-habit border border-gray-400/30 p-1.5 sm:p-4 text-center mt-6"
        >
          <div class="text-2xl sm:text-3xl mb-1 sm:mb-2">&#129352;</div>
          <div
            class="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg mx-auto mb-2"
          >
            {{ (gamification.leaderboard[1]?.first_name || "?")[0]
            }}{{ (gamification.leaderboard[1]?.last_name || "?")[0] }}
          </div>
          <h4 class="text-sm font-semibold text-habit-text truncate">
            {{ gamification.leaderboard[1]?.first_name }}
            {{ gamification.leaderboard[1]?.last_name }}
          </h4>
          <div class="text-xs text-habit-text-subtle mt-1">
            Lv. {{ gamification.leaderboard[1]?.level || 1 }}
          </div>
          <div class="text-sm font-bold text-habit-text-muted mt-1">
            {{ gamification.leaderboard[1]?.xp_points || 0 }} XP
          </div>
        </div>

        <!-- 1° posto -->
        <div
          class="bg-habit-card rounded-habit border border-yellow-500/30 p-1.5 sm:p-4 text-center"
        >
          <div class="text-3xl sm:text-4xl mb-1 sm:mb-2">&#129351;</div>
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-base sm:text-xl mx-auto mb-2 shadow-lg shadow-yellow-500/20"
          >
            {{ (gamification.leaderboard[0]?.first_name || "?")[0]
            }}{{ (gamification.leaderboard[0]?.last_name || "?")[0] }}
          </div>
          <h4 class="text-sm font-semibold text-habit-text truncate">
            {{ gamification.leaderboard[0]?.first_name }}
            {{ gamification.leaderboard[0]?.last_name }}
          </h4>
          <div class="text-xs text-yellow-400 mt-1">
            Lv. {{ gamification.leaderboard[0]?.level || 1 }}
          </div>
          <div class="text-sm font-bold text-yellow-400 mt-1">
            {{ gamification.leaderboard[0]?.xp_points || 0 }} XP
          </div>
        </div>

        <!-- 3° posto -->
        <div
          class="bg-habit-card rounded-habit border border-orange-500/30 p-1.5 sm:p-4 text-center mt-6"
        >
          <div class="text-2xl sm:text-3xl mb-1 sm:mb-2">&#129353;</div>
          <div
            class="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg mx-auto mb-2"
          >
            {{ (gamification.leaderboard[2]?.first_name || "?")[0]
            }}{{ (gamification.leaderboard[2]?.last_name || "?")[0] }}
          </div>
          <h4 class="text-sm font-semibold text-habit-text truncate">
            {{ gamification.leaderboard[2]?.first_name }}
            {{ gamification.leaderboard[2]?.last_name }}
          </h4>
          <div class="text-xs text-habit-text-subtle mt-1">
            Lv. {{ gamification.leaderboard[2]?.level || 1 }}
          </div>
          <div class="text-sm font-bold text-orange-400 mt-1">
            {{ gamification.leaderboard[2]?.xp_points || 0 }} XP
          </div>
        </div>
      </div>

      <!-- Lista completa -->
      <div
        class="bg-habit-card rounded-habit border border-habit-border overflow-hidden"
      >
        <!-- Header tabella -->
        <div
          class="grid grid-cols-10 sm:grid-cols-12 gap-2 px-3 sm:px-4 py-3 border-b border-habit-border text-xs text-habit-text-subtle uppercase font-medium"
        >
          <div class="col-span-1">#</div>
          <div class="col-span-5">Cliente</div>
          <div class="col-span-2 text-center">Livello</div>
          <div class="col-span-2 text-center hidden sm:block">Badge</div>
          <div class="col-span-2 text-right">XP</div>
        </div>

        <!-- Righe -->
        <div
          v-for="client in gamification.leaderboard"
          :key="client.id"
          :class="[
            'grid grid-cols-10 sm:grid-cols-12 gap-2 px-3 sm:px-4 py-3 items-center border-b border-habit-border last:border-0 transition',
            getRankStyle(client.rank)
              ? getRankStyle(client.rank)!.bg
              : 'hover:bg-habit-bg/50',
          ]"
        >
          <!-- Rank -->
          <div class="col-span-1">
            <span v-if="getRankStyle(client.rank)" class="text-lg">{{
              getRankStyle(client.rank)!.emoji
            }}</span>
            <span v-else class="text-sm font-bold text-habit-text-subtle">{{
              client.rank
            }}</span>
          </div>

          <!-- Nome -->
          <div class="col-span-5 flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0"
            >
              {{ (client.first_name || "?")[0]
              }}{{ (client.last_name || "?")[0] }}
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-habit-text truncate">
                {{ client.first_name }} {{ client.last_name }}
              </div>
              <div
                v-if="client.streak_days > 0"
                class="text-[10px] text-orange-400"
              >
                {{ client.streak_days }}d streak
              </div>
            </div>
          </div>

          <!-- Livello -->
          <div class="col-span-2 text-center">
            <span :class="['text-sm font-bold', getLevelColor(client.level)]">
              Lv. {{ client.level || 1 }}
            </span>
          </div>

          <!-- Badge -->
          <div class="col-span-2 text-center hidden sm:block">
            <span class="text-sm text-habit-text-subtle">{{
              client.achievements_count || 0
            }}</span>
          </div>

          <!-- XP -->
          <div class="col-span-2 text-right">
            <span class="text-sm font-bold text-habit-cyan">{{
              (client.xp_points || 0).toLocaleString("it-IT")
            }}</span>
            <span class="text-xs text-habit-text-subtle ml-1">XP</span>
          </div>
        </div>
      </div>

      <!-- Paginazione -->
      <div
        v-if="gamification.leaderboardPagination.totalPages > 1"
        class="flex justify-center items-center gap-3 mt-6"
      >
        <button
          @click="
            gamification.fetchLeaderboard(
              gamification.leaderboardPagination.page - 1,
            )
          "
          :disabled="gamification.leaderboardPagination.page <= 1"
          class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
        >
          Prec
        </button>
        <span class="text-sm text-habit-text-subtle">
          {{ gamification.leaderboardPagination.page }} /
          {{ gamification.leaderboardPagination.totalPages }}
        </span>
        <button
          @click="
            gamification.fetchLeaderboard(
              gamification.leaderboardPagination.page + 1,
            )
          "
          :disabled="
            gamification.leaderboardPagination.page >=
            gamification.leaderboardPagination.totalPages
          "
          class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
        >
          Succ
        </button>
      </div>
    </div>
  </div>
</template>
