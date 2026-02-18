<script setup lang="ts">
/**
 * MeasurementsView - Dashboard unica misurazioni corporee
 * Layout: Stats > Grafici > Confronto > Form inline > Storico
 * Stile: Apple Health inspired, Minimal/Clean
 */
import { ref, computed, onMounted } from "vue";
import { useMeasurementStore } from "@/store/measurement";
import { useToast } from "vue-toastification";
import StatsCard from "@/components/ui/StatsCard.vue";
import BodyCompositionChart from "@/components/measurements/BodyCompositionChart.vue";
import MeasurementFormCard from "@/components/measurements/MeasurementFormCard.vue";
import MeasurementComparison from "@/components/measurements/MeasurementComparison.vue";
import MeasurementHistory from "@/components/measurements/MeasurementHistory.vue";
import type { MeasurementType } from "@/types";

const toast = useToast();
const store = useMeasurementStore();

// Local state
const saving = ref<string | null>(null);
const editingRecord = ref<{
  type: MeasurementType;
  record: Record<string, any>;
} | null>(null);
const clientSearch = ref("");
const showClientDropdown = ref(false);

// Client search
const filteredClients = computed(() => {
  if (!clientSearch.value) return store.clients;
  const q = clientSearch.value.toLowerCase();
  return store.clients.filter(
    (c) =>
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q),
  );
});

const selectedClientName = computed(() => {
  if (!store.selectedClientId) return "";
  const client = store.clients.find((c) => c.id === store.selectedClientId);
  return client ? `${client.first_name} ${client.last_name}` : "";
});

const hideDropdown = () => {
  window.setTimeout(() => (showClientDropdown.value = false), 200);
};

const selectClient = async (clientId: number) => {
  showClientDropdown.value = false;
  clientSearch.value = "";
  await store.setClient(clientId);
};

// Stats cards config
const statsCards = computed(() => {
  const o = store.overview;
  const wc = store.weightChange;

  return [
    {
      label: "Peso Attuale",
      value: o?.body?.weight_kg ?? o?.anthropometric?.weight_kg ?? 0,
      suffix: "kg",
      iconEmoji: "\u2696\uFE0F",
      iconColor: "blue" as const,
      trend: wc?.percentage ?? null,
    },
    {
      label: "% Grasso",
      value:
        o?.bia?.fat_mass_pct ??
        o?.skinfold?.body_fat_percentage ??
        o?.body?.body_fat_percentage ??
        0,
      suffix: "%",
      iconEmoji: "\uD83D\uDD25",
      iconColor: "orange" as const,
      trend: null,
    },
    {
      label: "Massa Magra",
      value: o?.bia?.lean_mass_kg ?? o?.body?.muscle_mass_kg ?? 0,
      suffix: "kg",
      iconEmoji: "\uD83D\uDCAA",
      iconColor: "green" as const,
      trend: null,
    },
    {
      label: "Vita",
      value: o?.circumference?.waist_cm ?? 0,
      suffix: "cm",
      iconEmoji: "\uD83D\uDCCF",
      iconColor: "purple" as const,
      trend: null,
    },
    {
      label: "BMR",
      value: o?.bia?.basal_metabolic_rate ?? 0,
      suffix: "kcal",
      iconEmoji: "\u26A1",
      iconColor: "red" as const,
      trend: null,
    },
  ];
});

// Form save handlers
const handleFormSave = async (
  type: MeasurementType,
  data: Record<string, any>,
) => {
  saving.value = type;
  let result;

  try {
    if (editingRecord.value && editingRecord.value.type === type) {
      const id = editingRecord.value.record.id;
      switch (type) {
        case "anthropometric":
          result = await store.updateAnthropometric(id, data);
          break;
        case "body":
          result = await store.updateBody(id, data);
          break;
        case "circumferences":
          result = await store.updateCircumference(id, data);
          break;
        case "skinfolds":
          result = await store.updateSkinfold(id, data);
          break;
        case "bia":
          result = await store.updateBia(id, data);
          break;
      }
      if (result?.success) {
        toast.success("Misurazione aggiornata");
        editingRecord.value = null;
      } else {
        toast.error(result?.message || "Errore aggiornamento");
      }
    } else {
      switch (type) {
        case "anthropometric":
          result = await store.createAnthropometric(data);
          break;
        case "body":
          result = await store.createBody(data);
          break;
        case "circumferences":
          result = await store.createCircumference(data);
          break;
        case "skinfolds":
          result = await store.createSkinfold(data);
          break;
        case "bia":
          result = await store.createBia(data);
          break;
      }
      if (result?.success) {
        toast.success("Misurazione salvata");
      } else {
        toast.error(result?.message || "Errore salvataggio");
      }
    }
  } finally {
    saving.value = null;
  }
};

const handleFormCancel = () => {
  editingRecord.value = null;
};

// History edit/delete handlers
const handleHistoryEdit = (
  type: MeasurementType,
  record: Record<string, any>,
) => {
  editingRecord.value = { type, record };
  // Scroll to the form card for this type
  const el = document.getElementById(`form-${type}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

const handleHistoryDelete = async (type: MeasurementType, id: number) => {
  let result;
  switch (type) {
    case "anthropometric":
      result = await store.deleteAnthropometric(id);
      break;
    case "body":
      result = await store.deleteBody(id);
      break;
    case "circumferences":
      result = await store.deleteCircumference(id);
      break;
    case "skinfolds":
      result = await store.deleteSkinfold(id);
      break;
    case "bia":
      result = await store.deleteBia(id);
      break;
  }
  if (result?.success) {
    toast.success("Misurazione eliminata");
    if (editingRecord.value?.record?.id === id) {
      editingRecord.value = null;
    }
  } else {
    toast.error("Errore nell'eliminazione");
  }
};

// Initialize
onMounted(async () => {
  await store.initialize();
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-8 sm:pb-12">
    <!-- 1. Header -->
    <div>
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Misurazioni Corporee
      </h1>
      <p class="text-xs sm:text-sm text-habit-text-muted mt-1">
        Monitora la composizione corporea e i progressi dei tuoi clienti
      </p>
    </div>

    <!-- 2. Client Selector with search -->
    <div class="relative">
      <label class="label text-xs mb-1">Cliente</label>
      <div class="relative">
        <input
          type="text"
          class="input w-full pl-10"
          :placeholder="selectedClientName || 'Cerca cliente...'"
          :value="showClientDropdown ? clientSearch : selectedClientName"
          @focus="showClientDropdown = true"
          @input="
            clientSearch = ($event.target as HTMLInputElement).value;
            showClientDropdown = true;
          "
          @blur="hideDropdown"
        />
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <!-- Dropdown -->
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="showClientDropdown && filteredClients.length > 0"
          class="absolute z-20 mt-1 w-full bg-habit-card border border-habit-border rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          <button
            v-for="client in filteredClients"
            :key="client.id"
            class="w-full text-left px-4 py-2.5 hover:bg-habit-bg-light transition-colors text-sm text-habit-text flex items-center gap-2"
            :class="{
              'bg-habit-bg-light font-medium':
                client.id === store.selectedClientId,
            }"
            @mousedown.prevent="selectClient(client.id)"
          >
            <div
              class="w-7 h-7 rounded-full bg-habit-orange/10 flex items-center justify-center text-xs font-medium text-habit-orange"
            >
              {{ client.first_name?.[0] }}{{ client.last_name?.[0] }}
            </div>
            {{ client.first_name }} {{ client.last_name }}
          </button>
        </div>
      </transition>
    </div>

    <!-- No client selected -->
    <div v-if="!store.selectedClientId" class="card p-6 sm:p-12 text-center">
      <div class="text-3xl sm:text-4xl mb-2 sm:mb-3">📏</div>
      <h3 class="text-base sm:text-lg font-semibold text-habit-text mb-1">
        Seleziona un cliente
      </h3>
      <p class="text-xs sm:text-sm text-habit-text-muted">
        Scegli un cliente dalla ricerca per visualizzare le sue misurazioni
      </p>
    </div>

    <!-- Dashboard content (only if client selected) -->
    <template v-if="store.selectedClientId">
      <!-- 3. Stats Summary -->
      <div>
        <div
          v-if="store.overviewLoading"
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 xs:gap-3 sm:gap-4 min-w-0"
        >
          <div
            v-for="i in 5"
            :key="i"
            class="h-20 xs:h-24 bg-habit-skeleton rounded-xl animate-pulse"
          />
        </div>
        <div
          v-else
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 xs:gap-3 sm:gap-4 min-w-0"
        >
          <StatsCard
            v-for="(stat, idx) in statsCards"
            :key="stat.label"
            :value="stat.value"
            :label="stat.label"
            :suffix="stat.suffix"
            :icon-emoji="stat.iconEmoji"
            :icon-color="stat.iconColor"
            :trend="stat.trend"
            :animate="true"
            :delay="idx * 0.1"
          />
        </div>
      </div>

      <!-- 4. Charts -->
      <div class="card p-3 xs:p-4 sm:p-6">
        <h3
          class="text-sm sm:text-base font-semibold text-habit-text mb-3 sm:mb-4"
        >
          Andamento
        </h3>
        <BodyCompositionChart
          :body-measurements="store.bodyMeasurements"
          :bia-measurements="store.biaMeasurements"
          :skinfolds="store.skinfolds"
          :circumferences="store.circumferences"
          :loading="store.bodyLoading || store.biaLoading"
        />
      </div>

      <!-- 5. Comparison Card -->
      <MeasurementComparison />

      <!-- 6. Measurement Forms (all 5 expanded) -->
      <div>
        <h3
          class="text-sm sm:text-base font-semibold text-habit-text mb-2 sm:mb-3"
        >
          Inserisci Misurazioni
        </h3>
        <div class="space-y-2 sm:space-y-3">
          <div id="form-anthropometric">
            <MeasurementFormCard
              type="anthropometric"
              title="Antropometria"
              accent-color="#3b82f6"
              icon-emoji="📏"
              :saving="saving === 'anthropometric'"
              :editing-record="
                editingRecord?.type === 'anthropometric'
                  ? editingRecord.record
                  : null
              "
              @save="(data) => handleFormSave('anthropometric', data)"
              @cancel="handleFormCancel"
              @delete="(id) => handleHistoryDelete('anthropometric', id)"
            />
          </div>
          <div id="form-body">
            <MeasurementFormCard
              type="body"
              title="Peso & Composizione"
              accent-color="#06b6d4"
              icon-emoji="⚖️"
              :saving="saving === 'body'"
              :editing-record="
                editingRecord?.type === 'body' ? editingRecord.record : null
              "
              @save="(data) => handleFormSave('body', data)"
              @cancel="handleFormCancel"
              @delete="(id) => handleHistoryDelete('body', id)"
            />
          </div>
          <div id="form-circumferences">
            <MeasurementFormCard
              type="circumferences"
              title="Circonferenze"
              accent-color="#22c55e"
              icon-emoji="📐"
              :saving="saving === 'circumferences'"
              :editing-record="
                editingRecord?.type === 'circumferences'
                  ? editingRecord.record
                  : null
              "
              @save="(data) => handleFormSave('circumferences', data)"
              @cancel="handleFormCancel"
              @delete="(id) => handleHistoryDelete('circumferences', id)"
            />
          </div>
          <div id="form-skinfolds">
            <MeasurementFormCard
              type="skinfolds"
              title="Plicometria"
              accent-color="#f97316"
              icon-emoji="🔬"
              :saving="saving === 'skinfolds'"
              :editing-record="
                editingRecord?.type === 'skinfolds'
                  ? editingRecord.record
                  : null
              "
              @save="(data) => handleFormSave('skinfolds', data)"
              @cancel="handleFormCancel"
              @delete="(id) => handleHistoryDelete('skinfolds', id)"
            />
          </div>
          <div id="form-bia">
            <MeasurementFormCard
              type="bia"
              title="BIA (Bioimpedenza)"
              accent-color="#8b5cf6"
              icon-emoji="🧪"
              :saving="saving === 'bia'"
              :editing-record="
                editingRecord?.type === 'bia' ? editingRecord.record : null
              "
              @save="(data) => handleFormSave('bia', data)"
              @cancel="handleFormCancel"
              @delete="(id) => handleHistoryDelete('bia', id)"
            />
          </div>
        </div>
      </div>

      <!-- 7. History Timeline -->
      <MeasurementHistory
        :anthropometric="store.anthropometric"
        :body-measurements="store.bodyMeasurements"
        :circumferences="store.circumferences"
        :skinfolds="store.skinfolds"
        :bia-measurements="store.biaMeasurements"
        @edit="handleHistoryEdit"
        @delete="handleHistoryDelete"
      />
    </template>
  </div>
</template>
