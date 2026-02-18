<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useGamificationStore } from "@/store/gamification";
import { useAuthStore } from "@/store/auth";
import TitleShowcase from "@/components/gamification/TitleShowcase.vue";
import TitleProgress from "@/components/gamification/TitleProgress.vue";
import TitleUnlockAnimation from "@/components/gamification/TitleUnlockAnimation.vue";
import type { Title } from "@/types";

interface ConfigItem {
  label: string;
  color: string;
  bg: string;
  border?: string;
  emoji?: string;
}

const router = useRouter();
const gamification = useGamificationStore();
const auth = useAuthStore();

const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as string),
);

// Config rarita
const rarityConfig: Record<string, ConfigItem> = {
  common: {
    label: "Comune",
    color: "text-habit-text-subtle",
    bg: "bg-gray-500/20",
    border: "border-gray-500/30",
  },
  uncommon: {
    label: "Non comune",
    color: "text-green-400",
    bg: "bg-green-500/20",
    border: "border-green-500/30",
  },
  rare: {
    label: "Raro",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
  epic: {
    label: "Epico",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    border: "border-purple-500/30",
  },
  legendary: {
    label: "Leggendario",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/30",
  },
};

// Config categorie
const categoryConfig: Record<string, ConfigItem> = {
  workout: {
    label: "Allenamento",
    emoji: "\u{1F4AA}",
    color: "text-habit-cyan",
    bg: "bg-cyan-500/10",
  },
  consistency: {
    label: "Costanza",
    emoji: "\u{1F525}",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  strength: {
    label: "Forza",
    emoji: "\u{1F3CB}",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  progress: {
    label: "Progressi",
    emoji: "\u{1F4C8}",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  social: {
    label: "Sociale",
    emoji: "\u{1F465}",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  special: {
    label: "Speciale",
    emoji: "\u{2B50}",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
};

// Config tipi transazione XP
const txTypeConfig: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  workout: { label: "Allenamento", emoji: "\u{1F4AA}", color: "bg-cyan-500" },
  checkin: { label: "Check-in", emoji: "\u{2705}", color: "bg-green-500" },
  achievement: {
    label: "Achievement",
    emoji: "\u{1F3C6}",
    color: "bg-yellow-500",
  },
  challenge: { label: "Sfida", emoji: "\u{1F3AF}", color: "bg-purple-500" },
  streak: { label: "Serie", emoji: "\u{1F525}", color: "bg-orange-500" },
  bonus: { label: "Bonus", emoji: "\u{1F381}", color: "bg-pink-500" },
  admin: { label: "Admin", emoji: "\u{2699}", color: "bg-gray-500" },
};

const getRarity = (r: string) => rarityConfig[r] || rarityConfig.common;
const getCategory = (c: string) => categoryConfig[c] || categoryConfig.workout;
const getTxType = (t: string) => txTypeConfig[t] || txTypeConfig.workout;

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Adesso";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} giorni fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

// Title unlock animation state
const showUnlockAnimation = ref(false);
const unlockedTitle = ref<Title | null>(null);

const handleClientChange = (e: Event) => {
  gamification.setClient(
    ((e.target as HTMLSelectElement).value as any) || null,
  );
};

const handleSetDisplayed = async (titleId: number) => {
  await gamification.setDisplayedTitle(titleId);
};

const handleRemoveDisplayed = async () => {
  await gamification.setDisplayedTitle(null as any);
};

const handleViewAllTitles = () => {
  // Navigate to titles page
  router.push("/titles");
};

onMounted(async () => {
  await gamification.initialize(isTrainer.value);
  // Load titles solo se c'e un client selezionato (o se siamo client)
  if (!isTrainer.value || gamification.selectedClientId) {
    gamification.fetchTitles();
    gamification.fetchDisplayedTitle();
  }
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Gamification
        </h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Livelli, obiettivi, sfide e classifiche
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <!-- Client selector per trainer -->
        <select
          v-if="isTrainer"
          @change="handleClientChange"
          class="bg-habit-card border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
        >
          <option value="">Seleziona cliente</option>
          <option v-for="c in gamification.clients" :key="c.id" :value="c.id">
            {{ c.first_name }} {{ c.last_name }}
          </option>
        </select>
        <!-- Quick links -->
        <div class="flex gap-2">
          <router-link
            to="/leaderboard"
            class="px-3 py-2 rounded-habit text-xs font-medium bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan transition"
          >
            Classifica
          </router-link>
          <router-link
            to="/challenges"
            class="px-3 py-2 rounded-habit text-xs font-medium bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan transition"
          >
            Sfide
          </router-link>
          <router-link
            to="/titles"
            class="px-3 py-2 rounded-habit text-xs font-medium bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan transition"
          >
            Titoli
          </router-link>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="gamification.loading && !gamification.dashboard"
      class="space-y-4"
    >
      <div class="bg-habit-card rounded-habit p-6 animate-pulse">
        <div class="flex items-center gap-4 sm:gap-6">
          <div class="w-20 h-20 bg-habit-skeleton rounded-full"></div>
          <div class="flex-1 space-y-3">
            <div class="h-5 w-40 bg-habit-skeleton rounded"></div>
            <div class="h-3 w-full bg-habit-skeleton rounded"></div>
            <div class="h-3 w-24 bg-habit-skeleton rounded"></div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-habit-card rounded-habit p-4 animate-pulse"
        >
          <div class="h-4 w-24 bg-habit-skeleton rounded mb-3"></div>
          <div class="h-8 w-16 bg-habit-skeleton rounded"></div>
        </div>
      </div>
    </div>

    <!-- Contenuto dashboard -->
    <div v-else-if="gamification.dashboard">
      <!-- Stats Hero Card -->
      <div
        class="bg-habit-card rounded-habit border border-habit-border p-4 sm:p-6 mb-4 sm:mb-6"
      >
        <div class="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
          <!-- Level badge -->
          <div class="relative">
            <div
              class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"
            >
              <div class="text-center">
                <div class="text-2xl sm:text-3xl font-bold text-habit-text">
                  {{ gamification.dashboard.level }}
                </div>
                <div
                  class="text-[10px] sm:text-xs text-cyan-200 uppercase tracking-wider"
                >
                  Livello
                </div>
              </div>
            </div>
            <div
              v-if="gamification.dashboard.streak > 0"
              class="absolute -bottom-1 -right-1 bg-orange-500 text-habit-text text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
            >
              {{ gamification.dashboard.streak }}d
            </div>
          </div>

          <!-- XP Progress -->
          <div class="flex-1 w-full">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-semibold text-habit-text"
                >Punti Esperienza</span
              >
              <span class="text-sm text-habit-cyan font-bold"
                >{{ gamification.dashboard.xp }} XP</span
              >
            </div>
            <div
              class="w-full h-3 bg-habit-bg rounded-full overflow-hidden mb-2"
            >
              <div
                class="h-full bg-gradient-to-r from-habit-cyan to-blue-500 rounded-full transition-all duration-500"
                :style="{ width: gamification.dashboard.xpProgress + '%' }"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-habit-text-subtle">
              <span>Lv. {{ gamification.dashboard.level }}</span>
              <span
                >{{ gamification.dashboard.xpInLevel }} /
                {{ gamification.dashboard.xpNeeded }} XP</span
              >
              <span>Lv. {{ gamification.dashboard.level + 1 }}</span>
            </div>
          </div>

          <!-- Mini stats -->
          <div class="flex md:flex-col gap-3">
            <div
              class="bg-habit-bg rounded-lg px-3 sm:px-4 py-2 text-center flex-1"
            >
              <div class="text-lg font-bold text-yellow-400">
                {{ gamification.dashboard.achievementsUnlocked }}
              </div>
              <div class="text-[10px] text-habit-text-subtle uppercase">
                Badge
              </div>
            </div>
            <div
              class="bg-habit-bg rounded-lg px-3 sm:px-4 py-2 text-center flex-1"
            >
              <div class="text-lg font-bold text-purple-400">
                {{ gamification.dashboard.titlesUnlocked }}
              </div>
              <div class="text-[10px] text-habit-text-subtle uppercase">
                Titoli
              </div>
            </div>
            <div
              class="bg-habit-bg rounded-lg px-3 sm:px-4 py-2 text-center flex-1"
            >
              <div class="text-lg font-bold text-green-400">
                {{ gamification.dashboard.activeChallenges }}
              </div>
              <div class="text-[10px] text-habit-text-subtle uppercase">
                Sfide
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ultimi Obiettivi Sbloccati -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-habit-text mb-3">
          Ultimi Obiettivi Sbloccati
        </h2>

        <div
          v-if="gamification.recentAchievements.length === 0"
          class="bg-habit-card rounded-habit border border-habit-border p-8 text-center"
        >
          <div class="text-3xl mb-2">&#127942;</div>
          <p class="text-habit-text-subtle text-sm">
            Nessun obiettivo sbloccato ancora. Inizia ad allenarti!
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
        >
          <div
            v-for="ach in gamification.recentAchievements"
            :key="ach.id"
            :class="[
              'bg-habit-card rounded-habit border p-3 sm:p-4 flex flex-col',
              getRarity(ach.rarity).border,
            ]"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">{{ ach.icon_url || "&#127942;" }}</span>
              <span
                :class="[
                  getRarity(ach.rarity).color,
                  getRarity(ach.rarity).bg,
                  'px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase',
                ]"
              >
                {{ getRarity(ach.rarity).label }}
              </span>
            </div>
            <h4 class="text-sm font-semibold text-habit-text mb-1 truncate">
              {{ ach.name }}
            </h4>
            <p class="text-xs text-habit-text-subtle line-clamp-2 mb-2 flex-1">
              {{ ach.description }}
            </p>
            <div class="flex justify-between items-center">
              <span class="text-xs text-habit-cyan font-bold"
                >+{{ ach.xp_reward }} XP</span
              >
              <span class="text-[10px] text-habit-text-subtle">{{
                formatDate(ach.unlocked_at)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Obiettivi per Categoria -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-habit-text mb-3">
          Obiettivi per Categoria
        </h2>

        <div
          v-if="gamification.achievementsByCategory.length === 0"
          class="bg-habit-card rounded-habit border border-habit-border p-8 text-center"
        >
          <p class="text-habit-text-subtle text-sm">
            Nessun obiettivo disponibile
          </p>
        </div>

        <div v-else class="flex flex-wrap justify-center gap-3">
          <div
            v-for="cat in gamification.achievementsByCategory"
            :key="cat.category"
            :class="[
              'bg-habit-card rounded-habit border border-habit-border p-4 hover:border-habit-border transition w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]',
              getCategory(cat.category).bg,
            ]"
          >
            <div class="flex items-center gap-3 mb-3">
              <span class="text-2xl">{{
                getCategory(cat.category).emoji
              }}</span>
              <div class="flex-1">
                <h4
                  :class="[
                    'text-sm font-semibold',
                    getCategory(cat.category).color,
                  ]"
                >
                  {{ getCategory(cat.category).label }}
                </h4>
                <span class="text-xs text-habit-text-subtle"
                  >{{ cat.unlocked }}/{{ cat.total }} sbloccati</span
                >
              </div>
            </div>
            <div class="w-full h-2 bg-habit-bg rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="
                  getCategory(cat.category)
                    .color.replace('text-', 'bg-')
                    .replace('habit-cyan', 'cyan-500')
                "
                :style="{
                  width:
                    (cat.total > 0 ? (cat.unlocked / cat.total) * 100 : 0) +
                    '%',
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sfide in Corso + Attivita XP (2 colonne) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Sfide in Corso -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-lg font-semibold text-habit-text">
              Sfide in Corso
            </h2>
            <router-link
              to="/challenges"
              class="text-xs text-habit-cyan hover:underline"
              >Vedi tutte</router-link
            >
          </div>

          <div
            v-if="gamification.activeChallengesPreview.length === 0"
            class="bg-habit-card rounded-habit border border-habit-border p-6 text-center"
          >
            <div class="text-3xl mb-2">&#127919;</div>
            <p class="text-habit-text-subtle text-sm">Nessuna sfida attiva</p>
            <router-link
              to="/challenges"
              class="inline-block mt-3 text-xs text-habit-cyan hover:underline"
            >
              Scopri le sfide
            </router-link>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="ch in gamification.activeChallengesPreview"
              :key="ch.id"
              class="bg-habit-card rounded-habit border border-habit-border p-4"
            >
              <div class="flex justify-between items-start mb-2">
                <h4 class="text-sm font-semibold text-habit-text">
                  {{ ch.name }}
                </h4>
                <span class="text-xs text-habit-cyan font-bold"
                  >+{{ ch.xp_reward }} XP</span
                >
              </div>
              <div class="mb-2">
                <div
                  class="flex justify-between text-xs text-habit-text-subtle mb-1"
                >
                  <span
                    >{{ ch.current_value || 0 }} / {{ ch.target_value }}</span
                  >
                  <span>{{ ch.progress_pct || 0 }}%</span>
                </div>
                <div
                  class="w-full h-2 bg-habit-bg rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-gradient-to-r from-green-500 to-habit-cyan rounded-full transition-all"
                    :style="{
                      width: Math.min(ch.progress_pct || 0, 100) + '%',
                    }"
                  ></div>
                </div>
              </div>
              <div
                class="flex justify-between text-[10px] text-habit-text-subtle"
              >
                <span>{{ ch.challenge_type }}</span>
                <span
                  v-if="ch.days_remaining != null && ch.days_remaining >= 0"
                  :class="
                    ch.days_remaining <= 3
                      ? 'text-red-400'
                      : 'text-habit-text-subtle'
                  "
                >
                  {{ ch.days_remaining }} giorni rimanenti
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Attivita XP Recente -->
        <div>
          <h2 class="text-lg font-semibold text-habit-text mb-3">
            Attivita XP Recente
          </h2>

          <div
            v-if="gamification.recentXPActivity.length === 0"
            class="bg-habit-card rounded-habit border border-habit-border p-6 text-center"
          >
            <div class="text-3xl mb-2">&#9889;</div>
            <p class="text-habit-text-subtle text-sm">
              Nessuna attivita XP registrata
            </p>
          </div>

          <div
            v-else
            class="bg-habit-card rounded-habit border border-habit-border divide-y divide-habit-border"
          >
            <div
              v-for="tx in gamification.recentXPActivity"
              :key="tx.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <div
                :class="[
                  'w-2 h-2 rounded-full shrink-0',
                  getTxType(tx.transaction_type).color,
                ]"
              ></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm">{{
                    getTxType(tx.transaction_type).emoji
                  }}</span>
                  <span class="text-sm text-habit-text truncate">{{
                    tx.description || getTxType(tx.transaction_type).label
                  }}</span>
                </div>
                <span class="text-[10px] text-habit-text-subtle">{{
                  formatDate(tx.created_at)
                }}</span>
              </div>
              <span
                :class="[
                  'text-sm font-bold shrink-0',
                  tx.points >= 0 ? 'text-green-400' : 'text-red-400',
                ]"
              >
                {{ tx.points >= 0 ? "+" : "" }}{{ tx.points }} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Titoli e Progressi (2 colonne) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- TitleShowcase -->
        <TitleShowcase
          :titles="gamification.titles as any[]"
          :displayedTitle="gamification.displayedTitle as any"
          @set-displayed="handleSetDisplayed"
          @remove-displayed="handleRemoveDisplayed"
          @view-all="handleViewAllTitles"
        />

        <!-- TitleProgress -->
        <TitleProgress :titles="gamification.titles as any[]" />
      </div>

      <!-- Unlock Animation -->
      <TitleUnlockAnimation
        :show="showUnlockAnimation"
        :title="unlockedTitle as any"
        @close="showUnlockAnimation = false"
        @set-displayed="handleSetDisplayed"
      />

      <!-- Navigazione Rapida -->
      <div class="flex flex-wrap justify-center gap-4">
        <router-link
          to="/leaderboard"
          class="bg-habit-card rounded-habit border border-habit-border p-5 text-center hover:border-habit-cyan transition group w-full sm:w-[calc(33.333%-0.7rem)]"
        >
          <div class="text-3xl mb-2">&#127942;</div>
          <h3
            class="text-sm font-semibold text-habit-text mb-1 group-hover:text-habit-cyan transition"
          >
            Classifica
          </h3>
          <p class="text-xs text-habit-text-subtle">
            Scopri la classifica dei clienti
          </p>
        </router-link>
        <router-link
          to="/challenges"
          class="bg-habit-card rounded-habit border border-habit-border p-5 text-center hover:border-habit-cyan transition group w-full sm:w-[calc(33.333%-0.7rem)]"
        >
          <div class="text-3xl mb-2">&#127919;</div>
          <h3
            class="text-sm font-semibold text-habit-text mb-1 group-hover:text-habit-cyan transition"
          >
            Sfide
          </h3>
          <p class="text-xs text-habit-text-subtle">
            Partecipa alle sfide attive
          </p>
        </router-link>
        <router-link
          to="/titles"
          class="bg-habit-card rounded-habit border border-habit-border p-5 text-center hover:border-habit-cyan transition group w-full sm:w-[calc(33.333%-0.7rem)]"
        >
          <div class="text-3xl mb-2">&#128081;</div>
          <h3
            class="text-sm font-semibold text-habit-text mb-1 group-hover:text-habit-cyan transition"
          >
            Titoli
          </h3>
          <p class="text-xs text-habit-text-subtle">
            Sblocca titoli unici per esercizio
          </p>
        </router-link>
      </div>
    </div>

    <!-- No client selected (trainer mode) -->
    <div
      v-else-if="
        isTrainer && !gamification.selectedClientId && !gamification.loading
      "
      class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
    >
      <div class="text-4xl mb-3">&#127918;</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Seleziona un cliente
      </h3>
      <p class="text-habit-text-subtle text-sm">
        Scegli un cliente dal menu per visualizzare i dati gamification
      </p>
    </div>
  </div>
</template>
