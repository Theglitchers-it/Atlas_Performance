<script setup lang="ts">
import { ref, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { formatDate, formatDateISO } from "@/composables/useFormatters";
import {
  INJURY_SEVERITY_OPTIONS,
  INJURY_STATUS_OPTIONS,
  type Injury,
  type InjurySeverity,
  type InjuryStatus,
} from "@/types";

const severityLabelMap = Object.fromEntries(
  INJURY_SEVERITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<InjurySeverity, string>;

const statusLabelMap = Object.fromEntries(
  INJURY_STATUS_OPTIONS.map((o) => [o.value, o.label]),
) as Record<InjuryStatus, string>;

const props = defineProps<{
  clientId: number;
  injuries: Injury[];
}>();

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const toast = useToast();

const showAddForm = ref(false);
const saving = ref(false);

const form = ref({
  bodyPart: "",
  description: "",
  severity: "mild" as InjurySeverity,
  injuryDate: formatDateISO(new Date()),
  notes: "",
});

const severityLabel = (s: InjurySeverity) => severityLabelMap[s] || s;

const severityClass = (s: InjurySeverity) => {
  if (s === "severe") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (s === "moderate")
    return "bg-habit-orange/15 text-habit-orange border-habit-orange/30";
  return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
};

const statusLabel = (s: InjuryStatus) => statusLabelMap[s] || s;

const statusClass = (s: string) => {
  if (s === "recovered")
    return "bg-habit-success/15 text-habit-success border-habit-success/30";
  if (s === "recovering")
    return "bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};

const openAdd = () => {
  showAddForm.value = true;
  form.value = {
    bodyPart: "",
    description: "",
    severity: "mild",
    injuryDate: formatDateISO(new Date()),
    notes: "",
  };
};

const cancelAdd = () => {
  showAddForm.value = false;
};

const saveInjury = async () => {
  if (!form.value.bodyPart.trim() || saving.value) return;
  saving.value = true;
  try {
    await api.post(`/clients/${props.clientId}/injuries`, {
      bodyPart: form.value.bodyPart.trim(),
      description: form.value.description || null,
      severity: form.value.severity,
      injuryDate: form.value.injuryDate || null,
      notes: form.value.notes || null,
    });
    toast.success("Infortunio registrato");
    showAddForm.value = false;
    emit("changed");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};

const removeInjury = async (injuryId: number) => {
  if (!confirm("Eliminare questo infortunio?")) return;
  try {
    await api.delete(`/clients/${props.clientId}/injuries/${injuryId}`);
    toast.success("Eliminato");
    emit("changed");
  } catch {
    toast.error("Errore");
  }
};

const updateStatus = async (
  injuryId: number,
  status: InjuryStatus,
) => {
  try {
    await api.put(`/clients/${props.clientId}/injuries/${injuryId}/status`, {
      status,
    });
    toast.success("Stato aggiornato");
    emit("changed");
  } catch {
    toast.error("Errore");
  }
};

const activeInjuries = computed(() =>
  props.injuries.filter((i) => i.status !== "recovered"),
);
const recoveredInjuries = computed(() =>
  props.injuries.filter((i) => i.status === "recovered"),
);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-semibold text-habit-text">Infortuni</h4>
      <button
        v-if="!showAddForm"
        @click="openAdd"
        class="text-xs text-habit-cyan hover:text-habit-orange transition-colors"
      >
        + Registra infortunio
      </button>
    </div>

    <!-- Form nuovo infortunio -->
    <div
      v-if="showAddForm"
      class="p-3 bg-habit-bg border border-habit-border rounded-lg mb-3 space-y-3"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1"
            >Zona *</label
          >
          <input
            v-model="form.bodyPart"
            type="text"
            placeholder="es. ginocchio destro"
            required
            class="w-full px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded focus:outline-none focus:border-habit-cyan"
          />
        </div>
        <div>
          <label class="block text-xs text-habit-text-subtle mb-1"
            >Severita</label
          >
          <select
            v-model="form.severity"
            class="w-full px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded focus:outline-none focus:border-habit-cyan"
          >
            <option v-for="opt in INJURY_SEVERITY_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs text-habit-text-subtle mb-1">Data</label>
        <input
          v-model="form.injuryDate"
          type="date"
          class="w-full px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded focus:outline-none focus:border-habit-cyan"
        />
      </div>
      <div>
        <label class="block text-xs text-habit-text-subtle mb-1"
          >Descrizione</label
        >
        <textarea
          v-model="form.description"
          rows="2"
          placeholder="Dinamica, causa, zona precisa..."
          class="w-full px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded focus:outline-none focus:border-habit-cyan resize-none"
        ></textarea>
      </div>
      <div>
        <label class="block text-xs text-habit-text-subtle mb-1"
          >Note cliniche</label
        >
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="Fisioterapia, farmaci, movimenti da evitare..."
          class="w-full px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded focus:outline-none focus:border-habit-cyan resize-none"
        ></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button
          @click="cancelAdd"
          type="button"
          class="px-3 py-1.5 text-xs text-habit-text-subtle hover:text-habit-text"
        >
          Annulla
        </button>
        <button
          @click="saveInjury"
          :disabled="!form.bodyPart.trim() || saving"
          class="px-3 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded hover:bg-habit-orange disabled:opacity-50"
        >
          {{ saving ? "Salvataggio..." : "Salva" }}
        </button>
      </div>
    </div>

    <!-- Lista infortuni -->
    <div
      v-if="injuries.length === 0 && !showAddForm"
      class="text-xs text-habit-text-subtle py-2"
    >
      Nessun infortunio registrato.
    </div>

    <ul v-else-if="injuries.length > 0" class="space-y-2">
      <li
        v-for="inj in [...activeInjuries, ...recoveredInjuries]"
        :key="inj.id"
        class="p-2.5 bg-habit-bg border border-habit-border rounded-lg"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-habit-text capitalize">
                {{ inj.body_part }}
              </span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase"
                :class="severityClass(inj.severity)"
              >
                {{ severityLabel(inj.severity) }}
              </span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full border"
                :class="statusClass(inj.status)"
              >
                {{ statusLabel(inj.status) }}
              </span>
            </div>
            <p
              v-if="inj.description"
              class="text-xs text-habit-text-subtle mt-1"
            >
              {{ inj.description }}
            </p>
            <p
              v-if="inj.injury_date"
              class="text-[11px] text-habit-text-subtle mt-1"
            >
              Data: {{ formatDate(inj.injury_date) }}
            </p>
          </div>
          <div class="flex flex-col gap-1 text-[11px]">
            <select
              :value="inj.status"
              @change="
                updateStatus(
                  inj.id,
                  ($event.target as HTMLSelectElement).value as InjuryStatus,
                )
              "
              class="px-1.5 py-0.5 bg-habit-card border border-habit-border rounded text-habit-text focus:outline-none"
            >
              <option v-for="opt in INJURY_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <button
              @click="removeInjury(inj.id)"
              class="text-red-400 hover:text-red-500"
            >
              Elimina
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
