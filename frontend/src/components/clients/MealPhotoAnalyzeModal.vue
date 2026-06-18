<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { MEAL_TYPE_OPTIONS, type MealType } from "@/types";
import { fileUrl } from "@/composables/useFormatters";

interface AnalyzedItem {
  name: string;
  estimated_quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: "high" | "medium" | "low";
}

interface Analysis {
  items: AnalyzedItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes?: string;
}

const props = defineProps<{
  clientId: number;
  selectedDate: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const toast = useToast();

const file = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const hint = ref("");
const mealType = ref<MealType>("lunch");
const mealTime = ref("12:30");

const analyzing = ref(false);
const analysis = ref<Analysis | null>(null);
const serverPhotoUrl = ref<string | null>(null);
const saving = ref(false);

const editableItems = ref<AnalyzedItem[]>([]);

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  file.value = f;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(f);
  analysis.value = null;
  serverPhotoUrl.value = null;
};

const analyze = async () => {
  if (!file.value) return;
  analyzing.value = true;
  try {
    const fd = new FormData();
    fd.append("photo", file.value);
    if (hint.value) fd.append("hint", hint.value);

    const res = await api.post(
      `/clients/${props.clientId}/food-log/analyze-photo`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    analysis.value = res.data.data.analysis;
    serverPhotoUrl.value = res.data.data.photoUrl;
    editableItems.value = (analysis.value?.items || []).map((i) => ({ ...i }));
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore analisi foto";
    toast.error(msg);
  } finally {
    analyzing.value = false;
  }
};

const recomputedTotals = computed(() => {
  return editableItems.value.reduce(
    (acc, i) => {
      acc.calories += Number(i.calories) || 0;
      acc.protein += Number(i.protein) || 0;
      acc.carbs += Number(i.carbs) || 0;
      acc.fat += Number(i.fat) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
});

const removeItem = (idx: number) => {
  editableItems.value.splice(idx, 1);
};

const saveAll = async () => {
  if (editableItems.value.length === 0) {
    toast.error("Nessun alimento da salvare");
    return;
  }
  saving.value = true;
  try {
    const loggedAt = `${props.selectedDate} ${mealTime.value}:00`;
    await Promise.all(
      editableItems.value.map((item) =>
        api.post(`/clients/${props.clientId}/food-log`, {
          foodName: item.name,
          quantity: item.estimated_quantity,
          unit: item.unit,
          mealType: mealType.value,
          loggedAt,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          photoUrl: serverPhotoUrl.value,
        }),
      ),
    );
    toast.success(`${editableItems.value.length} pasti registrati`);
    emit("saved");
    emit("close");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore salvataggio";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

const confidenceClass = (c?: string) => {
  if (c === "high") return "bg-habit-success/15 text-habit-success";
  if (c === "low") return "bg-red-500/15 text-red-400";
  return "bg-habit-orange/15 text-habit-orange";
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-habit-card border border-habit-border rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
    >
      <div class="p-4 border-b border-habit-border flex items-center justify-between">
        <h3 class="text-base font-semibold text-habit-text">📷 Analizza foto piatto (AI)</h3>
        <button
          @click="emit('close')"
          class="p-1 hover:bg-habit-card-hover rounded"
          aria-label="Chiudi"
        >
          <svg class="w-4 h-4 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-4 space-y-4">
        <!-- Upload foto -->
        <div v-if="!analysis">
          <label class="block text-xs text-habit-text-subtle mb-1">Foto del pasto</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            @change="onFileChange"
            class="w-full text-sm text-habit-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-habit-cyan/20 file:text-habit-cyan file:font-medium hover:file:bg-habit-cyan hover:file:text-white transition-colors"
          />
          <p v-if="previewUrl" class="mt-3">
            <img
              :src="previewUrl"
              alt="Preview"
              class="w-full max-h-64 object-contain rounded-lg border border-habit-border"
            />
          </p>

          <div class="mt-3">
            <label class="block text-xs text-habit-text-subtle mb-1">
              Hint opzionale (aiuta l'AI)
            </label>
            <input
              v-model="hint"
              type="text"
              placeholder="Es. 'pasta al pomodoro ristorante' o 'insalata di riso casa'"
              class="w-full px-3 py-2 bg-habit-bg border border-habit-border text-sm text-habit-text rounded focus:outline-none focus:border-habit-cyan"
            />
          </div>

          <button
            @click="analyze"
            :disabled="!file || analyzing"
            class="mt-3 w-full px-4 py-2 bg-habit-cyan text-white font-medium rounded-lg hover:bg-habit-orange disabled:opacity-50 transition-colors"
          >
            {{ analyzing ? "Analisi in corso..." : "✨ Analizza con AI" }}
          </button>
          <p class="text-[10px] text-habit-text-subtle mt-2 text-center">
            L'AI stimerà porzioni e macros. Potrai rivederli prima di salvare.
          </p>
        </div>

        <!-- Risultati analisi -->
        <div v-else class="space-y-3">
          <div class="flex items-start gap-3">
            <img
              v-if="serverPhotoUrl"
              :src="fileUrl(serverPhotoUrl)"
              alt="Pasto"
              class="w-24 h-24 object-cover rounded-lg border border-habit-border flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-habit-text-subtle" v-if="analysis.notes">
                {{ analysis.notes }}
              </p>
            </div>
          </div>

          <!-- Totali ricalcolati -->
          <div class="grid grid-cols-4 gap-1.5 bg-habit-bg-light/40 border border-habit-border rounded-lg p-2 text-center">
            <div>
              <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Kcal</p>
              <p class="text-sm font-semibold text-habit-text tabular-nums">
                {{ Math.round(recomputedTotals.calories) }}
              </p>
            </div>
            <div>
              <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Prot</p>
              <p class="text-sm font-semibold text-habit-cyan tabular-nums">
                {{ Math.round(recomputedTotals.protein) }}g
              </p>
            </div>
            <div>
              <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Carb</p>
              <p class="text-sm font-semibold text-habit-orange tabular-nums">
                {{ Math.round(recomputedTotals.carbs) }}g
              </p>
            </div>
            <div>
              <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Grassi</p>
              <p class="text-sm font-semibold text-yellow-500 tabular-nums">
                {{ Math.round(recomputedTotals.fat) }}g
              </p>
            </div>
          </div>

          <!-- Items editabili -->
          <div class="space-y-1.5">
            <p class="text-xs text-habit-text-subtle">
              Rivedi e correggi se necessario prima di salvare:
            </p>
            <div
              v-for="(it, idx) in editableItems"
              :key="idx"
              class="border border-habit-border rounded p-2 space-y-1.5"
            >
              <div class="flex items-center justify-between gap-2">
                <input
                  v-model="it.name"
                  type="text"
                  class="flex-1 min-w-0 px-2 py-1 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
                />
                <span
                  v-if="it.confidence"
                  class="text-[9px] px-1.5 py-0.5 rounded-full uppercase font-semibold tracking-wider"
                  :class="confidenceClass(it.confidence)"
                >
                  {{ it.confidence }}
                </span>
                <button
                  @click="removeItem(idx)"
                  class="text-red-400 text-xs px-1 hover:text-red-500"
                  aria-label="Rimuovi"
                >
                  ✕
                </button>
              </div>
              <div class="grid grid-cols-6 gap-1 items-center">
                <input
                  v-model.number="it.estimated_quantity"
                  type="number"
                  step="1"
                  min="0"
                  class="col-span-1 px-1.5 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums"
                />
                <input
                  v-model="it.unit"
                  type="text"
                  maxlength="6"
                  class="col-span-1 px-1.5 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded"
                />
                <input
                  v-model.number="it.calories"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="kcal"
                  class="col-span-1 px-1.5 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums"
                />
                <input
                  v-model.number="it.protein"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="P"
                  class="col-span-1 px-1.5 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums"
                />
                <input
                  v-model.number="it.carbs"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="C"
                  class="col-span-1 px-1.5 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums"
                />
                <input
                  v-model.number="it.fat"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="F"
                  class="col-span-1 px-1.5 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums"
                />
              </div>
            </div>
          </div>

          <!-- Meal type + time -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1">Pasto</label>
              <select
                v-model="mealType"
                class="w-full px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
              >
                <option v-for="m in MEAL_TYPE_OPTIONS" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1">Ora</label>
              <input
                v-model="mealTime"
                type="time"
                class="w-full px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              @click="() => { analysis = null; editableItems = []; }"
              class="px-3 py-1.5 text-sm text-habit-text-subtle hover:text-habit-text"
            >
              Riprova
            </button>
            <button
              @click="saveAll"
              :disabled="saving || editableItems.length === 0"
              class="px-4 py-1.5 bg-habit-cyan text-white text-sm font-medium rounded hover:bg-habit-orange disabled:opacity-50"
            >
              {{ saving ? "Salvataggio..." : `Salva ${editableItems.length} pasti` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
