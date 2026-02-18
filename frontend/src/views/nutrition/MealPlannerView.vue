<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNutritionStore } from "@/store/nutrition";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import { useNative } from "@/composables/useNative";

const route = useRoute();
const router = useRouter();
const store = useNutritionStore();
const toast = useToast();
const isDirty = ref(false);
useUnsavedChanges(isDirty);
const { isMobile } = useNative();

// Local state
const saving = ref(false);
const expandedDays = ref<Record<string, any>>({});
const editingPlanInfo = ref(false);

// Plan info edit form
const planInfoForm = ref<Record<string, any>>({
  name: "",
  startDate: "",
  endDate: "",
  targetCalories: null,
  targetProteinG: null,
  targetCarbsG: null,
  targetFatG: null,
  notes: "",
});

// Add day form
const showAddDayForm = ref(false);
const addDayForm = ref<Record<string, any>>({
  dayNumber: 1,
  dayName: "",
  notes: "",
});

// Add meal form (keyed by dayId)
const showAddMealForm = ref<Record<string, any>>({});
const addMealForms = ref<Record<string, any>>({});

// Add item form (keyed by mealId)
const showAddItemForm = ref<Record<string, any>>({});
const addItemForms = ref<Record<string, any>>({});

// Delete confirm (ConfirmDialog)
const showDeleteConfirm = ref(false);
const deleteTarget = ref<Record<string, any>>({ type: "", id: null, name: "" });
const isDeleting = ref(false);

// Computed
const plan = computed(() => store.currentPlan as any);
const isLoading = computed(() => store.planLoading);
const planId = computed(() => (route.params.id || route.params.planId) as any);

const clientName = computed(() => {
  if (!plan.value) return "";
  return `${plan.value.client_first_name || ""} ${plan.value.client_last_name || ""}`.trim();
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: "Bozza",
    active: "Attivo",
    completed: "Completato",
    archived: "Archiviato",
  };
  return map[plan.value?.status] || plan.value?.status;
});

const statusClasses = computed(() => {
  const map: Record<string, string> = {
    draft: "bg-habit-skeleton/50 text-habit-text-muted",
    active: "bg-emerald-500/20 text-emerald-400",
    completed: "bg-cyan-500/20 text-cyan-400",
    archived: "bg-orange-500/20 text-orange-400",
  };
  return (
    map[plan.value?.status] || "bg-habit-skeleton/50 text-habit-text-muted"
  );
});

const isDraft = computed(() => plan.value?.status === "draft");
const isEditable = computed(() =>
  ["draft", "active"].includes(plan.value?.status),
);

// Meal type options
const mealTypeOptions = [
  { value: "breakfast", label: "Colazione" },
  { value: "morning_snack", label: "Spuntino Mattina" },
  { value: "lunch", label: "Pranzo" },
  { value: "afternoon_snack", label: "Spuntino Pomeriggio" },
  { value: "dinner", label: "Cena" },
  { value: "evening_snack", label: "Spuntino Sera" },
  { value: "other", label: "Altro" },
];

const getMealTypeLabel = (type: any) => {
  const opt = mealTypeOptions.find((m) => m.value === type);
  return opt ? opt.label : type;
};

// Day toggle
const toggleDay = (dayId: any) => {
  expandedDays.value[dayId] = !expandedDays.value[dayId];
};

// Plan info editing
const startEditPlanInfo = () => {
  if (!plan.value) return;
  planInfoForm.value = {
    name: plan.value.name || "",
    startDate: plan.value.start_date ? plan.value.start_date.split("T")[0] : "",
    endDate: plan.value.end_date ? plan.value.end_date.split("T")[0] : "",
    targetCalories: plan.value.target_calories || null,
    targetProteinG: plan.value.target_protein_g || null,
    targetCarbsG: plan.value.target_carbs_g || null,
    targetFatG: plan.value.target_fat_g || null,
    notes: plan.value.notes || "",
  };
  editingPlanInfo.value = true;
};

const savePlanInfo = async () => {
  saving.value = true;
  const data = { ...planInfoForm.value };
  if (!data.startDate) (data as any).startDate = undefined;
  if (!data.endDate) (data as any).endDate = undefined;
  const result = await store.updatePlan(planId.value, data);
  if (result.success) {
    editingPlanInfo.value = false;
    isDirty.value = false;
    toast.success("Piano aggiornato");
  } else {
    toast.error("Errore durante l'aggiornamento del piano");
  }
  saving.value = false;
};

// Day actions
const handleAddDay = async () => {
  saving.value = true;
  const result = await store.addDay(planId.value, addDayForm.value);
  if (result.success) {
    showAddDayForm.value = false;
    addDayForm.value = {
      dayNumber: (plan.value?.days?.length || 0) + 2,
      dayName: "",
      notes: "",
    };
    isDirty.value = true;
    toast.success("Giorno aggiunto");
  } else {
    toast.error("Errore durante l'aggiunta del giorno");
  }
  saving.value = false;
};

const handleDeleteDay = async (dayId: any) => {
  isDeleting.value = true;
  await store.deleteDay(dayId, planId.value);
  isDeleting.value = false;
  showDeleteConfirm.value = false;
  toast.success("Giorno eliminato");
};

// Meal actions
const getAddMealForm = (dayId: any) => {
  if (!addMealForms.value[dayId]) {
    addMealForms.value[dayId] = {
      mealType: "breakfast",
      name: "",
      notes: "",
    };
  }
  return addMealForms.value[dayId];
};

const handleAddMeal = async (dayId: any) => {
  saving.value = true;
  const form = addMealForms.value[dayId];
  const result = await store.addMeal(dayId, form, planId.value);
  if (result.success) {
    showAddMealForm.value[dayId] = false;
    addMealForms.value[dayId] = { mealType: "breakfast", name: "", notes: "" };
    isDirty.value = true;
    toast.success("Pasto aggiunto");
  } else {
    toast.error("Errore durante l'aggiunta del pasto");
  }
  saving.value = false;
};

const handleDeleteMeal = async (mealId: any) => {
  isDeleting.value = true;
  await store.deleteMeal(mealId, planId.value);
  isDeleting.value = false;
  showDeleteConfirm.value = false;
  toast.success("Pasto eliminato");
};

// Item actions
const getAddItemForm = (mealId: any) => {
  if (!addItemForms.value[mealId]) {
    addItemForms.value[mealId] = {
      foodName: "",
      quantity: null,
      unit: "g",
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fiberG: null,
      notes: "",
    };
  }
  return addItemForms.value[mealId];
};

const handleAddItem = async (mealId: any) => {
  const form = addItemForms.value[mealId];
  if (!form || !form.foodName) return;

  saving.value = true;
  const result = await store.addMealItem(mealId, form, planId.value);
  if (result.success) {
    showAddItemForm.value[mealId] = false;
    addItemForms.value[mealId] = {
      foodName: "",
      quantity: null,
      unit: "g",
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fiberG: null,
      notes: "",
    };
    isDirty.value = true;
    toast.success("Alimento aggiunto");
  } else {
    toast.error("Errore durante l'aggiunta dell'alimento");
  }
  saving.value = false;
};

const handleDeleteItem = async (itemId: any) => {
  isDeleting.value = true;
  await store.deleteMealItem(itemId, planId.value);
  isDeleting.value = false;
  showDeleteConfirm.value = false;
  toast.success("Alimento eliminato");
};

// Computed day totals from items (local calculation)
const calculateDayTotals = (day: any) => {
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0;
  if (day.meals) {
    for (const meal of day.meals) {
      if (meal.items) {
        for (const item of meal.items) {
          calories += item.calories || 0;
          protein += parseFloat(item.protein_g || 0);
          carbs += parseFloat(item.carbs_g || 0);
          fat += parseFloat(item.fat_g || 0);
        }
      }
    }
  }
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
};

// Meal totals from items
const calculateMealTotals = (meal: any) => {
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0;
  if (meal.items) {
    for (const item of meal.items) {
      calories += item.calories || 0;
      protein += parseFloat(item.protein_g || 0);
      carbs += parseFloat(item.carbs_g || 0);
      fat += parseFloat(item.fat_g || 0);
    }
  }
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
};

// Delete confirm helpers
const confirmDelete = (type: any, id: any, name: any) => {
  deleteTarget.value = { type, id, name };
  showDeleteConfirm.value = true;
};

const executeDelete = async () => {
  const { type, id } = deleteTarget.value;
  if (type === "day") await handleDeleteDay(id);
  else if (type === "meal") await handleDeleteMeal(id);
  else if (type === "item") await handleDeleteItem(id);
};

const deleteConfirmMessage = computed(() => {
  const { type, name } = deleteTarget.value;
  let msg = `Vuoi eliminare "${name}"?`;
  if (type === "day")
    msg += " Tutti i pasti e gli alimenti associati verranno eliminati.";
  else if (type === "meal")
    msg += " Tutti gli alimenti del pasto verranno eliminati.";
  return msg;
});

// Format date
const formatDate = (dateStr: any) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Navigation
const goBack = () => {
  router.push("/nutrition");
};

// Lifecycle
onMounted(async () => {
  if (planId.value) {
    await store.fetchPlanById(planId.value);
    // Espandi primo giorno di default
    if (plan.value?.days?.length > 0) {
      expandedDays.value[plan.value.days[0].id] = true;
    }
    // Prepara form add day
    addDayForm.value.dayNumber = (plan.value?.days?.length || 0) + 1;
  }
});

onUnmounted(() => {
  store.clearCurrentPlan();
});
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <!-- Loading -->
    <div v-if="isLoading" class="animate-pulse space-y-6">
      <div class="h-8 bg-habit-skeleton rounded w-72"></div>
      <div class="h-32 bg-habit-skeleton rounded-habit"></div>
      <div class="h-48 bg-habit-skeleton rounded-habit"></div>
      <div class="h-48 bg-habit-skeleton rounded-habit"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error && !plan" class="space-y-4">
      <div class="bg-red-500/10 border border-red-500/30 rounded-habit p-4">
        <p class="text-red-400">{{ store.error }}</p>
      </div>
      <button
        @click="goBack"
        class="text-habit-cyan hover:text-cyan-300 flex items-center gap-2 text-sm"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Torna ai Piani
      </button>
    </div>

    <!-- Content -->
    <div v-else-if="plan" class="space-y-6">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <button
            @click="goBack"
            class="text-habit-text-subtle hover:text-habit-text flex items-center gap-1 text-sm mb-2 transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Torna ai Piani
          </button>
          <h1
            class="text-xl sm:text-2xl font-bold text-habit-text flex items-center gap-3"
          >
            {{ plan.name }}
            <span
              :class="[
                'px-2.5 py-1 text-xs rounded-full font-medium',
                statusClasses,
              ]"
            >
              {{ statusLabel }}
            </span>
          </h1>
          <p class="text-habit-text-subtle mt-1">{{ clientName }}</p>
        </div>

        <div class="flex gap-3">
          <button
            v-if="isEditable && !editingPlanInfo"
            @click="startEditPlanInfo"
            class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
          >
            Modifica Info
          </button>
          <button
            v-if="isDraft"
            @click="store.updatePlan(planId, { status: 'active' })"
            class="px-4 py-2 bg-emerald-500 text-white rounded-habit hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            Attiva Piano
          </button>
        </div>
      </div>

      <!-- Error banner -->
      <div
        v-if="store.error"
        class="bg-red-500/10 border border-red-500/30 rounded-habit p-3"
      >
        <p class="text-red-400 text-sm">{{ store.error }}</p>
      </div>

      <!-- Plan Info Card (view mode) -->
      <div
        v-if="!editingPlanInfo"
        class="bg-habit-card border border-habit-border rounded-habit p-5"
      >
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Inizio
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ formatDate(plan.start_date) }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Fine
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ formatDate(plan.end_date) }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Giorni
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ plan.days?.length || 0 }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >
              Status
            </p>
            <span
              :class="['px-2 py-0.5 text-xs rounded-full', statusClasses]"
              >{{ statusLabel }}</span
            >
          </div>
        </div>
        <!-- Target macro -->
        <div
          v-if="plan.target_calories || plan.target_protein_g"
          class="mt-4 pt-4 border-t border-habit-border"
        >
          <p
            class="text-habit-text-subtle text-xs uppercase tracking-wide mb-2"
          >
            Target Giornalieri
          </p>
          <div class="flex flex-wrap gap-3">
            <span
              v-if="plan.target_calories"
              class="px-2.5 py-1 bg-red-500/15 text-red-400 rounded-full text-xs font-medium"
            >
              {{ plan.target_calories }} kcal
            </span>
            <span
              v-if="plan.target_protein_g"
              class="px-2.5 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs font-medium"
            >
              P: {{ plan.target_protein_g }}g
            </span>
            <span
              v-if="plan.target_carbs_g"
              class="px-2.5 py-1 bg-yellow-500/15 text-yellow-400 rounded-full text-xs font-medium"
            >
              C: {{ plan.target_carbs_g }}g
            </span>
            <span
              v-if="plan.target_fat_g"
              class="px-2.5 py-1 bg-orange-500/15 text-orange-400 rounded-full text-xs font-medium"
            >
              F: {{ plan.target_fat_g }}g
            </span>
          </div>
        </div>
        <!-- Notes -->
        <div v-if="plan.notes" class="mt-4 pt-4 border-t border-habit-border">
          <p
            class="text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
          >
            Note
          </p>
          <p class="text-habit-text-muted text-sm">{{ plan.notes }}</p>
        </div>
      </div>

      <!-- Plan Info Card (edit mode) -->
      <div
        v-if="editingPlanInfo"
        class="bg-habit-card border border-habit-cyan/30 rounded-habit p-5"
      >
        <h3 class="text-habit-text font-medium mb-4">
          Modifica Informazioni Piano
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
              >Nome Piano *</label
            >
            <input
              v-model="planInfoForm.name"
              type="text"
              class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Data Inizio</label
              >
              <input
                v-model="planInfoForm.startDate"
                type="date"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
              />
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Data Fine</label
              >
              <input
                v-model="planInfoForm.endDate"
                type="date"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
              />
            </div>
          </div>
        </div>
        <p class="text-habit-text-subtle text-xs uppercase tracking-wide mb-2">
          Target Macro Giornalieri
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-habit-text-subtle text-xs mb-1"
              >Calorie (kcal)</label
            >
            <input
              v-model.number="planInfoForm.targetCalories"
              type="number"
              min="0"
              class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
            />
          </div>
          <div>
            <label class="block text-habit-text-subtle text-xs mb-1"
              >Proteine (g)</label
            >
            <input
              v-model.number="planInfoForm.targetProteinG"
              type="number"
              min="0"
              class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
            />
          </div>
          <div>
            <label class="block text-habit-text-subtle text-xs mb-1"
              >Carboidrati (g)</label
            >
            <input
              v-model.number="planInfoForm.targetCarbsG"
              type="number"
              min="0"
              class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
            />
          </div>
          <div>
            <label class="block text-habit-text-subtle text-xs mb-1"
              >Grassi (g)</label
            >
            <input
              v-model.number="planInfoForm.targetFatG"
              type="number"
              min="0"
              class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none"
            />
          </div>
        </div>
        <div class="mb-4">
          <label
            class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
            >Note</label
          >
          <textarea
            v-model="planInfoForm.notes"
            rows="2"
            class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/50 outline-none resize-none"
          ></textarea>
        </div>
        <div class="flex gap-3 justify-end">
          <button
            @click="editingPlanInfo = false"
            class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
          >
            Annulla
          </button>
          <button
            @click="savePlanInfo"
            :disabled="!planInfoForm.name || saving"
            class="px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {{ saving ? "Salvataggio..." : "Salva" }}
          </button>
        </div>
      </div>

      <!-- ==================== DAYS LIST ==================== -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-habit-text">
            Giorni ({{ plan.days?.length || 0 }})
          </h2>
          <button
            v-if="isEditable"
            @click="showAddDayForm = !showAddDayForm"
            class="px-3 py-1.5 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 transition-colors text-sm font-medium"
          >
            + Giorno
          </button>
        </div>

        <!-- Add day form -->
        <div
          v-if="showAddDayForm && isEditable"
          class="bg-habit-card border border-habit-cyan/30 rounded-habit p-4"
        >
          <h4 class="text-habit-text text-sm font-medium mb-3">
            Aggiungi Giorno
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label class="block text-habit-text-subtle text-xs mb-1"
                >Numero *</label
              >
              <input
                v-model.number="addDayForm.dayNumber"
                type="number"
                min="1"
                class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-1.5 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div>
              <label class="block text-habit-text-subtle text-xs mb-1"
                >Nome (opz.)</label
              >
              <input
                v-model="addDayForm.dayName"
                type="text"
                placeholder="es. Lunedi"
                class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-1.5 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div>
              <label class="block text-habit-text-subtle text-xs mb-1"
                >Note (opz.)</label
              >
              <input
                v-model="addDayForm.notes"
                type="text"
                placeholder="Note..."
                class="w-full bg-habit-bg-light border border-habit-border rounded px-3 py-1.5 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button
              @click="showAddDayForm = false"
              class="px-3 py-1.5 text-habit-text-subtle hover:text-habit-text text-sm transition-colors"
            >
              Annulla
            </button>
            <button
              @click="handleAddDay"
              :disabled="!addDayForm.dayNumber || saving"
              class="px-4 py-1.5 bg-habit-cyan text-white rounded text-sm font-medium hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {{ saving ? "..." : "Aggiungi" }}
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="!plan.days || plan.days.length === 0"
          class="bg-habit-card border border-habit-border rounded-habit p-8 text-center"
        >
          <p class="text-habit-text-subtle mb-2">Nessun giorno nel piano</p>
          <p v-if="isEditable" class="text-habit-text-subtle text-sm">
            Clicca "+ Giorno" per iniziare a costruire il piano alimentare
          </p>
        </div>

        <!-- Day Cards -->
        <div
          v-for="day in plan.days"
          :key="day.id"
          class="bg-habit-card border border-habit-border rounded-habit overflow-hidden"
        >
          <!-- Day Header (clickable to expand) -->
          <div
            @click="toggleDay(day.id)"
            class="p-4 flex items-center justify-between cursor-pointer hover:bg-habit-bg-light/30 transition-colors"
          >
            <div class="flex items-center gap-3">
              <!-- Expand chevron -->
              <svg
                :class="[
                  'w-4 h-4 text-habit-text-subtle transition-transform',
                  expandedDays[day.id] ? 'rotate-90' : '',
                ]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <div>
                <h3 class="text-habit-text font-medium">
                  Giorno {{ day.day_number }}
                  <span
                    v-if="day.day_name"
                    class="text-habit-text-subtle font-normal ml-1"
                    >- {{ day.day_name }}</span
                  >
                </h3>
                <p class="text-habit-text-subtle text-xs mt-0.5">
                  {{ day.meals?.length || 0 }} pasti
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Day macro totals -->
              <div class="hidden sm:flex gap-2 text-xs">
                <span class="px-2 py-0.5 bg-red-500/10 text-red-400 rounded">
                  {{ calculateDayTotals(day).calories }} kcal
                </span>
                <span class="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                  P:{{ calculateDayTotals(day).protein }}g
                </span>
                <span
                  class="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded"
                >
                  C:{{ calculateDayTotals(day).carbs }}g
                </span>
                <span
                  class="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded"
                >
                  F:{{ calculateDayTotals(day).fat }}g
                </span>
              </div>

              <!-- Delete day -->
              <button
                v-if="isEditable"
                @click.stop="
                  confirmDelete('day', day.id, `Giorno ${day.day_number}`)
                "
                class="p-1 text-habit-text-subtle hover:text-red-400 transition-colors"
              >
                <svg
                  class="w-4 h-4"
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

          <!-- Day Content (expanded) -->
          <div v-if="expandedDays[day.id]" class="border-t border-habit-border">
            <!-- Day notes -->
            <div
              v-if="day.notes"
              class="px-4 py-2 bg-habit-bg-light/20 border-b border-habit-border/50"
            >
              <p class="text-habit-text-subtle text-xs">
                <span class="text-habit-text-subtle">Note:</span>
                {{ day.notes }}
              </p>
            </div>

            <!-- Mobile macro totals -->
            <div
              class="sm:hidden px-4 py-2 border-b border-habit-border/50 flex gap-2 text-xs"
            >
              <span class="px-2 py-0.5 bg-red-500/10 text-red-400 rounded"
                >{{ calculateDayTotals(day).calories }} kcal</span
              >
              <span class="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded"
                >P:{{ calculateDayTotals(day).protein }}g</span
              >
              <span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded"
                >C:{{ calculateDayTotals(day).carbs }}g</span
              >
              <span class="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded"
                >F:{{ calculateDayTotals(day).fat }}g</span
              >
            </div>

            <!-- Meals -->
            <div class="divide-y divide-habit-border/50">
              <div v-for="meal in day.meals" :key="meal.id" class="px-4 py-3">
                <!-- Meal Header -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-habit-cyan text-sm font-medium">
                      {{ getMealTypeLabel(meal.meal_type) }}
                    </span>
                    <span
                      v-if="meal.name"
                      class="text-habit-text-subtle text-sm"
                      >- {{ meal.name }}</span
                    >
                    <span class="text-habit-text-subtle text-xs">
                      ({{ calculateMealTotals(meal).calories }} kcal)
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="isEditable"
                      @click="
                        showAddItemForm[meal.id] = !showAddItemForm[meal.id];
                        getAddItemForm(meal.id);
                      "
                      class="text-xs text-habit-cyan hover:text-cyan-300 transition-colors"
                    >
                      + Alimento
                    </button>
                    <button
                      v-if="isEditable"
                      @click="
                        confirmDelete(
                          'meal',
                          meal.id,
                          getMealTypeLabel(meal.meal_type),
                        )
                      "
                      class="p-0.5 text-habit-text-subtle hover:text-red-400 transition-colors"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Meal Items Table (Desktop) -->
                <div
                  v-if="meal.items && meal.items.length > 0 && !isMobile"
                  class="overflow-x-auto"
                >
                  <table class="w-full text-xs">
                    <thead>
                      <tr
                        class="text-habit-text-subtle uppercase tracking-wider"
                      >
                        <th class="py-1 text-left font-medium">Alimento</th>
                        <th class="py-1 text-center font-medium w-16">Qty</th>
                        <th class="py-1 text-center font-medium w-14">Kcal</th>
                        <th class="py-1 text-center font-medium w-12">P</th>
                        <th class="py-1 text-center font-medium w-12">C</th>
                        <th class="py-1 text-center font-medium w-12">F</th>
                        <th v-if="isEditable" class="py-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in meal.items"
                        :key="item.id"
                        class="text-habit-text-muted border-t border-habit-border/30"
                      >
                        <td class="py-1.5 text-left">
                          <span class="text-habit-text">{{
                            item.food_name
                          }}</span>
                          <span
                            v-if="item.notes"
                            class="text-habit-text-subtle ml-1"
                            :title="item.notes"
                            >*</span
                          >
                        </td>
                        <td class="py-1.5 text-center text-habit-text-subtle">
                          {{ item.quantity }}{{ item.unit }}
                        </td>
                        <td class="py-1.5 text-center text-red-400 font-medium">
                          {{ item.calories || "-" }}
                        </td>
                        <td class="py-1.5 text-center text-blue-400">
                          {{ item.protein_g || "-" }}
                        </td>
                        <td class="py-1.5 text-center text-yellow-400">
                          {{ item.carbs_g || "-" }}
                        </td>
                        <td class="py-1.5 text-center text-orange-400">
                          {{ item.fat_g || "-" }}
                        </td>
                        <td v-if="isEditable" class="py-1.5 text-center">
                          <button
                            @click="
                              confirmDelete('item', item.id, item.food_name)
                            "
                            class="text-habit-text-subtle hover:text-red-400 transition-colors"
                          >
                            <svg
                              class="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      <!-- Meal totals row -->
                      <tr
                        class="border-t border-habit-border/50 text-habit-text-subtle font-medium"
                      >
                        <td
                          class="py-1.5 text-left text-habit-text-subtle italic"
                        >
                          Totale
                        </td>
                        <td></td>
                        <td class="py-1.5 text-center text-red-400">
                          {{ calculateMealTotals(meal).calories }}
                        </td>
                        <td class="py-1.5 text-center text-blue-400">
                          {{ calculateMealTotals(meal).protein }}
                        </td>
                        <td class="py-1.5 text-center text-yellow-400">
                          {{ calculateMealTotals(meal).carbs }}
                        </td>
                        <td class="py-1.5 text-center text-orange-400">
                          {{ calculateMealTotals(meal).fat }}
                        </td>
                        <td v-if="isEditable"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Meal Items Cards (Mobile) -->
                <div
                  v-else-if="meal.items && meal.items.length > 0 && isMobile"
                  class="space-y-2"
                >
                  <div
                    v-for="item in meal.items"
                    :key="item.id"
                    class="bg-habit-bg-light/30 border border-habit-border/40 rounded-lg p-3"
                  >
                    <!-- Food name row with delete button -->
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <span
                          class="text-habit-text text-sm font-medium truncate"
                          >{{ item.food_name }}</span
                        >
                        <span
                          v-if="item.notes"
                          class="text-habit-text-subtle text-xs flex-shrink-0"
                          :title="item.notes"
                          >*</span
                        >
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-habit-text-subtle text-xs"
                          >{{ item.quantity }}{{ item.unit }}</span
                        >
                        <button
                          v-if="isEditable"
                          @click="
                            confirmDelete('item', item.id, item.food_name)
                          "
                          class="p-1 text-habit-text-subtle hover:text-red-400 transition-colors"
                        >
                          <svg
                            class="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <!-- Macros 2x2 grid -->
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div class="flex items-center justify-between">
                        <span class="text-habit-text-subtle">Kcal</span>
                        <span class="text-red-400 font-medium">{{
                          item.calories || "-"
                        }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-habit-text-subtle">Proteine</span>
                        <span class="text-blue-400"
                          >{{ item.protein_g || "-" }}g</span
                        >
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-habit-text-subtle">Carboidrati</span>
                        <span class="text-yellow-400"
                          >{{ item.carbs_g || "-" }}g</span
                        >
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-habit-text-subtle">Grassi</span>
                        <span class="text-orange-400"
                          >{{ item.fat_g || "-" }}g</span
                        >
                      </div>
                    </div>
                  </div>
                  <!-- Meal totals card -->
                  <div
                    class="bg-habit-bg-light/50 border border-habit-border/50 rounded-lg p-3"
                  >
                    <div class="flex items-center justify-between mb-1.5">
                      <span
                        class="text-habit-text-subtle text-xs font-medium italic"
                        >Totale Pasto</span
                      >
                    </div>
                    <div class="grid grid-cols-4 gap-2 text-xs text-center">
                      <div>
                        <span
                          class="block text-habit-text-subtle text-[10px] uppercase"
                          >Kcal</span
                        >
                        <span class="text-red-400 font-medium">{{
                          calculateMealTotals(meal).calories
                        }}</span>
                      </div>
                      <div>
                        <span
                          class="block text-habit-text-subtle text-[10px] uppercase"
                          >Prot</span
                        >
                        <span class="text-blue-400 font-medium"
                          >{{ calculateMealTotals(meal).protein }}g</span
                        >
                      </div>
                      <div>
                        <span
                          class="block text-habit-text-subtle text-[10px] uppercase"
                          >Carb</span
                        >
                        <span class="text-yellow-400 font-medium"
                          >{{ calculateMealTotals(meal).carbs }}g</span
                        >
                      </div>
                      <div>
                        <span
                          class="block text-habit-text-subtle text-[10px] uppercase"
                          >Grassi</span
                        >
                        <span class="text-orange-400 font-medium"
                          >{{ calculateMealTotals(meal).fat }}g</span
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <p v-else class="text-habit-text-subtle text-xs italic">
                  Nessun alimento
                </p>

                <!-- Add Item Form (inline) -->
                <div
                  v-if="showAddItemForm[meal.id] && isEditable"
                  class="mt-2 p-3 bg-habit-bg-light/40 rounded border border-habit-border/50"
                >
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <div class="col-span-2">
                      <input
                        v-model="getAddItemForm(meal.id).foodName"
                        type="text"
                        placeholder="Nome alimento *"
                        class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                      />
                    </div>
                    <div class="flex gap-1">
                      <input
                        v-model.number="getAddItemForm(meal.id).quantity"
                        type="number"
                        min="0"
                        placeholder="Qty"
                        class="flex-1 bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                      />
                      <select
                        v-model="getAddItemForm(meal.id).unit"
                        class="bg-habit-bg-light border border-habit-border rounded px-1 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none w-14"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="pz">pz</option>
                        <option value="cucchiaio">cucch.</option>
                        <option value="tazza">tazza</option>
                      </select>
                    </div>
                    <div>
                      <input
                        v-model.number="getAddItemForm(meal.id).calories"
                        type="number"
                        min="0"
                        placeholder="Kcal"
                        class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                      />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <input
                      v-model.number="getAddItemForm(meal.id).proteinG"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Prot (g)"
                      class="bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    />
                    <input
                      v-model.number="getAddItemForm(meal.id).carbsG"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Carb (g)"
                      class="bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    />
                    <input
                      v-model.number="getAddItemForm(meal.id).fatG"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Grassi (g)"
                      class="bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    />
                    <input
                      v-model.number="getAddItemForm(meal.id).fiberG"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Fibre (g)"
                      class="bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    />
                  </div>
                  <div class="flex gap-2 justify-end">
                    <button
                      @click="showAddItemForm[meal.id] = false"
                      class="text-habit-text-subtle hover:text-habit-text text-xs transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      @click="handleAddItem(meal.id)"
                      :disabled="!getAddItemForm(meal.id).foodName || saving"
                      class="px-3 py-1 bg-habit-cyan text-white rounded text-xs font-medium hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {{ saving ? "..." : "Aggiungi" }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- No meals message -->
              <div
                v-if="!day.meals || day.meals.length === 0"
                class="px-4 py-4 text-center"
              >
                <p class="text-habit-text-subtle text-sm">
                  Nessun pasto per questo giorno
                </p>
              </div>
            </div>

            <!-- Add Meal Button -->
            <div
              v-if="isEditable"
              class="px-4 py-3 border-t border-habit-border"
            >
              <!-- Add meal toggle -->
              <div v-if="!showAddMealForm[day.id]">
                <button
                  @click="
                    showAddMealForm[day.id] = true;
                    getAddMealForm(day.id);
                  "
                  class="text-sm text-habit-cyan hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Aggiungi Pasto
                </button>
              </div>

              <!-- Add meal form -->
              <div
                v-else
                class="p-3 bg-habit-bg-light/40 rounded border border-habit-border/50"
              >
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <div>
                    <label class="block text-habit-text-subtle text-xs mb-1"
                      >Tipo Pasto *</label
                    >
                    <select
                      v-model="getAddMealForm(day.id).mealType"
                      class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    >
                      <option
                        v-for="opt in mealTypeOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-habit-text-subtle text-xs mb-1"
                      >Nome (opz.)</label
                    >
                    <input
                      v-model="getAddMealForm(day.id).name"
                      type="text"
                      placeholder="es. Pre-Workout"
                      class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    />
                  </div>
                  <div>
                    <label class="block text-habit-text-subtle text-xs mb-1"
                      >Note (opz.)</label
                    >
                    <input
                      v-model="getAddMealForm(day.id).notes"
                      type="text"
                      placeholder="Note..."
                      class="w-full bg-habit-bg-light border border-habit-border rounded px-2 py-1.5 text-habit-text text-xs focus:border-habit-cyan outline-none"
                    />
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    @click="showAddMealForm[day.id] = false"
                    class="text-habit-text-subtle hover:text-habit-text text-xs transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    @click="handleAddMeal(day.id)"
                    :disabled="!getAddMealForm(day.id).mealType || saving"
                    class="px-3 py-1 bg-habit-cyan text-white rounded text-xs font-medium hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {{ saving ? "..." : "Aggiungi" }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Dialog -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Conferma Eliminazione"
      :message="deleteConfirmMessage"
      confirmText="Elimina"
      cancelText="Annulla"
      variant="danger"
      :loading="isDeleting"
      @confirm="executeDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
