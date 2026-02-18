<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface PermissionCategory {
  key: string;
  label: string;
  description: string;
}

interface PermissionSet {
  read: boolean;
  write: boolean;
  delete: boolean;
}

const toast = useToast();

const staffMembers = ref<StaffMember[]>([]);
const isLoading = ref<boolean>(true);
const selectedStaff = ref<StaffMember | null>(null);
const showModal = ref<boolean>(false);

const permissionCategories: PermissionCategory[] = [
  {
    key: "clients",
    label: "Gestione Clienti",
    description: "Visualizza, crea, modifica clienti",
  },
  {
    key: "workouts",
    label: "Schede Allenamento",
    description: "Crea e assegna schede",
  },
  {
    key: "programs",
    label: "Programmi",
    description: "Gestione programmi multi-settimana",
  },
  { key: "nutrition", label: "Nutrizione", description: "Piani alimentari" },
  {
    key: "payments",
    label: "Pagamenti",
    description: "Visualizza e gestisci pagamenti",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Dashboard e reportistica",
  },
  { key: "chat", label: "Chat", description: "Messaggistica con clienti" },
  {
    key: "booking",
    label: "Booking",
    description: "Calendario e appuntamenti",
  },
  { key: "videos", label: "Video", description: "Libreria video e corsi" },
  { key: "community", label: "Community", description: "Post e moderazione" },
  {
    key: "settings",
    label: "Impostazioni",
    description: "Configurazione tenant",
  },
];

const staffPermissions = ref<Record<string, PermissionSet>>({});

onMounted(async () => {
  await loadStaff();
});

const loadStaff = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/users", { params: { role: "staff" } });
    staffMembers.value = res.data.data?.users || res.data.data || [];
  } catch (error) {
    console.error("Error loading staff:", error);
    staffMembers.value = [];
  } finally {
    isLoading.value = false;
  }
};

const openPermissions = async (staff: StaffMember) => {
  selectedStaff.value = staff;
  // Load permissions for this staff member
  const perms: Record<string, PermissionSet> = {};
  permissionCategories.forEach((cat) => {
    perms[cat.key] = { read: true, write: false, delete: false };
  });
  try {
    const res = await api.get(`/users/${staff.id}/permissions`);
    const saved = res.data.data || {};
    Object.keys(saved).forEach((key) => {
      if (perms[key]) perms[key] = saved[key];
    });
  } catch (e) {
    // Use defaults
  }
  staffPermissions.value = perms;
  showModal.value = true;
};

const savePermissions = async () => {
  if (!selectedStaff.value) return;
  try {
    await api.put(`/users/${selectedStaff.value.id}/permissions`, {
      permissions: staffPermissions.value,
    });
    toast.success("Permessi aggiornati");
    showModal.value = false;
  } catch (error) {
    toast.error("Errore nel salvataggio permessi");
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Permessi Staff
        </h1>
        <p class="text-habit-text-subtle mt-1">
          Configura i permessi per i collaboratori
        </p>
      </div>
      <router-link
        to="/settings"
        class="inline-flex items-center px-4 py-2 bg-habit-card border border-habit-border text-habit-text rounded-habit hover:bg-habit-card-hover transition-all"
      >
        <svg
          class="w-4 h-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Impostazioni
      </router-link>
    </div>

    <!-- Staff List -->
    <div class="bg-habit-bg border border-habit-border rounded-habit">
      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 3" :key="i" class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-habit-skeleton rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
              <div class="h-3 bg-habit-skeleton rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="staffMembers.length === 0"
        class="p-12 text-center text-habit-text-subtle"
      >
        <svg
          class="w-12 h-12 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <p>Nessun membro staff trovato</p>
        <p class="text-sm mt-1">Aggiungi staff dal pannello impostazioni</p>
      </div>
      <div v-else class="divide-y divide-habit-border">
        <div
          v-for="staff in staffMembers"
          :key="staff.id"
          class="p-4 flex items-center justify-between hover:bg-habit-card-hover transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-habit-cyan/20 rounded-full flex items-center justify-center"
            >
              <span class="text-habit-cyan font-medium text-sm"
                >{{ staff.first_name?.charAt(0)
                }}{{ staff.last_name?.charAt(0) }}</span
              >
            </div>
            <div>
              <p class="text-sm font-medium text-habit-text">
                {{ staff.first_name }} {{ staff.last_name }}
              </p>
              <p class="text-xs text-habit-text-subtle">{{ staff.email }}</p>
            </div>
          </div>
          <button
            @click="openPermissions(staff)"
            class="px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-cyan hover:bg-habit-card-hover transition-colors"
          >
            Configura Permessi
          </button>
        </div>
      </div>
    </div>

    <!-- Permissions Modal -->
    <Teleport to="body">
      <div
        v-if="showModal && selectedStaff"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="fixed inset-0 bg-black/60" @click="showModal = false"></div>
        <div
          class="relative bg-habit-bg border border-habit-border rounded-2xl w-full max-w-2xl mx-4 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-habit-text">
                Permessi - {{ selectedStaff.first_name }}
                {{ selectedStaff.last_name }}
              </h3>
              <p class="text-sm text-habit-text-subtle">
                {{ selectedStaff.email }}
              </p>
            </div>
            <button
              @click="showModal = false"
              class="text-habit-text-subtle hover:text-habit-text"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div
              class="grid grid-cols-4 gap-2 px-4 text-xs font-medium text-habit-text-subtle uppercase"
            >
              <span>Sezione</span>
              <span class="text-center">Lettura</span>
              <span class="text-center">Scrittura</span>
              <span class="text-center">Elimina</span>
            </div>
            <div
              v-for="cat in permissionCategories"
              :key="cat.key"
              class="grid grid-cols-4 gap-2 items-center p-3 bg-habit-card rounded-xl border border-habit-border"
            >
              <div>
                <p class="text-sm font-medium text-habit-text">
                  {{ cat.label }}
                </p>
                <p class="text-xs text-habit-text-subtle">
                  {{ cat.description }}
                </p>
              </div>
              <div class="flex justify-center">
                <input
                  v-model="staffPermissions[cat.key].read"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-cyan focus:ring-habit-cyan"
                />
              </div>
              <div class="flex justify-center">
                <input
                  v-model="staffPermissions[cat.key].write"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-orange focus:ring-habit-orange"
                />
              </div>
              <div class="flex justify-center">
                <input
                  v-model="staffPermissions[cat.key].delete"
                  type="checkbox"
                  class="w-4 h-4 rounded border-habit-border text-habit-red focus:ring-habit-red"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-3 justify-end pt-2">
            <button
              @click="showModal = false"
              class="px-4 py-2 text-sm text-habit-text-muted hover:text-habit-text transition-colors"
            >
              Annulla
            </button>
            <button
              @click="savePermissions"
              class="px-4 py-2 text-sm bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all"
            >
              Salva Permessi
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
