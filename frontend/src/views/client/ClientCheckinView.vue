<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";

interface CheckinForm {
  sleepQuality: number;
  sleepHours: number;
  energyLevel: number;
  stressLevel: number;
  muscleSoreness: number;
  motivation: number;
  mood: number;
  notes: string;
  [key: string]: any;
}

interface MoodOption {
  value: number;
  emoji: string;
  label: string;
}

interface MetricField {
  key: string;
  label: string;
  emojis: string[];
  labels: string[];
  inverted?: boolean;
}

const auth = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const todayCheckin = ref<any>(null);
const history = ref<any[]>([]);
const isEditing = ref(false);
const successMessage = ref("");

// Animation state
const showConfetti = ref(false);
const showCheckmark = ref(false);
const confettiParticles = ref<
  { x: number; y: number; color: string; delay: number; rotation: number }[]
>([]);

// Form check-in
const form = ref<CheckinForm>({
  sleepQuality: 3,
  sleepHours: 7,
  energyLevel: 3,
  stressLevel: 3,
  muscleSoreness: 3,
  motivation: 3,
  mood: 3,
  notes: "",
});

// Mood options (1-5 integer values matching backend validator)
const moodOptions: MoodOption[] = [
  { value: 1, emoji: "😫", label: "Terribile" },
  { value: 2, emoji: "😞", label: "Male" },
  { value: 3, emoji: "😐", label: "Neutrale" },
  { value: 4, emoji: "😊", label: "Bene" },
  { value: 5, emoji: "🤩", label: "Ottimo" },
];

// Metric fields with per-level emojis (scala 1-5 allineata al backend validator)
const metricFields: MetricField[] = [
  {
    key: "sleepQuality",
    label: "Qualita' del sonno",
    emojis: ["😵", "😴", "🥱", "😌", "😇"],
    labels: ["Pessimo", "Male", "Cosi' cosi'", "Bene", "Da dio"],
  },
  {
    key: "energyLevel",
    label: "Livello di energia",
    emojis: ["🪫", "😮‍💨", "😐", "💪", "⚡"],
    labels: ["A terra", "Scarso", "Normale", "Carico", "Al massimo"],
  },
  {
    key: "stressLevel",
    label: "Livello di stress",
    emojis: ["😌", "🙂", "😐", "😰", "🤯"],
    labels: ["Zero stress", "Rilassato", "Normale", "Stressato", "Al limite"],
    inverted: true,
  },
  {
    key: "muscleSoreness",
    label: "Dolori muscolari",
    emojis: ["✨", "👍", "😐", "😣", "🤕"],
    labels: ["Nessuno", "Leggeri", "Normali", "Forti", "Devastanti"],
    inverted: true,
  },
  {
    key: "motivation",
    label: "Motivazione",
    emojis: ["😴", "😕", "😐", "😤", "🔥"],
    labels: ["Zero", "Poca", "Normale", "Motivato", "On fire"],
  },
];

const getMetricLabel = (field: MetricField, value: number): string => {
  return field.labels[value - 1] || field.labels[2];
};

const getMetricEmoji = (field: MetricField, value: number): string => {
  return field.emojis[value - 1] || field.emojis[2];
};

// Color per valore selezionato (inverted = basso e' positivo)
const getValueColor = (field: MetricField, value: number): string => {
  const colors = field.inverted
    ? ["text-green-400", "text-green-400", "text-yellow-400", "text-orange-400", "text-red-400"]
    : ["text-red-400", "text-orange-400", "text-yellow-400", "text-green-400", "text-cyan-400"];
  return colors[value - 1] || "text-habit-text-muted";
};

const getSelectedBg = (field: MetricField, value: number): string => {
  const bgs = field.inverted
    ? ["bg-green-400/15 ring-green-400/30", "bg-green-400/15 ring-green-400/30", "bg-yellow-400/15 ring-yellow-400/30", "bg-orange-400/15 ring-orange-400/30", "bg-red-400/15 ring-red-400/30"]
    : ["bg-red-400/15 ring-red-400/30", "bg-orange-400/15 ring-orange-400/30", "bg-yellow-400/15 ring-yellow-400/30", "bg-green-400/15 ring-green-400/30", "bg-cyan-400/15 ring-cyan-400/30"];
  return bgs[value - 1] || bgs[2];
};

// Confetti
const triggerConfetti = () => {
  const colors = ["#FF6B35", "#00D4AA", "#FFD700", "#FF69B4", "#00BFFF"];
  confettiParticles.value = Array.from({ length: 15 }, (_, i) => ({
    x: Math.random() * 240 - 120,
    y: -(Math.random() * 80 + 60),
    color: colors[i % colors.length],
    delay: Math.random() * 0.3,
    rotation: Math.random() * 720 - 360,
  }));
  showConfetti.value = true;
  setTimeout(() => {
    showConfetti.value = false;
  }, 1500);
};

// Formatters
const formatDate = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const todayFormatted = computed(() => {
  return new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
});

const getMoodEmoji = (m: number | string): string => {
  const val = typeof m === "string" ? parseInt(m) || 3 : m;
  const opt = moodOptions.find((o) => o.value === val);
  return opt ? opt.emoji : "😐";
};

const getMoodLabel = (m: number | string): string => {
  const val = typeof m === "string" ? parseInt(m) || 3 : m;
  const opt = moodOptions.find((o) => o.value === val);
  return opt ? opt.label : "Neutrale";
};

const getReadinessColor = (score: number): string => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

const getReadinessStrokeColor = (score: number): string => {
  if (score >= 80) return "stroke-green-400";
  if (score >= 60) return "stroke-yellow-400";
  if (score >= 40) return "stroke-orange-400";
  return "stroke-red-400";
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
        sleepQuality: todayCheckin.value.sleep_quality || 3,
        sleepHours: todayCheckin.value.sleep_hours || 7,
        energyLevel: todayCheckin.value.energy_level || 3,
        stressLevel: todayCheckin.value.stress_level || 3,
        muscleSoreness: todayCheckin.value.soreness_level || 3,
        motivation: todayCheckin.value.motivation_level || 3,
        mood: todayCheckin.value.mood || 3,
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

    // Animation sequence
    showCheckmark.value = true;
    triggerConfetti();
    try {
      navigator?.vibrate?.(100);
    } catch {}

    successMessage.value = "Check-in salvato con successo!";
    isEditing.value = false;

    // Ricarica dati
    const todayRes = await api
      .get(`/readiness/${clientId.value}/today`)
      .catch(() => null);
    todayCheckin.value = todayRes?.data?.data?.checkin || null;

    setTimeout(() => {
      successMessage.value = "";
      showCheckmark.value = false;
    }, 2500);
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
  <div class="checkin-page px-4 sm:px-6 pt-4 pb-24 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Check-in Giornaliero
      </h1>
      <p class="text-habit-text-subtle text-sm mt-1 capitalize">
        {{ todayFormatted }}
      </p>
    </div>

    <!-- Success Message -->
    <Transition name="success-slide">
      <div
        v-if="successMessage"
        class="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
      >
        <span
          v-if="showCheckmark"
          class="checkmark-icon text-green-400 text-xl"
        >
          ✓
        </span>
        <span v-else class="text-green-400 text-xl">✅</span>
        <span class="text-green-400 text-sm font-medium">{{
          successMessage
        }}</span>
      </div>
    </Transition>

    <!-- Confetti Overlay -->
    <Teleport to="body">
      <div v-if="showConfetti" class="confetti-container">
        <span
          v-for="(p, i) in confettiParticles"
          :key="i"
          class="confetti-particle"
          :style="{
            '--x': p.x + 'px',
            '--y': p.y + 'px',
            '--rotation': p.rotation + 'deg',
            backgroundColor: p.color,
            animationDelay: p.delay + 's',
          }"
        ></span>
      </div>
    </Teleport>

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
      <div v-if="todayCheckin && !isEditing" class="card-dark p-5 sm:p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-habit-text">Check-in di Oggi</h3>
          <button @click="startEdit" class="btn-ghost btn-sm text-xs">
            Modifica
          </button>
        </div>

        <!-- Readiness Score -->
        <div class="flex items-center gap-4 sm:gap-6 mb-6">
          <div class="relative w-24 h-24 flex-shrink-0">
            <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-habit-bg-light"
                stroke="currentColor"
                stroke-width="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="ring-fill-animated"
                :class="getReadinessStrokeColor(todayCheckin.readiness_score)"
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
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Sonno</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.sleep_quality }}/5
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Energia</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.energy_level }}/5
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Stress</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.stress_level }}/5
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Dolori</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.soreness_level }}/5
            </div>
          </div>
          <div class="text-center p-2 bg-habit-bg-light rounded-lg">
            <div class="text-xs text-habit-text-subtle mb-0.5">Motivazione</div>
            <div class="text-sm font-bold text-habit-text">
              {{ todayCheckin.motivation_level }}/5
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
      <div v-if="showForm" class="card-dark p-5 sm:p-6 mb-6">
        <h3 class="font-semibold text-habit-text mb-6">
          {{ todayCheckin ? "Modifica Check-in" : "Come stai oggi?" }}
        </h3>

        <div class="space-y-7">
          <!-- Mood Selection -->
          <div>
            <label class="block text-habit-text-muted text-sm mb-3"
              >Come ti senti?</label
            >
            <div class="flex justify-between items-end gap-1 sm:gap-2">
              <button
                v-for="mood in moodOptions"
                :key="mood.value"
                @click="form.mood = mood.value"
                class="mood-btn flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-300"
                :class="
                  form.mood === mood.value
                    ? 'mood-btn--active'
                    : 'mood-btn--inactive'
                "
              >
                <span
                  class="transition-transform duration-300"
                  :class="
                    form.mood === mood.value
                      ? 'text-3xl sm:text-4xl scale-110'
                      : 'text-xl sm:text-2xl opacity-50'
                  "
                >
                  {{ mood.emoji }}
                </span>
                <span
                  class="text-[10px] sm:text-xs font-medium transition-all duration-200"
                  :class="
                    form.mood === mood.value
                      ? 'text-habit-orange opacity-100'
                      : 'text-habit-text-subtle opacity-0 sm:opacity-40'
                  "
                >
                  {{ mood.label }}
                </span>
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
              <span class="text-habit-orange font-bold text-xl tabular-nums"
                >{{ form.sleepHours }}h</span
              >
            </div>
            <input
              v-model.number="form.sleepHours"
              type="range"
              min="0"
              max="14"
              step="0.5"
              class="sleep-slider w-full"
            />
            <div
              class="flex justify-between text-xs text-habit-text-subtle mt-1"
            >
              <span>0h</span>
              <span>7h</span>
              <span>14h</span>
            </div>
          </div>

          <!-- Emoji Metric Selectors -->
          <div
            v-for="field in metricFields"
            :key="field.key"
            class="metric-group"
          >
            <div class="flex items-center justify-between mb-2">
              <label class="text-habit-text-muted text-sm font-medium">
                {{ field.label }}
              </label>
              <span
                class="text-xs font-semibold transition-all duration-200"
                :class="getValueColor(field, form[field.key])"
              >
                {{ getMetricLabel(field, form[field.key]) }}
              </span>
            </div>
            <div class="flex justify-between gap-1">
              <button
                v-for="(emoji, idx) in field.emojis"
                :key="idx"
                @click="form[field.key] = idx + 1"
                class="emoji-btn flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200"
                :class="
                  form[field.key] === idx + 1
                    ? ['ring-2', getSelectedBg(field, idx + 1), 'emoji-btn--active']
                    : 'emoji-btn--inactive'
                "
              >
                <span
                  class="transition-all duration-200"
                  :class="
                    form[field.key] === idx + 1
                      ? 'text-2xl sm:text-3xl scale-110'
                      : 'text-lg sm:text-xl opacity-40 grayscale'
                  "
                >
                  {{ emoji }}
                </span>
                <span
                  class="text-[9px] sm:text-[10px] font-medium transition-opacity duration-150"
                  :class="
                    form[field.key] === idx + 1
                      ? 'opacity-100 text-habit-text'
                      : 'opacity-0'
                  "
                >
                  {{ field.labels[idx] }}
                </span>
              </button>
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
              class="btn-primary flex-1 py-3 relative overflow-hidden"
            >
              <Transition name="btn-content" mode="out-in">
                <span v-if="showCheckmark" key="check" class="checkmark-icon"
                  >✓ Salvato!</span
                >
                <span v-else-if="saving" key="saving">Salvataggio...</span>
                <span v-else key="default">{{
                  todayCheckin ? "Aggiorna Check-in" : "Salva Check-in"
                }}</span>
              </Transition>
            </button>
          </div>
        </div>
      </div>

      <!-- Storico -->
      <div class="card-dark p-5 sm:p-6">
        <h3 class="font-semibold text-habit-text mb-4">Storico Check-in</h3>

        <div v-if="history.length > 0" class="space-y-2">
          <div
            v-for="checkin in history"
            :key="checkin.id"
            class="flex items-center gap-3 sm:gap-4 p-3 bg-habit-bg-light rounded-xl transition-all duration-200"
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
                <span class="hidden sm:inline"
                  >Energia: {{ checkin.energy_level }}/5</span
                >
                <span>Stress: {{ checkin.stress_level }}/5</span>
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

<style scoped>
/* Mood buttons */
.mood-btn {
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}
.mood-btn--active {
  background: rgba(255, 107, 53, 0.12);
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.15);
}
.mood-btn--inactive {
  background: transparent;
}
.mood-btn--active span:first-child {
  animation: mood-bounce 0.4s ease-out;
}

/* Emoji metric buttons */
.emoji-btn {
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
  min-height: 3.25rem;
}
.emoji-btn--active span:first-child {
  animation: emoji-pop 0.3s ease-out;
}
.emoji-btn--inactive {
  background: transparent;
}
.emoji-btn:active {
  transform: scale(0.93);
}
.metric-group + .metric-group {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Sleep slider */
.sleep-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgb(var(--color-habit-bg-light));
  outline: none;
}
.sleep-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff6b35;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
  transition: transform 0.15s ease;
}
.sleep-slider::-webkit-slider-thumb:active {
  transform: scale(1.2);
}
.sleep-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff6b35;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
}
.sleep-slider::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: rgb(var(--color-habit-bg-light));
}

/* Ring fill animation */
.ring-fill-animated {
  animation: ring-fill 1s ease-out forwards;
}

/* Checkmark icon */
.checkmark-icon {
  display: inline-block;
  animation: checkmark-pop 0.4s ease-out;
}

/* Success message transition */
.success-slide-enter-active {
  transition: all 0.4s ease-out;
}
.success-slide-leave-active {
  transition: all 0.3s ease-in;
}
.success-slide-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.success-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Button content transition */
.btn-content-enter-active {
  transition: all 0.2s ease-out;
}
.btn-content-leave-active {
  transition: all 0.15s ease-in;
}
.btn-content-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.btn-content-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Confetti */
.confetti-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 9999;
}
.confetti-particle {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: confetti-fall 1.2s ease-out forwards;
  animation-delay: var(--delay, 0s);
}

/* Keyframes */
@keyframes confetti-fall {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(var(--x, 0), var(--y, -100px)) rotate(var(--rotation, 360deg));
    opacity: 0;
  }
}

@keyframes checkmark-pop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes ring-fill {
  from {
    stroke-dasharray: 0, 100;
  }
}

@keyframes mood-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.35);
  }
  70% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1.1);
  }
}

@keyframes emoji-pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1.1);
  }
}
</style>
