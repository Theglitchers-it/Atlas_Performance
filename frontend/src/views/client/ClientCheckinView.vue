<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";

interface CheckinForm {
  sleepQuality: number;
  sleepHours: number;
  energyLevel: number;
  stressLevel: number;
  sorenessLevel: number;
  motivationLevel: number;
  mood: string;
  notes: string;
  [key: string]: any;
}

interface MoodOption {
  value: string;
  emoji: string;
  label: string;
}

const auth = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const todayCheckin = ref<any>(null);
const history = ref<any[]>([]);
const isEditing = ref(false);
const successMessage = ref("");

// Form check-in
const form = ref<CheckinForm>({
  sleepQuality: 5,
  sleepHours: 7,
  energyLevel: 5,
  stressLevel: 5,
  sorenessLevel: 5,
  motivationLevel: 5,
  mood: "neutral",
  notes: "",
});

// Mood options
const moodOptions: MoodOption[] = [
  { value: "terrible", emoji: "😫", label: "Terribile" },
  { value: "bad", emoji: "😞", label: "Male" },
  { value: "neutral", emoji: "😐", label: "Neutrale" },
  { value: "good", emoji: "😊", label: "Bene" },
  { value: "great", emoji: "🤩", label: "Ottimo" },
];

// Slider configs
const sliderFields = [
  {
    key: "sleepQuality",
    label: "Qualità del sonno",
    icon: "😴",
    description: "Come hai dormito?",
  },
  {
    key: "energyLevel",
    label: "Livello di energia",
    icon: "⚡",
    description: "Come ti senti oggi?",
  },
  {
    key: "stressLevel",
    label: "Livello di stress",
    icon: "😤",
    description: "Quanto sei stressato?",
  },
  {
    key: "sorenessLevel",
    label: "Dolori muscolari",
    icon: "💪",
    description: "Quanto sei dolorante?",
  },
  {
    key: "motivationLevel",
    label: "Motivazione",
    icon: "🔥",
    description: "Quanto sei motivato?",
  },
];

const getSliderLabel = (value: number): string => {
  if (value >= 9) return "Eccellente";
  if (value >= 7) return "Buono";
  if (value >= 5) return "Nella media";
  if (value >= 3) return "Basso";
  return "Molto basso";
};

const isStressField = (key: string): boolean =>
  key === "stressLevel" || key === "sorenessLevel";

// Formatters
const formatDate = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMoodEmoji = (m: string): string => {
  const opt = moodOptions.find((o) => o.value === m);
  return opt ? opt.emoji : "😐";
};

const getMoodLabel = (m: string): string => {
  const opt = moodOptions.find((o) => o.value === m);
  return opt ? opt.label : "Neutrale";
};

const getReadinessColor = (score: number): string => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

// Client ID from auth store (set by backend for client users)
const clientId = computed(() => auth.user?.clientId || null);

// Load data
const loadData = async () => {
  if (!clientId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const [todayRes, historyRes] = await Promise.all([
      api.get(`/readiness/${clientId.value}/today`).catch(() => null),
      api
        .get(`/readiness/${clientId.value}/history`, { params: { days: 14 } })
        .catch(() => null),
    ]);

    todayCheckin.value = todayRes?.data?.data?.checkin || null;
    history.value =
      historyRes?.data?.data?.checkins || historyRes?.data?.data?.history || [];

    // Se esiste il checkin di oggi, precompila il form
    if (todayCheckin.value) {
      form.value = {
        sleepQuality: todayCheckin.value.sleep_quality || 5,
        sleepHours: todayCheckin.value.sleep_hours || 7,
        energyLevel: todayCheckin.value.energy_level || 5,
        stressLevel: todayCheckin.value.stress_level || 5,
        sorenessLevel: todayCheckin.value.soreness_level || 5,
        motivationLevel: todayCheckin.value.motivation_level || 5,
        mood: todayCheckin.value.mood || "neutral",
        notes: todayCheckin.value.notes || "",
      };
    }
  } catch (err) {
    console.error("Errore caricamento dati:", err);
  } finally {
    loading.value = false;
  }
};

// Salva check-in
const handleSubmit = async () => {
  if (!clientId.value) return;
  saving.value = true;
  try {
    await api.post(`/readiness/${clientId.value}`, form.value);
    successMessage.value = "Check-in salvato con successo!";
    isEditing.value = false;

    // Ricarica dati
    const todayRes = await api
      .get(`/readiness/${clientId.value}/today`)
      .catch(() => null);
    todayCheckin.value = todayRes?.data?.data?.checkin || null;

    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err) {
    console.error("Errore salvataggio check-in:", err);
  } finally {
    saving.value = false;
  }
};

const startEdit = () => {
  isEditing.value = true;
};

const showForm = computed(() => {
  return !todayCheckin.value || isEditing.value;
});

onMounted(loadData);
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Check-in Giornaliero
      </h1>
      <p class="text-habit-text-muted text-sm mt-1">
        Monitora il tuo stato fisico e mentale ogni giorno
      </p>
    </div>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
    >
      <span class="text-green-400 text-xl">✅</span>
      <span class="text-green-400 text-sm font-medium">{{
        successMessage
      }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="card-dark p-6 animate-pulse">
        <div class="h-6 bg-habit-skeleton rounded w-1/2 mb-4"></div>
        <div class="space-y-3">
          <div
            v-for="i in 5"
            :key="i"
            class="h-12 bg-habit-skeleton rounded"
          ></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Checkin di oggi completato -->
      <div v-if="todayCheckin && !isEditing" class="card-dark p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-habit-text">Check-in di Oggi</h3>
          <button @click="startEdit" class="btn-ghost btn-sm text-xs">
            Modifica
          </button>
        </div>

        <!-- Readiness Score -->
        <div class="flex items-center gap-4 sm:gap-6 mb-6">
          <div class="relative w-24 h-24">
            <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-habit-bg-light"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                :class="getReadinessColor(todayCheckin.readiness_score)"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="`${todayCheckin.readiness_score}, 100`"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-habit-text font-bold text-2xl">{{
                Math.round(todayCheckin.readiness_score)
              }}</span>
            </div>
          </div>
          <div>
            <div class="text-sm text-habit-text-subtle mb-1">
              Punteggio Readiness
            </div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-3xl">{{
                getMoodEmoji(todayCheckin.mood)
              }}</span>
              <span class="text-habit-text font-medium">{{
                getMoodLabel(todayCheckin.mood)
              }}</span>
            </div>
            <div class="text-xs text-habit-text-subtle">
              Sonno: {{ todayCheckin.sleep_hours }}h
            </div>
          </div>
        </div>

        <!-- Metriche riepilogo -->
        <div class="grid grid-cols-3 md:grid-cols-5 gap-3">
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Sonno</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.sleep_quality }}/10
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Energia</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.energy_level }}/10
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Stress</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.stress_level }}/10
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Dolori</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.soreness_level }}/10
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Motivazione</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.motivation_level }}/10
            </div>
          </div>
        </div>

        <p
          v-if="todayCheckin.notes"
          class="text-habit-text-muted text-sm mt-4 p-3 bg-habit-bg-light rounded-xl"
        >
          {{ todayCheckin.notes }}
        </p>
      </div>

      <!-- Form Check-in -->
      <div v-if="showForm" class="card-dark p-6 mb-6">
        <h3 class="font-semibold text-habit-text mb-6">
          {{ todayCheckin ? "Modifica Check-in" : "Come stai oggi?" }}
        </h3>

        <div class="space-y-6">
          <!-- Mood Selection -->
          <div>
            <label class="block text-habit-text-muted text-sm mb-3"
              >Come ti senti?</label
            >
            <div class="flex justify-between gap-2">
              <button
                v-for="mood in moodOptions"
                :key="mood.value"
                @click="form.mood = mood.value"
                class="flex-1 p-3 rounded-xl text-center transition-all"
                :class="
                  form.mood === mood.value
                    ? 'bg-habit-orange/20 border-2 border-habit-orange/50 scale-105'
                    : 'bg-habit-bg-light border-2 border-transparent hover:bg-habit-card-hover'
                "
              >
                <div class="text-2xl mb-1">{{ mood.emoji }}</div>
                <div class="text-xs text-habit-text-muted">
                  {{ mood.label }}
                </div>
              </button>
            </div>
          </div>

          <!-- Ore di sonno -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label
                class="text-habit-text-muted text-sm flex items-center gap-2"
              >
                <span>🛏️</span> Ore di sonno
              </label>
              <span class="text-habit-text font-bold text-lg"
                >{{ form.sleepHours }}h</span
              >
            </div>
            <input
              v-model.number="form.sleepHours"
              type="range"
              min="0"
              max="14"
              step="0.5"
              class="w-full accent-habit-orange"
            />
            <div
              class="flex justify-between text-xs text-habit-text-subtle mt-1"
            >
              <span>0h</span>
              <span>7h</span>
              <span>14h</span>
            </div>
          </div>

          <!-- Slider Metriche -->
          <div v-for="field in sliderFields" :key="field.key" class="space-y-2">
            <div class="flex items-center justify-between">
              <label
                class="text-habit-text-muted text-sm flex items-center gap-2"
              >
                <span>{{ field.icon }}</span> {{ field.label }}
              </label>
              <div class="flex items-center gap-2">
                <span class="text-habit-text font-bold">{{
                  form[field.key]
                }}</span>
                <span class="text-habit-text-subtle text-xs">/10</span>
              </div>
            </div>
            <input
              v-model.number="form[field.key]"
              type="range"
              min="1"
              max="10"
              step="1"
              class="w-full accent-habit-orange"
            />
            <div class="flex justify-between items-center">
              <span class="text-xs text-habit-text-subtle">{{
                field.description
              }}</span>
              <span
                class="text-xs font-medium"
                :class="
                  isStressField(field.key)
                    ? form[field.key] <= 3
                      ? 'text-green-400'
                      : form[field.key] <= 6
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    : form[field.key] >= 7
                      ? 'text-green-400'
                      : form[field.key] >= 4
                        ? 'text-yellow-400'
                        : 'text-red-400'
                "
              >
                {{
                  isStressField(field.key)
                    ? form[field.key] <= 3
                      ? "Basso"
                      : form[field.key] <= 6
                        ? "Medio"
                        : "Alto"
                    : getSliderLabel(form[field.key])
                }}
              </span>
            </div>
          </div>

          <!-- Note -->
          <div>
            <label class="block text-habit-text-muted text-sm mb-2"
              >Note (opzionale)</label
            >
            <textarea
              v-model="form.notes"
              rows="3"
              class="input-dark w-full"
              placeholder="Come ti senti oggi? Qualcosa da segnalare?"
            ></textarea>
          </div>

          <!-- Submit -->
          <div class="flex gap-3">
            <button
              v-if="isEditing"
              @click="isEditing = false"
              class="btn-secondary btn-sm flex-1"
            >
              Annulla
            </button>
            <button
              @click="handleSubmit"
              :disabled="saving"
              class="btn-primary flex-1 py-3"
            >
              <span v-if="saving">Salvataggio...</span>
              <span v-else>{{
                todayCheckin ? "Aggiorna Check-in" : "Salva Check-in"
              }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Storico -->
      <div class="card-dark p-6">
        <h3 class="font-semibold text-habit-text mb-4">Storico Check-in</h3>

        <div v-if="history.length > 0" class="space-y-2">
          <div
            v-for="checkin in history"
            :key="checkin.id"
            class="flex items-center gap-4 p-3 bg-habit-bg-light rounded-xl"
          >
            <!-- Mood -->
            <div class="text-2xl flex-shrink-0">
              {{ getMoodEmoji(checkin.mood) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-habit-text">
                {{ formatDate(checkin.checkin_date) }}
              </div>
              <div
                class="flex items-center gap-3 text-xs text-habit-text-subtle mt-0.5"
              >
                <span>Sonno: {{ checkin.sleep_hours }}h</span>
                <span>Energia: {{ checkin.energy_level }}/10</span>
                <span>Stress: {{ checkin.stress_level }}/10</span>
              </div>
            </div>

            <!-- Score -->
            <div class="text-right flex-shrink-0">
              <div
                :class="getReadinessColor(checkin.readiness_score)"
                class="text-lg font-bold"
              >
                {{ Math.round(checkin.readiness_score) }}
              </div>
              <div class="text-habit-text-subtle text-xs">Readiness</div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <div class="text-4xl mb-3">📊</div>
          <p class="text-habit-text-muted text-sm">
            Nessun check-in registrato ancora
          </p>
          <p class="text-habit-text-subtle text-xs mt-1">
            I tuoi check-in appariranno qui
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
