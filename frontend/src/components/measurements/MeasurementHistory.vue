<template>
  <div>
    <!-- Filter: compact flex-wrap -->
    <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 pb-1.5">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="activeFilter = f.key"
        class="text-[10px] py-0.5 px-1.5 rounded-full transition-colors"
        :class="activeFilter === f.key
          ? 'bg-habit-card-hover text-habit-text font-medium'
          : 'text-habit-text-muted hover:text-habit-text'"
      >{{ f.label }}</button>
      <span class="text-[10px] text-habit-text-muted">({{ filteredEntries.length }})</span>
    </div>

    <!-- Empty state -->
    <div v-if="filteredEntries.length === 0" class="text-center text-habit-text-muted text-[11px] py-2">
      Nessuna misurazione
    </div>

    <!-- Timeline entries: compact -->
    <div v-else class="divide-y divide-habit-border/50">
      <div
        v-for="entry in displayedEntries"
        :key="`${entry.type}-${entry.id}`"
        class="flex items-center gap-1.5 py-1.5 group"
      >
        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: typeColors[entry.type] }"></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-[10px] font-medium" :style="{ color: typeColors[entry.type] }">{{ typeLabels[entry.type] }}</span>
            <span class="text-[10px] text-habit-text-muted">{{ formatDate(entry.date) }}</span>
          </div>
          <p class="text-[11px] text-habit-text truncate">{{ entry.summary }}</p>
        </div>
        <div class="flex-shrink-0 flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button class="p-1 rounded text-habit-text-muted hover:text-habit-text" title="Modifica" @click="$emit('edit', entry.type, entry.record)">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button class="p-1 rounded text-habit-text-muted hover:text-red-600" title="Elimina" @click="confirmDelete(entry)">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Show more -->
    <div v-if="filteredEntries.length > displayCount" class="text-center pt-1.5">
      <button class="text-[11px] text-habit-orange hover:underline" @click="displayCount += 15">
        +{{ filteredEntries.length - displayCount }} altre
      </button>
    </div>

    <!-- Delete confirmation -->
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Elimina misurazione"
      :message="deleteMessage"
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
const deleteTarget = ref<{ type: MeasurementType; id: number; summary: string; date: string } | null>(null);

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

const deleteMessage = computed(() => {
  if (!deleteTarget.value) return "";
  const label = typeLabels[deleteTarget.value.type] || "";
  return `Eliminare ${label} del ${deleteTarget.value.date} (${deleteTarget.value.summary})? L'azione non puo essere annullata.`;
});

const confirmDelete = (entry: TimelineEntry) => {
  deleteTarget.value = {
    type: entry.type,
    id: entry.id,
    summary: entry.summary,
    date: formatDate(entry.date),
  };
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
