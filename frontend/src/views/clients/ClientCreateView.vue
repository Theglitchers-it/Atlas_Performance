<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import {
  DIETARY_RESTRICTION_OPTIONS,
  type DietPhase,
} from "@/types";

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  initialWeightKg: string;
  fitnessLevel: string;
  primaryGoal: string;
  trainingLocation: string;
  medicalNotes: string;
  notes: string;
  sportHistory: string;
  occupationType: string;
  dailyStepsAvg: string;
  jointPainAreas: string[];
  previousDiets: string;
  dietaryRestrictions: string[];
  foodAllergies: string;
  currentDietPhase: DietPhase;
  baselineStressLevel: string;
  mealsPerDayHabit: string;
  createAccount: boolean;
  password: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const router = useRouter();
const toast = useToast();

// Track unsaved changes
const isDirty = ref<boolean>(false);
useUnsavedChanges(isDirty);

const formData = ref<ClientFormData>({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  heightCm: "",
  initialWeightKg: "",
  fitnessLevel: "beginner",
  primaryGoal: "general_fitness",
  trainingLocation: "hybrid",
  medicalNotes: "",
  notes: "",
  sportHistory: "",
  occupationType: "",
  dailyStepsAvg: "",
  jointPainAreas: [],
  previousDiets: "",
  dietaryRestrictions: [],
  foodAllergies: "",
  currentDietPhase: "free",
  baselineStressLevel: "",
  mealsPerDayHabit: "",
  createAccount: false,
  password: "",
});

const isLoading = ref<boolean>(false);
const errorMessage = ref<string>("");
const errors = ref<Record<string, string>>({});

const fitnessLevels: SelectOption[] = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzato" },
  { value: "elite", label: "Elite" },
];

const goals: SelectOption[] = [
  { value: "weight_loss", label: "Perdita peso" },
  { value: "muscle_gain", label: "Aumento massa muscolare" },
  { value: "strength", label: "Forza" },
  { value: "endurance", label: "Resistenza" },
  { value: "flexibility", label: "Flessibilita" },
  { value: "general_fitness", label: "Fitness generale" },
  { value: "sport_specific", label: "Sport specifico" },
];

const locations: SelectOption[] = [
  { value: "online", label: "Online" },
  { value: "in_person", label: "Di persona" },
  { value: "hybrid", label: "Ibrido" },
];

const occupationTypes: SelectOption[] = [
  { value: "sedentary", label: "Sedentario" },
  { value: "moderately_active", label: "Moderatamente attivo" },
  { value: "active", label: "Attivo" },
  { value: "highly_active", label: "Molto attivo (lavoro fisico)" },
];

const jointPainOptions = [
  "spalla",
  "ginocchio",
  "schiena",
  "anca",
  "caviglia",
  "polso",
  "gomito",
  "collo",
];

const toggleJointPain = (area: string) => {
  const idx = formData.value.jointPainAreas.indexOf(area);
  if (idx >= 0) formData.value.jointPainAreas.splice(idx, 1);
  else formData.value.jointPainAreas.push(area);
};

const dietPhases: SelectOption[] = [
  { value: "free", label: "Libero (nessuna dieta attiva)" },
  { value: "cut", label: "Taglio calorico (cut)" },
  { value: "normocaloric", label: "Normocalorica (mantenimento)" },
  { value: "bulk", label: "Massa (bulk)" },
];

const dietaryRestrictionOptions = DIETARY_RESTRICTION_OPTIONS;

const toggleDietaryRestriction = (r: string) => {
  const idx = formData.value.dietaryRestrictions.indexOf(r);
  if (idx >= 0) formData.value.dietaryRestrictions.splice(idx, 1);
  else formData.value.dietaryRestrictions.push(r);
};

const validateForm = (): boolean => {
  errors.value = {};

  if (!formData.value.firstName.trim()) {
    errors.value.firstName = "Nome obbligatorio";
  }
  if (!formData.value.lastName.trim()) {
    errors.value.lastName = "Cognome obbligatorio";
  }
  if (
    formData.value.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)
  ) {
    errors.value.email = "Email non valida";
  }
  if (formData.value.createAccount && !formData.value.password) {
    errors.value.password = "Password obbligatoria per creare l'account";
  }
  if (
    formData.value.createAccount &&
    formData.value.password &&
    formData.value.password.length < 8
  ) {
    errors.value.password = "La password deve avere almeno 8 caratteri";
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const payload = {
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email || null,
      phone: formData.value.phone || null,
      dateOfBirth: formData.value.dateOfBirth || null,
      gender: formData.value.gender || null,
      heightCm: formData.value.heightCm
        ? parseFloat(formData.value.heightCm)
        : null,
      initialWeightKg: formData.value.initialWeightKg
        ? parseFloat(formData.value.initialWeightKg)
        : null,
      fitnessLevel: formData.value.fitnessLevel,
      primaryGoal: formData.value.primaryGoal,
      trainingLocation: formData.value.trainingLocation,
      medicalNotes: formData.value.medicalNotes || null,
      notes: formData.value.notes || null,
      sportHistory: formData.value.sportHistory || null,
      occupationType: formData.value.occupationType || null,
      dailyStepsAvg: formData.value.dailyStepsAvg
        ? parseInt(formData.value.dailyStepsAvg, 10)
        : null,
      jointPainAreas:
        formData.value.jointPainAreas.length > 0
          ? formData.value.jointPainAreas
          : null,
      previousDiets: formData.value.previousDiets || null,
      dietaryRestrictions:
        formData.value.dietaryRestrictions.length > 0
          ? formData.value.dietaryRestrictions
          : null,
      foodAllergies: formData.value.foodAllergies || null,
      currentDietPhase: formData.value.currentDietPhase || null,
      baselineStressLevel: formData.value.baselineStressLevel
        ? parseInt(formData.value.baselineStressLevel, 10)
        : null,
      mealsPerDayHabit: formData.value.mealsPerDayHabit
        ? parseInt(formData.value.mealsPerDayHabit, 10)
        : null,
      createAccount: formData.value.createAccount,
      password: formData.value.createAccount
        ? formData.value.password
        : undefined,
    };

    const response = await api.post("/clients", payload);
    const clientId = response.data.data.client.id;

    isDirty.value = false; // Reset before navigating
    toast.success("Cliente creato con successo");
    router.push(`/clients/${clientId}`);
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.message ||
      "Errore durante la creazione del cliente";
    toast.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

// Watch form changes to track dirty state
watch(
  formData,
  () => {
    isDirty.value = true;
  },
  { deep: true },
);

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <button
        @click="goBack"
        class="inline-flex items-center text-habit-text-subtle hover:text-habit-text mb-4"
      >
        <svg
          class="w-5 h-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Torna indietro
      </button>
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Nuovo Cliente
      </h1>
      <p class="text-habit-text-subtle mt-1">
        Inserisci i dati del nuovo cliente
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
    >
      <p class="text-sm text-red-600">{{ errorMessage }}</p>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Personal Info -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <h2 class="text-lg font-semibold text-habit-text mb-4">
          Informazioni Personali
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Nome *</label
            >
            <input
              v-model="formData.firstName"
              type="text"
              autocomplete="given-name"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              :class="
                errors.firstName ? 'border-red-500' : 'border-habit-border'
              "
            />
            <p v-if="errors.firstName" class="mt-1 text-xs text-red-500">
              {{ errors.firstName }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Cognome *</label
            >
            <input
              v-model="formData.lastName"
              type="text"
              autocomplete="family-name"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              :class="
                errors.lastName ? 'border-red-500' : 'border-habit-border'
              "
            />
            <p v-if="errors.lastName" class="mt-1 text-xs text-red-500">
              {{ errors.lastName }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Email</label
            >
            <input
              v-model="formData.email"
              type="email"
              autocomplete="email"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              :class="errors.email ? 'border-red-500' : 'border-habit-border'"
            />
            <p v-if="errors.email" class="mt-1 text-xs text-red-500">
              {{ errors.email }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Telefono</label
            >
            <input
              v-model="formData.phone"
              type="tel"
              autocomplete="tel"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Data di nascita</label
            >
            <input
              v-model="formData.dateOfBirth"
              type="date"
              autocomplete="bday"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Genere</label
            >
            <select
              v-model="formData.gender"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            >
              <option value="">Seleziona...</option>
              <option value="male">Maschio</option>
              <option value="female">Femmina</option>
              <option value="other">Altro</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Physical Info -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <h2 class="text-lg font-semibold text-habit-text mb-4">Dati Fisici</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Altezza (cm)</label
            >
            <input
              v-model="formData.heightCm"
              type="number"
              min="100"
              max="250"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Peso iniziale (kg)</label
            >
            <input
              v-model="formData.initialWeightKg"
              type="number"
              min="30"
              max="300"
              step="0.1"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            />
          </div>
        </div>
      </div>

      <!-- Anamnesi sportiva -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <h2 class="text-lg font-semibold text-habit-text mb-4">
          Anamnesi sportiva
        </h2>
        <p class="text-xs text-habit-text-subtle mb-4">
          Informazioni per una programmazione personalizzata: storico,
          stile di vita e dolori ricorrenti.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Storico sportivo</label
            >
            <textarea
              v-model="formData.sportHistory"
              rows="3"
              maxlength="2000"
              placeholder="Sport praticati, anni di esperienza, risultati..."
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Tipo di lavoro</label
              >
              <select
                v-model="formData.occupationType"
                class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              >
                <option value="">Seleziona...</option>
                <option
                  v-for="o in occupationTypes"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Passi giornalieri medi</label
              >
              <input
                v-model="formData.dailyStepsAvg"
                type="number"
                min="0"
                max="50000"
                placeholder="es. 8000"
                class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-2"
              >Dolori articolari ricorrenti</label
            >
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="area in jointPainOptions"
                :key="area"
                type="button"
                @click="toggleJointPain(area)"
                class="px-3 py-1.5 text-xs rounded-full border transition-colors capitalize"
                :class="
                  formData.jointPainAreas.includes(area)
                    ? 'bg-habit-orange/15 border-habit-orange text-habit-orange'
                    : 'bg-habit-bg border-habit-border text-habit-text-subtle hover:text-habit-text'
                "
              >
                {{ area }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Anamnesi nutrizionale -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <h2 class="text-lg font-semibold text-habit-text mb-4">
          Anamnesi nutrizionale
        </h2>
        <p class="text-xs text-habit-text-subtle mb-4">
          Snapshot iniziale del profilo alimentare: punto di partenza per
          definire calorie e macros del piano nutrizionale.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Diete pregresse</label
            >
            <textarea
              v-model="formData.previousDiets"
              rows="3"
              maxlength="2000"
              placeholder="Es. Dukan 2022, fai-da-te low carb, digiuno intermittente 3 mesi..."
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-habit-text-muted mb-1"
                >Fase alimentare attuale</label
              >
              <select
                v-model="formData.currentDietPhase"
                class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              >
                <option v-for="p in dietPhases" :key="p.value" :value="p.value">
                  {{ p.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-habit-text-muted mb-1"
                >N° pasti abituali / giorno</label
              >
              <input
                v-model="formData.mealsPerDayHabit"
                type="number"
                min="1"
                max="10"
                placeholder="es. 4"
                class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Allergie / intolleranze alimentari</label
            >
            <textarea
              v-model="formData.foodAllergies"
              rows="2"
              maxlength="1000"
              placeholder="Es. arachidi, crostacei, mandorle..."
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-2"
              >Restrizioni / preferenze alimentari</label
            >
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="r in dietaryRestrictionOptions"
                :key="r"
                type="button"
                @click="toggleDietaryRestriction(r)"
                class="px-3 py-1.5 text-xs rounded-full border transition-colors capitalize"
                :class="
                  formData.dietaryRestrictions.includes(r)
                    ? 'bg-habit-cyan/15 border-habit-cyan text-habit-cyan'
                    : 'bg-habit-bg border-habit-border text-habit-text-subtle hover:text-habit-text'
                "
              >
                {{ r }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Livello stress iniziale (1-10)</label
            >
            <input
              v-model="formData.baselineStressLevel"
              type="number"
              min="1"
              max="10"
              placeholder="es. 6"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            />
            <p class="text-[10px] text-habit-text-subtle mt-1">
              Snapshot al momento della presa in carico. Lo stress giornaliero
              continua a essere tracciato nei check-in.
            </p>
          </div>
        </div>
      </div>

      <!-- Fitness Info -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <h2 class="text-lg font-semibold text-habit-text mb-4">
          Profilo Fitness
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Livello</label
            >
            <select
              v-model="formData.fitnessLevel"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            >
              <option
                v-for="level in fitnessLevels"
                :key="level.value"
                :value="level.value"
              >
                {{ level.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Obiettivo principale</label
            >
            <select
              v-model="formData.primaryGoal"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            >
              <option
                v-for="goal in goals"
                :key="goal.value"
                :value="goal.value"
              >
                {{ goal.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Modalita allenamento</label
            >
            <select
              v-model="formData.trainingLocation"
              class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            >
              <option
                v-for="loc in locations"
                :key="loc.value"
                :value="loc.value"
              >
                {{ loc.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-habit-text-muted mb-1"
            >Note mediche</label
          >
          <textarea
            v-model="formData.medicalNotes"
            rows="3"
            class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            placeholder="Infortuni, allergie, condizioni mediche..."
          ></textarea>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-habit-text-muted mb-1"
            >Note</label
          >
          <textarea
            v-model="formData.notes"
            rows="3"
            class="w-full px-4 py-2 border border-habit-border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            placeholder="Note aggiuntive..."
          ></textarea>
        </div>
      </div>

      <!-- Account Creation -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <h2 class="text-lg font-semibold text-habit-text mb-4">
          Account Cliente
        </h2>

        <label class="flex items-center cursor-pointer mb-4">
          <input
            v-model="formData.createAccount"
            type="checkbox"
            class="h-4 w-4 text-habit-cyan focus:ring-habit-cyan border-habit-border rounded"
          />
          <span class="ml-2 text-habit-text-muted">
            Crea account per il cliente (potra accedere all'app)
          </span>
        </label>

        <div v-if="formData.createAccount" class="mt-4">
          <label class="block text-sm font-medium text-habit-text-muted mb-1"
            >Password *</label
          >
          <input
            v-model="formData.password"
            type="password"
            autocomplete="new-password"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-habit-cyan bg-habit-bg text-habit-text"
            :class="errors.password ? 'border-red-500' : 'border-habit-border'"
            placeholder="Minimo 8 caratteri"
          />
          <p v-if="errors.password" class="mt-1 text-xs text-red-500">
            {{ errors.password }}
          </p>
          <p class="mt-1 text-xs text-habit-text-subtle">
            Il cliente usera l'email inserita sopra per accedere
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-4">
        <button
          type="button"
          @click="goBack"
          class="px-6 py-2 border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          :disabled="isLoading"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <svg
            v-if="isLoading"
            class="animate-spin -ml-1 mr-2 h-4 w-4"
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
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ isLoading ? "Creazione..." : "Crea Cliente" }}
        </button>
      </div>
    </form>
  </div>
</template>
