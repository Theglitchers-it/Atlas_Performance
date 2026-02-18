<template>
  <div
    class="card overflow-hidden transition-all"
    :class="{ 'ring-2': isOpen }"
    :style="
      isOpen
        ? { borderColor: accentColor, '--tw-ring-color': accentColor + '30' }
        : {}
    "
  >
    <!-- Header (clickable to toggle) -->
    <button
      class="w-full flex items-center justify-between p-3 sm:p-4 text-left"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2.5 sm:gap-3">
        <div
          class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-lg"
          :style="{ backgroundColor: accentColor + '15', color: accentColor }"
        >
          {{ iconEmoji }}
        </div>
        <div>
          <h3 class="font-semibold text-habit-text text-xs sm:text-sm">
            {{ title }}
          </h3>
          <p class="text-[11px] sm:text-xs text-habit-text-muted">
            {{
              editingRecord
                ? "Modifica misurazione"
                : "Aggiungi nuova misurazione"
            }}
          </p>
        </div>
      </div>
      <svg
        class="w-4 h-4 sm:w-5 sm:h-5 text-habit-text-muted transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Form body -->
    <div
      class="form-collapse-wrapper overflow-hidden"
      :style="{ maxHeight: isOpen ? contentHeight + 'px' : '0px' }"
    >
      <div ref="formContentRef" class="border-t border-habit-border">
        <div class="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <!-- Date field (always first) -->
          <div>
            <label class="label text-xs sm:text-sm">Data misurazione</label>
            <input
              type="date"
              v-model="form.measurementDate"
              class="input w-full text-sm"
            />
          </div>

          <!-- Special fields for skinfolds -->
          <div
            v-if="type === 'skinfolds'"
            class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3"
          >
            <div>
              <label class="label text-xs sm:text-sm">Sesso</label>
              <select v-model="form.gender" class="input w-full text-sm">
                <option value="male">Maschio</option>
                <option value="female">Femmina</option>
              </select>
            </div>
            <div>
              <label class="label text-xs sm:text-sm">Eta</label>
              <input
                type="number"
                v-model.number="form.age"
                class="input w-full text-sm"
                min="5"
                max="120"
                placeholder="30"
              />
            </div>
            <div>
              <label class="label text-xs sm:text-sm">Metodo calcolo</label>
              <select
                v-model="form.calculationMethod"
                class="input w-full text-sm"
              >
                <option value="jackson_pollock_3">Jackson-Pollock 3</option>
                <option value="jackson_pollock_7">Jackson-Pollock 7</option>
                <option value="durnin_womersley">Durnin-Womersley</option>
              </select>
            </div>
          </div>

          <!-- Dynamic fields grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div v-for="field in fields" :key="field.key">
              <label class="label text-xs sm:text-sm">{{ field.label }}</label>
              <div class="relative">
                <input
                  :type="field.type || 'number'"
                  v-model.number="form[field.key]"
                  class="input w-full pr-10 text-sm"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step || 0.1"
                  :placeholder="field.placeholder || ''"
                />
                <span
                  v-if="field.unit"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-habit-text-muted"
                >
                  {{ field.unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- Device model for BIA -->
          <div v-if="type === 'bia'">
            <label class="label text-xs sm:text-sm">Modello dispositivo</label>
            <input
              type="text"
              v-model="form.deviceModel"
              class="input w-full text-sm"
              placeholder="es. InBody 270"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="label text-xs sm:text-sm">Note</label>
            <textarea
              v-model="form.notes"
              class="input w-full text-sm"
              rows="2"
              placeholder="Note opzionali..."
            ></textarea>
          </div>

          <!-- Actions -->
          <div
            class="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1.5 sm:pt-2"
          >
            <button
              class="btn btn-primary btn-sm text-xs sm:text-sm"
              :disabled="saving"
              @click="handleSave"
            >
              <svg
                v-if="saving"
                class="animate-spin -ml-1 mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {{ editingRecord ? "Aggiorna" : "Salva" }}
            </button>
            <button
              v-if="editingRecord"
              class="btn btn-outline btn-sm text-xs sm:text-sm"
              @click="handleCancel"
            >
              Annulla
            </button>
            <button
              v-if="editingRecord"
              class="btn btn-danger btn-sm text-xs sm:text-sm sm:ml-auto"
              @click="handleDelete"
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick, onMounted } from "vue";
import type { MeasurementType } from "@/types";

interface FieldConfig {
  key: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  type?: string;
  placeholder?: string;
}

interface Props {
  type: MeasurementType;
  title: string;
  accentColor: string;
  iconEmoji: string;
  saving: boolean;
  editingRecord: Record<string, any> | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  save: [data: Record<string, any>];
  cancel: [];
  delete: [id: number];
}>();

const isOpen = ref(false);
const formContentRef = ref<HTMLElement | null>(null);
const contentHeight = ref(2000); // Default generous height

const updateContentHeight = () => {
  nextTick(() => {
    if (formContentRef.value) {
      contentHeight.value = formContentRef.value.scrollHeight + 10;
    }
  });
};

// Update height when isOpen changes
watch(isOpen, (val) => {
  if (val) {
    updateContentHeight();
  }
});

onMounted(() => {
  updateContentHeight();
});

const fieldConfigs: Record<string, FieldConfig[]> = {
  anthropometric: [
    {
      key: "heightCm",
      label: "Altezza",
      unit: "cm",
      min: 50,
      max: 250,
      step: 0.1,
    },
    {
      key: "weightKg",
      label: "Peso",
      unit: "kg",
      min: 20,
      max: 400,
      step: 0.1,
    },
    { key: "ageYears", label: "Eta", unit: "anni", min: 5, max: 120, step: 1 },
    {
      key: "dailyStepsAvg",
      label: "Passi giornalieri",
      unit: "passi",
      min: 0,
      max: 100000,
      step: 100,
    },
  ],
  body: [
    {
      key: "weightKg",
      label: "Peso",
      unit: "kg",
      min: 20,
      max: 400,
      step: 0.1,
    },
    {
      key: "bodyFatPercentage",
      label: "% Grasso",
      unit: "%",
      min: 1,
      max: 60,
      step: 0.1,
    },
    {
      key: "muscleMassKg",
      label: "Massa muscolare",
      unit: "kg",
      min: 10,
      max: 200,
      step: 0.1,
    },
  ],
  circumferences: [
    { key: "waistCm", label: "Vita", unit: "cm", min: 30, max: 200, step: 0.1 },
    {
      key: "hipsCm",
      label: "Fianchi",
      unit: "cm",
      min: 40,
      max: 200,
      step: 0.1,
    },
    {
      key: "chestCm",
      label: "Petto",
      unit: "cm",
      min: 50,
      max: 200,
      step: 0.1,
    },
    {
      key: "shouldersCm",
      label: "Spalle",
      unit: "cm",
      min: 60,
      max: 200,
      step: 0.1,
    },
    {
      key: "bicepsCm",
      label: "Bicipiti",
      unit: "cm",
      min: 15,
      max: 70,
      step: 0.1,
    },
    {
      key: "bicepsFlexedCm",
      label: "Bicipiti flessi",
      unit: "cm",
      min: 15,
      max: 80,
      step: 0.1,
    },
    {
      key: "thighUpperCm",
      label: "Coscia alta",
      unit: "cm",
      min: 30,
      max: 100,
      step: 0.1,
    },
    {
      key: "thighLowerCm",
      label: "Coscia bassa",
      unit: "cm",
      min: 20,
      max: 80,
      step: 0.1,
    },
    {
      key: "glutesCm",
      label: "Glutei",
      unit: "cm",
      min: 50,
      max: 200,
      step: 0.1,
    },
  ],
  skinfolds: [
    { key: "chestMm", label: "Petto", unit: "mm", min: 1, max: 80, step: 0.1 },
    {
      key: "abdominalMm",
      label: "Addome",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "quadricepsMm",
      label: "Quadricipite",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "tricepsMm",
      label: "Tricipite",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "subscapularMm",
      label: "Sottoscapolare",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "suprailiacMm",
      label: "Sovrailica",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "bicepsMm",
      label: "Bicipite",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "cheekMm",
      label: "Guancia",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
    {
      key: "calfMm",
      label: "Polpaccio",
      unit: "mm",
      min: 1,
      max: 80,
      step: 0.1,
    },
  ],
  bia: [
    {
      key: "leanMassKg",
      label: "Massa magra",
      unit: "kg",
      min: 10,
      max: 200,
      step: 0.1,
    },
    {
      key: "leanMassPct",
      label: "Massa magra",
      unit: "%",
      min: 10,
      max: 99,
      step: 0.1,
    },
    {
      key: "fatMassKg",
      label: "Massa grassa",
      unit: "kg",
      min: 0,
      max: 200,
      step: 0.1,
    },
    {
      key: "fatMassPct",
      label: "Massa grassa",
      unit: "%",
      min: 1,
      max: 60,
      step: 0.1,
    },
    {
      key: "totalBodyWaterL",
      label: "Acqua totale",
      unit: "L",
      min: 10,
      max: 100,
      step: 0.1,
    },
    {
      key: "totalBodyWaterPct",
      label: "Acqua totale",
      unit: "%",
      min: 30,
      max: 80,
      step: 0.1,
    },
    {
      key: "muscleMassKg",
      label: "Massa muscolare",
      unit: "kg",
      min: 10,
      max: 200,
      step: 0.1,
    },
    {
      key: "basalMetabolicRate",
      label: "BMR",
      unit: "kcal",
      min: 500,
      max: 5000,
      step: 1,
    },
    {
      key: "visceralFatLevel",
      label: "Grasso viscerale",
      unit: "lv",
      min: 1,
      max: 30,
      step: 1,
    },
    {
      key: "boneMassKg",
      label: "Massa ossea",
      unit: "kg",
      min: 0.5,
      max: 10,
      step: 0.1,
    },
  ],
};

const fields = computed(() => fieldConfigs[props.type] || []);

// camelCase to snake_case DB field mapping for editing
const snakeToCamel: Record<string, string> = {
  height_cm: "heightCm",
  weight_kg: "weightKg",
  age_years: "ageYears",
  daily_steps_avg: "dailyStepsAvg",
  body_fat_percentage: "bodyFatPercentage",
  muscle_mass_kg: "muscleMassKg",
  waist_cm: "waistCm",
  hips_cm: "hipsCm",
  biceps_cm: "bicepsCm",
  biceps_flexed_cm: "bicepsFlexedCm",
  shoulders_cm: "shouldersCm",
  chest_cm: "chestCm",
  thigh_upper_cm: "thighUpperCm",
  thigh_lower_cm: "thighLowerCm",
  glutes_cm: "glutesCm",
  chest_mm: "chestMm",
  subscapular_mm: "subscapularMm",
  suprailiac_mm: "suprailiacMm",
  abdominal_mm: "abdominalMm",
  quadriceps_mm: "quadricepsMm",
  biceps_mm: "bicepsMm",
  triceps_mm: "tricepsMm",
  cheek_mm: "cheekMm",
  calf_mm: "calfMm",
  calculation_method: "calculationMethod",
  lean_mass_kg: "leanMassKg",
  lean_mass_pct: "leanMassPct",
  fat_mass_kg: "fatMassKg",
  fat_mass_pct: "fatMassPct",
  total_body_water_l: "totalBodyWaterL",
  total_body_water_pct: "totalBodyWaterPct",
  basal_metabolic_rate: "basalMetabolicRate",
  visceral_fat_level: "visceralFatLevel",
  bone_mass_kg: "boneMassKg",
  device_model: "deviceModel",
  measurement_date: "measurementDate",
};

const getDefaultForm = (): Record<string, any> => {
  const f: Record<string, any> = {
    measurementDate: new Date().toISOString().split("T")[0],
    notes: "",
  };
  if (props.type === "skinfolds") {
    f.gender = "male";
    f.age = 30;
    f.calculationMethod = "jackson_pollock_3";
  }
  if (props.type === "bia") {
    f.deviceModel = "";
  }
  for (const field of fieldConfigs[props.type] || []) {
    f[field.key] = null;
  }
  return f;
};

const form = reactive<Record<string, any>>(getDefaultForm());

const resetForm = () => {
  const defaults = getDefaultForm();
  Object.keys(defaults).forEach((key) => {
    form[key] = defaults[key];
  });
};

// Populate form when editingRecord changes
watch(
  () => props.editingRecord,
  (record) => {
    if (record) {
      isOpen.value = true;
      resetForm();
      // Map snake_case DB fields to camelCase form fields
      for (const [snakeKey, camelKey] of Object.entries(snakeToCamel)) {
        if (record[snakeKey] != null) {
          form[camelKey] = record[snakeKey];
        }
      }
      // Also try camelCase keys directly
      for (const key of Object.keys(form)) {
        if (record[key] != null && form[key] == null) {
          form[key] = record[key];
        }
      }
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

const handleSave = () => {
  // Clean nulls and empty strings for numeric fields
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(form)) {
    if (value !== null && value !== "" && value !== undefined) {
      data[key] = value;
    }
  }
  emit("save", data);
  if (!props.editingRecord) {
    resetForm();
  }
};

const handleCancel = () => {
  resetForm();
  emit("cancel");
};

const handleDelete = () => {
  if (props.editingRecord?.id) {
    emit("delete", props.editingRecord.id);
  }
};
</script>

<style scoped>
.form-collapse-wrapper {
  transition: max-height 0.3s ease-in-out;
}
</style>
