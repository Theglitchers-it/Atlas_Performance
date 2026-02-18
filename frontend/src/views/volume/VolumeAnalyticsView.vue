<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";

const toast = useToast();

const clients = ref<any[]>([]);
const selectedClientId = ref("");
const volumeData = ref<any[]>([]);
const priorities = ref<any[]>([]);
const plateauAlerts = ref<any[]>([]);
const isLoading = ref(false);
const activeTab = ref("volume");
const showPriorityModal = ref(false);
const priorityForm = ref({
  muscle_group_id: "",
  priority_level: "medium",
  notes: "",
});
const muscleGroups = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await api.get("/clients", { params: { limit: 100 } });
    clients.value = res.data.data?.clients || [];
  } catch (e: any) {
    console.error("Error loading clients:", e);
  }
  // Load muscle groups
  try {
    const res = await api.get("/exercises/muscle-groups");
    muscleGroups.value = res.data.data || [];
  } catch (e: any) {
    muscleGroups.value = [];
  }
});

watch(selectedClientId, async (id: any) => {
  if (id) await loadClientVolume(id);
});

const loadClientVolume = async (clientId: any) => {
  isLoading.value = true;
  try {
    const [volRes, priRes, platRes] = await Promise.allSettled([
      api.get(`/volume/${clientId}`),
      api.get(`/volume/${clientId}/priorities`),
      api.get(`/volume/${clientId}/plateau`),
    ]);
    if (volRes.status === "fulfilled")
      volumeData.value = volRes.value.data.data || [];
    if (priRes.status === "fulfilled")
      priorities.value = priRes.value.data.data || [];
    if (platRes.status === "fulfilled")
      plateauAlerts.value = platRes.value.data.data || [];
  } catch (error: any) {
    console.error("Error loading volume:", error);
  } finally {
    isLoading.value = false;
  }
};

const calculateWeekly = async () => {
  if (!selectedClientId.value) return;
  try {
    await api.post(`/volume/${selectedClientId.value}/calculate`);
    toast.success("Volume settimanale calcolato!");
    await loadClientVolume(selectedClientId.value);
  } catch (error: any) {
    toast.error("Errore nel calcolo");
  }
};

const addPriority = async () => {
  if (!selectedClientId.value || !priorityForm.value.muscle_group_id) return;
  try {
    await api.post(
      `/volume/${selectedClientId.value}/priorities`,
      priorityForm.value,
    );
    toast.success("Priorita aggiunta!");
    showPriorityModal.value = false;
    priorityForm.value = {
      muscle_group_id: "",
      priority_level: "medium",
      notes: "",
    };
    await loadClientVolume(selectedClientId.value);
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Errore");
  }
};

const removePriority = async (muscleGroupId: any) => {
  if (!selectedClientId.value) return;
  try {
    await api.delete(
      `/volume/${selectedClientId.value}/priorities/${muscleGroupId}`,
    );
    toast.success("Priorita rimossa");
    await loadClientVolume(selectedClientId.value);
  } catch (error: any) {
    toast.error("Errore nella rimozione");
  }
};

const getVolumeColor = (sets: any) => {
  if (sets >= 20) return "text-habit-red";
  if (sets >= 15) return "text-habit-orange";
  if (sets >= 10) return "text-habit-success";
  return "text-habit-text-subtle";
};

const getVolumeBarWidth = (sets: any) => {
  return Math.min((sets / 25) * 100, 100) + "%";
};

const priorityLabelMap: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Bassa",
};
const priorityClassMap: Record<string, string> = {
  high: "bg-habit-red/20 text-habit-red",
  medium: "bg-habit-orange/20 text-habit-orange",
  low: "bg-habit-success/20 text-habit-success",
};
</script>

<template>
  <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Volume Analytics
        </h1>
        <p class="text-habit-text-subtle mt-1">
          Tracking volume per gruppo muscolare e mesociclo
        </p>
      </div>
    </div>

    <!-- Client Selector -->
    <div class="flex flex-col sm:flex-row gap-4">
      <select
        v-model="selectedClientId"
        class="flex-1 px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan"
      >
        <option value="">Seleziona un cliente...</option>
        <option v-for="c in clients" :key="c.id" :value="c.id">
          {{ c.first_name }} {{ c.last_name }}
        </option>
      </select>
      <button
        v-if="selectedClientId"
        @click="calculateWeekly"
        class="px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all"
      >
        Calcola Volume Settimana
      </button>
    </div>

    <template v-if="selectedClientId">
      <!-- Tabs -->
      <div class="flex gap-2 border-b border-habit-border">
        <button
          v-for="tab in [
            { id: 'volume', label: 'Volume per Muscolo' },
            { id: 'priorities', label: 'Carenze / Priorita' },
            { id: 'plateau', label: 'Plateau' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="
            activeTab === tab.id
              ? 'border-habit-cyan text-habit-cyan'
              : 'border-transparent text-habit-text-muted hover:text-habit-text'
          "
        >
          {{ tab.label }}
          <span
            v-if="tab.id === 'plateau' && plateauAlerts.length"
            class="ml-1 px-1.5 py-0.5 text-xs bg-habit-red/20 text-habit-red rounded-full"
            >{{ plateauAlerts.length }}</span
          >
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div
          v-for="i in 5"
          :key="i"
          class="animate-pulse h-12 bg-habit-skeleton rounded"
        ></div>
      </div>

      <!-- Volume Tab -->
      <div
        v-else-if="activeTab === 'volume'"
        class="bg-habit-bg border border-habit-border rounded-habit"
      >
        <div
          v-if="volumeData.length === 0"
          class="p-12 text-center text-habit-text-subtle"
        >
          <p>Nessun dato di volume disponibile</p>
          <p class="text-sm mt-1">Calcola il volume settimanale per iniziare</p>
        </div>
        <div v-else class="divide-y divide-habit-border">
          <div
            v-for="item in volumeData"
            :key="item.muscle_group || item.muscle_group_id"
            class="p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-habit-text">{{
                item.muscle_group_name || item.muscle_group
              }}</span>
              <span
                class="text-sm font-bold"
                :class="getVolumeColor(item.total_sets || item.sets)"
                >{{ item.total_sets || item.sets || 0 }} serie</span
              >
            </div>
            <div class="w-full bg-habit-skeleton rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-500"
                :class="
                  (item.total_sets || item.sets) >= 20
                    ? 'bg-habit-red'
                    : (item.total_sets || item.sets) >= 15
                      ? 'bg-habit-orange'
                      : 'bg-habit-cyan'
                "
                :style="{
                  width: getVolumeBarWidth(item.total_sets || item.sets),
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Priorities Tab -->
      <div v-else-if="activeTab === 'priorities'" class="space-y-4">
        <div class="flex justify-end">
          <button
            @click="showPriorityModal = true"
            class="px-4 py-2 text-sm bg-habit-cyan/20 text-habit-cyan rounded-habit hover:bg-habit-cyan/30 transition-colors"
          >
            + Aggiungi Priorita
          </button>
        </div>
        <div class="bg-habit-bg border border-habit-border rounded-habit">
          <div
            v-if="priorities.length === 0"
            class="p-12 text-center text-habit-text-subtle"
          >
            <p>Nessuna priorita muscolare impostata</p>
          </div>
          <div v-else class="divide-y divide-habit-border">
            <div
              v-for="p in priorities"
              :key="p.muscle_group_id"
              class="p-4 flex items-center justify-between"
            >
              <div>
                <span class="text-sm font-medium text-habit-text">{{
                  p.muscle_group_name || p.name
                }}</span>
                <span
                  class="ml-2 px-2 py-0.5 text-xs rounded-full"
                  :class="
                    priorityClassMap[p.priority_level] ||
                    'bg-habit-skeleton text-habit-text-subtle'
                  "
                  >{{
                    priorityLabelMap[p.priority_level] || p.priority_level
                  }}</span
                >
                <p v-if="p.notes" class="text-xs text-habit-text-subtle mt-1">
                  {{ p.notes }}
                </p>
              </div>
              <button
                @click="removePriority(p.muscle_group_id)"
                class="text-habit-text-subtle hover:text-habit-red transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Plateau Tab -->
      <div
        v-else-if="activeTab === 'plateau'"
        class="bg-habit-bg border border-habit-border rounded-habit"
      >
        <div
          v-if="plateauAlerts.length === 0"
          class="p-12 text-center text-habit-text-subtle"
        >
          <p>Nessun plateau rilevato - ottimo!</p>
        </div>
        <div v-else class="divide-y divide-habit-border">
          <div
            v-for="alert in plateauAlerts"
            :key="alert.id || alert.muscle_group"
            class="p-4"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 bg-habit-orange/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <svg
                  class="w-4 h-4 text-habit-orange"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-habit-text">
                  {{
                    alert.muscle_group_name ||
                    alert.muscle_group ||
                    "Gruppo muscolare"
                  }}
                </p>
                <p class="text-xs text-habit-text-subtle mt-1">
                  {{
                    alert.message ||
                    alert.description ||
                    "Plateau nella progressione rilevato. Considerare la modifica dei parametri di allenamento."
                  }}
                </p>
                <p
                  v-if="alert.weeks_stagnant"
                  class="text-xs text-habit-orange mt-1"
                >
                  Stagnante da {{ alert.weeks_stagnant }} settimane
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="bg-habit-bg border border-habit-border rounded-habit p-12 text-center text-habit-text-subtle"
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p>Seleziona un cliente per visualizzare le analytics di volume</p>
    </div>

    <!-- Priority Modal -->
    <Teleport to="body">
      <div
        v-if="showPriorityModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div
          class="fixed inset-0 bg-black/60"
          @click="showPriorityModal = false"
        ></div>
        <div
          class="relative bg-habit-bg border border-habit-border rounded-2xl w-full max-w-md mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-lg font-bold text-habit-text">
            Aggiungi Priorita Muscolare
          </h3>
          <div class="space-y-3">
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Gruppo Muscolare</label
              >
              <select
                v-model="priorityForm.muscle_group_id"
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan"
              >
                <option value="">Seleziona...</option>
                <option v-for="mg in muscleGroups" :key="mg.id" :value="mg.id">
                  {{ mg.name }}
                </option>
              </select>
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Livello Priorita</label
              >
              <select
                v-model="priorityForm.priority_level"
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text focus:outline-none focus:border-habit-cyan"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Bassa</option>
              </select>
            </div>
            <div>
              <label
                class="block text-sm font-medium text-habit-text-muted mb-1"
                >Note</label
              >
              <textarea
                v-model="priorityForm.notes"
                rows="2"
                class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan resize-none"
                placeholder="Note sulla carenza..."
              ></textarea>
            </div>
          </div>
          <div class="flex gap-3 justify-end">
            <button
              @click="showPriorityModal = false"
              class="px-4 py-2 text-sm text-habit-text-muted"
            >
              Annulla
            </button>
            <button
              @click="addPriority"
              :disabled="!priorityForm.muscle_group_id"
              class="px-4 py-2 text-sm bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all disabled:opacity-50"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
