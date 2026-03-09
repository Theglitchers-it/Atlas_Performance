<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useProgramStore } from "@/store/program";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

const props = defineProps<{ clientId: number | string }>();

const router = useRouter();
const today = new Date().toISOString().split("T")[0];
const store = useProgramStore();
const toast = useToast();

// Modal state
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const deletingProgram = ref<any>(null);
const isDeleting = ref(false);
const isCreating = ref(false);
const initialized = ref(false);

// Create form
const createForm = ref<any>({
  name: "",
  description: "",
  startDate: "",
  weeks: 4,
  daysPerWeek: 3,
});

// Computed
const programs = computed(() => store.programs);
const loading = computed(() => store.loading);
const error = computed(() => store.error);
const pagination = computed(() => store.pagination);
const totalPages = computed(() => pagination.value.totalPages || 1);

// Helpers
const statusLabel = (status: any) => {
  const labels: Record<string, string> = {
    draft: "Bozza",
    active: "Attivo",
    completed: "Completato",
    cancelled: "Annullato",
  };
  return labels[status] || status || "-";
};

const statusClass = (status: any) => {
  const classes: Record<string, string> = {
    draft: "bg-yellow-500/15 text-yellow-400",
    active: "bg-emerald-500/15 text-emerald-400",
    completed: "bg-blue-500/15 text-blue-400",
    cancelled: "bg-red-500/15 text-red-400",
  };
  return classes[status] || "bg-habit-skeleton/50 text-habit-text-subtle";
};

const formatDate = (dateStr: any) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const handleFilterStatus = (e: any) => {
  store.setFilter("status", e.target.value || null);
};

const openCreateModal = () => {
  createForm.value = {
    name: "",
    description: "",
    startDate: "",
    weeks: 4,
    daysPerWeek: 3,
  };
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!createForm.value.name) return;
  isCreating.value = true;
  const result = (await store.createProgram({
    name: createForm.value.name,
    clientId: parseInt(String(props.clientId)),
    description: createForm.value.description || null,
    startDate: createForm.value.startDate || null,
    weeks: parseInt(createForm.value.weeks) || 4,
    daysPerWeek: parseInt(createForm.value.daysPerWeek) || 3,
  })) as any;
  isCreating.value = false;
  if (result.success) {
    showCreateModal.value = false;
    toast.success("Programma creato con successo");
    if (result.id) router.push(`/programs/${result.id}`);
  } else {
    toast.error(result.error || "Errore durante la creazione del programma");
  }
};

const openDeleteModal = (program: any) => {
  deletingProgram.value = program;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!deletingProgram.value) return;
  isDeleting.value = true;
  const result = (await store.deleteProgram(deletingProgram.value.id)) as any;
  isDeleting.value = false;
  if (result.success) {
    showDeleteModal.value = false;
    deletingProgram.value = null;
    toast.success("Programma eliminato con successo");
  } else {
    toast.error(result.error || "Errore durante l'eliminazione del programma");
  }
};

const handleStatusChange = async (programId: any, newStatus: any) => {
  const result = (await store.updateStatus(programId, newStatus)) as any;
  if (result && result.success) {
    toast.success("Stato del programma aggiornato");
  } else {
    toast.error(result?.error || "Errore durante l'aggiornamento dello stato");
  }
};

const prevPage = () => {
  if (pagination.value.page > 1) store.setPage(pagination.value.page - 1);
};

const nextPage = () => {
  if (pagination.value.page < totalPages.value)
    store.setPage(pagination.value.page + 1);
};

const initPrograms = async () => {
  if (initialized.value) return;
  initialized.value = true;
  store.filters.clientId = Number(props.clientId);
  store.filters.status = null;
  store.pagination.page = 1;
  await store.fetchPrograms();
};

onMounted(() => {
  initPrograms();
});
</script>

<template>
  <div>
    <!-- Header row -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <select
          :value="store.filters.status || ''"
          @change="handleFilterStatus"
          class="bg-habit-bg-light border border-habit-border rounded-habit px-2.5 py-1.5 text-xs text-habit-text focus:border-habit-cyan outline-none"
        >
          <option value="">Tutti gli stati</option>
          <option value="draft">Bozza</option>
          <option value="active">Attivo</option>
          <option value="completed">Completato</option>
          <option value="cancelled">Annullato</option>
        </select>
      </div>
      <button
        @click="openCreateModal"
        class="px-3 py-1.5 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 transition-colors text-xs font-medium flex items-center gap-1.5"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuovo Programma
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-habit p-3 mb-4">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-16 bg-habit-skeleton rounded-lg animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="programs.length === 0" class="text-center py-8 text-habit-text-subtle">
      <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
      <p class="text-sm mb-3">Nessun programma per questo cliente</p>
      <button
        @click="openCreateModal"
        class="px-4 py-1.5 bg-habit-cyan text-white text-sm rounded-habit hover:bg-cyan-500 transition-colors"
      >
        Crea il primo programma
      </button>
    </div>

    <!-- Programs List -->
    <div v-else class="space-y-2.5">
      <div
        v-for="program in programs"
        :key="program.id"
        class="bg-habit-bg-light border border-habit-border rounded-lg p-3.5 hover:border-habit-cyan/30 transition-colors"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <router-link
              :to="`/programs/${program.id}`"
              class="text-habit-text font-medium text-sm hover:text-habit-cyan transition-colors block truncate"
            >
              {{ program.name }}
            </router-link>
            <div class="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-habit-text-subtle">
              <span v-if="program.weeks">{{ program.weeks }} sett.</span>
              <span v-if="program.days_per_week">{{ program.days_per_week }} gg/sett</span>
              <span v-if="program.start_date">Dal {{ formatDate(program.start_date) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span :class="['px-2 py-0.5 rounded-full text-[10px] font-medium', statusClass(program.status)]">
              {{ statusLabel(program.status) }}
            </span>
            <div class="flex items-center gap-0.5">
              <button
                v-if="program.status === 'draft'"
                @click="handleStatusChange(program.id, 'active')"
                class="p-1 text-habit-text-subtle hover:text-emerald-400 transition-colors"
                title="Attiva"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                v-if="program.status === 'active'"
                @click="handleStatusChange(program.id, 'completed')"
                class="p-1 text-habit-text-subtle hover:text-blue-400 transition-colors"
                title="Completa"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <router-link
                :to="`/programs/${program.id}`"
                class="p-1 text-habit-text-subtle hover:text-habit-cyan transition-colors"
                title="Dettaglio"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </router-link>
              <button
                @click="openDeleteModal(program)"
                class="p-1 text-habit-text-subtle hover:text-red-400 transition-colors"
                title="Elimina"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && programs.length > 0 && totalPages > 1" class="flex items-center justify-between mt-4">
      <p class="text-habit-text-subtle text-xs">
        Pagina {{ pagination.page }} di {{ totalPages }} ({{ pagination.total }} programmi)
      </p>
      <div class="flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="pagination.page <= 1"
          class="p-1.5 rounded-habit border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          @click="nextPage"
          :disabled="pagination.page >= totalPages"
          class="p-1.5 rounded-habit border border-habit-border text-habit-text-subtle hover:text-habit-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" @click="showCreateModal = false"></div>
        <div class="relative bg-habit-card border border-habit-border rounded-habit p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 class="text-habit-text font-semibold text-lg mb-4">Nuovo Programma</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1">Nome Programma *</label>
              <input
                v-model="createForm.name"
                type="text"
                placeholder="Es. Ipertrofia Fase 1"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div>
              <label class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1">Descrizione</label>
              <textarea
                v-model="createForm.description"
                rows="2"
                placeholder="Descrizione opzionale..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none resize-none"
              ></textarea>
            </div>
            <div>
              <label class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1">Data Inizio</label>
              <input
                v-model="createForm.startDate"
                type="date"
                :min="today"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1">Settimane</label>
                <input
                  v-model.number="createForm.weeks"
                  type="number"
                  min="1"
                  max="52"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
              <div>
                <label class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1">Giorni/Sett</label>
                <input
                  v-model.number="createForm.daysPerWeek"
                  type="number"
                  min="1"
                  max="7"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
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
              :disabled="isCreating || !createForm.name"
              class="flex-1 px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ isCreating ? "Creazione..." : "Crea Programma" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Modal -->
    <ConfirmDialog
      :open="showDeleteModal"
      title="Elimina Programma"
      :message="'Sei sicuro di voler eliminare ' + (deletingProgram?.name || 'questo programma') + '? Questa azione non puo essere annullata.'"
      confirmText="Elimina"
      variant="danger"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
