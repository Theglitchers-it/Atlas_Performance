<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useGamificationStore } from "@/store/gamification";
import { useAuthStore } from "@/store/auth";
import TitleManager from "@/components/gamification/TitleManager.vue";

interface ConfigItem {
  label: string;
  emoji?: string;
  color: string;
  bg: string;
  border?: string;
}

const gamification = useGamificationStore();
const auth = useAuthStore();

const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as string),
);

// Config categorie titoli
const categoryConfig: Record<string, ConfigItem> = {
  strength: {
    label: "Forza",
    emoji: "\u{1F4AA}",
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
  consistency: {
    label: "Costanza",
    emoji: "\u{1F525}",
    color: "text-green-400",
    bg: "bg-green-500/20",
  },
  transformation: {
    label: "Trasformazione",
    emoji: "\u{1F4C8}",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  custom: {
    label: "Personalizzato",
    emoji: "\u{2B50}",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
};

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

// Config metric type
const metricLabels: Record<string, string> = {
  weight_kg: "kg",
  reps: "reps",
  consecutive_days: "giorni",
  weight_loss: "kg persi",
  weight_gain: "kg guadagnati",
};

const getCategory = (c: string) => categoryConfig[c] || categoryConfig.custom;
const getRarity = (r: string) => rarityConfig[r] || rarityConfig.common;
const getMetricLabel = (m: string): string => metricLabels[m] || "";

// State
const filterCategory = ref("");
const filterUnlocked = ref(false);

// Raggruppamento per esercizio
const groupedTitles = computed(() => {
  const groups: Record<string, any> = {};
  for (const title of gamification.titles as any[]) {
    const key = title.exercise_name || title.category || "Altro";
    if (!groups[key]) {
      groups[key] = {
        name: key,
        category: title.category,
        titles: [] as any[],
        unlocked: 0,
        total: 0,
      };
    }
    groups[key].titles.push(title);
    groups[key].total++;
    if (title.unlocked) groups[key].unlocked++;
  }
  return Object.values(groups);
});

// Titolo attualmente mostrato
const displayedTitle = computed(() => gamification.displayedTitle);

// Handlers
const loadTitles = () => {
  const options: Record<string, any> = {};
  if (filterCategory.value) options.category = filterCategory.value;
  if (filterUnlocked.value) options.unlockedOnly = "true";
  if (gamification.selectedClientId)
    options.clientId = gamification.selectedClientId;
  gamification.fetchTitles(options);
};

const handleCategoryFilter = (cat: string) => {
  filterCategory.value = cat;
  loadTitles();
};

const handleUnlockedToggle = () => {
  filterUnlocked.value = !filterUnlocked.value;
  loadTitles();
};

const handleSetDisplayed = async (titleId: number) => {
  const result = await gamification.setDisplayedTitle(titleId);
  if (result.success) {
    loadTitles();
  }
};

const handleRemoveDisplayed = async () => {
  await gamification.setDisplayedTitle(null as any);
  loadTitles();
};

const handleClientChange = (e: Event) => {
  gamification.selectedClientId = ((e.target as HTMLSelectElement).value ||
    null) as any;
  loadTitles();
  gamification.fetchDisplayedTitle();
};

onMounted(() => {
  loadTitles();
  gamification.fetchDisplayedTitle();
  if (isTrainer.value && gamification.clients.length === 0) {
    gamification.fetchClients();
  }
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Titoli</h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Sblocca titoli raggiungendo traguardi negli esercizi
        </p>
      </div>
      <div class="flex items-center gap-3">
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
        <router-link
          to="/gamification"
          class="px-3 py-2 rounded-habit text-xs font-medium bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan transition"
        >
          &larr; Gamification
        </router-link>
      </div>
    </div>

    <!-- Titolo mostrato -->
    <div
      v-if="displayedTitle"
      class="bg-habit-card rounded-habit border border-yellow-500/30 p-4 mb-6"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="text-2xl">&#128081;</div>
          <div>
            <div class="text-xs text-habit-text-subtle uppercase mb-0.5">
              Titolo attivo
            </div>
            <div class="text-base font-bold text-yellow-400">
              {{ displayedTitle.title_name }}
            </div>
            <div class="text-xs text-habit-text-subtle">
              {{ displayedTitle.title_description }}
            </div>
          </div>
        </div>
        <button
          @click="handleRemoveDisplayed"
          class="text-xs text-habit-text-subtle hover:text-red-400 transition"
        >
          Rimuovi
        </button>
      </div>
    </div>

    <!-- Filtri -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button
        @click="handleCategoryFilter('')"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition',
          !filterCategory
            ? 'bg-habit-cyan text-habit-bg'
            : 'bg-habit-card text-habit-text-subtle hover:text-habit-text border border-habit-border',
        ]"
      >
        Tutte
      </button>
      <button
        v-for="(cfg, key) in categoryConfig"
        :key="key"
        @click="handleCategoryFilter(key)"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition',
          filterCategory === key
            ? 'bg-habit-cyan text-habit-bg'
            : 'bg-habit-card text-habit-text-subtle hover:text-habit-text border border-habit-border',
        ]"
      >
        {{ cfg.emoji }} {{ cfg.label }}
      </button>
      <div class="ml-auto">
        <button
          @click="handleUnlockedToggle"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition border',
            filterUnlocked
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-habit-card text-habit-text-subtle border-habit-border hover:text-habit-text',
          ]"
        >
          Solo sbloccati
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="gamification.loading && gamification.titles.length === 0"
      class="space-y-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="bg-habit-card rounded-habit p-5 animate-pulse"
      >
        <div class="h-5 w-40 bg-habit-skeleton rounded mb-4"></div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="j in 3"
            :key="j"
            class="h-24 bg-habit-skeleton rounded"
          ></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="gamification.titles.length === 0"
      class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
    >
      <div class="text-4xl mb-3">&#128081;</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Nessun titolo trovato
      </h3>
      <p class="text-habit-text-subtle text-sm">
        {{
          filterUnlocked
            ? "Nessun titolo sbloccato ancora."
            : "Non ci sono titoli in questa categoria."
        }}
      </p>
    </div>

    <!-- Gruppi titoli per esercizio -->
    <div v-else class="space-y-6">
      <div v-for="group in groupedTitles" :key="group.name">
        <!-- Header gruppo -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ getCategory(group.category).emoji }}</span>
            <h2 class="text-base font-semibold text-habit-text">
              {{ group.name }}
            </h2>
            <span class="text-xs text-habit-text-subtle"
              >({{ group.unlocked }}/{{ group.total }})</span
            >
          </div>
          <!-- Mini progress -->
          <div class="w-24 h-1.5 bg-habit-bg rounded-full overflow-hidden">
            <div
              class="h-full bg-habit-cyan rounded-full transition-all"
              :style="{
                width:
                  (group.total > 0 ? (group.unlocked / group.total) * 100 : 0) +
                  '%',
              }"
            ></div>
          </div>
        </div>

        <!-- Griglia titoli -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="title in group.titles"
            :key="title.id"
            :class="[
              'bg-habit-card rounded-habit border p-4 transition relative',
              title.unlocked
                ? getRarity(title.rarity).border + ' hover:border-habit-border'
                : 'border-habit-border opacity-60',
            ]"
          >
            <!-- Rarity badge -->
            <div class="flex items-center justify-between mb-2">
              <span
                :class="[
                  getRarity(title.rarity).color,
                  getRarity(title.rarity).bg,
                  'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                ]"
              >
                {{ getRarity(title.rarity).label }}
              </span>
              <!-- Icona lucchetto se non sbloccato -->
              <span
                v-if="!title.unlocked"
                class="text-habit-text-subtle text-sm"
                >&#128274;</span
              >
              <!-- Icona mostrato -->
              <span
                v-else-if="title.is_displayed"
                class="text-yellow-400 text-sm"
                title="Titolo attivo"
                >&#128081;</span
              >
            </div>

            <!-- Nome titolo -->
            <h4 class="text-sm font-semibold text-habit-text mb-1">
              {{ title.title_name }}
            </h4>
            <p
              v-if="title.title_description"
              class="text-xs text-habit-text-subtle line-clamp-2 mb-2"
            >
              {{ title.title_description }}
            </p>

            <!-- Soglia -->
            <div class="text-xs text-habit-text-subtle mb-3">
              Soglia:
              <span class="text-habit-text font-medium"
                >{{ title.threshold_value }}
                {{ getMetricLabel(title.metric_type) }}</span
              >
            </div>

            <!-- Stato & azione -->
            <div
              v-if="title.unlocked"
              class="flex items-center justify-between"
            >
              <span class="text-[10px] text-green-400">
                Sbloccato{{
                  title.unlocked_value
                    ? ` (${title.unlocked_value} ${getMetricLabel(title.metric_type)})`
                    : ""
                }}
              </span>
              <button
                v-if="!title.is_displayed"
                @click="handleSetDisplayed(title.id)"
                class="text-[10px] text-habit-cyan hover:underline font-medium"
              >
                Mostra
              </button>
            </div>
            <div v-else class="text-[10px] text-habit-text-subtle">
              Non ancora sbloccato
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gestione Titoli (solo Trainer) -->
    <div v-if="isTrainer" class="mt-8">
      <TitleManager />
    </div>
  </div>
</template>
