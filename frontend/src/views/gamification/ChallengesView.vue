<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useGamificationStore } from "@/store/gamification";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";

interface TypeConfig {
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

interface NewChallengeForm {
  name: string;
  description: string;
  challengeType: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  xpReward: number;
}

const gamification = useGamificationStore();
const auth = useAuthStore();

const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as string),
);

const challengeTypes: Record<string, TypeConfig> = {
  workout_count: {
    label: "N. Allenamenti",
    emoji: "\u{1F4AA}",
    color: "text-cyan-400",
    bg: "bg-cyan-500/20",
  },
  total_volume: {
    label: "Volume Totale",
    emoji: "\u{1F3CB}",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  consecutive_days: {
    label: "Giorni Consecutivi",
    emoji: "\u{1F525}",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
  },
  specific_exercise: {
    label: "Esercizio Specifico",
    emoji: "\u{1F3AF}",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
  },
  custom: {
    label: "Personalizzata",
    emoji: "\u{2B50}",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
};

const participantStatuses: Record<string, StatusConfig> = {
  active: { label: "Iscritto", color: "text-green-400", bg: "bg-green-500/20" },
  completed: {
    label: "Completato",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  failed: { label: "Non riuscito", color: "text-red-400", bg: "bg-red-500/20" },
  withdrawn: {
    label: "Ritirato",
    color: "text-habit-text-subtle",
    bg: "bg-gray-500/20",
  },
};

const statusFilters = [
  { value: "active", label: "Attive" },
  { value: "upcoming", label: "In arrivo" },
  { value: "past", label: "Passate" },
  { value: "", label: "Tutte" },
];

const getChallengeType = (t: string): TypeConfig =>
  challengeTypes[t] || challengeTypes.custom;
const getParticipantStatus = (s: string): StatusConfig =>
  participantStatuses[s] || participantStatuses.active;

// State
const statusFilter = ref("active");
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const loading = ref(false);

// Form
const newChallenge = ref<NewChallengeForm>({
  name: "",
  description: "",
  challengeType: "workout_count",
  targetValue: 10,
  startDate: "",
  endDate: "",
  xpReward: 50,
});

// Handlers
const handleStatusFilter = (status: string) => {
  statusFilter.value = status;
  gamification.fetchChallenges({ status, page: 1 });
};

const openDetail = async (challengeId: number) => {
  await gamification.fetchChallengeById(challengeId);
  showDetailModal.value = true;
};

const handleCreate = async () => {
  if (!newChallenge.value.name.trim()) return;
  loading.value = true;
  try {
    await api.post("/gamification/challenges", newChallenge.value);
    showCreateModal.value = false;
    newChallenge.value = {
      name: "",
      description: "",
      challengeType: "workout_count",
      targetValue: 10,
      startDate: "",
      endDate: "",
      xpReward: 50,
    };
    await gamification.fetchChallenges({ status: statusFilter.value, page: 1 });
  } catch (err) {
    console.error("Errore creazione sfida:", err);
  } finally {
    loading.value = false;
  }
};

const handleJoin = async (challengeId: number) => {
  const result = await gamification.joinChallenge(challengeId);
  if (result.success) {
    await gamification.fetchChallengeById(challengeId);
    await gamification.fetchChallenges({
      status: statusFilter.value,
      page: gamification.challengesPagination.page,
    });
  }
};

const handleWithdraw = async (challengeId: number) => {
  const result = await gamification.withdrawFromChallenge(challengeId);
  if (result.success) {
    await gamification.fetchChallengeById(challengeId);
    await gamification.fetchChallenges({
      status: statusFilter.value,
      page: gamification.challengesPagination.page,
    });
  }
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const daysRemaining = (endDate: string | null | undefined): number | null => {
  if (!endDate) return null;
  const diff = Math.ceil(
    (new Date(endDate).getTime() - new Date().getTime()) / 86400000,
  );
  return diff >= 0 ? diff : null;
};

const progressPct = (
  current: number | null | undefined,
  target: number,
): number => {
  if (!target) return 0;
  return Math.min(Math.round(((current || 0) / target) * 100), 100);
};

onMounted(() => {
  gamification.fetchChallenges({ status: "active" });
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Sfide</h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Partecipa alle sfide e guadagna XP
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="isTrainer"
          @click="showCreateModal = true"
          class="bg-habit-cyan text-habit-bg px-4 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition flex items-center gap-2"
        >
          <span class="text-lg">+</span> Nuova Sfida
        </button>
        <router-link
          to="/gamification"
          class="px-3 py-2 rounded-habit text-xs font-medium bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-cyan transition"
        >
          &larr; Gamification
        </router-link>
      </div>
    </div>

    <!-- Filtri status -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        @click="handleStatusFilter(f.value)"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition',
          statusFilter === f.value
            ? 'bg-habit-cyan text-habit-bg'
            : 'bg-habit-card text-habit-text-subtle hover:text-habit-text border border-habit-border',
        ]"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="gamification.loading && gamification.challenges.length === 0"
      class="space-y-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="bg-habit-card rounded-habit p-5 animate-pulse"
      >
        <div class="h-5 w-48 bg-habit-skeleton rounded mb-3"></div>
        <div class="h-3 w-full bg-habit-skeleton rounded mb-2"></div>
        <div class="h-2 w-full bg-habit-skeleton rounded mb-3"></div>
        <div class="flex gap-3">
          <div class="h-4 w-20 bg-habit-skeleton rounded"></div>
          <div class="h-4 w-20 bg-habit-skeleton rounded"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="gamification.challenges.length === 0"
      class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
    >
      <div class="text-4xl mb-3">&#127919;</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">
        Nessuna sfida trovata
      </h3>
      <p class="text-habit-text-subtle text-sm">
        {{
          statusFilter === "active"
            ? "Non ci sono sfide attive al momento."
            : "Nessuna sfida in questa categoria."
        }}
      </p>
    </div>

    <!-- Lista sfide -->
    <div v-else class="space-y-4">
      <div
        v-for="ch in gamification.challenges"
        :key="ch.id"
        class="bg-habit-card rounded-habit border border-habit-border p-5 hover:border-habit-border transition"
      >
        <div
          class="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold text-habit-text">
                {{ ch.name }}
              </h3>
              <span
                :class="[
                  getChallengeType(ch.challenge_type).bg,
                  getChallengeType(ch.challenge_type).color,
                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                ]"
              >
                {{ getChallengeType(ch.challenge_type).emoji }}
                {{ getChallengeType(ch.challenge_type).label }}
              </span>
            </div>
            <p
              v-if="ch.description"
              class="text-xs text-habit-text-subtle line-clamp-2"
            >
              {{ ch.description }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- Stato partecipazione -->
            <span
              v-if="ch.participant_status"
              :class="[
                getParticipantStatus(ch.participant_status).bg,
                getParticipantStatus(ch.participant_status).color,
                'px-2 py-1 rounded-full text-xs font-medium',
              ]"
            >
              {{ getParticipantStatus(ch.participant_status).label }}
            </span>
            <span
              class="text-xs text-habit-cyan font-bold bg-habit-cyan/10 px-2 py-1 rounded-full"
              >+{{ ch.xp_reward }} XP</span
            >
          </div>
        </div>

        <!-- Progress bar (se partecipante) -->
        <div
          v-if="ch.participant_status === 'active' && ch.current_value != null"
          class="mb-3"
        >
          <div class="flex justify-between text-xs text-habit-text-subtle mb-1">
            <span
              >Progresso: {{ ch.current_value || 0 }} /
              {{ ch.target_value }}</span
            >
            <span>{{ progressPct(ch.current_value, ch.target_value) }}%</span>
          </div>
          <div class="w-full h-2 bg-habit-bg rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-green-500 to-habit-cyan rounded-full transition-all"
              :style="{
                width: progressPct(ch.current_value, ch.target_value) + '%',
              }"
            ></div>
          </div>
        </div>

        <!-- Info riga -->
        <div
          class="flex flex-wrap items-center gap-4 text-xs text-habit-text-subtle"
        >
          <span
            >{{ formatDate(ch.start_date) }} —
            {{ formatDate(ch.end_date) }}</span
          >
          <span
            v-if="daysRemaining(ch.end_date) != null"
            :class="daysRemaining(ch.end_date)! <= 3 ? 'text-red-400' : ''"
          >
            {{ daysRemaining(ch.end_date) }} giorni rimasti
          </span>
          <span>{{ ch.participants_count || 0 }} partecipanti</span>
          <button
            @click="openDetail(ch.id)"
            class="ml-auto text-habit-cyan hover:underline text-xs font-medium"
          >
            Dettagli
          </button>
        </div>
      </div>
    </div>

    <!-- Paginazione -->
    <div
      v-if="gamification.challengesPagination.totalPages > 1"
      class="flex justify-center items-center gap-3 mt-6"
    >
      <button
        @click="
          gamification.fetchChallenges({
            status: statusFilter,
            page: gamification.challengesPagination.page - 1,
          })
        "
        :disabled="gamification.challengesPagination.page <= 1"
        class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
      >
        Prec
      </button>
      <span class="text-sm text-habit-text-subtle">
        {{ gamification.challengesPagination.page }} /
        {{ gamification.challengesPagination.totalPages }}
      </span>
      <button
        @click="
          gamification.fetchChallenges({
            status: statusFilter,
            page: gamification.challengesPagination.page + 1,
          })
        "
        :disabled="
          gamification.challengesPagination.page >=
          gamification.challengesPagination.totalPages
        "
        class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
      >
        Succ
      </button>
    </div>

    <!-- Modale Crea Sfida -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showCreateModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-lg"
        >
          <div
            class="p-4 border-b border-habit-border flex justify-between items-center"
          >
            <h3 class="text-lg font-semibold text-habit-text">Nuova Sfida</h3>
            <button
              @click="showCreateModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>
          <div class="p-4 space-y-4">
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Nome</label
              >
              <input
                v-model="newChallenge.name"
                type="text"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                placeholder="Nome della sfida"
              />
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Descrizione</label
              >
              <textarea
                v-model="newChallenge.description"
                rows="2"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none resize-none"
                placeholder="Descrizione opzionale"
              ></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1"
                  >Tipo</label
                >
                <select
                  v-model="newChallenge.challengeType"
                  class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                >
                  <option
                    v-for="(cfg, key) in challengeTypes"
                    :key="key"
                    :value="key"
                  >
                    {{ cfg.emoji }} {{ cfg.label }}
                  </option>
                </select>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1"
                  >Obiettivo</label
                >
                <input
                  v-model.number="newChallenge.targetValue"
                  type="number"
                  min="1"
                  class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1"
                  >Data inizio</label
                >
                <input
                  v-model="newChallenge.startDate"
                  type="date"
                  class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                />
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1"
                  >Data fine</label
                >
                <input
                  v-model="newChallenge.endDate"
                  type="date"
                  class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >XP Reward</label
              >
              <input
                v-model.number="newChallenge.xpReward"
                type="number"
                min="0"
                step="10"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              />
            </div>
          </div>
          <div class="p-4 border-t border-habit-border flex justify-end gap-2">
            <button
              @click="showCreateModal = false"
              class="px-4 py-2 rounded-habit text-sm text-habit-text-subtle hover:text-habit-text transition"
            >
              Annulla
            </button>
            <button
              @click="handleCreate"
              :disabled="
                !newChallenge.name.trim() ||
                !newChallenge.startDate ||
                !newChallenge.endDate ||
                loading
              "
              class="bg-habit-cyan text-habit-bg px-4 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              Crea Sfida
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modale Dettaglio Sfida -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && gamification.currentChallenge"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showDetailModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-lg max-h-[85vh] flex flex-col"
        >
          <div
            class="p-4 border-b border-habit-border flex justify-between items-center shrink-0"
          >
            <h3 class="text-lg font-semibold text-habit-text">
              Dettaglio Sfida
            </h3>
            <button
              @click="showDetailModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>

          <div class="overflow-y-auto flex-1 p-4 space-y-4">
            <!-- Info sfida -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <h4 class="text-base font-semibold text-habit-text">
                  {{ gamification.currentChallenge.name }}
                </h4>
                <span
                  :class="[
                    getChallengeType(
                      gamification.currentChallenge.challenge_type,
                    ).bg,
                    getChallengeType(
                      gamification.currentChallenge.challenge_type,
                    ).color,
                    'px-2 py-0.5 rounded-full text-[10px] font-medium',
                  ]"
                >
                  {{
                    getChallengeType(
                      gamification.currentChallenge.challenge_type,
                    ).emoji
                  }}
                  {{
                    getChallengeType(
                      gamification.currentChallenge.challenge_type,
                    ).label
                  }}
                </span>
              </div>
              <p
                v-if="gamification.currentChallenge.description"
                class="text-sm text-habit-text-subtle mb-3"
              >
                {{ gamification.currentChallenge.description }}
              </p>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-habit-bg rounded-lg p-3">
                  <div
                    class="text-[10px] text-habit-text-subtle uppercase mb-1"
                  >
                    Obiettivo
                  </div>
                  <div class="text-habit-text font-bold">
                    {{ gamification.currentChallenge.target_value }}
                  </div>
                </div>
                <div class="bg-habit-bg rounded-lg p-3">
                  <div
                    class="text-[10px] text-habit-text-subtle uppercase mb-1"
                  >
                    XP Reward
                  </div>
                  <div class="text-habit-cyan font-bold">
                    +{{ gamification.currentChallenge.xp_reward }} XP
                  </div>
                </div>
                <div class="bg-habit-bg rounded-lg p-3">
                  <div
                    class="text-[10px] text-habit-text-subtle uppercase mb-1"
                  >
                    Inizio
                  </div>
                  <div class="text-habit-text text-xs">
                    {{ formatDate(gamification.currentChallenge.start_date) }}
                  </div>
                </div>
                <div class="bg-habit-bg rounded-lg p-3">
                  <div
                    class="text-[10px] text-habit-text-subtle uppercase mb-1"
                  >
                    Fine
                  </div>
                  <div class="text-habit-text text-xs">
                    {{ formatDate(gamification.currentChallenge.end_date) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Azioni partecipazione -->
            <div
              v-if="gamification.currentChallenge.userParticipation"
              class="text-center"
            >
              <div class="mb-2">
                <span
                  :class="[
                    getParticipantStatus(
                      gamification.currentChallenge.userParticipation.status,
                    ).bg,
                    getParticipantStatus(
                      gamification.currentChallenge.userParticipation.status,
                    ).color,
                    'px-3 py-1 rounded-full text-sm font-medium',
                  ]"
                >
                  {{
                    getParticipantStatus(
                      gamification.currentChallenge.userParticipation.status,
                    ).label
                  }}
                </span>
              </div>
              <button
                v-if="
                  gamification.currentChallenge.userParticipation.status ===
                  'active'
                "
                @click="handleWithdraw(gamification.currentChallenge.id)"
                class="text-xs text-red-400 hover:underline"
              >
                Ritirati dalla sfida
              </button>
            </div>
            <div v-else class="text-center">
              <button
                @click="handleJoin(gamification.currentChallenge.id)"
                class="bg-habit-cyan text-habit-bg px-6 py-2 rounded-habit text-sm font-semibold hover:opacity-90 transition"
              >
                Partecipa alla Sfida
              </button>
            </div>

            <!-- Partecipanti -->
            <div>
              <h4 class="text-sm font-semibold text-habit-text mb-3">
                Partecipanti ({{
                  gamification.currentChallenge.participants?.length || 0
                }})
              </h4>

              <div
                v-if="!gamification.currentChallenge.participants?.length"
                class="text-center py-4 text-habit-text-subtle text-sm"
              >
                Nessun partecipante ancora
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(p, idx) in gamification.currentChallenge.participants"
                  :key="p.id"
                  class="flex items-center gap-3 bg-habit-bg rounded-lg p-3"
                >
                  <span
                    class="text-sm font-bold text-habit-text-subtle w-6 text-center"
                    >{{ Number(idx) + 1 }}</span
                  >
                  <div
                    class="w-7 h-7 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                  >
                    {{ (p.first_name || "?")[0] }}{{ (p.last_name || "?")[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm text-habit-text truncate">
                      {{ p.first_name }} {{ p.last_name }}
                    </div>
                    <div class="text-[10px] text-habit-text-subtle">
                      Lv. {{ p.level || 1 }}
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-sm font-bold text-habit-text">
                      {{ p.current_value || 0 }}/{{
                        gamification.currentChallenge.target_value
                      }}
                    </div>
                    <span
                      :class="[
                        getParticipantStatus(p.status).color,
                        'text-[10px]',
                      ]"
                    >
                      {{ getParticipantStatus(p.status).label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
