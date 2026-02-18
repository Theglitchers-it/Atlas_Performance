<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { MapPinIcon } from "@heroicons/vue/24/outline";

const toast = useToast();

const locations = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const editingLocation = ref<any>(null);
const form = ref<any>({
  name: "",
  address: "",
  city: "",
  phone: "",
  notes: "",
  is_active: true,
});

// Confirm dialog state
const showDeleteConfirm = ref(false);
const deletingId = ref<any>(null);
const isDeleting = ref(false);

onMounted(async () => {
  await loadLocations();
});

const loadLocations = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/locations");
    locations.value = res.data.data?.locations || res.data.data || [];
  } catch (error: any) {
    console.error("Error loading locations:", error);
  } finally {
    isLoading.value = false;
  }
};

const openCreateModal = () => {
  editingLocation.value = null;
  form.value = {
    name: "",
    address: "",
    city: "",
    phone: "",
    notes: "",
    is_active: true,
  };
  showModal.value = true;
};

const openEditModal = (loc: any) => {
  editingLocation.value = loc;
  form.value = {
    name: loc.name,
    address: loc.address || "",
    city: loc.city || "",
    phone: loc.phone || "",
    notes: loc.notes || "",
    is_active: loc.is_active !== false,
  };
  showModal.value = true;
};

const saveLocation = async () => {
  try {
    if (editingLocation.value) {
      await api.put(`/locations/${editingLocation.value.id}`, form.value);
      toast.success("Sede aggiornata");
    } else {
      await api.post("/locations", form.value);
      toast.success("Sede creata");
    }
    showModal.value = false;
    await loadLocations();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Errore nel salvataggio");
  }
};

const askDeleteLocation = (id: any) => {
  deletingId.value = id;
  showDeleteConfirm.value = true;
};

const confirmDeleteLocation = async () => {
  isDeleting.value = true;
  try {
    await api.delete(`/locations/${deletingId.value}`);
    toast.success("Sede eliminata");
    showDeleteConfirm.value = false;
    await loadLocations();
  } catch (error: any) {
    toast.error("Errore nella cancellazione");
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Gestione Sedi
        </h1>
        <p class="text-habit-text-subtle mt-1">
          {{ locations.length }} sedi configurate
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="flex sm:inline-flex items-center justify-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300 w-full sm:w-auto"
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
        Nuova Sede
      </button>
    </div>

    <!-- Locations Grid -->
    <div v-if="isLoading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse bg-habit-bg border border-habit-border rounded-habit p-6"
      >
        <div class="h-5 bg-habit-skeleton rounded w-1/2 mb-3"></div>
        <div class="h-4 bg-habit-skeleton rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
      </div>
    </div>

    <EmptyState
      v-else-if="locations.length === 0"
      :icon="MapPinIcon"
      title="Nessuna sede configurata"
      description="Aggiungi la tua prima sede per gestire le attivita' in piu' location."
      actionText="Nuova Sede"
      @action="openCreateModal"
    />

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="loc in locations"
        :key="loc.id"
        class="bg-habit-bg border border-habit-border rounded-habit p-6 hover:border-habit-cyan/50 transition-colors"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :class="
                loc.is_active !== false
                  ? 'bg-habit-cyan/20'
                  : 'bg-habit-skeleton'
              "
            >
              <svg
                class="w-5 h-5"
                :class="
                  loc.is_active !== false
                    ? 'text-habit-cyan'
                    : 'text-habit-text-subtle'
                "
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-habit-text">{{ loc.name }}</h3>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="
                  loc.is_active !== false
                    ? 'bg-habit-success/20 text-habit-success'
                    : 'bg-habit-skeleton text-habit-text-subtle'
                "
              >
                {{ loc.is_active !== false ? "Attiva" : "Inattiva" }}
              </span>
            </div>
          </div>
          <div class="flex gap-1">
            <button
              @click="openEditModal(loc)"
              class="p-1.5 text-habit-text-subtle hover:text-habit-cyan transition-colors"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="askDeleteLocation(loc.id)"
              class="p-1.5 text-habit-text-subtle hover:text-habit-red transition-colors"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="space-y-1 text-sm text-habit-text-muted">
          <p v-if="loc.address">{{ loc.address }}</p>
          <p v-if="loc.city">{{ loc.city }}</p>
          <p v-if="loc.phone">{{ loc.phone }}</p>
        </div>
        <p v-if="loc.notes" class="mt-2 text-xs text-habit-text-subtle italic">
          {{ loc.notes }}
        </p>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="fixed inset-0 bg-black/60" @click="showModal = false"></div>
        <div
          class="relative bg-habit-bg border border-habit-border rounded-2xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-lg font-bold text-habit-text">
            {{ editingLocation ? "Modifica Sede" : "Nuova Sede" }}
          </h3>
          <div class="space-y-3">
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Nome *</label
              >
              <input
                v-model="form.name"
                type="text"
                placeholder="es. Palestra Centro"
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
              />
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Indirizzo</label
              >
              <input
                v-model="form.address"
                type="text"
                placeholder="Via Roma 1"
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1"
                  >Citta</label
                >
                <input
                  v-model="form.city"
                  type="text"
                  placeholder="Milano"
                  class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-habit-text-muted mb-1"
                  >Telefono</label
                >
                <input
                  v-model="form.phone"
                  type="text"
                  placeholder="+39..."
                  class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Note</label
              >
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Note aggiuntive..."
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan resize-none"
              ></textarea>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.is_active"
                type="checkbox"
                class="w-4 h-4 rounded border-habit-border text-habit-cyan focus:ring-habit-cyan"
              />
              <span class="text-sm text-habit-text-muted">Sede attiva</span>
            </label>
          </div>
          <div class="flex gap-3 justify-end">
            <button
              @click="showModal = false"
              class="px-4 py-2 text-sm text-habit-text-muted hover:text-habit-text transition-colors"
            >
              Annulla
            </button>
            <button
              @click="saveLocation"
              :disabled="!form.name.trim()"
              class="px-4 py-2 text-sm bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all disabled:opacity-50"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Elimina Sede"
      message="Sei sicuro di voler eliminare questa sede? Questa azione non puo' essere annullata."
      confirmText="Elimina"
      variant="danger"
      :loading="isDeleting"
      @confirm="confirmDeleteLocation"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
