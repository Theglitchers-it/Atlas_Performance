<script setup lang="ts">
/**
 * TitleShowcase - Vetrina titoli sbloccati
 * Mostra i titoli sbloccati dal cliente con effetti visivi per rarita
 */
import { computed } from "vue";

interface ShowcaseTitle {
  id: number;
  title_name: string;
  exercise_name?: string;
  category: string;
  metric_type: string;
  threshold_value: number;
  rarity: string;
  unlocked?: boolean;
  is_displayed?: boolean;
}

interface RarityVisual {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
}

interface Props {
  titles?: ShowcaseTitle[];
  displayedTitle?: ShowcaseTitle | null;
  maxShow?: number;
}

const props = withDefaults(defineProps<Props>(), {
  titles: () => [],
  displayedTitle: null,
  maxShow: 6,
});

const emit = defineEmits<{
  (e: "set-displayed", id: number): void;
  (e: "remove-displayed"): void;
  (e: "view-all"): void;
}>();

const rarityConfig: Record<string, RarityVisual> = {
  common: {
    label: "Comune",
    color: "text-habit-text-subtle",
    bg: "bg-habit-skeleton/50",
    border: "border-habit-border",
    glow: "",
  },
  uncommon: {
    label: "Non comune",
    color: "text-green-400",
    bg: "bg-green-500/20",
    border: "border-green-500/30",
    glow: "",
  },
  rare: {
    label: "Raro",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10 shadow-md",
  },
  epic: {
    label: "Epico",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/15 shadow-lg",
  },
  legendary: {
    label: "Leggendario",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/30",
    glow: "shadow-yellow-500/20 shadow-lg",
  },
};

const getRarity = (r: string): RarityVisual =>
  rarityConfig[r] || rarityConfig.common;

const unlockedTitles = computed(() =>
  props.titles.filter((t) => t.unlocked).slice(0, props.maxShow),
);

const totalUnlocked = computed(
  () => props.titles.filter((t) => t.unlocked).length,
);
</script>

<template>
  <div class="bg-habit-card border border-habit-border rounded-habit p-5">
    <div class="flex items-center justify-between mb-4">
      <h3
        class="text-base font-semibold text-habit-text flex items-center gap-2"
      >
        <span class="text-lg">&#128081;</span> Titoli Sbloccati
      </h3>
      <button
        v-if="totalUnlocked > maxShow"
        @click="emit('view-all')"
        class="text-xs text-habit-cyan hover:underline font-medium"
      >
        Vedi tutti ({{ totalUnlocked }})
      </button>
    </div>

    <!-- Titolo attivo -->
    <div
      v-if="displayedTitle"
      class="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3 mb-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">&#128081;</span>
          <div>
            <div class="text-[10px] text-habit-text-subtle uppercase">
              Titolo attivo
            </div>
            <div class="text-sm font-bold text-yellow-400">
              {{ displayedTitle.title_name }}
            </div>
          </div>
        </div>
        <button
          @click="emit('remove-displayed')"
          class="text-[10px] text-habit-text-subtle hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/10"
        >
          Rimuovi
        </button>
      </div>
    </div>

    <!-- Grid titoli sbloccati -->
    <div
      v-if="unlockedTitles.length > 0"
      class="flex flex-wrap justify-center gap-2.5"
    >
      <div
        v-for="title in unlockedTitles"
        :key="title.id"
        :class="[
          'rounded-lg border p-3 transition-all cursor-pointer hover:scale-[1.02] w-[calc(50%-0.35rem)] sm:w-[calc(33.333%-0.45rem)]',
          getRarity(title.rarity).border,
          getRarity(title.rarity).glow,
          title.is_displayed ? 'ring-1 ring-yellow-500/40' : '',
        ]"
        @click="!title.is_displayed && emit('set-displayed', title.id)"
      >
        <!-- Rarity badge -->
        <div class="flex items-center justify-between mb-1.5">
          <span
            :class="[
              getRarity(title.rarity).color,
              getRarity(title.rarity).bg,
              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
            ]"
          >
            {{ getRarity(title.rarity).label }}
          </span>
          <span v-if="title.is_displayed" class="text-yellow-400 text-xs"
            >&#128081;</span
          >
        </div>
        <!-- Title name -->
        <h4 class="text-xs font-semibold text-habit-text truncate">
          {{ title.title_name }}
        </h4>
        <p
          v-if="title.exercise_name"
          class="text-[10px] text-habit-text-subtle truncate"
        >
          {{ title.exercise_name }}
        </p>
        <!-- Threshold -->
        <div class="text-[10px] text-habit-text-subtle mt-1">
          {{ title.threshold_value }}
          {{
            title.metric_type === "weight_kg"
              ? "kg"
              : title.metric_type === "consecutive_days"
                ? "gg"
                : ""
          }}
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-6">
      <div class="text-3xl mb-2">&#128274;</div>
      <p class="text-habit-text-subtle text-sm">
        Nessun titolo sbloccato ancora
      </p>
      <p class="text-habit-text-subtle text-xs mt-1">
        Raggiungi nuovi traguardi per sbloccare titoli
      </p>
    </div>
  </div>
</template>
