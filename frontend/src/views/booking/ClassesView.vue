<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useClassesStore } from "@/store/classes";
import { useAuthStore } from "@/store/auth";

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

interface NewClassForm {
  name: string;
  description: string;
  maxParticipants: number;
  durationMin: number;
  location: string;
}

interface NewSessionForm {
  classId: string;
  startDatetime: string;
  endDatetime: string;
  notes: string;
}

const store = useClassesStore();
const auth = useAuthStore();

const isTrainer = computed(() =>
  ["tenant_owner", "staff", "super_admin"].includes(auth.user?.role as string),
);

// Tab attiva
const activeTab = ref<"sessions" | "classes" | "my">("sessions");

// Filtri sessioni
const sessionStatusFilter = ref("");

// Modali
const showCreateClassModal = ref(false);
const showCreateSessionModal = ref(false);
const showSessionDetailModal = ref(false);

// Form nuova classe
const newClass = ref<NewClassForm>({
  name: "",
  description: "",
  maxParticipants: 10,
  durationMin: 60,
  location: "",
});

// Form nuova sessione
const newSession = ref<NewSessionForm>({
  classId: "",
  startDatetime: "",
  endDatetime: "",
  notes: "",
});

// Config status sessione
const sessionStatusConfig: Record<string, StatusConfig> = {
  scheduled: {
    label: "Programmata",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  in_progress: {
    label: "In corso",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  completed: {
    label: "Completata",
    color: "text-green-400",
    bg: "bg-green-500/20",
  },
  cancelled: {
    label: "Cancellata",
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
};

// Config status iscrizione
const enrollmentStatusConfig: Record<string, StatusConfig> = {
  enrolled: {
    label: "Iscritto",
    color: "text-green-400",
    bg: "bg-green-500/20",
  },
  waitlist: {
    label: "In attesa",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  cancelled: {
    label: "Cancellato",
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
  attended: {
    label: "Presente",
    color: "text-habit-cyan",
    bg: "bg-cyan-500/20",
  },
  no_show: {
    label: "Assente",
    color: "text-habit-text-subtle",
    bg: "bg-habit-skeleton/50",
  },
};

const getSessionStatus = (s: string): StatusConfig =>
  sessionStatusConfig[s] || sessionStatusConfig.scheduled;
const getEnrollmentStatus = (s: string): StatusConfig =>
  enrollmentStatusConfig[s] || enrollmentStatusConfig.enrolled;

const formatDate = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const formatTime = (d: string | null | undefined): string => {
  if (!d) return "-";
  return new Date(d).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
const formatDateTime = (d: string | null | undefined): string =>
  `${formatDate(d)} ${formatTime(d)}`;

// Handlers
const loadSessions = (page: number = 1) => {
  store.fetchSessions({ page, status: sessionStatusFilter.value || undefined });
};

const handleStatusFilter = (status: string) => {
  sessionStatusFilter.value = status;
  loadSessions();
};

const handleTabChange = (tab: "sessions" | "classes" | "my") => {
  activeTab.value = tab;
  if (tab === "sessions") loadSessions();
  else if (tab === "classes") store.fetchClasses();
  else if (tab === "my") store.fetchMyClasses();
};

const handleCreateClass = async () => {
  const result = await store.createClass(newClass.value);
  if (result.success) {
    showCreateClassModal.value = false;
    newClass.value = {
      name: "",
      description: "",
      maxParticipants: 10,
      durationMin: 60,
      location: "",
    };
    store.fetchClasses();
  }
};

const handleCreateSession = async () => {
  const result = await store.createSession({
    classId: parseInt(newSession.value.classId),
    startDatetime: newSession.value.startDatetime,
    endDatetime: newSession.value.endDatetime,
    notes: newSession.value.notes || null,
  });
  if (result.success) {
    showCreateSessionModal.value = false;
    newSession.value = {
      classId: "",
      startDatetime: "",
      endDatetime: "",
      notes: "",
    };
    loadSessions();
  }
};

const openSessionDetail = async (sessionId: number) => {
  await store.fetchSessionById(sessionId);
  showSessionDetailModal.value = true;
};

const handleEnroll = async (sessionId: number) => {
  const result = await store.enrollToSession(sessionId);
  if (result.success) {
    loadSessions();
    if (showSessionDetailModal.value) await store.fetchSessionById(sessionId);
  }
};

const handleCancelEnrollment = async (sessionId: number) => {
  const result = await store.cancelEnrollment(sessionId);
  if (result.success) {
    loadSessions();
    if (showSessionDetailModal.value) await store.fetchSessionById(sessionId);
  }
};

const handleCheckIn = async (sessionId: number, clientId: number) => {
  const result = await store.checkInClient(sessionId, clientId);
  if (result.success) await store.fetchSessionById(sessionId);
};

const handleMarkNoShow = async (sessionId: number, clientId: number) => {
  const result = await store.markNoShow(sessionId, clientId);
  if (result.success) await store.fetchSessionById(sessionId);
};

const handleUpdateSessionStatus = async (sessionId: number, status: string) => {
  const result = await store.updateSessionStatus(sessionId, status);
  if (result.success) {
    loadSessions();
    if (showSessionDetailModal.value) await store.fetchSessionById(sessionId);
  }
};

const handleDeleteClass = async (id: number) => {
  const result = await store.deleteClass(id);
  if (result.success) store.fetchClasses();
};

const handleClientChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value;
  store.selectedClientId = val ? Number(val) : null;
  if (activeTab.value === "my") store.fetchMyClasses();
  else loadSessions();
};

onMounted(() => {
  loadSessions();
  if (isTrainer.value) {
    store.fetchClients();
    store.fetchClasses();
  }
});
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Classi</h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Gestione classi di gruppo, sessioni e iscrizioni
        </p>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-if="isTrainer"
          @change="handleClientChange"
          class="bg-habit-card border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
        >
          <option value="">Tutti i clienti</option>
          <option v-for="c in store.clients" :key="c.id" :value="c.id">
            {{ c.first_name }} {{ c.last_name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tabs -->
    <div
      class="flex items-center gap-1 mb-6 bg-habit-card rounded-habit p-1 border border-habit-border"
    >
      <button
        @click="handleTabChange('sessions')"
        :class="[
          'flex-1 px-4 py-2 rounded-habit text-sm font-medium transition',
          activeTab === 'sessions'
            ? 'bg-habit-cyan text-habit-bg'
            : 'text-habit-text-subtle hover:text-habit-text',
        ]"
      >
        Sessioni
      </button>
      <button
        v-if="isTrainer"
        @click="handleTabChange('classes')"
        :class="[
          'flex-1 px-4 py-2 rounded-habit text-sm font-medium transition',
          activeTab === 'classes'
            ? 'bg-habit-cyan text-habit-bg'
            : 'text-habit-text-subtle hover:text-habit-text',
        ]"
      >
        Gestione Classi
      </button>
      <button
        @click="handleTabChange('my')"
        :class="[
          'flex-1 px-4 py-2 rounded-habit text-sm font-medium transition',
          activeTab === 'my'
            ? 'bg-habit-cyan text-habit-bg'
            : 'text-habit-text-subtle hover:text-habit-text',
        ]"
      >
        Le Mie
      </button>
    </div>

    <!-- ========== TAB SESSIONI ========== -->
    <div v-if="activeTab === 'sessions'">
      <!-- Filtri + Azioni -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <button
          @click="handleStatusFilter('')"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition',
            !sessionStatusFilter
              ? 'bg-habit-cyan text-habit-bg'
              : 'bg-habit-card text-habit-text-subtle hover:text-habit-text border border-habit-border',
          ]"
        >
          Tutte
        </button>
        <button
          v-for="(cfg, key) in sessionStatusConfig"
          :key="key"
          @click="handleStatusFilter(key)"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition',
            sessionStatusFilter === key
              ? 'bg-habit-cyan text-habit-bg'
              : 'bg-habit-card text-habit-text-subtle hover:text-habit-text border border-habit-border',
          ]"
        >
          {{ cfg.label }}
        </button>
        <div class="ml-auto" v-if="isTrainer">
          <button
            @click="showCreateSessionModal = true"
            class="px-4 py-1.5 rounded-habit text-xs font-medium bg-habit-cyan text-habit-bg hover:bg-habit-cyan/80 transition"
          >
            + Nuova Sessione
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div
        v-if="store.loading && store.sessions.length === 0"
        class="space-y-3"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="bg-habit-card rounded-habit p-5 animate-pulse"
        >
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-habit-skeleton rounded-habit"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 w-40 bg-habit-skeleton rounded"></div>
              <div class="h-3 w-24 bg-habit-skeleton rounded"></div>
            </div>
            <div class="h-8 w-20 bg-habit-skeleton rounded"></div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="store.sessions.length === 0"
        class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
      >
        <div class="text-4xl mb-3">&#128197;</div>
        <h3 class="text-lg font-semibold text-habit-text mb-2">
          Nessuna sessione trovata
        </h3>
        <p class="text-habit-text-subtle text-sm">
          {{
            sessionStatusFilter
              ? "Nessuna sessione con questo stato."
              : "Non ci sono sessioni programmate."
          }}
        </p>
      </div>

      <!-- Lista sessioni -->
      <div v-else class="space-y-3">
        <div
          v-for="session in store.sessions"
          :key="session.id"
          class="bg-habit-card rounded-habit border border-habit-border p-4 hover:border-habit-border transition cursor-pointer"
          @click="openSessionDetail(session.id)"
        >
          <div class="flex items-start gap-4">
            <!-- Data box -->
            <div
              class="w-16 h-16 rounded-habit bg-habit-bg flex flex-col items-center justify-center shrink-0 border border-habit-border"
            >
              <span class="text-lg font-bold text-habit-text">{{
                new Date(session.start_datetime).getDate()
              }}</span>
              <span class="text-[10px] text-habit-text-subtle uppercase">{{
                new Date(session.start_datetime).toLocaleDateString("it-IT", {
                  month: "short",
                })
              }}</span>
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-sm font-semibold text-habit-text truncate">
                  {{ session.class_name }}
                </h3>
                <span
                  :class="[
                    getSessionStatus(session.status).color,
                    getSessionStatus(session.status).bg,
                    'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                  ]"
                >
                  {{ getSessionStatus(session.status).label }}
                </span>
              </div>
              <div
                class="flex items-center gap-4 text-xs text-habit-text-subtle"
              >
                <span
                  >&#128336; {{ formatTime(session.start_datetime) }} -
                  {{ formatTime(session.end_datetime) }}</span
                >
                <span v-if="session.location"
                  >&#128205; {{ session.location }}</span
                >
                <span v-if="session.instructor_first_name"
                  >&#128100; {{ session.instructor_first_name }}
                  {{ session.instructor_last_name }}</span
                >
              </div>
            </div>
            <!-- Posti -->
            <div class="text-right shrink-0">
              <div
                class="text-sm font-bold"
                :class="
                  session.enrolled_count >= session.max_participants
                    ? 'text-red-400'
                    : 'text-habit-cyan'
                "
              >
                {{ session.enrolled_count || 0 }}/{{ session.max_participants }}
              </div>
              <div class="text-[10px] text-habit-text-subtle">posti</div>
              <div
                v-if="session.waitlist_count > 0"
                class="text-[10px] text-yellow-400 mt-0.5"
              >
                {{ session.waitlist_count }} in attesa
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Paginazione sessioni -->
      <div
        v-if="store.sessionsPagination.totalPages > 1"
        class="flex justify-center items-center gap-3 mt-6"
      >
        <button
          @click="loadSessions(store.sessionsPagination.page - 1)"
          :disabled="store.sessionsPagination.page <= 1"
          class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
        >
          Prec
        </button>
        <span class="text-sm text-habit-text-subtle">
          {{ store.sessionsPagination.page }} /
          {{ store.sessionsPagination.totalPages }}
        </span>
        <button
          @click="loadSessions(store.sessionsPagination.page + 1)"
          :disabled="
            store.sessionsPagination.page >= store.sessionsPagination.totalPages
          "
          class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
        >
          Succ
        </button>
      </div>
    </div>

    <!-- ========== TAB GESTIONE CLASSI (trainer) ========== -->
    <div v-if="activeTab === 'classes' && isTrainer">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-habit-text">
          Classi configurate
        </h2>
        <button
          @click="showCreateClassModal = true"
          class="px-4 py-2 rounded-habit text-xs font-medium bg-habit-cyan text-habit-bg hover:bg-habit-cyan/80 transition"
        >
          + Nuova Classe
        </button>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && store.classes.length === 0" class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-habit-card rounded-habit p-5 animate-pulse"
        >
          <div class="h-5 w-40 bg-habit-skeleton rounded mb-3"></div>
          <div class="h-3 w-60 bg-habit-skeleton rounded"></div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="store.classes.length === 0"
        class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
      >
        <div class="text-4xl mb-3">&#127947;</div>
        <h3 class="text-lg font-semibold text-habit-text mb-2">
          Nessuna classe creata
        </h3>
        <p class="text-habit-text-subtle text-sm">
          Crea la prima classe per iniziare a programmare sessioni.
        </p>
      </div>

      <!-- Lista classi -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="cls in store.classes"
          :key="cls.id"
          class="bg-habit-card rounded-habit border border-habit-border p-5"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-base font-semibold text-habit-text">
                {{ cls.name }}
              </h3>
              <p
                v-if="cls.description"
                class="text-xs text-habit-text-subtle mt-1 line-clamp-2"
              >
                {{ cls.description }}
              </p>
            </div>
            <span
              :class="[
                cls.is_active
                  ? 'text-green-400 bg-green-500/20'
                  : 'text-habit-text-subtle bg-habit-skeleton/50',
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
              ]"
            >
              {{ cls.is_active ? "Attiva" : "Inattiva" }}
            </span>
          </div>
          <div
            class="grid grid-cols-2 gap-2 text-xs text-habit-text-subtle mb-3"
          >
            <div>
              &#128100; {{ cls.instructor_first_name }}
              {{ cls.instructor_last_name }}
            </div>
            <div>&#128101; Max {{ cls.max_participants }} partecipanti</div>
            <div>&#9201; {{ cls.duration_min }} min</div>
            <div v-if="cls.location">&#128205; {{ cls.location }}</div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-habit-text-subtle"
              >{{ cls.upcoming_sessions || 0 }} sessioni programmate</span
            >
            <button
              @click="handleDeleteClass(cls.id)"
              class="text-xs text-habit-text-subtle hover:text-red-400 transition"
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== TAB LE MIE CLASSI ========== -->
    <div v-if="activeTab === 'my'">
      <!-- Loading -->
      <div
        v-if="store.loading && store.myClasses.length === 0"
        class="space-y-3"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="bg-habit-card rounded-habit p-5 animate-pulse"
        >
          <div class="h-4 w-40 bg-habit-skeleton rounded mb-3"></div>
          <div class="h-3 w-32 bg-habit-skeleton rounded"></div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="store.myClasses.length === 0"
        class="bg-habit-card rounded-habit border border-habit-border p-12 text-center"
      >
        <div class="text-4xl mb-3">&#128218;</div>
        <h3 class="text-lg font-semibold text-habit-text mb-2">
          Nessuna iscrizione
        </h3>
        <p class="text-habit-text-subtle text-sm">
          Non sei iscritto a nessuna sessione. Esplora le sessioni disponibili!
        </p>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-3">
        <div
          v-for="item in store.myClasses"
          :key="item.session_id"
          class="bg-habit-card rounded-habit border border-habit-border p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-habit-text">
                {{ item.class_name }}
              </h3>
              <div
                class="flex items-center gap-3 text-xs text-habit-text-subtle mt-1"
              >
                <span>&#128197; {{ formatDateTime(item.start_datetime) }}</span>
                <span v-if="item.location">&#128205; {{ item.location }}</span>
                <span
                  >&#128100; {{ item.instructor_first_name }}
                  {{ item.instructor_last_name }}</span
                >
              </div>
            </div>
            <div class="text-right">
              <span
                :class="[
                  getEnrollmentStatus(item.enrollment_status).color,
                  getEnrollmentStatus(item.enrollment_status).bg,
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                ]"
              >
                {{ getEnrollmentStatus(item.enrollment_status).label }}
              </span>
              <div
                v-if="item.waitlist_position"
                class="text-[10px] text-habit-text-subtle mt-1"
              >
                Posizione: {{ item.waitlist_position }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Paginazione -->
      <div
        v-if="store.myClassesPagination.totalPages > 1"
        class="flex justify-center items-center gap-3 mt-6"
      >
        <button
          @click="
            store.fetchMyClasses({ page: store.myClassesPagination.page - 1 })
          "
          :disabled="store.myClassesPagination.page <= 1"
          class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
        >
          Prec
        </button>
        <span class="text-sm text-habit-text-subtle">
          {{ store.myClassesPagination.page }} /
          {{ store.myClassesPagination.totalPages }}
        </span>
        <button
          @click="
            store.fetchMyClasses({ page: store.myClassesPagination.page + 1 })
          "
          :disabled="
            store.myClassesPagination.page >=
            store.myClassesPagination.totalPages
          "
          class="px-3 py-1.5 rounded-habit text-sm bg-habit-card border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 transition"
        >
          Succ
        </button>
      </div>
    </div>

    <!-- ========== MODALE CREA CLASSE ========== -->
    <Teleport to="body">
      <div
        v-if="showCreateClassModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="showCreateClassModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
        >
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-lg font-bold text-habit-text">Nuova Classe</h3>
            <button
              @click="showCreateClassModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Nome *</label
              >
              <input
                v-model="newClass.name"
                type="text"
                placeholder="Es. Yoga Mattutino"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Descrizione</label
              >
              <textarea
                v-model="newClass.description"
                rows="3"
                placeholder="Descrizione della classe..."
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none resize-none"
              ></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-habit-text-subtle mb-1"
                  >Max Partecipanti</label
                >
                <input
                  v-model.number="newClass.maxParticipants"
                  type="number"
                  min="1"
                  class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs text-habit-text-subtle mb-1"
                  >Durata (min)</label
                >
                <input
                  v-model.number="newClass.durationMin"
                  type="number"
                  min="15"
                  step="15"
                  class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Luogo</label
              >
              <input
                v-model="newClass.location"
                type="text"
                placeholder="Es. Sala A"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              />
            </div>
            <button
              @click="handleCreateClass"
              :disabled="!newClass.name"
              class="w-full py-2.5 rounded-habit text-sm font-medium bg-habit-cyan text-habit-bg hover:bg-habit-cyan/80 disabled:opacity-40 transition"
            >
              Crea Classe
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========== MODALE CREA SESSIONE ========== -->
    <Teleport to="body">
      <div
        v-if="showCreateSessionModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="showCreateSessionModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
        >
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-lg font-bold text-habit-text">Nuova Sessione</h3>
            <button
              @click="showCreateSessionModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Classe *</label
              >
              <select
                v-model="newSession.classId"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              >
                <option value="">Seleziona classe</option>
                <option
                  v-for="cls in store.classes"
                  :key="cls.id"
                  :value="cls.id"
                >
                  {{ cls.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Data e ora inizio *</label
              >
              <input
                v-model="newSession.startDatetime"
                type="datetime-local"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Data e ora fine *</label
              >
              <input
                v-model="newSession.endDatetime"
                type="datetime-local"
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs text-habit-text-subtle mb-1"
                >Note</label
              >
              <textarea
                v-model="newSession.notes"
                rows="2"
                placeholder="Note opzionali..."
                class="w-full bg-habit-bg border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none resize-none"
              ></textarea>
            </div>
            <button
              @click="handleCreateSession"
              :disabled="
                !newSession.classId ||
                !newSession.startDatetime ||
                !newSession.endDatetime
              "
              class="w-full py-2.5 rounded-habit text-sm font-medium bg-habit-cyan text-habit-bg hover:bg-habit-cyan/80 disabled:opacity-40 transition"
            >
              Crea Sessione
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========== MODALE DETTAGLIO SESSIONE ========== -->
    <Teleport to="body">
      <div
        v-if="showSessionDetailModal && store.currentSession"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="showSessionDetailModal = false"
      >
        <div
          class="bg-habit-card rounded-habit border border-habit-border w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        >
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-lg font-bold text-habit-text">
              {{ store.currentSession.class_name }}
            </h3>
            <button
              @click="showSessionDetailModal = false"
              class="text-habit-text-subtle hover:text-habit-text text-xl"
            >
              &times;
            </button>
          </div>

          <!-- Info sessione -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="bg-habit-bg rounded-habit p-3">
              <div class="text-[10px] text-habit-text-subtle uppercase mb-1">
                Stato
              </div>
              <span
                :class="[
                  getSessionStatus(store.currentSession.status).color,
                  'text-sm font-semibold',
                ]"
              >
                {{ getSessionStatus(store.currentSession.status).label }}
              </span>
            </div>
            <div class="bg-habit-bg rounded-habit p-3">
              <div class="text-[10px] text-habit-text-subtle uppercase mb-1">
                Posti
              </div>
              <span class="text-sm font-semibold text-habit-text"
                >{{ store.currentSession.enrolled_count || 0 }}/{{
                  store.currentSession.max_participants
                }}</span
              >
            </div>
            <div class="bg-habit-bg rounded-habit p-3">
              <div class="text-[10px] text-habit-text-subtle uppercase mb-1">
                Inizio
              </div>
              <span class="text-xs text-habit-text">{{
                formatDateTime(store.currentSession.start_datetime)
              }}</span>
            </div>
            <div class="bg-habit-bg rounded-habit p-3">
              <div class="text-[10px] text-habit-text-subtle uppercase mb-1">
                Fine
              </div>
              <span class="text-xs text-habit-text">{{
                formatDateTime(store.currentSession.end_datetime)
              }}</span>
            </div>
            <div
              v-if="store.currentSession.location"
              class="bg-habit-bg rounded-habit p-3 col-span-2"
            >
              <div class="text-[10px] text-habit-text-subtle uppercase mb-1">
                Luogo
              </div>
              <span class="text-xs text-habit-text">{{
                store.currentSession.location
              }}</span>
            </div>
          </div>

          <!-- Azioni stato (trainer) -->
          <div
            v-if="isTrainer && store.currentSession.status === 'scheduled'"
            class="flex gap-2 mb-5"
          >
            <button
              @click="
                handleUpdateSessionStatus(
                  store.currentSession.id,
                  'in_progress',
                )
              "
              class="px-3 py-1.5 rounded-habit text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition"
            >
              Inizia Sessione
            </button>
            <button
              @click="
                handleUpdateSessionStatus(store.currentSession.id, 'cancelled')
              "
              class="px-3 py-1.5 rounded-habit text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              Cancella
            </button>
          </div>
          <div
            v-if="isTrainer && store.currentSession.status === 'in_progress'"
            class="mb-5"
          >
            <button
              @click="
                handleUpdateSessionStatus(store.currentSession.id, 'completed')
              "
              class="px-3 py-1.5 rounded-habit text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
            >
              Completa Sessione
            </button>
          </div>

          <!-- Azioni iscrizione (client) -->
          <div
            v-if="store.currentSession.status === 'scheduled'"
            class="flex gap-2 mb-5"
          >
            <button
              @click="handleEnroll(store.currentSession.id)"
              class="px-4 py-2 rounded-habit text-xs font-medium bg-habit-cyan text-habit-bg hover:bg-habit-cyan/80 transition"
            >
              Iscriviti
            </button>
            <button
              @click="handleCancelEnrollment(store.currentSession.id)"
              class="px-4 py-2 rounded-habit text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              Cancella Iscrizione
            </button>
          </div>

          <!-- Lista iscritti -->
          <div
            v-if="
              store.currentSession.enrollments &&
              store.currentSession.enrollments.length > 0
            "
          >
            <h4 class="text-sm font-semibold text-habit-text mb-3">
              Iscritti ({{ store.currentSession.enrollments.length }})
            </h4>
            <div class="space-y-2">
              <div
                v-for="enroll in store.currentSession.enrollments"
                :key="enroll.id"
                class="flex items-center justify-between bg-habit-bg rounded-habit px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-7 h-7 rounded-full bg-gradient-to-br from-habit-cyan to-blue-600 flex items-center justify-center text-white font-bold text-[10px]"
                  >
                    {{ (enroll.first_name || "?")[0]
                    }}{{ (enroll.last_name || "?")[0] }}
                  </div>
                  <span class="text-sm text-habit-text"
                    >{{ enroll.first_name }} {{ enroll.last_name }}</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      getEnrollmentStatus(enroll.status).color,
                      getEnrollmentStatus(enroll.status).bg,
                      'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                    ]"
                  >
                    {{ getEnrollmentStatus(enroll.status).label }}
                  </span>
                  <!-- Azioni trainer su iscritti -->
                  <div
                    v-if="
                      isTrainer &&
                      enroll.status === 'enrolled' &&
                      store.currentSession.status !== 'scheduled'
                    "
                    class="flex gap-1"
                  >
                    <button
                      @click="
                        handleCheckIn(store.currentSession.id, enroll.client_id)
                      "
                      class="text-[10px] text-green-400 hover:underline"
                    >
                      Check-in
                    </button>
                    <button
                      @click="
                        handleMarkNoShow(
                          store.currentSession.id,
                          enroll.client_id,
                        )
                      "
                      class="text-[10px] text-red-400 hover:underline"
                    >
                      Assente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-habit-text-subtle text-sm py-4">
            Nessun iscritto per questa sessione
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
