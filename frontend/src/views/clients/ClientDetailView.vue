<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import type { Client } from "@/types";

interface ClientDetail extends Omit<Client, "status"> {
  status: string;
  level?: number;
  xp_points?: number;
  streak_days?: number;
  height_cm?: number;
  current_weight_kg?: number;
  fitness_level?: string;
  primary_goal?: string;
  training_location?: string;
  last_workout_at?: string;
  medical_notes?: string;
  goals?: ClientGoal[];
}

interface ClientGoal {
  id: number;
  goal_type: string;
  target_value: number;
  current_value?: number;
  unit?: string;
}

interface ClientStats {
  totalWorkouts?: number;
  workoutsThisWeek?: number;
  totalMinutes?: number;
  avgDuration?: number;
}

interface TabItem {
  id: string;
  label: string;
}

const route = useRoute();
const router = useRouter();

const client = ref<ClientDetail | null>(null);
const stats = ref<ClientStats | null>(null);
const isLoading = ref<boolean>(true);
const activeTab = ref<string>("overview");

const tabs: TabItem[] = [
  { id: "overview", label: "Panoramica" },
  { id: "workouts", label: "Allenamenti" },
  { id: "progress", label: "Progressi" },
  { id: "nutrition", label: "Nutrizione" },
];

const clientId = computed(() => route.params.id);

onMounted(async () => {
  await loadClient();
});

const loadClient = async () => {
  isLoading.value = true;
  try {
    const [clientRes, statsRes] = await Promise.all([
      api.get(`/clients/${clientId.value}`),
      api
        .get(`/clients/${clientId.value}/stats`)
        .catch(() => ({ data: { data: { stats: {} } } })),
    ]);

    client.value = clientRes.data.data.client;
    stats.value = statsRes.data.data.stats;
  } catch (error: any) {
    console.error("Error loading client:", error);
    if (error.response?.status === 404) {
      router.push("/clients");
    }
  } finally {
    isLoading.value = false;
  }
};

const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    active: "bg-habit-success/20 text-habit-success",
    inactive: "bg-habit-skeleton text-habit-text-subtle",
    paused: "bg-habit-orange/20 text-habit-orange",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return classes[status] || classes.inactive;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: "Attivo",
    inactive: "Inattivo",
    paused: "In pausa",
    cancelled: "Cancellato",
  };
  return labels[status] || status;
};

const getFitnessLevelLabel = (level: string | undefined): string => {
  if (!level) return "-";
  const labels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzato",
    elite: "Elite",
  };
  return labels[level] || level;
};

const getGoalLabel = (goal: string | undefined): string => {
  if (!goal) return "-";
  const labels: Record<string, string> = {
    weight_loss: "Perdita peso",
    muscle_gain: "Aumento massa",
    strength: "Forza",
    endurance: "Resistenza",
    flexibility: "Flessibilita",
    general_fitness: "Fitness generale",
    sport_specific: "Sport specifico",
  };
  return labels[goal] || goal;
};

const formatDate = (date: string | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("it-IT");
};

const calculateAge = (dob: string | undefined): string => {
  if (!dob) return "-";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age + " anni";
};

const goBack = () => {
  router.push("/clients");
};

const sendMessage = () => {
  router.push(`/chat?client=${clientId.value}`);
};

const createWorkout = () => {
  router.push(`/workouts/builder?client=${clientId.value}`);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="isLoading" class="animate-pulse space-y-6">
      <div class="h-8 bg-habit-skeleton rounded w-1/4"></div>
      <div class="bg-habit-bg rounded-xl p-6">
        <div class="flex items-center space-x-4">
          <div class="w-20 h-20 bg-habit-skeleton rounded-full"></div>
          <div class="space-y-2 flex-1">
            <div class="h-6 bg-habit-skeleton rounded w-1/3"></div>
            <div class="h-4 bg-habit-skeleton rounded w-1/4"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="client">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="p-2 text-habit-text-subtle hover:text-habit-text hover:bg-habit-card-hover rounded-lg"
          >
            <svg
              class="w-5 h-5"
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
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
            {{ client.first_name }} {{ client.last_name }}
          </h1>
        </div>
        <div class="flex gap-2">
          <button
            @click="sendMessage"
            class="px-4 py-2 border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover transition-colors flex items-center"
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Messaggio
          </button>
          <button
            @click="createWorkout"
            class="px-4 py-2 bg-habit-cyan text-white rounded-lg hover:bg-cyan-500 transition-colors flex items-center"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuova Scheda
          </button>
        </div>
      </div>

      <!-- Profile Card -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm p-6"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-6">
          <div
            class="flex-shrink-0 w-20 h-20 bg-habit-cyan/20 rounded-full flex items-center justify-center"
          >
            <span class="text-2xl font-bold text-habit-cyan">
              {{ client.first_name?.charAt(0)
              }}{{ client.last_name?.charAt(0) }}
            </span>
          </div>
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-3 mb-2">
              <span
                :class="getStatusBadgeClass(client.status)"
                class="px-3 py-1 text-sm rounded-full"
              >
                {{ getStatusLabel(client.status) }}
              </span>
              <span class="text-sm text-habit-text-subtle">
                Livello {{ client.level || 1 }}
              </span>
              <span class="text-sm text-habit-text-subtle">
                {{ client.xp_points || 0 }} XP
              </span>
            </div>
            <div class="flex flex-wrap gap-4 text-sm text-habit-text-subtle">
              <span v-if="client.email" class="flex items-center">
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {{ client.email }}
              </span>
              <span v-if="client.phone" class="flex items-center">
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {{ client.phone }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-center px-4">
              <div class="flex items-center text-orange-500">
                <svg
                  class="w-5 h-5 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  />
                </svg>
                <span class="text-xl font-bold">{{
                  client.streak_days || 0
                }}</span>
              </div>
              <p class="text-xs text-habit-text-subtle">Streak</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          class="bg-habit-bg border border-habit-border rounded-xl p-4 shadow-sm"
        >
          <p class="text-sm text-habit-text-subtle">Workout Totali</p>
          <p class="text-2xl font-bold text-habit-text">
            {{ stats?.totalWorkouts || 0 }}
          </p>
        </div>
        <div
          class="bg-habit-bg border border-habit-border rounded-xl p-4 shadow-sm"
        >
          <p class="text-sm text-habit-text-subtle">Questa Settimana</p>
          <p class="text-2xl font-bold text-habit-success">
            {{ stats?.workoutsThisWeek || 0 }}
          </p>
        </div>
        <div
          class="bg-habit-bg border border-habit-border rounded-xl p-4 shadow-sm"
        >
          <p class="text-sm text-habit-text-subtle">Minuti Totali</p>
          <p class="text-2xl font-bold text-habit-blue">
            {{ stats?.totalMinutes || 0 }}
          </p>
        </div>
        <div
          class="bg-habit-bg border border-habit-border rounded-xl p-4 shadow-sm"
        >
          <p class="text-sm text-habit-text-subtle">Media Durata</p>
          <p class="text-2xl font-bold text-habit-purple">
            {{ stats?.avgDuration || 0 }} min
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div
        class="bg-habit-bg border border-habit-border rounded-xl shadow-sm overflow-hidden"
      >
        <div class="border-b border-habit-border">
          <nav class="flex -mb-px overflow-x-auto hide-scrollbar">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
              :class="
                activeTab === tab.id
                  ? 'border-habit-cyan text-habit-cyan'
                  : 'border-transparent text-habit-text-subtle hover:text-habit-text-muted'
              "
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="space-y-6">
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Personal Info -->
              <div>
                <h3 class="text-lg font-semibold text-habit-text mb-4">
                  Informazioni Personali
                </h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Eta</dt>
                    <dd class="text-sm text-habit-text">
                      {{ calculateAge(client.date_of_birth) }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Genere</dt>
                    <dd class="text-sm text-habit-text capitalize">
                      {{ client.gender || "-" }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Altezza</dt>
                    <dd class="text-sm text-habit-text">
                      {{ client.height_cm ? client.height_cm + " cm" : "-" }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Peso attuale</dt>
                    <dd class="text-sm text-habit-text">
                      {{
                        client.current_weight_kg
                          ? client.current_weight_kg + " kg"
                          : "-"
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Cliente dal</dt>
                    <dd class="text-sm text-habit-text">
                      {{ formatDate(client.created_at) }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Fitness Profile -->
              <div>
                <h3 class="text-lg font-semibold text-habit-text mb-4">
                  Profilo Fitness
                </h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Livello</dt>
                    <dd class="text-sm text-habit-text">
                      {{ getFitnessLevelLabel(client.fitness_level) }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Obiettivo</dt>
                    <dd class="text-sm text-habit-text">
                      {{ getGoalLabel(client.primary_goal) }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">Modalita</dt>
                    <dd class="text-sm text-habit-text capitalize">
                      {{ client.training_location || "-" }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-habit-text-subtle">
                      Ultimo workout
                    </dt>
                    <dd class="text-sm text-habit-text">
                      {{ formatDate(client.last_workout_at) }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="client.medical_notes || client.notes">
              <h3 class="text-lg font-semibold text-habit-text mb-4">Note</h3>
              <div
                v-if="client.medical_notes"
                class="mb-4 p-4 bg-yellow-500/10 rounded-lg"
              >
                <h4 class="text-sm font-medium text-yellow-700 mb-1">
                  Note Mediche
                </h4>
                <p class="text-sm text-yellow-600">
                  {{ client.medical_notes }}
                </p>
              </div>
              <div
                v-if="client.notes"
                class="p-4 bg-habit-card-hover/50 rounded-lg"
              >
                <p class="text-sm text-habit-text-muted">{{ client.notes }}</p>
              </div>
            </div>

            <!-- Goals -->
            <div v-if="client.goals && client.goals.length > 0">
              <h3 class="text-lg font-semibold text-habit-text mb-4">
                Obiettivi Attivi
              </h3>
              <div class="space-y-3">
                <div
                  v-for="goal in client.goals"
                  :key="goal.id"
                  class="p-4 bg-habit-card-hover/50 rounded-lg"
                >
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-habit-text">{{
                      goal.goal_type
                    }}</span>
                    <span class="text-sm text-habit-text-subtle">
                      {{ goal.current_value || 0 }} / {{ goal.target_value }}
                      {{ goal.unit }}
                    </span>
                  </div>
                  <div class="w-full bg-habit-skeleton rounded-full h-2">
                    <div
                      class="bg-habit-cyan h-2 rounded-full"
                      :style="{
                        width:
                          (goal.target_value
                            ? Math.min(
                                ((goal.current_value || 0) /
                                  goal.target_value) *
                                  100,
                                100,
                              )
                            : 0) + '%',
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Workouts Tab -->
          <div
            v-if="activeTab === 'workouts'"
            class="text-center py-8 text-habit-text-subtle"
          >
            <svg
              class="w-12 h-12 mx-auto mb-4 text-habit-text-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p>Sezione allenamenti in arrivo</p>
            <button
              @click="createWorkout"
              class="mt-4 px-4 py-2 bg-habit-cyan text-white rounded-lg hover:bg-cyan-500"
            >
              Crea prima scheda
            </button>
          </div>

          <!-- Progress Tab -->
          <div
            v-if="activeTab === 'progress'"
            class="text-center py-8 text-habit-text-subtle"
          >
            <svg
              class="w-12 h-12 mx-auto mb-4 text-habit-text-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p>Sezione progressi in arrivo</p>
          </div>

          <!-- Nutrition Tab -->
          <div
            v-if="activeTab === 'nutrition'"
            class="text-center py-8 text-habit-text-subtle"
          >
            <svg
              class="w-12 h-12 mx-auto mb-4 text-habit-text-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p>Sezione nutrizione in arrivo</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
