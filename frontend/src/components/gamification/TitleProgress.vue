<script setup lang="ts">
/**
 * TitleProgress - Barra progresso verso il prossimo titolo
 * Mostra per ogni esercizio il progresso verso il titolo successivo
 */

interface TitleData {
  id: number;
  title_name: string;
  exercise_name?: string;
  category: string;
  metric_type: string;
  threshold_value: number;
  rarity: string;
  unlocked?: boolean;
  unlocked_value?: number;
}

interface Props {
  titles?: TitleData[];
  maxShow?: number;
}

const props = withDefaults(defineProps<Props>(), {
  titles: () => [],
  maxShow: 5,
});

const categoryConfig: Record<string, { emoji: string; color: string }> = {
  strength: { emoji: "&#128170;", color: "from-red-500 to-red-600" },
  consistency: { emoji: "&#128293;", color: "from-green-500 to-green-600" },
  transformation: { emoji: "&#128200;", color: "from-blue-500 to-blue-600" },
  custom: { emoji: "&#11088;", color: "from-yellow-500 to-yellow-600" },
};

const metricLabels: Record<string, string> = {
  weight_kg: "kg",
  reps: "reps",
  consecutive_days: "giorni",
  weight_loss: "kg persi",
  weight_gain: "kg guadagnati",
};

// Group titles by exercise and find next locked for each
const nextTitles = (() => {
  const exerciseMap: Record<
    string,
    {
      name: string;
      category: string;
      locked: TitleData[];
      bestUnlocked: TitleData | null;
    }
  > = {};
  for (const t of props.titles) {
    const key = t.exercise_name || t.category || "Generale";
    if (!exerciseMap[key])
      exerciseMap[key] = {
        name: key,
        category: t.category,
        locked: [],
        bestUnlocked: null,
      };
    if (t.unlocked) {
      if (
        !exerciseMap[key].bestUnlocked ||
        t.threshold_value > exerciseMap[key].bestUnlocked.threshold_value
      ) {
        exerciseMap[key].bestUnlocked = t;
      }
    } else {
      exerciseMap[key].locked.push(t);
    }
  }

  const result: {
    exerciseName: string;
    category: string;
    nextTitle: TitleData;
    currentValue: number;
    targetValue: number;
    progress: number;
    remaining: number;
    metricLabel: string;
  }[] = [];
  for (const [, data] of Object.entries(exerciseMap)) {
    if (data.locked.length === 0) continue;
    // Sort locked by threshold ascending -> next one
    data.locked.sort(
      (a: TitleData, b: TitleData) => a.threshold_value - b.threshold_value,
    );
    const next = data.locked[0];
    const currentValue =
      data.bestUnlocked?.unlocked_value ||
      data.bestUnlocked?.threshold_value ||
      0;
    const progress =
      next.threshold_value > 0
        ? Math.min((currentValue / next.threshold_value) * 100, 99)
        : 0;

    result.push({
      exerciseName: data.name,
      category: data.category,
      nextTitle: next,
      currentValue,
      targetValue: next.threshold_value,
      progress: Math.round(progress),
      remaining: next.threshold_value - currentValue,
      metricLabel: metricLabels[next.metric_type] || "",
    });
  }

  // Sort by progress descending (closest to unlocking first)
  result.sort((a, b) => b.progress - a.progress);
  return result.slice(0, props.maxShow);
})();

const getGradient = (cat: string): string =>
  categoryConfig[cat]?.color || "from-cyan-500 to-blue-500";
</script>

<template>
  <div
    v-if="nextTitles.length > 0"
    class="bg-habit-card border border-habit-border rounded-habit p-5"
  >
    <h3
      class="text-base font-semibold text-habit-text mb-4 flex items-center gap-2"
    >
      <span>&#127919;</span> Prossimi Titoli
    </h3>

    <div class="space-y-3">
      <div
        v-for="item in nextTitles"
        :key="item.exerciseName"
        class="bg-habit-bg-light rounded-lg p-3"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-habit-text">{{
              item.exerciseName
            }}</span>
            <span class="text-[10px] text-habit-text-subtle">→</span>
            <span class="text-xs font-medium text-habit-cyan">{{
              item.nextTitle.title_name
            }}</span>
          </div>
          <span class="text-xs text-habit-text-subtle font-medium"
            >{{ item.progress }}%</span
          >
        </div>

        <!-- Progress bar -->
        <div class="w-full h-2 bg-habit-bg rounded-full overflow-hidden mb-1.5">
          <div
            :class="[
              'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
              getGradient(item.category),
            ]"
            :style="{ width: item.progress + '%' }"
          ></div>
        </div>

        <div class="flex justify-between text-[10px] text-habit-text-subtle">
          <span>Attuale: {{ item.currentValue }} {{ item.metricLabel }}</span>
          <span>Obiettivo: {{ item.targetValue }} {{ item.metricLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
