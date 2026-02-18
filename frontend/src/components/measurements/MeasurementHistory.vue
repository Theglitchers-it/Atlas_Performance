<template>
  <div class="card">
    <div class="p-3 sm:p-4 border-b border-habit-border space-y-2 sm:space-y-3">
      <h3 class="font-semibold text-habit-text text-xs sm:text-sm">
        Storico Misurazioni
      </h3>

      <!-- Type filter - horizontal scroll on mobile -->
      <div class="flex gap-1 sm:gap-1.5 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:-mx-4 sm:px-4 pb-1">
        <button
          v-for="f in filters"
          :key="f.key"
          class="text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0"
          :class="
            activeFilter === f.key
              ? 'bg-habit-orange/10 text-habit-orange font-medium'
              : 'text-habit-text-muted hover:text-habit-text hover:bg-habit-bg-light'
          "
          @click="activeFilter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="filteredEntries.length === 0"
      class="p-5 sm:p-8 text-center text-habit-text-muted text-xs sm:text-sm"
    >
      Nessuna misurazione registrata
    </div>

    <!-- Timeline entries -->
    <div v-else class="divide-y divide-habit-border">
      <div
        v-for="entry in displayedEntries"
        :key="`${entry.type}-${entry.id}`"
        class="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 hover:bg-habit-bg-light transition-colors group"
      >
        <!-- Timeline dot -->
        <div class="flex-shrink-0 mt-1">
          <div
            class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
            :style="{ backgroundColor: typeColors[entry.type] }"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 sm:gap-2 mb-0.5">
            <span
              class="text-[10px] sm:text-xs font-medium"
              :style="{ color: typeColors[entry.type] }"
            >
              {{ typeLabels[entry.type] }}
            </span>
            <span class="text-[10px] sm:text-xs text-habit-text-muted">
              {{ formatDate(entry.date) }}
            </span>
            <span class="text-[10px] sm:text-xs text-habit-text-subtle hidden xs:inline">
              {{ relativeTime(entry.date) }}
            </span>
          </div>
          <p class="text-xs sm:text-sm text-habit-text truncate">
            {{ entry.summary }}
          </p>
        </div>

        <!-- Actions (always visible on mobile, hover on desktop) -->
        <div
          class="flex-shrink-0 flex items-center gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <button
            class="p-1.5 sm:p-1.5 rounded-lg hover:bg-habit-bg-light text-habit-text-muted hover:text-habit-text transition-colors"
            title="Modifica"
            @click="$emit('edit', entry.type, entry.record)"
          >
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            class="p-1.5 sm:p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-habit-text-muted hover:text-red-600 transition-colors"
            title="Elimina"
            @click="confirmDelete(entry)"
          >
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
    </div>

    <!-- Show more button -->
    <div
      v-if="filteredEntries.length > displayCount"
      class="p-2 sm:p-3 border-t border-habit-border text-center"
    >
      <button
        class="text-xs sm:text-sm text-habit-orange hover:underline"
        @click="displayCount += 15"
      >
        Mostra altri ({{ filteredEntries.length - displayCount }} rimanenti)
      </button>
    </div>

    <!-- Delete confirmation dialog -->
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Elimina misurazione"
      message="Sei sicuro di voler eliminare questa misurazione? L'azione non puo essere annullata."
      confirm-text="Elimina"
      variant="danger"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import type {
  AnthropometricRecord,
  BodyMeasurementRecord,
  CircumferenceRecord,
  SkinfoldRecord,
  BiaRecord,
  MeasurementType,
} from "@/types";

interface Props {
  anthropometric: AnthropometricRecord[];
  bodyMeasurements: BodyMeasurementRecord[];
  circumferences: CircumferenceRecord[];
  skinfolds: SkinfoldRecord[];
  biaMeasurements: BiaRecord[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  edit: [type: MeasurementType, record: Record<string, any>];
  delete: [type: MeasurementType, id: number];
}>();

const activeFilter = ref("all");
const displayCount = ref(15);
const showDeleteDialog = ref(false);
const deleteTarget = ref<{ type: MeasurementType; id: number } | null>(null);

const filters = [
  { key: "all", label: "Tutti" },
  { key: "anthropometric", label: "Antropometria" },
  { key: "body", label: "Peso" },
  { key: "circumferences", label: "Circonferenze" },
  { key: "skinfolds", label: "Plicometria" },
  { key: "bia", label: "BIA" },
];

const typeColors: Record<string, string> = {
  anthropometric: "#3b82f6",
  body: "#06b6d4",
  circumferences: "#22c55e",
  skinfolds: "#f97316",
  bia: "#8b5cf6",
};

const typeLabels: Record<string, string> = {
  anthropometric: "Antropometria",
  body: "Peso & Composizione",
  circumferences: "Circonferenze",
  skinfolds: "Plicometria",
  bia: "BIA",
};

interface TimelineEntry {
  id: number;
  type: MeasurementType;
  date: string;
  summary: string;
  record: Record<string, any>;
}

const summarize = (type: string, r: Record<string, any>): string => {
  const parts: string[] = [];
  switch (type) {
    case "anthropometric":
      if (r.weight_kg) parts.push(`${r.weight_kg} kg`);
      if (r.height_cm) parts.push(`${r.height_cm} cm`);
      if (r.age_years) parts.push(`${r.age_years} anni`);
      break;
    case "body":
      if (r.weight_kg) parts.push(`${r.weight_kg} kg`);
      if (r.body_fat_percentage) parts.push(`${r.body_fat_percentage}% BF`);
      if (r.muscle_mass_kg) parts.push(`${r.muscle_mass_kg} kg muscoli`);
      break;
    case "circumferences":
      if (r.waist_cm) parts.push(`Vita ${r.waist_cm}`);
      if (r.hips_cm) parts.push(`Fianchi ${r.hips_cm}`);
      if (r.chest_cm) parts.push(`Petto ${r.chest_cm}`);
      break;
    case "skinfolds":
      if (r.body_fat_percentage) parts.push(`${r.body_fat_percentage}% BF`);
      if (r.sum_total_mm) parts.push(`Somma ${r.sum_total_mm} mm`);
      break;
    case "bia":
      if (r.fat_mass_pct) parts.push(`${r.fat_mass_pct}% grasso`);
      if (r.lean_mass_kg) parts.push(`${r.lean_mass_kg} kg magra`);
      if (r.basal_metabolic_rate) parts.push(`BMR ${r.basal_metabolic_rate}`);
      break;
  }
  return parts.length > 0 ? parts.join(" \u00B7 ") : "Misurazione registrata";
};

const allEntries = computed<TimelineEntry[]>(() => {
  const entries: TimelineEntry[] = [];

  for (const r of props.anthropometric) {
    entries.push({
      id: r.id,
      type: "anthropometric",
      date: r.measurement_date,
      summary: summarize("anthropometric", r),
      record: r,
    });
  }
  for (const r of props.bodyMeasurements) {
    entries.push({
      id: r.id,
      type: "body",
      date: r.measurement_date,
      summary: summarize("body", r),
      record: r,
    });
  }
  for (const r of props.circumferences) {
    entries.push({
      id: r.id,
      type: "circumferences",
      date: r.measurement_date,
      summary: summarize("circumferences", r),
      record: r,
    });
  }
  for (const r of props.skinfolds) {
    entries.push({
      id: r.id,
      type: "skinfolds",
      date: r.measurement_date,
      summary: summarize("skinfolds", r),
      record: r,
    });
  }
  for (const r of props.biaMeasurements) {
    entries.push({
      id: r.id,
      type: "bia",
      date: r.measurement_date,
      summary: summarize("bia", r),
      record: r,
    });
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
});

const filteredEntries = computed(() => {
  if (activeFilter.value === "all") return allEntries.value;
  return allEntries.value.filter((e) => e.type === activeFilter.value);
});

const displayedEntries = computed(() =>
  filteredEntries.value.slice(0, displayCount.value),
);

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const relativeTime = (d: string) => {
  const now = new Date();
  const date = new Date(d);
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays}g fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sett fa`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mesi fa`;
  return `${Math.floor(diffDays / 365)}a fa`;
};

const confirmDelete = (entry: TimelineEntry) => {
  deleteTarget.value = { type: entry.type, id: entry.id };
  showDeleteDialog.value = true;
};

const handleDelete = () => {
  if (deleteTarget.value) {
    emit("delete", deleteTarget.value.type, deleteTarget.value.id);
  }
  showDeleteDialog.value = false;
  deleteTarget.value = null;
};
</script>
