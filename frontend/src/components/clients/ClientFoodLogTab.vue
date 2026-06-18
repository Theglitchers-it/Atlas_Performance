<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import {
  MEAL_TYPE_OPTIONS,
  type Food,
  type FoodLogEntry,
  type FoodLogDayTotals,
  type MealType,
} from "@/types";
import { formatDateISO } from "@/composables/useFormatters";
import MealPhotoAnalyzeModal from "@/components/clients/MealPhotoAnalyzeModal.vue";

const props = defineProps<{
  clientId: number;
}>();

const toast = useToast();
const selectedDate = ref<string>(formatDateISO(new Date()));
const entries = ref<FoodLogEntry[]>([]);
const totals = ref<FoodLogDayTotals | null>(null);
const loading = ref(false);

const showAddForm = ref(false);
const showPhotoModal = ref(false);
const saving = ref(false);

const searchText = ref("");
const searchResults = ref<Food[]>([]);
const searching = ref(false);
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

const form = ref({
  foodId: null as number | null,
  foodName: "",
  quantity: "" as number | string,
  unit: "g",
  mealType: "breakfast" as MealType,
  calories: "" as number | string,
  protein: "" as number | string,
  carbs: "" as number | string,
  fat: "" as number | string,
  fiber: "" as number | string,
  notes: "",
  time: "12:00",
});

const showCreateFoodModal = ref(false);
const newFood = ref({
  name: "",
  defaultUnit: "g",
  caloriesPer100: "" as number | string,
  proteinPer100: "" as number | string,
  carbsPer100: "" as number | string,
  fatPer100: "" as number | string,
  fiberPer100: "" as number | string,
  isPreset: false,
});

const loadDay = async () => {
  loading.value = true;
  const res = await api
    .get(`/clients/${props.clientId}/food-log`, {
      params: { date: selectedDate.value },
    })
    .catch(() => null);
  entries.value = res?.data?.data?.entries || [];
  totals.value = res?.data?.data?.totals || null;
  loading.value = false;
};

watch(selectedDate, loadDay);
onMounted(loadDay);

const groupedByMeal = computed(() => {
  const map: Record<MealType, FoodLogEntry[]> = {
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    evening_snack: [],
    other: [],
  };
  for (const e of entries.value) map[e.meal_type].push(e);
  return map;
});

const doSearch = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    if (!searchText.value.trim()) {
      searchResults.value = [];
      return;
    }
    searching.value = true;
    const res = await api
      .get("/foods", { params: { q: searchText.value, limit: 10 } })
      .catch(() => null);
    searchResults.value = res?.data?.data?.foods || [];
    searching.value = false;
  }, 250);
};

watch(searchText, doSearch);

const pickFood = (food: Food) => {
  form.value.foodId = food.id;
  form.value.foodName = food.name;
  form.value.unit = food.default_unit || "g";
  form.value.quantity = food.default_quantity || 100;
  form.value.calories = "";
  form.value.protein = "";
  form.value.carbs = "";
  form.value.fat = "";
  form.value.fiber = "";
  searchText.value = "";
  searchResults.value = [];
};

const resetForm = () => {
  form.value = {
    foodId: null,
    foodName: "",
    quantity: "",
    unit: "g",
    mealType: "breakfast",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    notes: "",
    time: "12:00",
  };
  searchText.value = "";
  searchResults.value = [];
};

const submitEntry = async () => {
  if (!form.value.foodName || !form.value.quantity) {
    toast.error("Nome alimento e quantità sono richiesti");
    return;
  }
  saving.value = true;
  try {
    const loggedAt = `${selectedDate.value} ${form.value.time}:00`;
    await api.post(`/clients/${props.clientId}/food-log`, {
      foodId: form.value.foodId,
      foodName: form.value.foodName,
      quantity: parseFloat(String(form.value.quantity)),
      unit: form.value.unit,
      mealType: form.value.mealType,
      loggedAt,
      notes: form.value.notes || null,
      calories: form.value.calories !== "" ? parseFloat(String(form.value.calories)) : null,
      protein: form.value.protein !== "" ? parseFloat(String(form.value.protein)) : null,
      carbs: form.value.carbs !== "" ? parseFloat(String(form.value.carbs)) : null,
      fat: form.value.fat !== "" ? parseFloat(String(form.value.fat)) : null,
      fiber: form.value.fiber !== "" ? parseFloat(String(form.value.fiber)) : null,
    });
    toast.success("Pasto registrato");
    resetForm();
    showAddForm.value = false;
    await loadDay();
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore registrazione";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};

const deleteEntry = async (entryId: number) => {
  if (!confirm("Eliminare questo pasto?")) return;
  try {
    await api.delete(`/clients/${props.clientId}/food-log/${entryId}`);
    toast.success("Pasto eliminato");
    await loadDay();
  } catch {
    toast.error("Errore eliminazione");
  }
};

const createFoodInDb = async () => {
  if (!newFood.value.name || newFood.value.name.length < 2) {
    toast.error("Nome alimento richiesto");
    return;
  }
  try {
    const res = await api.post("/foods", {
      name: newFood.value.name,
      defaultUnit: newFood.value.defaultUnit,
      caloriesPer100: newFood.value.caloriesPer100 !== "" ? parseFloat(String(newFood.value.caloriesPer100)) : null,
      proteinPer100: newFood.value.proteinPer100 !== "" ? parseFloat(String(newFood.value.proteinPer100)) : null,
      carbsPer100: newFood.value.carbsPer100 !== "" ? parseFloat(String(newFood.value.carbsPer100)) : null,
      fatPer100: newFood.value.fatPer100 !== "" ? parseFloat(String(newFood.value.fatPer100)) : null,
      fiberPer100: newFood.value.fiberPer100 !== "" ? parseFloat(String(newFood.value.fiberPer100)) : null,
      isPreset: newFood.value.isPreset,
    });
    const newId = res.data.data.id;
    pickFood({
      id: newId,
      name: newFood.value.name,
      brand: null,
      default_unit: newFood.value.defaultUnit,
      default_quantity: 100,
      calories_per_100: newFood.value.caloriesPer100 !== "" ? parseFloat(String(newFood.value.caloriesPer100)) : null,
      protein_per_100: newFood.value.proteinPer100 !== "" ? parseFloat(String(newFood.value.proteinPer100)) : null,
      carbs_per_100: newFood.value.carbsPer100 !== "" ? parseFloat(String(newFood.value.carbsPer100)) : null,
      fat_per_100: newFood.value.fatPer100 !== "" ? parseFloat(String(newFood.value.fatPer100)) : null,
      fiber_per_100: newFood.value.fiberPer100 !== "" ? parseFloat(String(newFood.value.fiberPer100)) : null,
      is_preset: newFood.value.isPreset,
    });
    showCreateFoodModal.value = false;
    newFood.value = {
      name: "",
      defaultUnit: "g",
      caloriesPer100: "",
      proteinPer100: "",
      carbsPer100: "",
      fatPer100: "",
      fiberPer100: "",
      isPreset: false,
    };
    toast.success("Alimento aggiunto al database");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore creazione";
    toast.error(msg);
  }
};

const shiftDay = (delta: number) => {
  const d = new Date(selectedDate.value);
  d.setDate(d.getDate() + delta);
  selectedDate.value = formatDateISO(d);
};

const fmtNum = (v: number | string | null) => {
  if (v == null) return "-";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "-";
  return Math.round(n * 10) / 10;
};
</script>

<template>
  <div class="space-y-4">
    <!-- Header: date navigation + totali -->
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-1.5">
        <button
          @click="shiftDay(-1)"
          class="p-1.5 border border-habit-border rounded hover:bg-habit-card-hover"
          aria-label="Giorno precedente"
        >
          <svg class="w-4 h-4 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <input
          v-model="selectedDate"
          type="date"
          class="px-2 py-1 border border-habit-border bg-habit-bg text-habit-text text-sm rounded focus:outline-none focus:border-habit-cyan"
        />
        <button
          @click="shiftDay(1)"
          class="p-1.5 border border-habit-border rounded hover:bg-habit-card-hover"
          aria-label="Giorno successivo"
        >
          <svg class="w-4 h-4 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          @click="showPhotoModal = true"
          class="px-2.5 py-1.5 border border-habit-cyan text-habit-cyan text-xs font-medium rounded-lg hover:bg-habit-cyan hover:text-white transition-colors"
          aria-label="Analizza foto piatto con AI"
        >
          📷 Foto
        </button>
        <button
          @click="showAddForm = !showAddForm"
          class="px-3 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded-lg hover:bg-habit-orange transition-colors"
        >
          {{ showAddForm ? "Chiudi" : "+ Registra" }}
        </button>
      </div>
    </div>

    <MealPhotoAnalyzeModal
      v-if="showPhotoModal"
      :client-id="clientId"
      :selected-date="selectedDate"
      @close="showPhotoModal = false"
      @saved="loadDay"
    />

    <!-- Totali giornalieri -->
    <div
      v-if="totals"
      class="grid grid-cols-5 gap-1.5 bg-habit-bg-light/40 border border-habit-border rounded-lg p-2 text-center"
    >
      <div>
        <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Kcal</p>
        <p class="text-sm font-semibold text-habit-text tabular-nums">{{ fmtNum(totals.calories) }}</p>
      </div>
      <div>
        <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Prot</p>
        <p class="text-sm font-semibold text-habit-cyan tabular-nums">{{ fmtNum(totals.protein) }}g</p>
      </div>
      <div>
        <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Carb</p>
        <p class="text-sm font-semibold text-habit-orange tabular-nums">{{ fmtNum(totals.carbs) }}g</p>
      </div>
      <div>
        <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Grassi</p>
        <p class="text-sm font-semibold text-yellow-500 tabular-nums">{{ fmtNum(totals.fat) }}g</p>
      </div>
      <div>
        <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">Fibra</p>
        <p class="text-sm font-semibold text-habit-success tabular-nums">{{ fmtNum(totals.fiber) }}g</p>
      </div>
    </div>

    <!-- Add entry form -->
    <div
      v-if="showAddForm"
      class="bg-habit-bg border border-habit-border rounded-lg p-3 space-y-3"
    >
      <!-- Food search -->
      <div class="relative">
        <label class="block text-xs text-habit-text-subtle mb-1">Cerca alimento</label>
        <input
          v-model="searchText"
          type="text"
          placeholder="Es. banana, pollo, riso..."
          class="w-full px-3 py-2 bg-habit-bg border border-habit-border text-sm text-habit-text rounded focus:outline-none focus:border-habit-cyan"
        />
        <div
          v-if="searchResults.length > 0"
          class="absolute z-10 mt-1 w-full bg-habit-card border border-habit-border rounded shadow-lg max-h-48 overflow-y-auto"
        >
          <button
            v-for="f in searchResults"
            :key="f.id"
            type="button"
            @click="pickFood(f)"
            class="w-full text-left px-3 py-2 hover:bg-habit-card-hover text-sm border-b border-habit-border last:border-0"
          >
            <div class="flex items-center justify-between">
              <span class="text-habit-text">{{ f.name }}</span>
              <span v-if="f.calories_per_100" class="text-[10px] text-habit-text-subtle tabular-nums">
                {{ f.calories_per_100 }}kcal/100{{ f.default_unit }}
              </span>
            </div>
          </button>
        </div>
        <p
          v-if="searchText && !searching && searchResults.length === 0"
          class="text-[10px] text-habit-text-subtle mt-1"
        >
          Nessun risultato.
          <button
            @click="() => { newFood.name = searchText; showCreateFoodModal = true; }"
            class="text-habit-cyan hover:underline"
          >
            + Aggiungi "{{ searchText }}" al database
          </button>
        </p>
      </div>

      <!-- Selected food + quantity -->
      <div v-if="form.foodName" class="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Alimento</label>
          <input
            v-model="form.foodName"
            type="text"
            class="w-full px-2 py-1.5 bg-habit-bg-light border border-habit-border text-sm text-habit-text rounded"
          />
        </div>
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Quantità</label>
          <input
            v-model.number="form.quantity"
            type="number"
            step="0.1"
            min="0"
            class="w-20 px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums"
          />
        </div>
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Unità</label>
          <input
            v-model="form.unit"
            type="text"
            maxlength="10"
            class="w-16 px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
          />
        </div>
      </div>

      <!-- Alimento senza food_id: input libero -->
      <div v-if="!form.foodName" class="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Oppure scrivi libero</label>
          <input
            v-model="form.foodName"
            type="text"
            placeholder="Es. Pasta al pomodoro"
            class="w-full px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
          />
        </div>
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Quantità</label>
          <input
            v-model.number="form.quantity"
            type="number"
            step="0.1"
            min="0"
            class="w-20 px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums"
          />
        </div>
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Unità</label>
          <input
            v-model="form.unit"
            type="text"
            maxlength="10"
            class="w-16 px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
          />
        </div>
      </div>

      <!-- Meal type + time -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Pasto</label>
          <select
            v-model="form.mealType"
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
            v-model="form.time"
            type="time"
            class="w-full px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
          />
        </div>
      </div>

      <!-- Macros override (opzionale) -->
      <details class="text-xs">
        <summary class="cursor-pointer text-habit-text-subtle select-none">
          Inserisci macros manualmente (se l'alimento non è nel DB)
        </summary>
        <div class="grid grid-cols-5 gap-1.5 mt-2">
          <input v-model.number="form.calories" type="number" step="1" min="0" placeholder="Kcal"
            class="px-2 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums" />
          <input v-model.number="form.protein" type="number" step="0.1" min="0" placeholder="P g"
            class="px-2 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums" />
          <input v-model.number="form.carbs" type="number" step="0.1" min="0" placeholder="C g"
            class="px-2 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums" />
          <input v-model.number="form.fat" type="number" step="0.1" min="0" placeholder="F g"
            class="px-2 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums" />
          <input v-model.number="form.fiber" type="number" step="0.1" min="0" placeholder="Fib g"
            class="px-2 py-1 bg-habit-bg border border-habit-border text-xs text-habit-text rounded tabular-nums" />
        </div>
      </details>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          @click="resetForm"
          class="px-3 py-1.5 text-xs text-habit-text-subtle hover:text-habit-text"
        >
          Annulla
        </button>
        <button
          type="button"
          @click="submitEntry"
          :disabled="saving || !form.foodName || !form.quantity"
          class="px-4 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded hover:bg-habit-orange disabled:opacity-50 transition-colors"
        >
          {{ saving ? "Salvataggio..." : "Salva pasto" }}
        </button>
      </div>
    </div>

    <!-- Entries grouped by meal -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-12 bg-habit-skeleton rounded animate-pulse"></div>
    </div>
    <div
      v-else-if="entries.length === 0"
      class="py-8 text-center text-habit-text-subtle text-sm"
    >
      <p>Nessun pasto registrato per questa giornata</p>
      <p class="text-xs mt-1">Clicca "+ Registra pasto" per iniziare</p>
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="meal in MEAL_TYPE_OPTIONS"
        :key="meal.value"
      >
        <div
          v-if="groupedByMeal[meal.value].length > 0"
          class="border border-habit-border rounded-lg overflow-hidden"
        >
          <div class="px-3 py-1.5 bg-habit-bg-light/40 text-xs font-medium text-habit-text-subtle">
            {{ meal.label }}
          </div>
          <ul class="divide-y divide-habit-border">
            <li
              v-for="e in groupedByMeal[meal.value]"
              :key="e.id"
              class="px-3 py-2 flex items-center gap-3 hover:bg-habit-card-hover"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm text-habit-text truncate">
                  {{ e.food_name }}
                  <span class="text-habit-text-subtle text-xs tabular-nums">
                    &middot; {{ e.quantity }}{{ e.unit }}
                  </span>
                </p>
                <p class="text-[11px] text-habit-text-subtle tabular-nums">
                  {{ fmtNum(e.calories) }} kcal &middot;
                  P {{ fmtNum(e.protein) }}g &middot;
                  C {{ fmtNum(e.carbs) }}g &middot;
                  G {{ fmtNum(e.fat) }}g
                </p>
              </div>
              <button
                @click="deleteEntry(e.id)"
                class="px-2 py-0.5 text-[10px] border border-habit-border rounded text-red-400 hover:border-red-400"
              >
                Elimina
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Create food modal -->
    <div
      v-if="showCreateFoodModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="showCreateFoodModal = false"
    >
      <div class="bg-habit-card border border-habit-border rounded-xl max-w-md w-full p-5 space-y-3">
        <h3 class="text-base font-semibold text-habit-text">Nuovo alimento nel database</h3>
        <p class="text-xs text-habit-text-subtle">
          Aggiungi un alimento riutilizzabile. I valori sono per 100{{ newFood.defaultUnit }}.
        </p>

        <div>
          <label class="block text-xs text-habit-text-subtle mb-1">Nome *</label>
          <input
            v-model="newFood.name"
            type="text"
            class="w-full px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-habit-text-subtle mb-1">Unità default</label>
            <select
              v-model="newFood.defaultUnit"
              class="w-full px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded"
            >
              <option value="g">grammi (g)</option>
              <option value="ml">millilitri (ml)</option>
              <option value="pz">pezzi (pz)</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-1.5 text-xs text-habit-text cursor-pointer">
              <input v-model="newFood.isPreset" type="checkbox" class="accent-habit-cyan" />
              Preset (alimento standard)
            </label>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-1.5">
          <input v-model.number="newFood.caloriesPer100" type="number" min="0" placeholder="Kcal"
            class="px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums" />
          <input v-model.number="newFood.proteinPer100" type="number" step="0.1" min="0" placeholder="P g"
            class="px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums" />
          <input v-model.number="newFood.carbsPer100" type="number" step="0.1" min="0" placeholder="C g"
            class="px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums" />
          <input v-model.number="newFood.fatPer100" type="number" step="0.1" min="0" placeholder="F g"
            class="px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums" />
          <input v-model.number="newFood.fiberPer100" type="number" step="0.1" min="0" placeholder="Fib g"
            class="px-2 py-1.5 bg-habit-bg border border-habit-border text-sm text-habit-text rounded tabular-nums" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="showCreateFoodModal = false"
            class="px-3 py-1.5 text-sm text-habit-text-subtle hover:text-habit-text"
          >
            Annulla
          </button>
          <button
            @click="createFoodInDb"
            :disabled="!newFood.name || newFood.name.length < 2"
            class="px-4 py-1.5 bg-habit-cyan text-white text-sm font-medium rounded hover:bg-habit-orange disabled:opacity-50"
          >
            Crea
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
