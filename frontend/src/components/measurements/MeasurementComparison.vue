<template>
  <div class="card">
    <div class="p-3 sm:p-4 border-b border-habit-border">
      <h3 class="font-semibold text-habit-text text-xs sm:text-sm mb-2 sm:mb-3">
        Confronto Misurazioni
      </h3>

      <!-- Date selectors -->
      <div class="flex items-center gap-2 sm:gap-3">
        <div class="flex-1 min-w-0">
          <label class="label text-xs">Data iniziale</label>
          <select
            v-model="selectedDate1"
            class="input w-full text-xs sm:text-sm"
            @change="loadComparison"
          >
            <option value="">Seleziona...</option>
            <option v-for="d in uniqueDates" :key="d" :value="d">
              {{ formatDateLong(d) }}
            </option>
          </select>
        </div>
        <div class="flex items-center pt-5">
          <svg
            class="w-4 h-4 sm:w-5 sm:h-5 text-habit-text-muted shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <label class="label text-xs">Data finale</label>
          <select
            v-model="selectedDate2"
            class="input w-full text-xs sm:text-sm"
            @change="loadComparison"
          >
            <option value="">Seleziona...</option>
            <option v-for="d in uniqueDates" :key="d" :value="d">
              {{ formatDateLong(d) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="p-4 sm:p-6">
      <div class="space-y-2 sm:space-y-3">
        <div
          v-for="i in 5"
          :key="i"
          class="h-7 sm:h-8 bg-habit-skeleton rounded animate-pulse"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!comparison || !selectedDate1 || !selectedDate2"
      class="p-4 sm:p-6 text-center text-habit-text-muted text-xs sm:text-sm"
    >
      Seleziona due date per confrontare le misurazioni
    </div>

    <!-- Comparison table -->
    <div v-else class="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div v-for="section in comparisonSections" :key="section.title">
        <div v-if="section.rows.length > 0" class="space-y-0.5 sm:space-y-1">
          <h4
            class="text-[10px] sm:text-xs font-medium text-habit-text-muted uppercase tracking-wider mb-1.5 sm:mb-2"
          >
            {{ section.title }}
          </h4>
          <div
            v-for="row in section.rows"
            :key="row.label"
            class="flex items-center justify-between py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg hover:bg-habit-bg-light transition-colors"
          >
            <span class="text-xs sm:text-sm text-habit-text truncate mr-2">{{
              row.label
            }}</span>
            <div
              class="flex items-center gap-1.5 xs:gap-3 text-xs xs:text-sm shrink-0"
            >
              <span class="text-habit-text-muted w-12 xs:w-16 text-right">{{
                row.before ?? "\u2014"
              }}</span>
              <span
                v-if="row.delta !== null"
                class="font-medium w-14 xs:w-20 text-center px-1.5 xs:px-2 py-0.5 rounded-full text-xs"
                :class="getDeltaClass(row.delta, row.inverse)"
              >
                {{ row.delta > 0 ? "+" : "" }}{{ row.delta }} {{ row.unit }}
              </span>
              <span
                v-else
                class="w-14 xs:w-20 text-center text-habit-text-muted text-xs"
                >\u2014</span
              >
              <span
                class="text-habit-text font-medium w-12 xs:w-16 text-right"
                >{{ row.after ?? "\u2014" }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useMeasurementStore } from "@/store/measurement";

const store = useMeasurementStore();

const selectedDate1 = ref("");
const selectedDate2 = ref("");

const loading = computed(() => store.comparisonLoading);
const comparison = computed(() => store.comparison);

const uniqueDates = computed(() => {
  const dates = new Set(store.availableDates.map((d) => d.measurement_date));
  return [...dates].sort((a, b) => a.localeCompare(b));
});

// Auto-select first and last dates
watch(
  () => uniqueDates.value,
  (dates) => {
    if (dates.length >= 2 && !selectedDate1.value && !selectedDate2.value) {
      selectedDate1.value = dates[0];
      selectedDate2.value = dates[dates.length - 1];
      loadComparison();
    }
  },
  { immediate: true },
);

const loadComparison = async () => {
  if (selectedDate1.value && selectedDate2.value) {
    await store.fetchComparison(selectedDate1.value, selectedDate2.value);
  }
};

const formatDateLong = (d: string) => {
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDeltaClass = (delta: number, inverse: boolean) => {
  const isPositive = inverse ? delta < 0 : delta > 0;
  const isNegative = inverse ? delta > 0 : delta < 0;
  if (isPositive)
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (isNegative)
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
};

interface ComparisonRow {
  label: string;
  before: string | null;
  after: string | null;
  delta: number | null;
  unit: string;
  inverse: boolean; // true = decrease is positive (e.g., body fat)
}

const round = (v: number | null | undefined, decimals = 1) => {
  if (v == null) return null;
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const makeRow = (
  label: string,
  beforeVal: number | null | undefined,
  afterVal: number | null | undefined,
  unit: string,
  inverse = false,
): ComparisonRow => {
  const b = round(beforeVal);
  const a = round(afterVal);
  return {
    label,
    before: b != null ? `${b}` : null,
    after: a != null ? `${a}` : null,
    delta: b != null && a != null ? round(a - b) : null,
    unit,
    inverse,
  };
};

const comparisonSections = computed(() => {
  if (!comparison.value) return [];

  const c = comparison.value;
  const sections = [];

  // Anthropometric
  const anthroRows: ComparisonRow[] = [];
  if (c.anthropometric.before || c.anthropometric.after) {
    anthroRows.push(
      makeRow(
        "Peso",
        c.anthropometric.before?.weight_kg,
        c.anthropometric.after?.weight_kg,
        "kg",
        true,
      ),
    );
    anthroRows.push(
      makeRow(
        "Altezza",
        c.anthropometric.before?.height_cm,
        c.anthropometric.after?.height_cm,
        "cm",
      ),
    );
  }
  if (anthroRows.some((r) => r.before || r.after)) {
    sections.push({
      title: "Antropometria",
      rows: anthroRows.filter((r) => r.before || r.after),
    });
  }

  // Body
  const bodyRows: ComparisonRow[] = [];
  if (c.body.before || c.body.after) {
    bodyRows.push(
      makeRow(
        "Peso",
        c.body.before?.weight_kg,
        c.body.after?.weight_kg,
        "kg",
        true,
      ),
    );
    bodyRows.push(
      makeRow(
        "% Grasso",
        c.body.before?.body_fat_percentage,
        c.body.after?.body_fat_percentage,
        "%",
        true,
      ),
    );
    bodyRows.push(
      makeRow(
        "Massa Muscolare",
        c.body.before?.muscle_mass_kg,
        c.body.after?.muscle_mass_kg,
        "kg",
      ),
    );
  }
  if (bodyRows.some((r) => r.before || r.after)) {
    sections.push({
      title: "Peso & Composizione",
      rows: bodyRows.filter((r) => r.before || r.after),
    });
  }

  // Circumferences
  const circRows: ComparisonRow[] = [];
  if (c.circumference.before || c.circumference.after) {
    circRows.push(
      makeRow(
        "Vita",
        c.circumference.before?.waist_cm,
        c.circumference.after?.waist_cm,
        "cm",
        true,
      ),
    );
    circRows.push(
      makeRow(
        "Fianchi",
        c.circumference.before?.hips_cm,
        c.circumference.after?.hips_cm,
        "cm",
        true,
      ),
    );
    circRows.push(
      makeRow(
        "Petto",
        c.circumference.before?.chest_cm,
        c.circumference.after?.chest_cm,
        "cm",
      ),
    );
    circRows.push(
      makeRow(
        "Spalle",
        c.circumference.before?.shoulders_cm,
        c.circumference.after?.shoulders_cm,
        "cm",
      ),
    );
    circRows.push(
      makeRow(
        "Bicipiti",
        c.circumference.before?.biceps_cm,
        c.circumference.after?.biceps_cm,
        "cm",
      ),
    );
    circRows.push(
      makeRow(
        "Coscia alta",
        c.circumference.before?.thigh_upper_cm,
        c.circumference.after?.thigh_upper_cm,
        "cm",
      ),
    );
    circRows.push(
      makeRow(
        "Glutei",
        c.circumference.before?.glutes_cm,
        c.circumference.after?.glutes_cm,
        "cm",
      ),
    );
  }
  if (circRows.some((r) => r.before || r.after)) {
    sections.push({
      title: "Circonferenze",
      rows: circRows.filter((r) => r.before || r.after),
    });
  }

  // Skinfolds
  const skinRows: ComparisonRow[] = [];
  if (c.skinfold.before || c.skinfold.after) {
    skinRows.push(
      makeRow(
        "Somma pliche",
        c.skinfold.before?.sum_total_mm,
        c.skinfold.after?.sum_total_mm,
        "mm",
        true,
      ),
    );
    skinRows.push(
      makeRow(
        "% Grasso",
        c.skinfold.before?.body_fat_percentage,
        c.skinfold.after?.body_fat_percentage,
        "%",
        true,
      ),
    );
  }
  if (skinRows.some((r) => r.before || r.after)) {
    sections.push({
      title: "Plicometria",
      rows: skinRows.filter((r) => r.before || r.after),
    });
  }

  // BIA
  const biaRows: ComparisonRow[] = [];
  if (c.bia.before || c.bia.after) {
    biaRows.push(
      makeRow(
        "Massa Magra",
        c.bia.before?.lean_mass_kg,
        c.bia.after?.lean_mass_kg,
        "kg",
      ),
    );
    biaRows.push(
      makeRow(
        "% Grasso",
        c.bia.before?.fat_mass_pct,
        c.bia.after?.fat_mass_pct,
        "%",
        true,
      ),
    );
    biaRows.push(
      makeRow(
        "Acqua %",
        c.bia.before?.total_body_water_pct,
        c.bia.after?.total_body_water_pct,
        "%",
      ),
    );
    biaRows.push(
      makeRow(
        "BMR",
        c.bia.before?.basal_metabolic_rate,
        c.bia.after?.basal_metabolic_rate,
        "kcal",
      ),
    );
    biaRows.push(
      makeRow(
        "Grasso Viscerale",
        c.bia.before?.visceral_fat_level,
        c.bia.after?.visceral_fat_level,
        "lv",
        true,
      ),
    );
  }
  if (biaRows.some((r) => r.before || r.after)) {
    sections.push({
      title: "BIA",
      rows: biaRows.filter((r) => r.before || r.after),
    });
  }

  return sections;
});
</script>
