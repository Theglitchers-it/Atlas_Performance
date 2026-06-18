<script setup lang="ts">
import { ref, computed, watch } from "vue";
import api from "@/services/api";
import {
  formatDate,
  fileUrl,
  PHOTO_TYPE_OPTIONS,
  dateOnly,
} from "@/composables/useFormatters";
import type { ProgressPhoto, PhotoType } from "@/types";

const props = defineProps<{
  clientId: number;
  photos: ProgressPhoto[];
}>();

const photoType = ref<PhotoType>("front");

const photoTypes = PHOTO_TYPE_OPTIONS;

const availableDates = computed(() => {
  const dates = props.photos
    .filter((p) => p.photo_type === photoType.value)
    .map((p) => dateOnly(p.taken_at));
  return Array.from(new Set(dates)).sort();
});

const date1 = ref<string>("");
const date2 = ref<string>("");

watch(
  availableDates,
  (dates) => {
    if (dates.length >= 2) {
      date1.value = dates[0];
      date2.value = dates[dates.length - 1];
    } else if (dates.length === 1) {
      date1.value = dates[0];
      date2.value = dates[0];
    } else {
      date1.value = "";
      date2.value = "";
    }
  },
  { immediate: true },
);

const comparison = ref<ProgressPhoto[]>([]);
const loading = ref(false);

const loadCompare = async () => {
  if (!date1.value || !date2.value) {
    comparison.value = [];
    return;
  }
  loading.value = true;
  const res = await api
    .get(`/progress/${props.clientId}/photos/compare`, {
      params: {
        date1: date1.value,
        date2: date2.value,
        photoType: photoType.value,
      },
    })
    .catch(() => null);
  comparison.value = res?.data?.data || [];
  loading.value = false;
};

watch([date1, date2, photoType], loadCompare, { immediate: true });

const before = computed(() =>
  comparison.value.find((p) => dateOnly(p.taken_at) === date1.value),
);
const after = computed(() =>
  comparison.value.find((p) => dateOnly(p.taken_at) === date2.value),
);

const weightDelta = computed(() => {
  const w1 = Number(before.value?.body_weight);
  const w2 = Number(after.value?.body_weight);
  if (!w1 || !w2) return null;
  const d = w2 - w1;
  if (Math.abs(d) < 0.01) return null;
  return { value: d, label: `${d > 0 ? "+" : ""}${d.toFixed(1)} kg` };
});

const fatDelta = computed(() => {
  const f1 = Number(before.value?.body_fat_pct);
  const f2 = Number(after.value?.body_fat_pct);
  if (!f1 || !f2) return null;
  const d = f2 - f1;
  if (Math.abs(d) < 0.01) return null;
  return { value: d, label: `${d > 0 ? "+" : ""}${d.toFixed(1)}%` };
});

const hasEnoughDates = computed(() => availableDates.value.length >= 2);
</script>

<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div>
        <label class="block text-xs text-habit-text-subtle mb-1">Categoria</label>
        <select
          v-model="photoType"
          class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
        >
          <option v-for="t in photoTypes" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-habit-text-subtle mb-1">Prima</label>
        <select
          v-model="date1"
          :disabled="availableDates.length === 0"
          class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan disabled:opacity-50"
        >
          <option v-for="d in availableDates" :key="'a' + d" :value="d">
            {{ formatDate(d) }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-habit-text-subtle mb-1">Dopo</label>
        <select
          v-model="date2"
          :disabled="availableDates.length === 0"
          class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan disabled:opacity-50"
        >
          <option v-for="d in availableDates" :key="'b' + d" :value="d">
            {{ formatDate(d) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Delta pills -->
    <div
      v-if="weightDelta || fatDelta"
      class="flex flex-wrap gap-2 text-xs"
    >
      <span
        v-if="weightDelta"
        class="px-3 py-1.5 rounded-full border"
        :class="
          weightDelta.value < 0
            ? 'bg-habit-success/15 border-habit-success/30 text-habit-success'
            : weightDelta.value > 0
              ? 'bg-habit-orange/15 border-habit-orange/30 text-habit-orange'
              : 'bg-habit-bg border-habit-border'
        "
      >
        Peso: {{ weightDelta.label }}
      </span>
      <span
        v-if="fatDelta"
        class="px-3 py-1.5 rounded-full border"
        :class="
          fatDelta.value < 0
            ? 'bg-habit-success/15 border-habit-success/30 text-habit-success'
            : fatDelta.value > 0
              ? 'bg-habit-orange/15 border-habit-orange/30 text-habit-orange'
              : 'bg-habit-bg border-habit-border'
        "
      >
        Body fat: {{ fatDelta.label }}
      </span>
    </div>

    <!-- Photos side-by-side -->
    <div v-if="loading" class="grid grid-cols-2 gap-3">
      <div
        v-for="i in 2"
        :key="i"
        class="aspect-[3/4] bg-habit-skeleton rounded-lg animate-pulse"
      ></div>
    </div>

    <div
      v-else-if="availableDates.length === 0"
      class="py-6 text-center text-habit-text-subtle text-sm"
    >
      Nessuna foto in questa categoria
    </div>

    <div
      v-else-if="!hasEnoughDates"
      class="py-6 text-center text-habit-text-subtle text-sm"
    >
      Servono almeno 2 date diverse per confrontare.
      <br />
      Carica una nuova foto {{ photoType === "front" ? "frontale" : "" }} pi&ugrave; avanti.
    </div>

    <div v-else class="grid grid-cols-2 gap-3">
      <div class="space-y-2">
        <p class="text-xs text-habit-text-subtle font-medium">
          Prima · {{ formatDate(date1) }}
        </p>
        <div
          class="aspect-[3/4] bg-habit-bg rounded-lg overflow-hidden border border-habit-border"
        >
          <img
            v-if="before"
            :src="fileUrl(before.photo_url)"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-habit-text-subtle text-xs"
          >
            Nessuna foto
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <p class="text-xs text-habit-text-subtle font-medium">
          Dopo · {{ formatDate(date2) }}
        </p>
        <div
          class="aspect-[3/4] bg-habit-bg rounded-lg overflow-hidden border border-habit-border"
        >
          <img
            v-if="after"
            :src="fileUrl(after.photo_url)"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-habit-text-subtle text-xs"
          >
            Nessuna foto
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
