<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";

const toast = useToast();

const stats = ref<any>({
  totalCodes: 0,
  totalConversions: 0,
  pendingConversions: 0,
  totalEarnings: 0,
});
const codes = ref<any[]>([]);
const conversions = ref<any[]>([]);
const isLoading = ref(true);
const showNewCodeModal = ref(false);
const newCodeName = ref("");
const activeTab = ref("codes");
const creatingCode = ref(false);

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  isLoading.value = true;
  try {
    const [statsRes, codesRes, convRes] = await Promise.allSettled([
      api.get("/referrals/stats"),
      api.get("/referrals/codes"),
      api.get("/referrals/conversions"),
    ]);
    if (statsRes.status === "fulfilled")
      stats.value = statsRes.value.data.data || stats.value;
    else console.error("Failed to load referral stats:", statsRes.reason);
    if (codesRes.status === "fulfilled")
      codes.value = codesRes.value.data.data || [];
    else console.error("Failed to load referral codes:", codesRes.reason);
    if (convRes.status === "fulfilled")
      conversions.value = convRes.value.data.data || [];
    else console.error("Failed to load referral conversions:", convRes.reason);
  } catch (error: any) {
    console.error("Error loading referral data:", error);
  } finally {
    isLoading.value = false;
  }
};

const generateCode = async () => {
  if (!newCodeName.value.trim()) return;
  creatingCode.value = true;
  try {
    await api.post("/referrals/codes", { name: newCodeName.value.trim() });
    toast.success("Codice referral creato!");
    newCodeName.value = "";
    showNewCodeModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Errore nella creazione");
  } finally {
    creatingCode.value = false;
  }
};

const copyCode = (code: any) => {
  navigator.clipboard.writeText(code);
  toast.success("Codice copiato negli appunti!");
};

const copyLink = (code: any) => {
  const link = `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
  navigator.clipboard.writeText(link);
  toast.success("Link referral copiato!");
};

const completeConversion = async (id: any) => {
  try {
    await api.put(`/referrals/conversions/${id}/complete`);
    toast.success("Conversione completata!");
    await loadData();
  } catch (error: any) {
    toast.error("Errore nel completamento");
  }
};

const statusLabel = (status: any) => {
  const labels: Record<string, string> = {
    pending: "In attesa",
    converted: "Convertito",
    rewarded: "Premiato",
    expired: "Scaduto",
  };
  return labels[status] || status;
};

const statusClass = (status: any) => {
  switch (status) {
    case "converted":
    case "rewarded":
      return "bg-habit-success/20 text-habit-success";
    case "pending":
      return "bg-habit-orange/20 text-habit-orange";
    default:
      return "bg-habit-skeleton text-habit-text-subtle";
  }
};
</script>

<template>
  <div class="min-h-screen bg-habit-bg space-y-4 sm:space-y-5">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Programma Referral
        </h1>
        <p class="text-habit-text-subtle mt-1">
          Invita colleghi e clienti, guadagna ricompense
        </p>
      </div>
      <button
        @click="showNewCodeModal = true"
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
        Nuovo Codice
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
        <p class="text-sm text-habit-text-subtle">Codici Creati</p>
        <p class="text-3xl font-bold text-habit-text mt-1">
          {{ stats.totalCodes || codes.length }}
        </p>
      </div>
      <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
        <p class="text-sm text-habit-text-subtle">Conversioni</p>
        <p class="text-3xl font-bold text-habit-success mt-1">
          {{ stats.totalConversions || conversions.length }}
        </p>
      </div>
      <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
        <p class="text-sm text-habit-text-subtle">In Attesa</p>
        <p class="text-3xl font-bold text-habit-orange mt-1">
          {{ stats.pendingConversions || 0 }}
        </p>
      </div>
      <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
        <p class="text-sm text-habit-text-subtle">Ricompense Totali</p>
        <p class="text-3xl font-bold text-habit-cyan mt-1">
          {{ stats.totalEarnings || 0 }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-habit-border">
      <button
        v-for="tab in [
          { id: 'codes', label: 'I miei Codici' },
          { id: 'conversions', label: 'Conversioni' },
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
      </button>
    </div>

    <!-- Codes Tab -->
    <div
      v-if="activeTab === 'codes'"
      class="bg-habit-bg border border-habit-border rounded-habit"
    >
      <div v-if="isLoading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div
            v-for="i in 3"
            :key="i"
            class="h-16 bg-habit-skeleton rounded"
          ></div>
        </div>
      </div>
      <div
        v-else-if="codes.length === 0"
        class="p-12 text-center text-habit-text-subtle"
      >
        <p class="mb-2">Nessun codice referral creato</p>
        <button
          @click="showNewCodeModal = true"
          class="text-habit-cyan hover:text-habit-orange transition-colors"
        >
          Crea il primo codice
        </button>
      </div>
      <div v-else class="divide-y divide-habit-border">
        <div
          v-for="code in codes"
          :key="code.id"
          class="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-habit-text">
              {{ code.name || "Codice Referral" }}
            </p>
            <p class="text-lg font-mono text-habit-cyan">{{ code.code }}</p>
            <p class="text-xs text-habit-text-subtle mt-1">
              Utilizzi: {{ code.uses || 0 }} | Creato:
              {{ new Date(code.created_at).toLocaleDateString("it-IT") }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="copyCode(code.code)"
              class="px-3 py-1.5 text-sm bg-habit-card border border-habit-border rounded-lg text-habit-text-muted hover:bg-habit-card-hover transition-colors"
            >
              Copia Codice
            </button>
            <button
              @click="copyLink(code.code)"
              class="px-3 py-1.5 text-sm bg-habit-cyan/20 text-habit-cyan rounded-lg hover:bg-habit-cyan/30 transition-colors"
            >
              Copia Link
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Conversions Tab -->
    <div
      v-if="activeTab === 'conversions'"
      class="bg-habit-bg border border-habit-border rounded-habit"
    >
      <div
        v-if="conversions.length === 0"
        class="p-12 text-center text-habit-text-subtle"
      >
        <p>Nessuna conversione ancora</p>
      </div>
      <div v-else class="divide-y divide-habit-border">
        <div
          v-for="conv in conversions"
          :key="conv.id"
          class="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div class="flex-1">
            <p class="text-sm font-medium text-habit-text">
              {{
                conv.referredUser?.email || conv.referredUser?.name || "Utente"
              }}
            </p>
            <p class="text-xs text-habit-text-subtle">
              Codice: {{ conv.code }} |
              {{ new Date(conv.createdAt).toLocaleDateString("it-IT") }}
            </p>
          </div>
          <span
            class="px-2 py-1 text-xs rounded-full font-medium"
            :class="statusClass(conv.status)"
            >{{ statusLabel(conv.status) }}</span
          >
          <button
            v-if="conv.status === 'pending'"
            @click="completeConversion(conv.id)"
            class="px-3 py-1 text-sm bg-habit-success/20 text-habit-success rounded-lg hover:bg-habit-success/30 transition-colors"
          >
            Completa
          </button>
        </div>
      </div>
    </div>

    <!-- New Code Modal -->
    <Teleport to="body">
      <div
        v-if="showNewCodeModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div
          class="fixed inset-0 bg-black/60"
          @click="showNewCodeModal = false"
        ></div>
        <div
          class="relative bg-habit-bg border border-habit-border rounded-2xl w-full max-w-md mx-4 p-6 space-y-4"
        >
          <h3 class="text-lg font-bold text-habit-text">
            Nuovo Codice Referral
          </h3>
          <div>
            <label class="block text-sm font-medium text-habit-text-muted mb-1"
              >Nome / Descrizione</label
            >
            <input
              v-model="newCodeName"
              type="text"
              placeholder="es. Promo Estate 2026"
              class="w-full px-4 py-2 bg-habit-card border border-habit-border rounded-habit text-habit-text placeholder-habit-text-subtle focus:outline-none focus:border-habit-cyan"
            />
          </div>
          <div class="flex gap-3 justify-end">
            <button
              @click="showNewCodeModal = false"
              class="px-4 py-2 text-sm text-habit-text-muted hover:text-habit-text transition-colors"
            >
              Annulla
            </button>
            <button
              @click="generateCode"
              :disabled="creatingCode || !newCodeName.trim()"
              class="px-4 py-2 text-sm bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all disabled:opacity-50"
            >
              {{ creatingCode ? "Creazione..." : "Crea Codice" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
