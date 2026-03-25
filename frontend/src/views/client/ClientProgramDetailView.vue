<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const program = ref<any>(null);
const expandedWorkoutId = ref<number | null>(null);

const programId = computed(() => parseInt(route.params.id as string));

// Program status config
const programStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Bozza", color: "text-gray-400", bg: "bg-gray-500/20" },
  active: { label: "Attivo", color: "text-green-400", bg: "bg-green-500/20" },
  completed: { label: "Completato", color: "text-blue-400", bg: "bg-blue-500/20" },
  archived: { label: "Archiviato", color: "text-yellow-400", bg: "bg-yellow-500/20" },
};

const getProgramStatus = (s: string) =>
  programStatusConfig[s] || programStatusConfig.draft;

const difficultyConfig: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: "Principiante", color: "text-green-400", bg: "bg-green-500/20" },
  intermediate: { label: "Intermedio", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  advanced: { label: "Avanzato", color: "text-red-400", bg: "bg-red-500/20" },
};

const getDifficulty = (d: string) =>
  difficultyConfig[d] || difficultyConfig.intermediate;

const dayLabels: Record<number, string> = {
  1: "Lunedi",
  2: "Martedi",
  3: "Mercoledi",
  4: "Giovedi",
  5: "Venerdi",
  6: "Sabato",
  7: "Domenica",
};

const categoryLabels: Record<string, string> = {
  strength: "Forza",
  cardio: "Cardio",
  flexibility: "Flessibilita",
  balance: "Equilibrio",
  plyometric: "Pliometria",
  compound: "Composto",
  isolation: "Isolamento",
};

const equipmentLabels: Record<string, string> = {
  barbell: "Bilanciere",
  dumbbell: "Manubrio",
  kettlebell: "Kettlebell",
  cable: "Cavo",
  machine: "Macchina",
  bodyweight: "Corpo libero",
  band: "Elastico",
  bench: "Panca",
  pull_up_bar: "Sbarra",
  trx: "TRX",
  smith_machine: "Smith Machine",
  ez_bar: "EZ Bar",
  foam_roller: "Foam Roller",
  medicine_ball: "Palla Medica",
  swiss_ball: "Swiss Ball",
  none: "Nessuno",
};

const weightTypeLabels: Record<string, string> = {
  fixed: "Fisso",
  percentage: "Percentuale",
  rpe: "RPE",
  bodyweight: "Corpo libero",
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

const formatEquipment = (equipment: any): string[] => {
  if (!equipment) return [];
  if (Array.isArray(equipment)) return equipment;
  if (typeof equipment !== 'string') return [String(equipment)];
  try {
    const parsed = JSON.parse(equipment);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return equipment.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
};

// Group workouts by week
const workoutsByWeek = computed(() => {
  if (!program.value?.workouts) return {};
  const grouped: Record<number, any[]> = {};
  for (const w of program.value.workouts) {
    const week = w.week_number || 1;
    if (!grouped[week]) grouped[week] = [];
    grouped[week].push(w);
  }
  for (const week of Object.keys(grouped)) {
    (grouped as any)[week].sort(
      (a: any, b: any) => (a.day_of_week || 0) - (b.day_of_week || 0),
    );
  }
  return grouped;
});

const weekNumbers = computed(() =>
  Object.keys(workoutsByWeek.value).map(Number).sort((a, b) => a - b),
);

// Total exercise count
const totalExercises = computed(() => {
  if (!program.value?.workouts) return 0;
  return program.value.workouts.reduce(
    (sum: number, w: any) => sum + (w.exercises?.length || 0),
    0,
  );
});

const toggleWorkout = (workoutId: number) => {
  expandedWorkoutId.value =
    expandedWorkoutId.value === workoutId ? null : workoutId;
};

const loadProgram = async () => {
  loading.value = true;
  try {
    const response = await api.get(`/programs/${programId.value}/full`);
    program.value = response.data.data?.program || null;
  } catch (err) {
    console.error("Errore caricamento programma:", err);
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push("/my-workout");
};

onMounted(() => {
  loadProgram();
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">
    <!-- Back button + Header -->
    <div class="mb-6">
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
      <div v-if="loading" class="space-y-3">
        <div class="h-7 bg-habit-skeleton rounded w-1/2 animate-pulse"></div>
        <div class="h-4 bg-habit-skeleton rounded w-1/3 animate-pulse"></div>
      </div>

      <div v-else-if="program">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
              {{ program.name }}
            </h1>
            <p v-if="program.description" class="text-habit-text-muted text-sm mt-1">
              {{ program.description }}
            </p>
          </div>
          <span
            :class="[getProgramStatus(program.status).bg, getProgramStatus(program.status).color]"
            class="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium"
          >
            {{ getProgramStatus(program.status).label }}
          </span>
        </div>
      </div>
    </div>

    <!-- Program Info Grid -->
    <div v-if="!loading && program" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="card-dark p-3 text-center">
        <div class="text-lg font-bold text-habit-text">{{ program.weeks || '-' }}</div>
        <div class="text-habit-text-subtle text-xs mt-0.5">Settimane</div>
      </div>
      <div class="card-dark p-3 text-center">
        <div class="text-lg font-bold text-habit-text">{{ program.days_per_week || '-' }}</div>
        <div class="text-habit-text-subtle text-xs mt-0.5">Giorni/Sett.</div>
      </div>
      <div class="card-dark p-3 text-center">
        <div class="text-lg font-bold text-habit-cyan">{{ program.workouts?.length || 0 }}</div>
        <div class="text-habit-text-subtle text-xs mt-0.5">Schede</div>
      </div>
      <div class="card-dark p-3 text-center">
        <div class="text-lg font-bold text-habit-orange">{{ totalExercises }}</div>
        <div class="text-habit-text-subtle text-xs mt-0.5">Esercizi Totali</div>
      </div>
    </div>

    <!-- Date range -->
    <div v-if="!loading && program && (program.start_date || program.end_date)" class="card-dark p-3 mb-6">
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-2 text-habit-text-muted">
          <svg class="w-4 h-4 text-habit-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span v-if="program.start_date">Dal {{ formatDate(program.start_date) }}</span>
          <span v-if="program.end_date"> al {{ formatDate(program.end_date) }}</span>
        </div>
        <div v-if="program.mesocycle_name" class="flex items-center gap-1.5 text-habit-text-muted">
          <span class="text-habit-text-subtle">Mesociclo:</span>
          {{ program.mesocycle_name }}
          <span v-if="program.mesocycle_focus" class="text-habit-text-subtle">({{ program.mesocycle_focus }})</span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton for workouts -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card-dark p-4 animate-pulse space-y-3">
        <div class="h-5 bg-habit-skeleton rounded w-1/4"></div>
        <div v-for="j in 3" :key="j" class="flex gap-3">
          <div class="w-10 h-10 bg-habit-skeleton rounded-lg"></div>
          <div class="flex-1 space-y-1">
            <div class="h-4 bg-habit-skeleton rounded w-1/2"></div>
            <div class="h-3 bg-habit-skeleton rounded w-1/3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- No workouts -->
    <div v-else-if="program && (!program.workouts || program.workouts.length === 0)" class="card-dark p-12 text-center">
      <div class="text-5xl mb-4">📋</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">Nessuna scheda</h3>
      <p class="text-habit-text-muted text-sm">
        Questo programma non ha ancora schede di allenamento associate.
      </p>
    </div>

    <!-- Workouts by Week -->
    <div v-else-if="program" class="space-y-6">
      <div v-for="week in weekNumbers" :key="week">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-7 h-7 rounded-lg bg-habit-cyan/10 border border-habit-cyan/20 text-habit-cyan flex items-center justify-center text-xs font-bold">
            {{ week }}
          </span>
          <h2 class="text-sm font-semibold text-habit-text">Settimana {{ week }}</h2>
        </div>

        <div class="space-y-3">
          <div
            v-for="workout in workoutsByWeek[week]"
            :key="workout.id"
            class="card-dark overflow-hidden"
          >
            <!-- Workout Header (clickable) -->
            <div
              @click="toggleWorkout(workout.id)"
              class="p-4 cursor-pointer hover:bg-habit-bg-light/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-habit-cyan/10 border border-habit-cyan/20 text-habit-cyan flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {{ workout.day_of_week ? dayLabels[workout.day_of_week]?.substring(0, 2) || workout.day_of_week : '-' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="font-semibold text-habit-text text-sm truncate">
                      {{ workout.template_name || 'Scheda senza nome' }}
                    </h3>
                    <span v-if="workout.exercises?.length" class="text-xs text-habit-text-subtle bg-habit-bg-light px-1.5 py-0.5 rounded">
                      {{ workout.exercises.length }} esercizi
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-habit-text-subtle mt-0.5">
                    <span v-if="workout.day_of_week">{{ dayLabels[workout.day_of_week] || `Giorno ${workout.day_of_week}` }}</span>
                    <span v-if="workout.category">&middot; {{ categoryLabels[workout.category] || workout.category }}</span>
                    <span v-if="workout.difficulty">&middot; {{ getDifficulty(workout.difficulty).label }}</span>
                    <span v-if="workout.estimated_duration_min">&middot; {{ workout.estimated_duration_min }} min</span>
                  </div>
                </div>
                <!-- Chevron -->
                <svg
                  class="w-5 h-5 text-habit-text-subtle flex-shrink-0 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedWorkoutId === workout.id }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p v-if="workout.notes" class="text-habit-text-muted text-xs mt-2 italic pl-[52px]">{{ workout.notes }}</p>
            </div>

            <!-- Expanded Exercise List -->
            <div v-if="expandedWorkoutId === workout.id" class="border-t border-habit-border">
              <div v-if="workout.exercises && workout.exercises.length > 0" class="p-4 space-y-3">
                <div
                  v-for="(exercise, idx) in workout.exercises"
                  :key="exercise.id"
                  class="p-3 bg-habit-bg-light/50 rounded-xl"
                >
                  <div class="flex items-start gap-3">
                    <!-- Order number -->
                    <div class="w-7 h-7 rounded-full bg-habit-orange/10 border border-habit-orange/20 text-habit-orange flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {{ idx + 1 }}
                    </div>

                    <div class="flex-1 min-w-0">
                      <!-- Exercise name + badges -->
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <h4 class="font-semibold text-habit-text text-sm">
                          {{ exercise.exercise_name }}
                        </h4>
                        <span v-if="exercise.is_warmup" class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          Riscaldamento
                        </span>
                        <span v-if="exercise.is_compound" class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                          Composto
                        </span>
                        <span v-if="exercise.superset_group" class="text-[10px] px-1.5 py-0.5 rounded bg-habit-cyan/20 text-habit-cyan">
                          Superset {{ exercise.superset_group }}
                        </span>
                      </div>

                      <!-- Exercise details grid -->
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs mt-2">
                        <div v-if="exercise.sets">
                          <span class="text-habit-text-subtle">Serie:</span>
                          <span class="text-habit-text font-medium ml-1">{{ exercise.sets }}</span>
                        </div>
                        <div v-if="exercise.reps_min || exercise.reps_max">
                          <span class="text-habit-text-subtle">Ripetizioni:</span>
                          <span class="text-habit-text font-medium ml-1">
                            <template v-if="exercise.reps_min && exercise.reps_max && exercise.reps_min !== exercise.reps_max">
                              {{ exercise.reps_min }}-{{ exercise.reps_max }}
                            </template>
                            <template v-else>
                              {{ exercise.reps_min || exercise.reps_max }}
                            </template>
                          </span>
                        </div>
                        <div v-if="exercise.weight_value">
                          <span class="text-habit-text-subtle">Peso:</span>
                          <span class="text-habit-text font-medium ml-1">
                            {{ exercise.weight_value }}{{ exercise.weight_type === 'percentage' ? '%' : 'kg' }}
                            <span v-if="exercise.weight_type && exercise.weight_type !== 'fixed'" class="text-habit-text-subtle">
                              ({{ weightTypeLabels[exercise.weight_type] || exercise.weight_type }})
                            </span>
                          </span>
                        </div>
                        <div v-if="exercise.rest_seconds">
                          <span class="text-habit-text-subtle">Recupero:</span>
                          <span class="text-habit-text font-medium ml-1">
                            {{ exercise.rest_seconds >= 60 ? `${Math.floor(exercise.rest_seconds / 60)}:${String(exercise.rest_seconds % 60).padStart(2, '0')}` : `${exercise.rest_seconds}s` }}
                          </span>
                        </div>
                      </div>

                      <!-- Tempo -->
                      <div v-if="exercise.tempo" class="text-xs mt-1">
                        <span class="text-habit-text-subtle">Tempo:</span>
                        <span class="text-habit-text font-medium ml-1">{{ exercise.tempo }}</span>
                      </div>

                      <!-- Category + Difficulty -->
                      <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span v-if="exercise.exercise_category" class="text-[10px] px-1.5 py-0.5 rounded bg-habit-bg-light text-habit-text-muted">
                          {{ categoryLabels[exercise.exercise_category] || exercise.exercise_category }}
                        </span>
                        <span
                          v-if="exercise.exercise_difficulty"
                          :class="[getDifficulty(exercise.exercise_difficulty).bg, getDifficulty(exercise.exercise_difficulty).color]"
                          class="text-[10px] px-1.5 py-0.5 rounded"
                        >
                          {{ getDifficulty(exercise.exercise_difficulty).label }}
                        </span>
                        <template v-if="formatEquipment(exercise.equipment).length">
                          <span
                            v-for="eq in formatEquipment(exercise.equipment)"
                            :key="eq"
                            class="text-[10px] px-1.5 py-0.5 rounded bg-habit-bg-light text-habit-text-subtle"
                          >
                            {{ equipmentLabels[eq] || eq }}
                          </span>
                        </template>
                      </div>

                      <!-- Notes -->
                      <p v-if="exercise.notes" class="text-habit-text-muted text-xs mt-2 italic">
                        {{ exercise.notes }}
                      </p>
                    </div>

                    <!-- Video icon -->
                    <div v-if="exercise.video_url" class="flex-shrink-0">
                      <a
                        :href="exercise.video_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="w-8 h-8 rounded-lg bg-habit-bg-light hover:bg-habit-cyan/10 flex items-center justify-center transition-colors"
                        @click.stop
                      >
                        <svg class="w-4 h-4 text-habit-cyan" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="p-4 text-center">
                <p class="text-habit-text-muted text-sm">Nessun esercizio in questa scheda</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="!loading && !program" class="card-dark p-12 text-center">
      <div class="text-5xl mb-4">😕</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">Programma non trovato</h3>
      <p class="text-habit-text-muted text-sm mb-4">
        Non siamo riusciti a caricare i dettagli del programma.
      </p>
      <button @click="goBack" class="btn-secondary btn-sm">
        Torna all'Allenamento
      </button>
    </div>
  </div>
</template>
