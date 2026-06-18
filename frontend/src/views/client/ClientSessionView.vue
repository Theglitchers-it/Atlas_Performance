<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useSessionStore } from "@/store/session";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useSessionStore();

const sessionId = computed(() => parseInt(route.params.id as string));

// Stato UI
const showCompleteSheet = ref(false);
const showSkipSheet = ref(false);
const skipReason = ref("");
const completing = ref(false);
const skipping = ref(false);
const elapsedMinutes = ref(0);
let elapsedTimer: any = null;

// Form completa
const completeForm = reactive({
  overallFeeling: "" as "" | "terrible" | "bad" | "okay" | "good" | "great",
  notes: "",
});

// Form log set per esercizio (key = sessionExerciseId)
type SetForm = {
  reps: string;
  weight: string;
  rpe: string;
  isWarmup: boolean;
  isFailure: boolean;
};
const setForms = reactive<Record<number, SetForm>>({});
const savingSetFor = ref<number | null>(null);
const editingSetId = ref<number | null>(null);
const editSetForm = reactive<SetForm>({ reps: "", weight: "", rpe: "", isWarmup: false, isFailure: false });

// Derivate
const session = computed(() => store.currentSession as any);
const isLoading = computed(() => store.detailLoading);
const isInProgress = computed(() => session.value?.status === "in_progress");
const isCompleted = computed(() => session.value?.status === "completed");
const isSkipped = computed(() => session.value?.status === "skipped");

const sessionTitle = computed(() => session.value?.template_name || "Sessione di allenamento");

const progress = computed(() => {
  if (!session.value?.exercises) return { completed: 0, total: 0, percent: 0 };
  let completed = 0;
  let total = 0;
  for (const ex of session.value.exercises) {
    const prescribed = Number(ex.prescribed_sets) || 0;
    total += prescribed;
    completed += ex.sets?.length || 0;
  }
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { completed, total, percent };
});

const isOldSession = computed(() => {
  if (!session.value?.started_at || !isInProgress.value) return false;
  const startedMs = new Date(session.value.started_at).getTime();
  return Date.now() - startedMs > 12 * 60 * 60 * 1000;
});

// Helpers
const feelingOptions = [
  { value: "terrible", emoji: "😫", label: "Terribile" },
  { value: "bad", emoji: "😞", label: "Male" },
  { value: "okay", emoji: "😐", label: "Ok" },
  { value: "good", emoji: "😊", label: "Bene" },
  { value: "great", emoji: "🤩", label: "Ottimo" },
] as const;

const feelingEmoji = (f: string | null | undefined) =>
  feelingOptions.find((o) => o.value === f)?.emoji || "—";

const formatTimeShort = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (min: number | null | undefined) => {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

// Parse prescritto "10-12" → "12" (target alto), "10" → "10"
const parsePrescribedReps = (raw: any): string => {
  if (raw == null) return "";
  const s = String(raw).trim();
  const range = s.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (range) return range[2];
  const single = s.match(/^(\d+)/);
  return single ? single[1] : "";
};

// Default form per un esercizio: usa l'ultimo set loggato se presente, altrimenti la prescrizione del PT.
const defaultsFromExercise = (exercise: any): SetForm => {
  const sets = exercise?.sets || [];
  const last = sets.length > 0 ? sets[sets.length - 1] : null;
  if (last) {
    return {
      reps: last.reps_completed != null ? String(last.reps_completed) : parsePrescribedReps(exercise?.prescribed_reps),
      weight: last.weight_used != null ? String(last.weight_used) : (exercise?.prescribed_weight != null ? String(exercise.prescribed_weight) : ""),
      rpe: last.rpe != null ? String(last.rpe) : "",
      isWarmup: false,
      isFailure: false,
    };
  }
  return {
    reps: parsePrescribedReps(exercise?.prescribed_reps),
    weight: exercise?.prescribed_weight != null ? String(exercise.prescribed_weight) : "",
    rpe: "",
    isWarmup: !!exercise?.is_warmup,
    isFailure: false,
  };
};

const ensureSetForm = (exercise: any): SetForm => {
  if (!setForms[exercise.id]) {
    setForms[exercise.id] = defaultsFromExercise(exercise);
  }
  return setForms[exercise.id];
};

const refreshSetFormFromExercise = (exerciseId: number) => {
  const updated = session.value?.exercises?.find((e: any) => e.id === exerciseId);
  if (updated) setForms[exerciseId] = defaultsFromExercise(updated);
};

// Timer durata: aggiorna ogni 30s solo quando la tab è visibile (risparmio batteria mobile).
const startElapsedTimer = () => {
  if (elapsedTimer) return;
  const update = () => {
    if (!session.value?.started_at) return;
    // Skip update se la tab è in background (page visibility API)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const ms = Date.now() - new Date(session.value.started_at).getTime();
    elapsedMinutes.value = Math.max(0, Math.round(ms / 60000));
  };
  update();
  elapsedTimer = window.setInterval(update, 30000);
};
const stopElapsedTimer = () => {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
};

// Carica + timer
const load = async () => {
  const res = await store.fetchSessionById(sessionId.value);
  if (!res.success) {
    toast.error(res.message || "Sessione non trovata");
    return;
  }
  if (isInProgress.value) startElapsedTimer();
};

// Log set
const onLogSet = async (exercise: any) => {
  const form = ensureSetForm(exercise);
  if (!form.reps && !form.isWarmup) {
    toast.error("Inserisci almeno le ripetizioni");
    return;
  }
  savingSetFor.value = exercise.id;
  const nextSetNumber = (exercise.sets?.length || 0) + 1;
  const res = await store.logSet(sessionId.value, {
    sessionExerciseId: exercise.id,
    setNumber: nextSetNumber,
    repsCompleted: form.reps ? Number(form.reps) : 0,
    weightUsed: form.weight ? Number(form.weight) : null,
    rpe: form.rpe ? Number(form.rpe) : null,
    isWarmup: form.isWarmup,
    isFailure: form.isFailure,
  });
  savingSetFor.value = null;
  if (res.success) {
    // Ri-popola il form con l'ultimo set appena loggato (default per il successivo)
    refreshSetFormFromExercise(exercise.id);
    toast.success("Set registrato");
  } else {
    toast.error(res.message || "Errore");
  }
};

// Edit set
const startEditSet = (set: any) => {
  editingSetId.value = set.id;
  editSetForm.reps = String(set.reps_completed ?? "");
  editSetForm.weight = set.weight_used != null ? String(set.weight_used) : "";
  editSetForm.rpe = set.rpe != null ? String(set.rpe) : "";
  editSetForm.isWarmup = !!set.is_warmup;
  editSetForm.isFailure = !!set.is_failure;
};
const cancelEditSet = () => {
  editingSetId.value = null;
};
const saveEditSet = async () => {
  if (!editingSetId.value) return;
  const res = await store.updateSet(sessionId.value, editingSetId.value, {
    repsCompleted: editSetForm.reps ? Number(editSetForm.reps) : 0,
    weightUsed: editSetForm.weight ? Number(editSetForm.weight) : null,
    rpe: editSetForm.rpe ? Number(editSetForm.rpe) : null,
    isWarmup: editSetForm.isWarmup,
    isFailure: editSetForm.isFailure,
  });
  if (res.success) {
    toast.success("Set aggiornato");
    editingSetId.value = null;
  } else {
    toast.error(res.message || "Errore");
  }
};

const onDeleteSet = async (set: any) => {
  if (!confirm("Eliminare questo set?")) return;
  const res = await store.deleteSet(sessionId.value, set.id);
  if (res.success) toast.success("Set eliminato");
  else toast.error(res.message || "Errore");
};

// Completa
const openComplete = () => {
  completeForm.overallFeeling = "";
  completeForm.notes = "";
  showCompleteSheet.value = true;
};
const onComplete = async () => {
  completing.value = true;
  const res = await store.completeSession(sessionId.value, {
    overallFeeling: completeForm.overallFeeling || null,
    notes: completeForm.notes || null,
  });
  completing.value = false;
  if (res.success) {
    showCompleteSheet.value = false;
    stopElapsedTimer();
    toast.success("Sessione completata!");
  } else {
    toast.error(res.message || "Errore");
  }
};

// Skip
const openSkip = () => {
  skipReason.value = "";
  showSkipSheet.value = true;
};
const onSkip = async () => {
  skipping.value = true;
  const res = await store.skipSession(sessionId.value, skipReason.value || "");
  skipping.value = false;
  if (res.success) {
    showSkipSheet.value = false;
    stopElapsedTimer();
    toast.success("Sessione saltata");
    await load();
  } else {
    toast.error(res.message || "Errore");
  }
};

const goBack = () => router.push("/my-workout");

onMounted(load);
onUnmounted(() => {
  stopElapsedTimer();
  store.clearCurrentSession();
});
</script>

<template>
  <div class="min-h-screen pb-32 sm:pb-6">
    <div class="max-w-5xl mx-auto p-3 sm:p-6">
      <!-- Back -->
      <button
        @click="goBack"
        class="flex items-center gap-1.5 text-habit-text-muted hover:text-habit-text text-sm mb-3 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Torna all'Allenamento
      </button>

      <!-- Loading skeleton -->
      <div v-if="isLoading && !session" class="space-y-4">
        <div class="h-28 bg-habit-skeleton rounded-3xl animate-pulse"></div>
        <div class="h-16 bg-habit-skeleton rounded-3xl animate-pulse"></div>
        <div v-for="i in 3" :key="i" class="h-44 bg-habit-skeleton rounded-3xl animate-pulse"></div>
      </div>

      <!-- Not found -->
      <div v-else-if="!session" class="bg-habit-card border border-white/10 rounded-3xl p-10 text-center">
        <div class="text-5xl mb-3">😕</div>
        <h2 class="text-habit-text font-bold text-lg mb-1">Sessione non trovata</h2>
        <p class="text-habit-text-muted text-sm mb-4">Forse è stata eliminata o non è la tua.</p>
        <button @click="goBack" class="btn-secondary btn-sm">Torna all'Allenamento</button>
      </div>

      <template v-else>
        <!-- Header glass-mesh 2026 -->
        <div
          class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-habit-card via-habit-card to-habit-bg-light/40 border border-white/10 p-5 sm:p-6 mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
        >
          <div class="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-habit-orange/15 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-red-500/10 blur-3xl"></div>
          <div class="relative flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-1.5">
                <span
                  v-if="isInProgress"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  In corso
                </span>
                <span
                  v-else-if="isCompleted"
                  class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[11px] font-semibold"
                >
                  ✅ Completata
                </span>
                <span
                  v-else-if="isSkipped"
                  class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-semibold"
                >
                  ⏭ Saltata
                </span>
              </div>
              <h1 class="text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                <span class="bg-gradient-to-r from-habit-orange to-red-500 bg-clip-text text-transparent">{{ sessionTitle }}</span>
              </h1>
              <p class="text-habit-text-muted text-xs sm:text-sm mt-1">
                Iniziata alle {{ formatTimeShort(session.started_at) }}
                <span v-if="isCompleted && session.completed_at"> · Terminata alle {{ formatTimeShort(session.completed_at) }}</span>
              </p>
            </div>
            <!-- Live timer -->
            <div
              v-if="isInProgress"
              class="flex-shrink-0 text-right bg-habit-bg-light/60 border border-habit-border rounded-2xl px-3 py-2"
            >
              <div class="text-[10px] uppercase tracking-wider text-habit-text-subtle font-semibold">Durata</div>
              <div class="text-habit-text font-bold text-lg tabular-nums leading-none mt-0.5">
                {{ elapsedMinutes }}<span class="text-xs text-habit-text-subtle font-medium ml-0.5">min</span>
              </div>
            </div>
            <div
              v-else-if="isCompleted"
              class="flex-shrink-0 text-right bg-habit-orange/10 border border-habit-orange/30 rounded-2xl px-3 py-2"
            >
              <div class="text-[10px] uppercase tracking-wider text-habit-orange font-semibold">XP</div>
              <div class="text-habit-orange font-bold text-lg leading-none mt-0.5">+{{ session.xp_earned || 0 }}</div>
            </div>
          </div>
        </div>

        <!-- Warning sessione vecchia -->
        <div
          v-if="isOldSession"
          class="mb-4 px-4 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm flex items-start gap-2"
        >
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div>
            Questa sessione è iniziata oltre 12 ore fa. Vuoi <button @click="openComplete" class="underline font-semibold">completarla</button> o <button @click="openSkip" class="underline font-semibold">saltarla</button>?
          </div>
        </div>

        <!-- Progress card sticky -->
        <div
          v-if="isInProgress"
          class="sticky top-2 z-20 bg-habit-card/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <div class="flex items-baseline justify-between mb-2">
            <div class="text-habit-text text-sm font-semibold">
              {{ progress.completed }} / {{ progress.total }} set
              <span class="text-habit-text-subtle text-xs ml-1">completati</span>
            </div>
            <div class="text-habit-orange font-bold text-base">{{ progress.percent }}%</div>
          </div>
          <div class="w-full h-2 rounded-full bg-habit-bg-light overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-habit-orange to-habit-orange-light transition-all duration-500 rounded-full"
              :style="{ width: progress.percent + '%' }"
            ></div>
          </div>
        </div>

        <!-- Summary completata/saltata -->
        <div
          v-if="isCompleted || isSkipped"
          class="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
        >
          <div class="bg-habit-card border border-white/10 rounded-2xl p-3 text-center">
            <div class="text-[10px] uppercase tracking-wider text-habit-text-subtle">Durata</div>
            <div class="text-habit-text font-bold text-base mt-0.5">{{ formatDuration(session.duration_minutes) }}</div>
          </div>
          <div class="bg-habit-card border border-white/10 rounded-2xl p-3 text-center">
            <div class="text-[10px] uppercase tracking-wider text-habit-text-subtle">Set</div>
            <div class="text-habit-text font-bold text-base mt-0.5">{{ progress.completed }} / {{ progress.total }}</div>
          </div>
          <div class="bg-habit-card border border-white/10 rounded-2xl p-3 text-center">
            <div class="text-[10px] uppercase tracking-wider text-habit-text-subtle">Feeling</div>
            <div class="text-habit-text font-bold text-base mt-0.5">{{ feelingEmoji(session.overall_feeling) }}</div>
          </div>
          <div class="bg-habit-card border border-white/10 rounded-2xl p-3 text-center">
            <div class="text-[10px] uppercase tracking-wider text-habit-text-subtle">XP</div>
            <div class="text-habit-orange font-bold text-base mt-0.5">+{{ session.xp_earned || 0 }}</div>
          </div>
        </div>
        <div
          v-if="(isCompleted || isSkipped) && session.notes"
          class="mb-4 px-4 py-3 rounded-2xl bg-habit-bg-light/50 border border-habit-border"
        >
          <div class="text-[10px] uppercase tracking-wider text-habit-text-subtle mb-1">Note</div>
          <p class="text-habit-text-muted text-sm whitespace-pre-line">{{ session.notes }}</p>
        </div>

        <!-- Esercizi -->
        <div v-if="session.exercises?.length" class="space-y-3 sm:space-y-4">
          <div
            v-for="(exercise, idx) in session.exercises"
            :key="exercise.id"
            class="bg-habit-card border border-white/10 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
          >
            <!-- Header esercizio -->
            <div class="p-4 sm:p-5">
              <div class="flex items-start gap-3 mb-3">
                <div class="w-9 h-9 rounded-xl bg-habit-orange/10 border border-habit-orange/20 text-habit-orange flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {{ Number(idx) + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-habit-text text-sm sm:text-base leading-tight">{{ exercise.exercise_name }}</h3>
                  <div class="flex flex-wrap gap-1.5 mt-1.5">
                    <span class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-habit-bg-light text-habit-text-muted">
                      {{ exercise.prescribed_sets || '?' }} x {{ exercise.prescribed_reps || '?' }}
                    </span>
                    <span v-if="exercise.prescribed_weight" class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-habit-bg-light text-habit-text-muted">
                      @ {{ exercise.prescribed_weight }} kg
                    </span>
                  </div>
                  <p v-if="exercise.notes" class="text-habit-text-muted text-xs italic mt-1.5">{{ exercise.notes }}</p>
                </div>
                <a
                  v-if="exercise.video_url"
                  :href="exercise.video_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-9 h-9 rounded-xl bg-habit-cyan/10 hover:bg-habit-cyan/20 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Video esercizio"
                >
                  <svg class="w-4 h-4 text-habit-cyan" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </a>
              </div>

              <!-- Set loggati -->
              <div v-if="exercise.sets?.length" class="space-y-1.5 mb-3">
                <div
                  v-for="(set, sIdx) in exercise.sets"
                  :key="set.id"
                  class="rounded-xl bg-habit-bg-light/40 border border-habit-border"
                >
                  <!-- View row -->
                  <div
                    v-if="editingSetId !== set.id"
                    class="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <span class="w-6 text-habit-text-subtle text-xs font-semibold">S{{ Number(sIdx) + 1 }}</span>
                    <span v-if="set.weight_used != null" class="text-habit-text font-medium tabular-nums">{{ set.weight_used }}<span class="text-habit-text-subtle text-xs ml-0.5">kg</span></span>
                    <span v-if="set.reps_completed != null" class="text-habit-text font-medium tabular-nums">×{{ set.reps_completed }}</span>
                    <span v-if="set.rpe != null" class="text-habit-cyan text-xs">RPE {{ set.rpe }}</span>
                    <span v-if="set.is_warmup" class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">warm</span>
                    <span v-if="set.is_failure" class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">fail</span>
                    <div class="ml-auto flex items-center gap-1" v-if="isInProgress">
                      <button
                        @click="startEditSet(set)"
                        class="w-8 h-8 rounded-lg hover:bg-habit-card flex items-center justify-center transition-colors"
                        aria-label="Modifica"
                      >
                        <svg class="w-4 h-4 text-habit-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button
                        @click="onDeleteSet(set)"
                        class="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        aria-label="Elimina"
                      >
                        <svg class="w-4 h-4 text-habit-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  <!-- Edit row -->
                  <div v-else class="px-3 py-2.5 space-y-2">
                    <div class="grid grid-cols-3 gap-2">
                      <input
                        v-model="editSetForm.weight"
                        type="number"
                        inputmode="decimal"
                        placeholder="kg"
                        class="w-full px-2.5 py-2 rounded-lg bg-habit-card border border-habit-border text-habit-text text-sm focus:outline-none focus:ring-2 focus:ring-habit-orange/40"
                      />
                      <input
                        v-model="editSetForm.reps"
                        type="number"
                        inputmode="numeric"
                        placeholder="reps"
                        class="w-full px-2.5 py-2 rounded-lg bg-habit-card border border-habit-border text-habit-text text-sm focus:outline-none focus:ring-2 focus:ring-habit-orange/40"
                      />
                      <input
                        v-model="editSetForm.rpe"
                        type="number"
                        inputmode="decimal"
                        placeholder="RPE"
                        min="1"
                        max="10"
                        class="w-full px-2.5 py-2 rounded-lg bg-habit-card border border-habit-border text-habit-text text-sm focus:outline-none focus:ring-2 focus:ring-habit-orange/40"
                      />
                    </div>
                    <div class="flex items-center gap-4 text-xs">
                      <label class="inline-flex items-center gap-1.5 cursor-pointer">
                        <input v-model="editSetForm.isWarmup" type="checkbox" class="rounded" /> Warmup
                      </label>
                      <label class="inline-flex items-center gap-1.5 cursor-pointer">
                        <input v-model="editSetForm.isFailure" type="checkbox" class="rounded" /> Failure
                      </label>
                      <div class="ml-auto flex gap-1">
                        <button @click="cancelEditSet" class="px-2 py-1 rounded-lg text-xs text-habit-text-muted hover:text-habit-text">Annulla</button>
                        <button @click="saveEditSet" class="px-3 py-1 rounded-lg bg-habit-orange text-white text-xs font-semibold hover:opacity-95 active:scale-[0.98] transition-all">Salva</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Form nuovo set (solo se in_progress) -->
              <div v-if="isInProgress" class="border-t border-habit-border pt-3">
                <div class="grid grid-cols-3 gap-2 mb-2">
                  <input
                    v-model="ensureSetForm(exercise).weight"
                    type="number"
                    inputmode="decimal"
                    placeholder="kg"
                    class="w-full px-3 py-2.5 rounded-xl bg-habit-bg-light border border-habit-border text-habit-text text-sm placeholder:text-habit-text-subtle focus:outline-none focus:ring-2 focus:ring-habit-orange/40 transition-all"
                  />
                  <input
                    v-model="ensureSetForm(exercise).reps"
                    type="number"
                    inputmode="numeric"
                    placeholder="reps"
                    class="w-full px-3 py-2.5 rounded-xl bg-habit-bg-light border border-habit-border text-habit-text text-sm placeholder:text-habit-text-subtle focus:outline-none focus:ring-2 focus:ring-habit-orange/40 transition-all"
                  />
                  <input
                    v-model="ensureSetForm(exercise).rpe"
                    type="number"
                    inputmode="decimal"
                    placeholder="RPE"
                    min="1"
                    max="10"
                    class="w-full px-3 py-2.5 rounded-xl bg-habit-bg-light border border-habit-border text-habit-text text-sm placeholder:text-habit-text-subtle focus:outline-none focus:ring-2 focus:ring-habit-orange/40 transition-all"
                  />
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                  <label class="inline-flex items-center gap-1.5 text-xs text-habit-text-muted cursor-pointer">
                    <input v-model="ensureSetForm(exercise).isWarmup" type="checkbox" class="rounded" />
                    Warmup
                  </label>
                  <label class="inline-flex items-center gap-1.5 text-xs text-habit-text-muted cursor-pointer">
                    <input v-model="ensureSetForm(exercise).isFailure" type="checkbox" class="rounded" />
                    Cedimento
                  </label>
                  <button
                    @click="onLogSet(exercise)"
                    :disabled="savingSetFor === exercise.id"
                    class="ml-auto inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-habit-orange to-habit-orange-light text-white text-xs font-bold shadow-habit-glow hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all"
                  >
                    <svg v-if="savingSetFor !== exercise.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
                    <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                    Aggiungi set
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty exercises -->
        <div
          v-else-if="session.exercises?.length === 0"
          class="bg-habit-card border border-white/10 rounded-3xl p-8 text-center"
        >
          <div class="text-4xl mb-3">📋</div>
          <p class="text-habit-text-muted text-sm">
            Questa scheda non ha esercizi configurati. Contatta il tuo PT.
          </p>
        </div>
      </template>
    </div>

    <!-- Footer sticky con CTA (mobile + desktop) -->
    <div
      v-if="session && isInProgress"
      class="fixed bottom-0 left-0 right-0 z-30 bg-habit-bg/95 backdrop-blur-xl border-t border-habit-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      style="padding-bottom: env(safe-area-inset-bottom, 0px)"
    >
      <div class="max-w-5xl mx-auto p-3 sm:p-4 flex items-center gap-2">
        <button
          @click="openSkip"
          class="px-4 py-3 min-h-[48px] rounded-2xl bg-habit-card border border-habit-border text-habit-text-muted hover:text-habit-text hover:border-habit-red/40 text-sm font-semibold transition-all"
        >
          ⏭ Salta
        </button>
        <button
          @click="openComplete"
          class="flex-1 px-5 py-3 min-h-[48px] rounded-2xl bg-gradient-to-r from-habit-cyan to-blue-600 text-white text-sm sm:text-base font-bold shadow-habit-glow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          Completa sessione
        </button>
      </div>
    </div>

    <!-- BottomSheet Completa -->
    <Teleport to="body">
      <transition name="sheet">
        <div
          v-if="showCompleteSheet"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          @click.self="showCompleteSheet = false"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            class="relative w-full sm:max-w-md bg-habit-card border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl"
            style="padding-bottom: env(safe-area-inset-bottom, 0px)"
          >
            <div class="p-5 sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-habit-text text-lg">Completa sessione</h3>
                <button
                  @click="showCompleteSheet = false"
                  class="w-9 h-9 rounded-lg hover:bg-habit-bg-light flex items-center justify-center"
                  aria-label="Chiudi"
                >
                  <svg class="w-5 h-5 text-habit-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <p class="text-habit-text-muted text-sm mb-4">Come ti sei sentito durante l'allenamento?</p>
              <div class="grid grid-cols-5 gap-2 mb-5">
                <button
                  v-for="opt in feelingOptions"
                  :key="opt.value"
                  @click="completeForm.overallFeeling = opt.value"
                  class="aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95"
                  :class="completeForm.overallFeeling === opt.value
                    ? 'bg-habit-orange/20 border-habit-orange shadow-habit-glow'
                    : 'bg-habit-bg-light border-habit-border hover:border-habit-orange/40'"
                >
                  <span class="text-2xl">{{ opt.emoji }}</span>
                  <span class="text-[9px] text-habit-text-subtle font-semibold">{{ opt.label }}</span>
                </button>
              </div>
              <label class="block text-xs text-habit-text-muted mb-1.5">Note (opzionali)</label>
              <textarea
                v-model="completeForm.notes"
                rows="3"
                placeholder="Come è andata? Sensazioni, infortuni..."
                class="w-full px-3 py-2.5 rounded-xl bg-habit-bg-light border border-habit-border text-habit-text text-sm focus:outline-none focus:ring-2 focus:ring-habit-orange/40 resize-none transition-all"
              ></textarea>
              <button
                @click="onComplete"
                :disabled="completing"
                class="w-full mt-4 px-5 py-3 min-h-[48px] rounded-2xl bg-gradient-to-r from-habit-cyan to-blue-600 text-white font-bold shadow-habit-glow hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                <svg v-if="!completing" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                {{ completing ? 'Completamento…' : 'Conferma e completa' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- BottomSheet Skip -->
    <Teleport to="body">
      <transition name="sheet">
        <div
          v-if="showSkipSheet"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          @click.self="showSkipSheet = false"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            class="relative w-full sm:max-w-md bg-habit-card border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl"
            style="padding-bottom: env(safe-area-inset-bottom, 0px)"
          >
            <div class="p-5 sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-habit-text text-lg">Salta sessione</h3>
                <button
                  @click="showSkipSheet = false"
                  class="w-9 h-9 rounded-lg hover:bg-habit-bg-light flex items-center justify-center"
                  aria-label="Chiudi"
                >
                  <svg class="w-5 h-5 text-habit-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <p class="text-habit-text-muted text-sm mb-3">Vuoi saltare questa sessione? Puoi indicare il motivo.</p>
              <textarea
                v-model="skipReason"
                rows="3"
                placeholder="Es. influenza, impegni, infortunio..."
                class="w-full px-3 py-2.5 rounded-xl bg-habit-bg-light border border-habit-border text-habit-text text-sm focus:outline-none focus:ring-2 focus:ring-habit-red/40 resize-none transition-all"
              ></textarea>
              <div class="flex gap-2 mt-4">
                <button
                  @click="showSkipSheet = false"
                  class="flex-1 px-4 py-3 min-h-[48px] rounded-2xl bg-habit-bg-light border border-habit-border text-habit-text-muted hover:text-habit-text font-semibold transition-all"
                >
                  Annulla
                </button>
                <button
                  @click="onSkip"
                  :disabled="skipping"
                  class="flex-1 px-4 py-3 min-h-[48px] rounded-2xl bg-gradient-to-r from-habit-red to-red-700 text-white font-bold hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all"
                >
                  {{ skipping ? '...' : 'Conferma salta' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-active > div:last-child,
.sheet-leave-active > div:last-child {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-enter-from > div:last-child {
  transform: translateY(100%);
}
.sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sheet-enter-from > div:last-child,
  .sheet-leave-to > div:last-child {
    transform: scale(0.96);
    opacity: 0;
  }
}
</style>
