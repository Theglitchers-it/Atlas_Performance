<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useBookingStore } from "@/store/booking";
import { useToast } from "vue-toastification";
import { useNative } from "@/composables/useNative";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import CalendarSkeleton from "@/components/skeleton/CalendarSkeleton.vue";
import PullToRefresh from "@/components/mobile/PullToRefresh.vue";
import type { Appointment, CreateAppointmentForm } from "@/types";

const store = useBookingStore();
const toast = useToast();
const { isMobile } = useNative();

// Calendar ref for programmatic control
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);

// Track which view is active for the toolbar toggle
const activeView = ref<"day" | "week" | "month">(
  isMobile.value ? "day" : "week",
);

// Modal state
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showDeleteModal = ref(false);
const selectedAppointment = ref<Appointment | null>(null);
const isCreating = ref(false);
const isDeleting = ref(false);

// Create form
const createForm = ref<CreateAppointmentForm>({
  clientId: "",
  trainerId: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  appointmentType: "training",
  location: "",
  notes: "",
});

// Computed store values
const appointments = computed(() => store.appointments);
const clients = computed(() => store.clients);
const trainers = computed(() => store.trainers as any[]);
const loading = computed(() => store.loading);
const error = computed(() => store.error);
const filters = computed(() => store.filters);

// Today string for fallback
const today = new Date().toISOString().substring(0, 10);

// Current title derived from FullCalendar
const calendarTitle = ref("");

// --- Event Color Map ---
const eventColorMap: Record<string, { bg: string; border: string }> = {
  training: { bg: "#0283a7", border: "#026b8a" },
  assessment: { bg: "#8b5cf6", border: "#7c3aed" },
  consultation: { bg: "#10b981", border: "#059669" },
  other: { bg: "#6b7280", border: "#4b5563" },
};

// --- Map store appointments to FullCalendar events ---
const calendarEvents = computed(() => {
  return appointments.value.map((apt) => ({
    id: String(apt.id),
    title: getClientName(apt),
    start: apt.start_datetime,
    end: apt.end_datetime,
    backgroundColor: eventColorMap[apt.appointment_type]?.bg || "#6b7280",
    borderColor: eventColorMap[apt.appointment_type]?.border || "#6b7280",
    textColor: "#ffffff",
    extendedProps: { appointment: apt },
  }));
});

// --- FullCalendar options ---
const calendarOptions = computed((): any => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: isMobile.value ? "timeGridDay" : "timeGridWeek",
  locale: "it",
  headerToolbar: false,
  slotMinTime: "07:00:00",
  slotMaxTime: "21:00:00",
  slotDuration: "00:30:00",
  allDaySlot: false,
  editable: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  nowIndicator: true,
  height: "auto",
  firstDay: 1,
  eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
  slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
  events: calendarEvents.value,
  select: handleDateSelect,
  eventClick: handleEventClick,
  eventDrop: handleEventDrop,
  eventResize: handleEventResize,
  datesSet: handleDatesSet,
}));

// --- FullCalendar navigation ---
const navigatePrev = () => {
  const api = calendarRef.value?.getApi();
  if (api) {
    api.prev();
    updateTitle();
  }
};

const navigateNext = () => {
  const api = calendarRef.value?.getApi();
  if (api) {
    api.next();
    updateTitle();
  }
};

const goToToday = () => {
  const api = calendarRef.value?.getApi();
  if (api) {
    api.today();
    updateTitle();
  }
};

const setCalendarView = (view: "day" | "week" | "month") => {
  const viewMap: Record<string, string> = {
    week: "timeGridWeek",
    month: "dayGridMonth",
    day: "timeGridDay",
  };
  const api = calendarRef.value?.getApi();
  if (api) {
    api.changeView(viewMap[view] || view);
    activeView.value = view;
    updateTitle();
  }
};

const updateTitle = () => {
  const api = calendarRef.value?.getApi();
  if (api) {
    calendarTitle.value = api.view.title;
  }
};

// --- FullCalendar Event Handlers ---

/**
 * Triggered when user selects a date/time range by clicking or dragging on the calendar.
 * Opens the create modal pre-filled with the selected range.
 */
const handleDateSelect = (selectInfo: any) => {
  const start = selectInfo.start;
  const end = selectInfo.end;
  const dateStr = start.toISOString().substring(0, 10);
  const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

  createForm.value = {
    clientId: "",
    trainerId: "",
    date: dateStr,
    startTime: startTime,
    endTime: endTime || "10:00",
    appointmentType: "training",
    location: "",
    notes: "",
  };
  showCreateModal.value = true;

  // Unselect so the mirror highlight disappears
  const api = calendarRef.value?.getApi();
  if (api) api.unselect();
};

/**
 * Triggered when user clicks on an existing event.
 * Opens the detail modal for the clicked appointment.
 */
const handleEventClick = (clickInfo: any) => {
  const apt = clickInfo.event.extendedProps.appointment;
  if (apt) {
    selectedAppointment.value = apt;
    showDetailModal.value = true;
  }
};

/**
 * Triggered when user drags an event to a new date/time.
 * Updates the appointment start and end datetime via the store.
 */
const handleEventDrop = async (dropInfo: any) => {
  const apt = dropInfo.event.extendedProps.appointment;
  if (!apt) return;

  const newStart = dropInfo.event.start;
  const newEnd = dropInfo.event.end;

  const formatDT = (d: Date | null): string | null => {
    if (!d) return null;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${da} ${h}:${mi}:00`;
  };

  const result = await store.updateAppointment(apt.id, {
    startDatetime: formatDT(newStart),
    endDatetime: formatDT(newEnd),
  });

  if (result.success) {
    toast.success("Appuntamento spostato");
    await store.fetchAppointments();
  } else {
    toast.error(result.message || "Errore durante lo spostamento");
    dropInfo.revert();
  }
};

/**
 * Triggered when user resizes an event (changes its end time).
 * Updates the appointment end datetime via the store.
 */
const handleEventResize = async (resizeInfo: any) => {
  const apt = resizeInfo.event.extendedProps.appointment;
  if (!apt) return;

  const newEnd = resizeInfo.event.end;

  const formatDT = (d: Date | null): string | null => {
    if (!d) return null;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${da} ${h}:${mi}:00`;
  };

  const result = await store.updateAppointment(apt.id, {
    endDatetime: formatDT(newEnd),
  });

  if (result.success) {
    toast.success("Durata aggiornata");
    await store.fetchAppointments();
  } else {
    toast.error(result.message || "Errore durante il ridimensionamento");
    resizeInfo.revert();
  }
};

/**
 * Triggered when the visible date range changes (navigation, view switch).
 * Syncs the store currentDate and updates the toolbar title.
 */
const handleDatesSet = (dateInfo: any) => {
  calendarTitle.value = dateInfo.view.title;
  // Sync store currentDate to the middle of the visible range
  const mid = new Date((dateInfo.start.getTime() + dateInfo.end.getTime()) / 2);
  const midStr = mid.toISOString().substring(0, 10);
  if (store.currentDate !== midStr) {
    store.currentDate = midStr;
  }
};

// --- Helpers ---

const statusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    scheduled: "Pianificato",
    confirmed: "Confermato",
    completed: "Completato",
    cancelled: "Annullato",
    no_show: "Assente",
  };
  return labels[status] || status || "-";
};

const statusClass = (status: string): string => {
  const classes: Record<string, string> = {
    scheduled: "bg-yellow-500/15 text-yellow-400",
    confirmed: "bg-blue-500/15 text-blue-400",
    completed: "bg-emerald-500/15 text-emerald-400",
    cancelled: "bg-red-500/15 text-red-400",
    no_show: "bg-orange-500/15 text-orange-400",
  };
  return classes[status] || "bg-habit-skeleton/50 text-habit-text-subtle";
};

const typeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    training: "Allenamento",
    assessment: "Valutazione",
    consultation: "Consulenza",
    other: "Altro",
  };
  return labels[type] || type || "-";
};

const typeDot = (type: string): string => {
  const colors: Record<string, string> = {
    training: "bg-habit-cyan",
    assessment: "bg-purple-400",
    consultation: "bg-emerald-400",
    other: "bg-habit-text-subtle",
  };
  return colors[type] || "bg-habit-text-subtle";
};

const formatTime = (datetime: string | null | undefined): string => {
  if (!datetime) return "-";
  return datetime.substring(11, 16);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getClientName = (apt: any): string => {
  if (apt.client_first_name)
    return `${apt.client_first_name} ${apt.client_last_name || ""}`.trim();
  return "-";
};

const getTrainerName = (apt: any): string => {
  if (apt.trainer_first_name)
    return `${apt.trainer_first_name} ${apt.trainer_last_name || ""}`.trim();
  return "-";
};

// --- Actions ---

const openCreateModal = (date: string | null = null) => {
  createForm.value = {
    clientId: "",
    trainerId: "",
    date: date || today,
    startTime: "09:00",
    endTime: "10:00",
    appointmentType: "training",
    location: "",
    notes: "",
  };
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (
    !createForm.value.clientId ||
    !createForm.value.trainerId ||
    !createForm.value.date
  )
    return;
  isCreating.value = true;
  const result = await store.createAppointment({
    clientId: parseInt(String(createForm.value.clientId)),
    trainerId: parseInt(String(createForm.value.trainerId)),
    startDatetime: `${createForm.value.date} ${createForm.value.startTime}:00`,
    endDatetime: `${createForm.value.date} ${createForm.value.endTime}:00`,
    appointmentType: createForm.value.appointmentType,
    location: createForm.value.location || null,
    notes: createForm.value.notes || null,
  });
  isCreating.value = false;
  if (result.success) {
    showCreateModal.value = false;
    toast.success("Appuntamento creato con successo");
  } else {
    toast.error(result.message || "Errore durante la creazione");
  }
};

const openDeleteModal = (apt: Appointment) => {
  selectedAppointment.value = apt;
  showDetailModal.value = false;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!selectedAppointment.value) return;
  isDeleting.value = true;
  const result = await store.deleteAppointment(selectedAppointment.value.id);
  isDeleting.value = false;
  if (result.success) {
    showDeleteModal.value = false;
    selectedAppointment.value = null;
    toast.success("Appuntamento eliminato con successo");
  } else {
    toast.error(result.message || "Errore durante l'eliminazione");
  }
};

const handleStatusChange = async (apt: Appointment, newStatus: string) => {
  const result = await store.updateStatus(apt.id, newStatus);
  showDetailModal.value = false;
  if (result.success) {
    toast.success("Stato aggiornato con successo");
  } else {
    toast.error(result.message || "Errore durante l'aggiornamento dello stato");
  }
};

const handleFilterClient = (e: Event) =>
  store.setFilter("clientId", (e.target as HTMLSelectElement).value || null);
const handleFilterTrainer = (e: Event) =>
  store.setFilter("trainerId", (e.target as HTMLSelectElement).value || null);

// --- Mobile filter toggle ---
const showMobileFilters = ref(false);

// --- Touch swipe for calendar navigation ---
const calTouchStartX = ref(0);
const calTouchStartY = ref(0);
const calSwiping = ref(false);

const onCalTouchStart = (e: TouchEvent) => {
  calTouchStartX.value = e.touches[0].clientX;
  calTouchStartY.value = e.touches[0].clientY;
  calSwiping.value = true;
};

const onCalTouchEnd = (e: TouchEvent) => {
  if (!calSwiping.value) return;
  calSwiping.value = false;
  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;
  const diffX = endX - calTouchStartX.value;
  const diffY = endY - calTouchStartY.value;
  // Only trigger if horizontal swipe is dominant and exceeds threshold
  if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
    if (diffX > 0) navigatePrev();
    else navigateNext();
  }
};

// --- Pull to refresh handler ---
const handlePullRefresh = async (done: () => void) => {
  await store.fetchAppointments();
  done();
};

// --- Lifecycle ---
onMounted(() => {
  store.initialize();
});
</script>

<template>
  <div class="min-h-screen bg-habit-bg">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Calendario
        </h1>
        <p class="text-habit-text-subtle text-sm mt-1">
          Gestisci appuntamenti e pianifica le sessioni
        </p>
      </div>
      <button
        @click="openCreateModal()"
        class="px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 transition-colors text-sm font-medium flex items-center gap-2"
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
        Nuovo Appuntamento
      </button>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-500/10 border border-red-500/30 rounded-habit p-3 mb-4"
    >
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <!-- Toolbar -->
    <div
      class="bg-habit-card border border-habit-border rounded-habit p-3 mb-6"
    >
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <!-- Row 1: Navigation + Title + Filter icon (mobile) -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <button
              @click="navigatePrev()"
              class="p-2 rounded-habit border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-border transition-colors"
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
            </button>
            <button
              @click="goToToday()"
              class="px-3 py-1.5 text-xs text-habit-text-muted border border-habit-border rounded-habit hover:bg-habit-bg-light transition-colors"
            >
              Oggi
            </button>
            <button
              @click="navigateNext()"
              class="p-2 rounded-habit border border-habit-border text-habit-text-subtle hover:text-habit-text hover:border-habit-border transition-colors"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <span class="text-habit-text text-sm font-medium ml-2 capitalize">
              {{ calendarTitle }}
            </span>
          </div>
          <!-- Filter icon button (mobile only) -->
          <button
            @click="showMobileFilters = !showMobileFilters"
            class="sm:hidden p-2 rounded-habit border border-habit-border text-habit-text-subtle hover:text-habit-text transition-colors"
            :class="{ 'border-habit-cyan text-habit-cyan': showMobileFilters }"
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
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
        </div>

        <!-- Row 2: View toggle pills -->
        <div class="flex items-center justify-between gap-2">
          <div
            class="flex rounded-habit border border-habit-border overflow-hidden"
          >
            <button
              @click="setCalendarView('day')"
              :class="[
                'px-3 py-1.5 text-xs transition-colors',
                activeView === 'day'
                  ? 'bg-habit-cyan text-white'
                  : 'text-habit-text-subtle hover:text-habit-text',
              ]"
            >
              Giorno
            </button>
            <button
              @click="setCalendarView('week')"
              :class="[
                'px-3 py-1.5 text-xs transition-colors',
                activeView === 'week'
                  ? 'bg-habit-cyan text-white'
                  : 'text-habit-text-subtle hover:text-habit-text',
              ]"
            >
              Settimana
            </button>
            <button
              @click="setCalendarView('month')"
              :class="[
                'px-3 py-1.5 text-xs transition-colors',
                activeView === 'month'
                  ? 'bg-habit-cyan text-white'
                  : 'text-habit-text-subtle hover:text-habit-text',
              ]"
            >
              Mese
            </button>
          </div>
          <!-- Desktop filters (hidden on mobile) -->
          <div class="hidden sm:flex items-center gap-2">
            <select
              :value="filters.clientId || ''"
              @change="handleFilterClient"
              class="bg-habit-bg-light border border-habit-border rounded-habit px-2 py-1.5 text-xs text-habit-text focus:border-habit-cyan outline-none"
            >
              <option value="">Tutti i clienti</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.first_name }} {{ c.last_name }}
              </option>
            </select>
            <select
              :value="filters.trainerId || ''"
              @change="handleFilterTrainer"
              class="bg-habit-bg-light border border-habit-border rounded-habit px-2 py-1.5 text-xs text-habit-text focus:border-habit-cyan outline-none"
            >
              <option value="">Tutti i trainer</option>
              <option v-for="t in trainers" :key="t.id" :value="t.id">
                {{ t.first_name }} {{ t.last_name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Mobile filters dropdown (shown when filter icon is toggled) -->
        <div
          v-if="showMobileFilters"
          class="sm:hidden flex flex-col gap-2 pt-2 border-t border-habit-border"
        >
          <select
            :value="filters.clientId || ''"
            @change="handleFilterClient"
            class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-xs text-habit-text focus:border-habit-cyan outline-none"
          >
            <option value="">Tutti i clienti</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">
              {{ c.first_name }} {{ c.last_name }}
            </option>
          </select>
          <select
            :value="filters.trainerId || ''"
            @change="handleFilterTrainer"
            class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-xs text-habit-text focus:border-habit-cyan outline-none"
          >
            <option value="">Tutti i trainer</option>
            <option v-for="t in trainers" :key="t.id" :value="t.id">
              {{ t.first_name }} {{ t.last_name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <CalendarSkeleton v-if="loading && appointments.length === 0" />

    <!-- FullCalendar wrapped with PullToRefresh and swipe -->
    <PullToRefresh v-else @refresh="handlePullRefresh">
      <div
        class="overflow-hidden"
        @touchstart.passive="onCalTouchStart"
        @touchend="onCalTouchEnd"
      >
        <FullCalendar ref="calendarRef" :options="calendarOptions" />
      </div>
    </PullToRefresh>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-4 mt-4">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-habit-cyan"></span>
        <span class="text-habit-text-subtle text-xs">Allenamento</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
        <span class="text-habit-text-subtle text-xs">Valutazione</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
        <span class="text-habit-text-subtle text-xs">Consulenza</span>
      </div>
    </div>

    <!-- Create Appointment Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60"
          @click="showCreateModal = false"
        ></div>
        <div
          class="relative bg-habit-card border border-habit-border rounded-habit p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-habit-text font-semibold text-lg mb-4">
            Nuovo Appuntamento
          </h3>

          <div class="space-y-4">
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Cliente *</label
              >
              <select
                v-model="createForm.clientId"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              >
                <option value="">Seleziona cliente</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">
                  {{ c.first_name }} {{ c.last_name }}
                </option>
              </select>
            </div>

            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Trainer *</label
              >
              <select
                v-model="createForm.trainerId"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              >
                <option value="">Seleziona trainer</option>
                <option v-for="t in trainers" :key="t.id" :value="t.id">
                  {{ t.first_name }} {{ t.last_name }}
                </option>
              </select>
            </div>

            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Data *</label
              >
              <input
                v-model="createForm.date"
                type="date"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Ora Inizio</label
                >
                <input
                  v-model="createForm.startTime"
                  type="time"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Ora Fine</label
                >
                <input
                  v-model="createForm.endTime"
                  type="time"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
            </div>

            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Tipo</label
              >
              <select
                v-model="createForm.appointmentType"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              >
                <option value="training">Allenamento</option>
                <option value="assessment">Valutazione</option>
                <option value="consultation">Consulenza</option>
                <option value="other">Altro</option>
              </select>
            </div>

            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Luogo</label
              >
              <input
                v-model="createForm.location"
                type="text"
                placeholder="Palestra, online..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>

            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Note</label
              >
              <textarea
                v-model="createForm.notes"
                rows="2"
                placeholder="Note opzionali..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              @click="showCreateModal = false"
              class="flex-1 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="handleCreate"
              :disabled="
                isCreating ||
                !createForm.clientId ||
                !createForm.trainerId ||
                !createForm.date
              "
              class="flex-1 px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ isCreating ? "Creazione..." : "Crea" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && selectedAppointment"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60"
          @click="showDetailModal = false"
        ></div>
        <div
          class="relative bg-habit-card border border-habit-border rounded-habit p-6 w-full max-w-sm"
        >
          <div class="flex items-start justify-between mb-4">
            <h3 class="text-habit-text font-semibold text-lg">
              Dettaglio Appuntamento
            </h3>
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-xs font-medium',
                statusClass(selectedAppointment.status),
              ]"
            >
              {{ statusLabel(selectedAppointment.status) }}
            </span>
          </div>

          <div class="space-y-3">
            <div>
              <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
                Cliente
              </p>
              <p class="text-habit-text text-sm">
                {{ getClientName(selectedAppointment) }}
              </p>
            </div>
            <div>
              <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
                Trainer
              </p>
              <p class="text-habit-text text-sm">
                {{ getTrainerName(selectedAppointment) }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <p
                  class="text-habit-text-subtle text-xs uppercase tracking-wide"
                >
                  Data
                </p>
                <p class="text-habit-text text-sm">
                  {{ formatDate(selectedAppointment.start_datetime) }}
                </p>
              </div>
              <div>
                <p
                  class="text-habit-text-subtle text-xs uppercase tracking-wide"
                >
                  Orario
                </p>
                <p class="text-habit-text text-sm">
                  {{ formatTime(selectedAppointment.start_datetime) }} -
                  {{ formatTime(selectedAppointment.end_datetime) }}
                </p>
              </div>
            </div>
            <div>
              <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
                Tipo
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span
                  :class="[
                    'w-2 h-2 rounded-full',
                    typeDot(selectedAppointment.appointment_type),
                  ]"
                ></span>
                <p class="text-habit-text text-sm">
                  {{ typeLabel(selectedAppointment.appointment_type) }}
                </p>
              </div>
            </div>
            <div v-if="selectedAppointment.location">
              <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
                Luogo
              </p>
              <p class="text-habit-text text-sm">
                {{ selectedAppointment.location }}
              </p>
            </div>
            <div v-if="selectedAppointment.notes">
              <p class="text-habit-text-subtle text-xs uppercase tracking-wide">
                Note
              </p>
              <p class="text-habit-text-muted text-sm">
                {{ selectedAppointment.notes }}
              </p>
            </div>
          </div>

          <!-- Status Actions -->
          <div
            class="flex flex-wrap gap-2 mt-5 pt-4 border-t border-habit-border"
          >
            <button
              v-if="selectedAppointment.status === 'scheduled'"
              @click="handleStatusChange(selectedAppointment, 'confirmed')"
              class="px-3 py-1.5 bg-blue-600 text-white rounded-habit hover:bg-blue-500 transition-colors text-xs"
            >
              Conferma
            </button>
            <button
              v-if="
                selectedAppointment.status === 'confirmed' ||
                selectedAppointment.status === 'scheduled'
              "
              @click="handleStatusChange(selectedAppointment, 'completed')"
              class="px-3 py-1.5 bg-emerald-600 text-white rounded-habit hover:bg-emerald-500 transition-colors text-xs"
            >
              Completato
            </button>
            <button
              v-if="
                selectedAppointment.status !== 'cancelled' &&
                selectedAppointment.status !== 'completed'
              "
              @click="handleStatusChange(selectedAppointment, 'cancelled')"
              class="px-3 py-1.5 border border-red-500/50 text-red-400 rounded-habit hover:bg-red-500/10 transition-colors text-xs"
            >
              Annulla
            </button>
            <button
              @click="openDeleteModal(selectedAppointment)"
              class="px-3 py-1.5 border border-habit-border text-habit-text-subtle rounded-habit hover:text-red-400 hover:border-red-500/50 transition-colors text-xs ml-auto"
            >
              Elimina
            </button>
          </div>

          <button
            @click="showDetailModal = false"
            class="w-full mt-3 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
          >
            Chiudi
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Delete Modal -->
    <ConfirmDialog
      :open="showDeleteModal"
      title="Elimina Appuntamento"
      message="Sei sicuro? Questa azione non puo essere annullata."
      confirmText="Elimina"
      variant="danger"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<style scoped>
:deep(.fc) {
  --fc-border-color: var(--habit-border, #2a2a3e);
  --fc-today-bg-color: rgba(2, 131, 167, 0.05);
  --fc-now-indicator-color: #ef4444;
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: transparent;
  font-family: "Inter", sans-serif;
}
:deep(.fc .fc-timegrid-slot) {
  height: 3rem;
}
:deep(.fc .fc-col-header-cell) {
  background: transparent;
  border-color: var(--habit-border, #2a2a3e);
  padding: 8px 0;
}
:deep(.fc .fc-col-header-cell-cushion) {
  color: var(--habit-text-subtle, #8b8ba7);
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 500;
}
:deep(.fc .fc-daygrid-day-number),
:deep(.fc .fc-timegrid-axis-cushion) {
  color: var(--habit-text-subtle, #8b8ba7);
  font-size: 0.75rem;
}
:deep(.fc .fc-event) {
  border-radius: 6px;
  padding: 2px 4px;
  font-size: 0.75rem;
  cursor: pointer;
  border-width: 0;
  border-left-width: 3px;
}
:deep(.fc .fc-timegrid-event .fc-event-main) {
  padding: 2px 4px;
}
:deep(.fc .fc-scrollgrid) {
  border-color: var(--habit-border, #2a2a3e);
}
:deep(.fc .fc-scrollgrid td),
:deep(.fc .fc-scrollgrid th) {
  border-color: var(--habit-border, #2a2a3e);
}
:deep(.fc .fc-highlight) {
  background: rgba(2, 131, 167, 0.1);
}
:deep(.fc .fc-day-today .fc-daygrid-day-number) {
  color: #0283a7;
  font-weight: 700;
}

/* Mobile-optimized FullCalendar */
@media (max-width: 640px) {
  :deep(.fc .fc-timegrid-slot) {
    height: 2.5rem;
  }
  :deep(.fc .fc-event) {
    font-size: 0.65rem;
    padding: 1px 3px;
  }
  :deep(.fc .fc-col-header-cell-cushion) {
    font-size: 0.7rem;
  }
  :deep(.fc .fc-timegrid-slot-label) {
    font-size: 0.6rem;
  }
}
</style>
