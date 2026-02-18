<script setup lang="ts">
/**
 * TitleManager - Gestione titoli personalizzati (per PT)
 * Permette al Personal Trainer di creare, modificare ed eliminare titoli custom
 */
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

interface CustomTitle {
  id: number;
  title_name: string;
  title_description?: string;
  exercise_name?: string;
  category: string;
  metric_type: string;
  threshold_value: number;
  rarity: string;
}

interface TitleForm {
  title_name: string;
  title_description: string;
  exercise_name: string;
  category: string;
  metric_type: string;
  threshold_value: number;
  rarity: string;
}

const toast = useToast();

// Confirm dialog state
const showDeleteConfirm = ref(false);
const deletingTitleId = ref<number | null>(null);
const isDeletingTitle = ref(false);

const loading = ref(false);
const saving = ref(false);
const customTitles = ref<CustomTitle[]>([]);
const showCreateModal = ref(false);
const editingTitle = ref<number | null>(null);
const error = ref<string | null>(null);
const successMsg = ref("");

const form = ref<TitleForm>({
  title_name: "",
  title_description: "",
  exercise_name: "",
  category: "custom",
  metric_type: "weight_kg",
  threshold_value: 0,
  rarity: "common",
});

const categories = [
  { value: "strength", label: "Forza" },
  { value: "consistency", label: "Costanza" },
  { value: "transformation", label: "Trasformazione" },
  { value: "custom", label: "Personalizzato" },
];

const metricTypes = [
  { value: "weight_kg", label: "Peso (kg)" },
  { value: "reps", label: "Ripetizioni" },
  { value: "consecutive_days", label: "Giorni consecutivi" },
  { value: "weight_loss", label: "Perdita peso (kg)" },
  { value: "weight_gain", label: "Aumento peso (kg)" },
];

const rarities = [
  { value: "common", label: "Comune", color: "text-habit-text-subtle" },
  { value: "uncommon", label: "Non comune", color: "text-green-400" },
  { value: "rare", label: "Raro", color: "text-blue-400" },
  { value: "epic", label: "Epico", color: "text-purple-400" },
  { value: "legendary", label: "Leggendario", color: "text-yellow-400" },
];

const fetchCustomTitles = async (): Promise<void> => {
  loading.value = true;
  try {
    const response = await api.get("/titles/manage");
    customTitles.value = response.data.data?.titles || [];
  } catch (err) {
    console.error("Errore fetch titoli custom:", err);
  } finally {
    loading.value = false;
  }
};

const resetForm = (): void => {
  form.value = {
    title_name: "",
    title_description: "",
    exercise_name: "",
    category: "custom",
    metric_type: "weight_kg",
    threshold_value: 0,
    rarity: "common",
  };
  editingTitle.value = null;
};

const openCreate = (): void => {
  resetForm();
  showCreateModal.value = true;
};

const openEdit = (title: CustomTitle): void => {
  editingTitle.value = title.id;
  form.value = {
    title_name: title.title_name || "",
    title_description: title.title_description || "",
    exercise_name: title.exercise_name || "",
    category: title.category || "custom",
    metric_type: title.metric_type || "weight_kg",
    threshold_value: title.threshold_value || 0,
    rarity: title.rarity || "common",
  };
  showCreateModal.value = true;
};

const handleSave = async (): Promise<void> => {
  if (!form.value.title_name || !form.value.threshold_value) {
    error.value = "Nome titolo e soglia sono obbligatori";
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    if (editingTitle.value) {
      await api.put(`/titles/manage/${editingTitle.value}`, form.value);
      successMsg.value = "Titolo aggiornato";
    } else {
      await api.post("/titles/manage", form.value);
      successMsg.value = "Titolo creato";
    }
    showCreateModal.value = false;
    resetForm();
    await fetchCustomTitles();
    setTimeout(() => {
      successMsg.value = "";
    }, 3000);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    error.value = axiosErr.response?.data?.message || "Errore nel salvataggio";
  } finally {
    saving.value = false;
  }
};

const askDelete = (id: number): void => {
  deletingTitleId.value = id;
  showDeleteConfirm.value = true;
};

const handleDelete = async (): Promise<void> => {
  isDeletingTitle.value = true;
  try {
    await api.delete(`/titles/manage/${deletingTitleId.value}`);
    showDeleteConfirm.value = false;
    await fetchCustomTitles();
    toast.success("Titolo eliminato");
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    toast.error(axiosErr.response?.data?.message || "Errore eliminazione");
  } finally {
    isDeletingTitle.value = false;
  }
};

const getRarityColor = (r: string): string => {
  const found = rarities.find((x) => x.value === r);
  return found?.color || "text-habit-text-subtle";
};

onMounted(fetchCustomTitles);
</script>

<template>
  <div class="bg-habit-card border border-habit-border rounded-habit p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-habit-text">Gestione Titoli</h3>
      <button
        @click="openCreate"
        class="px-3 py-1.5 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 transition-colors text-sm font-medium"
      >
        + Nuovo Titolo
      </button>
    </div>

    <!-- Success banner -->
    <div
      v-if="successMsg"
      class="bg-green-500/10 border border-green-500/30 rounded-habit p-3 mb-4"
    >
      <p class="text-green-400 text-sm">{{ successMsg }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="h-16 bg-habit-skeleton rounded animate-pulse"
      ></div>
    </div>

    <!-- Empty -->
    <div v-else-if="customTitles.length === 0" class="text-center py-8">
      <div class="text-3xl mb-2">&#128081;</div>
      <p class="text-habit-text-subtle text-sm">
        Nessun titolo personalizzato creato
      </p>
      <p class="text-habit-text-subtle text-xs mt-1">
        Crea titoli per motivare i tuoi clienti
      </p>
    </div>

    <!-- Titles list -->
    <div v-else class="space-y-2">
      <div
        v-for="title in customTitles"
        :key="title.id"
        class="bg-habit-bg-light rounded-lg p-3 flex items-center gap-3"
      >
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              :class="[
                getRarityColor(title.rarity),
                'text-xs font-bold uppercase',
              ]"
            >
              {{
                rarities.find((r) => r.value === title.rarity)?.label ||
                "Comune"
              }}
            </span>
            <h4 class="text-sm font-semibold text-habit-text truncate">
              {{ title.title_name }}
            </h4>
          </div>
          <div
            class="flex items-center gap-2 text-[10px] text-habit-text-subtle mt-0.5"
          >
            <span v-if="title.exercise_name">{{ title.exercise_name }}</span>
            <span
              >{{ title.threshold_value }}
              {{
                metricTypes.find((m) => m.value === title.metric_type)?.label ||
                ""
              }}</span
            >
          </div>
        </div>
        <!-- Actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            @click="openEdit(title)"
            class="p-1.5 rounded hover:bg-habit-bg text-habit-text-subtle hover:text-habit-cyan transition text-xs"
          >
            Modifica
          </button>
          <button
            @click="askDelete(title.id)"
            class="p-1.5 rounded hover:bg-red-500/10 text-habit-text-subtle hover:text-red-400 transition text-xs"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        role="dialog"
        aria-modal="true"
        aria-label="Gestisci titolo"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="fixed inset-0 bg-black/60"
          @click="showCreateModal = false"
        ></div>
        <div
          class="bg-habit-card border border-habit-border rounded-habit w-full max-w-md relative z-10 max-h-[90vh] overflow-y-auto p-6"
        >
          <h3 class="text-lg font-bold text-habit-text mb-4">
            {{ editingTitle ? "Modifica Titolo" : "Nuovo Titolo" }}
          </h3>

          <!-- Error -->
          <div
            v-if="error"
            class="bg-red-500/10 border border-red-500/30 rounded p-2 mb-3"
          >
            <p class="text-red-400 text-sm">{{ error }}</p>
          </div>

          <div class="space-y-3">
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Nome Titolo *</label
              >
              <input
                v-model="form.title_name"
                type="text"
                placeholder="es. Re della Panca"
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Descrizione</label
              >
              <input
                v-model="form.title_description"
                type="text"
                placeholder="Descrizione opzionale..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                >Esercizio</label
              >
              <input
                v-model="form.exercise_name"
                type="text"
                placeholder="es. Panca Piana, Squat..."
                class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Categoria</label
                >
                <select
                  v-model="form.category"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                >
                  <option
                    v-for="c in categories"
                    :key="c.value"
                    :value="c.value"
                  >
                    {{ c.label }}
                  </option>
                </select>
              </div>
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Rarita</label
                >
                <select
                  v-model="form.rarity"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                >
                  <option v-for="r in rarities" :key="r.value" :value="r.value">
                    {{ r.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Tipo Metrica</label
                >
                <select
                  v-model="form.metric_type"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                >
                  <option
                    v-for="m in metricTypes"
                    :key="m.value"
                    :value="m.value"
                  >
                    {{ m.label }}
                  </option>
                </select>
              </div>
              <div>
                <label
                  class="block text-habit-text-subtle text-xs uppercase tracking-wide mb-1"
                  >Soglia *</label
                >
                <input
                  v-model.number="form.threshold_value"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="100"
                  class="w-full bg-habit-bg-light border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Modal actions -->
          <div class="flex gap-3 mt-6">
            <button
              @click="showCreateModal = false"
              class="flex-1 px-4 py-2 border border-habit-border text-habit-text-muted rounded-habit hover:bg-habit-bg-light transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="handleSave"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 disabled:opacity-40 transition-colors text-sm font-medium"
            >
              {{
                saving ? "Salvataggio..." : editingTitle ? "Aggiorna" : "Crea"
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Elimina Titolo"
      message="Sei sicuro di voler eliminare questo titolo? I progressi dei clienti associati verranno persi."
      confirmText="Elimina"
      variant="danger"
      :loading="isDeletingTitle"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
