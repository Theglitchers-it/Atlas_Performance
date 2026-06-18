<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import HeroGlassCard from "@/components/ui/HeroGlassCard.vue";
import { MapPinIcon, PhoneIcon, MapIcon, EnvelopeIcon, UsersIcon, UserCircleIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/store/auth";

const toast = useToast();
const authStore = useAuthStore();
const isReadOnly = computed(() => authStore.user?.role === "client");
const pageTitle = computed(() =>
  isReadOnly.value ? "Le nostre sedi" : "Gestione Sedi"
);
const pageSubtitle = computed(() => {
  if (isReadOnly.value) {
    return locations.value.length === 1
      ? "Dove ci alleniamo"
      : `${locations.value.length} sedi dove ci alleniamo`;
  }
  return `${locations.value.length} sedi configurate`;
});
const emptyDescription = computed(() =>
  isReadOnly.value
    ? "Le sedi non sono ancora state pubblicate. Riprova piu tardi."
    : "Aggiungi la tua prima sede per gestire le attivita in piu location."
);

const locations = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const editingLocation = ref<any>(null);
const form = ref<any>({
  name: "",
  location_type: "main",
  address: "",
  city: "",
  postal_code: "",
  province: "",
  phone: "",
  email: "",
  capacity: "",
  notes: "",
  is_active: true,
});

const LOCATION_TYPE_OPTIONS = [
  { value: "main", label: "Sede principale" },
  { value: "branch", label: "Filiale" },
  { value: "popup", label: "Pop-up / Stagionale" },
  { value: "external", label: "Partner esterno" },
];
const locationTypeLabel = (t: string) =>
  LOCATION_TYPE_OPTIONS.find((o) => o.value === t)?.label || "Sede principale";
const locationTypeBadgeClass = (t: string) => {
  switch (t) {
    case "branch":
      return "bg-habit-cyan/15 text-habit-cyan";
    case "popup":
      return "bg-purple-500/15 text-purple-500 dark:text-purple-400";
    case "external":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "main":
    default:
      return "bg-habit-orange/15 text-habit-orange";
  }
};

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

// === Staff per sede (lazy-load on expand) ===
interface LocationStaff { user_id: number; first_name: string; last_name: string; role_at_location: string; is_primary?: number | boolean }
const staffByLocation = ref<Record<number, LocationStaff[]>>({});
const loadingStaffFor = ref<number | null>(null);
const expandedStaffFor = ref<Set<number>>(new Set());

const toggleStaff = async (locationId: number) => {
  if (expandedStaffFor.value.has(locationId)) {
    expandedStaffFor.value.delete(locationId);
    expandedStaffFor.value = new Set(expandedStaffFor.value);
    return;
  }
  expandedStaffFor.value.add(locationId);
  expandedStaffFor.value = new Set(expandedStaffFor.value);
  // Carica solo se non già fetchato
  if (staffByLocation.value[locationId]) return;
  loadingStaffFor.value = locationId;
  try {
    const res = await api.get(`/locations/${locationId}/staff`);
    const data = res.data?.data || [];
    staffByLocation.value = { ...staffByLocation.value, [locationId]: Array.isArray(data) ? data : [] };
  } catch {
    staffByLocation.value = { ...staffByLocation.value, [locationId]: [] };
  } finally {
    loadingStaffFor.value = null;
  }
};

const ROLE_AT_LOC_LABELS: Record<string, string> = {
  owner: "Titolare",
  manager: "Manager",
  trainer: "Trainer",
  nutritionist: "Nutrizionista",
  front_desk: "Reception",
};

const openCreateModal = () => {
  editingLocation.value = null;
  form.value = {
    name: "",
    location_type: "main",
    address: "",
    city: "",
    postal_code: "",
    province: "",
    phone: "",
    email: "",
    capacity: "",
    notes: "",
    is_active: true,
  };
  showModal.value = true;
};

const openEditModal = (loc: any) => {
  editingLocation.value = loc;
  form.value = {
    name: loc.name,
    location_type: loc.location_type || "main",
    address: loc.address || "",
    city: loc.city || "",
    postal_code: loc.postal_code || "",
    province: loc.province || "",
    phone: loc.phone || "",
    email: loc.email || "",
    capacity: loc.capacity ?? "",
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
    <!-- Hero header glass-mesh 2026 -->
    <HeroGlassCard mb="mb-0">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-habit-cyan/15 flex items-center justify-center flex-shrink-0">
            <MapIcon class="w-6 h-6 text-habit-cyan" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
              {{ pageTitle }}
            </h1>
            <p class="text-habit-text-subtle text-sm mt-0.5">
              {{ pageSubtitle }}
            </p>
          </div>
        </div>
        <button
          v-if="!isReadOnly"
          @click="openCreateModal"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-habit-orange to-amber-500 text-white rounded-2xl hover:shadow-lg hover:shadow-habit-orange/30 transition-all duration-300 text-sm font-semibold w-full sm:w-auto"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuova Sede
        </button>
      </div>
    </HeroGlassCard>

    <!-- Locations Grid -->
    <div v-if="isLoading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 sm:p-6"
      >
        <div class="h-5 bg-habit-skeleton rounded w-1/2 mb-3"></div>
        <div class="h-4 bg-habit-skeleton rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
      </div>
    </div>

    <EmptyState
      v-else-if="locations.length === 0"
      :icon="MapPinIcon"
      :title="isReadOnly ? 'Nessuna sede disponibile' : 'Nessuna sede configurata'"
      :description="emptyDescription"
      :actionText="isReadOnly ? undefined : 'Nuova Sede'"
      @action="!isReadOnly && openCreateModal()"
    />

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="loc in locations"
        :key="loc.id"
        class="relative overflow-hidden bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 sm:p-6 hover:border-habit-cyan/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300"
      >
        <div class="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-habit-cyan/10 blur-3xl"></div>
        <div class="relative">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-11 h-11 rounded-2xl flex items-center justify-center"
                :class="
                  loc.is_active !== false
                    ? 'bg-habit-cyan/15'
                    : 'bg-habit-skeleton'
                "
              >
                <MapPinIcon
                  class="w-5 h-5"
                  :class="
                    loc.is_active !== false
                      ? 'text-habit-cyan'
                      : 'text-habit-text-subtle'
                  "
                />
              </div>
              <div>
                <h3 class="font-semibold text-habit-text leading-tight">{{ loc.name }}</h3>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span
                    class="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold"
                    :class="
                      loc.is_active !== false
                        ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'
                        : 'bg-habit-skeleton text-habit-text-subtle'
                    "
                  >
                    {{ loc.is_active !== false ? "Attiva" : "Inattiva" }}
                  </span>
                  <span
                    v-if="loc.location_type"
                    class="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold"
                    :class="locationTypeBadgeClass(loc.location_type)"
                  >
                    {{ locationTypeLabel(loc.location_type) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="!isReadOnly" class="flex gap-1">
              <button
                @click="openEditModal(loc)"
                aria-label="Modifica sede"
                class="p-1.5 rounded-lg text-habit-text-subtle hover:text-habit-cyan hover:bg-habit-cyan/10 transition-colors"
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
                aria-label="Elimina sede"
                class="p-1.5 rounded-lg text-habit-text-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors"
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
          <div class="space-y-1.5 text-sm text-habit-text-muted">
            <p v-if="loc.address || loc.city" class="flex items-start gap-2">
              <MapPinIcon class="w-4 h-4 text-habit-text-subtle mt-0.5 flex-shrink-0" />
              <span>
                <template v-if="loc.address">{{ loc.address }}<br /></template>
                <span v-if="loc.postal_code || loc.city || loc.province" class="text-xs">
                  <template v-if="loc.postal_code">{{ loc.postal_code }} </template>
                  <template v-if="loc.city">{{ loc.city }}</template>
                  <template v-if="loc.province"> ({{ loc.province }})</template>
                </span>
              </span>
            </p>
            <a
              v-if="loc.phone"
              :href="`tel:${loc.phone}`"
              class="flex items-center gap-2 hover:text-habit-cyan transition-colors"
            >
              <PhoneIcon class="w-4 h-4 text-habit-text-subtle flex-shrink-0" />
              <span>{{ loc.phone }}</span>
            </a>
            <a
              v-if="loc.email"
              :href="`mailto:${loc.email}`"
              class="flex items-center gap-2 hover:text-habit-cyan transition-colors break-all"
            >
              <EnvelopeIcon class="w-4 h-4 text-habit-text-subtle flex-shrink-0" />
              <span>{{ loc.email }}</span>
            </a>
            <p v-if="loc.capacity" class="flex items-center gap-2">
              <UsersIcon class="w-4 h-4 text-habit-text-subtle flex-shrink-0" />
              <span>{{ loc.capacity }} posti</span>
            </p>
          </div>
          <p v-if="!isReadOnly && loc.notes" class="mt-3 pt-3 border-t border-habit-border text-xs text-habit-text-subtle italic">
            {{ loc.notes }}
          </p>

          <!-- Toggle "Mostra staff" + lista -->
          <div class="mt-3 pt-3 border-t border-habit-border">
            <button
              type="button"
              @click="toggleStaff(loc.id)"
              class="text-xs font-medium text-habit-cyan hover:text-habit-orange transition-colors inline-flex items-center gap-1.5"
            >
              <UserCircleIcon class="w-4 h-4" />
              <span>{{ expandedStaffFor.has(loc.id) ? 'Nascondi staff' : 'Chi allena qui' }}</span>
            </button>

            <div v-if="expandedStaffFor.has(loc.id)" class="mt-3 space-y-1.5">
              <div v-if="loadingStaffFor === loc.id" class="text-xs text-habit-text-subtle">
                Caricamento staff&hellip;
              </div>
              <div v-else-if="!staffByLocation[loc.id] || staffByLocation[loc.id].length === 0" class="text-xs text-habit-text-subtle italic">
                Nessuno staff assegnato a questa sede.
              </div>
              <ul v-else class="space-y-1.5">
                <li
                  v-for="s in staffByLocation[loc.id]"
                  :key="s.user_id"
                  class="flex items-center justify-between text-xs bg-habit-bg-light/40 rounded-lg px-2.5 py-1.5"
                >
                  <span class="text-habit-text font-medium">{{ s.first_name }} {{ s.last_name }}</span>
                  <span class="flex items-center gap-1.5">
                    <span class="text-habit-text-subtle">{{ ROLE_AT_LOC_LABELS[s.role_at_location] || s.role_at_location }}</span>
                    <span v-if="s.is_primary" class="text-[10px] px-1.5 py-0.5 rounded-full bg-habit-orange/15 text-habit-orange font-bold">
                      Primaria
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
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
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Nome *</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="es. Atlas Lamezia Studio"
                  class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Tipo</label>
                <select
                  v-model="form.location_type"
                  class="w-full px-3 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan text-sm"
                >
                  <option v-for="opt in LOCATION_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-habit-text-muted mb-1">Indirizzo</label>
              <input
                v-model="form.address"
                type="text"
                placeholder="Via Roma 1"
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
              />
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-sm font-medium text-habit-text-muted mb-1">CAP</label>
                <input
                  v-model="form.postal_code"
                  type="text"
                  maxlength="10"
                  placeholder="88046"
                  class="w-full px-3 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
              <div class="col-span-1">
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Citta</label>
                <input
                  v-model="form.city"
                  type="text"
                  placeholder="Lamezia Terme"
                  class="w-full px-3 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Provincia</label>
                <input
                  v-model="form.province"
                  type="text"
                  maxlength="100"
                  placeholder="CZ"
                  class="w-full px-3 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan uppercase"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Capacita</label>
                <input
                  v-model.number="form.capacity"
                  type="number"
                  min="0"
                  placeholder="30"
                  class="w-full px-3 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Telefono</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  placeholder="+39 0968 123456"
                  class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-habit-text-muted mb-1">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="lamezia@miostudio.it"
                  class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-habit-text-muted mb-1">Note</label>
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Orari speciali, accessi, indicazioni..."
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
