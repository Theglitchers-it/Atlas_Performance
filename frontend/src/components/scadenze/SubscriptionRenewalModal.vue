<script setup lang="ts">
import { ref, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { formatDateISO } from "@/composables/useFormatters";
import type { ActionItem } from "@/types";

const props = defineProps<{
  item: ActionItem;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const toast = useToast();

const saving = ref(false);

const planType = ref(props.item.meta?.plan_type || "Premium");
const billingCycle = ref<"monthly" | "quarterly" | "yearly">("monthly");
const amount = ref<number | null>(null);

const cycleDays = computed(() => {
  if (billingCycle.value === "quarterly") return 90;
  if (billingCycle.value === "yearly") return 365;
  return 30;
});

// Default: se sub in scadenza esiste, parti dal giorno dopo la scadenza attuale.
// Altrimenti parte da oggi.
const existingEnd = props.item.meta?.end_date
  ? new Date(props.item.meta.end_date)
  : null;
const today = new Date();
const baseStart = existingEnd && existingEnd > today
  ? new Date(existingEnd.getTime() + 24 * 60 * 60 * 1000)
  : today;

const startDate = ref(formatDateISO(baseStart));
const endDate = ref(
  formatDateISO(
    new Date(baseStart.getTime() + cycleDays.value * 24 * 60 * 60 * 1000),
  ),
);
const notes = ref("");

// Quando cambia ciclo, ricalcola endDate
const recalcEnd = () => {
  const start = new Date(startDate.value);
  const end = new Date(start.getTime() + cycleDays.value * 24 * 60 * 60 * 1000);
  endDate.value = formatDateISO(end);
};

const handleSubmit = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    await api.post("/payments/subscriptions", {
      clientId: props.item.client_id,
      planType: planType.value,
      amount: amount.value || null,
      currency: "EUR",
      billingCycle: billingCycle.value,
      startDate: startDate.value,
      endDate: endDate.value,
      notes: notes.value || null,
    });
    toast.success("Abbonamento rinnovato");
    emit("saved");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore durante il rinnovo";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-habit-card border border-habit-border rounded-habit max-w-lg w-full max-h-[90vh] overflow-y-auto"
    >
      <div class="p-5 border-b border-habit-border flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-habit-text">
            Rinnova abbonamento
          </h3>
          <p class="text-xs text-habit-text-subtle mt-0.5">
            {{ item.first_name }} {{ item.last_name }} —
            {{ item.message }}
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 hover:bg-habit-card-hover rounded-lg transition-colors"
          aria-label="Chiudi"
        >
          <svg
            class="w-5 h-5 text-habit-text-subtle"
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

      <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Tipo piano</label
          >
          <input
            v-model="planType"
            type="text"
            required
            placeholder="es. Premium, Base, Elite"
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Ciclo</label
            >
            <select
              v-model="billingCycle"
              @change="recalcEnd"
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            >
              <option value="monthly">Mensile</option>
              <option value="quarterly">Trimestrale</option>
              <option value="yearly">Annuale</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Importo (€)</label
            >
            <input
              v-model.number="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Opzionale"
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Data inizio</label
            >
            <input
              v-model="startDate"
              type="date"
              required
              @change="recalcEnd"
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Data fine</label
            >
            <input
              v-model="endDate"
              type="date"
              required
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Note (opzionale)</label
          >
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Es. pagato in contanti, rate, ecc."
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan resize-none"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm text-habit-text-subtle hover:text-habit-text transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 bg-habit-cyan text-white text-sm font-medium rounded-lg hover:bg-habit-orange transition-colors disabled:opacity-50"
          >
            {{ saving ? "Salvataggio..." : "Rinnova abbonamento" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
