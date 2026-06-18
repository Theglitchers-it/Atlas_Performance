<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import SubscriptionRenewalModal from "@/components/scadenze/SubscriptionRenewalModal.vue";
import { formatDate, daysFromNow } from "@/composables/useFormatters";
import type { ActionItem } from "@/types";

interface Subscription {
  id: number;
  client_id: number;
  plan_type: string | null;
  amount: number | null;
  currency: string;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  start_date: string | null;
  end_date: string | null;
  status: "active" | "paused" | "cancelled" | "expired";
  notes: string | null;
  created_at: string;
}

const props = defineProps<{
  clientId: number;
  clientFirstName: string;
  clientLastName: string;
}>();

const toast = useToast();
const subscriptions = ref<Subscription[]>([]);
const loading = ref(true);

const loadSubscriptions = async () => {
  loading.value = true;
  const res = await api
    .get("/payments/subscriptions", { params: { clientId: props.clientId } })
    .catch(() => null);
  if (res?.data?.data) {
    subscriptions.value =
      res.data.data.subscriptions || res.data.data.items || [];
  }
  loading.value = false;
};

onMounted(loadSubscriptions);

const statusClass = (s: string) => {
  if (s === "active") return "bg-habit-success/20 text-habit-success";
  if (s === "paused") return "bg-habit-orange/20 text-habit-orange";
  if (s === "expired") return "bg-red-500/20 text-red-400";
  return "bg-habit-skeleton text-habit-text-subtle";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    active: "Attivo",
    paused: "In pausa",
    cancelled: "Annullato",
    expired: "Scaduto",
  };
  return map[s] || s;
};

const daysLeft = daysFromNow;

const activeSubscription = computed(() =>
  subscriptions.value.find((s) => s.status === "active"),
);

// Modal rinnovo
const showRenewal = ref(false);
const renewalItem = ref<ActionItem | null>(null);

const openRenewal = (sub?: Subscription) => {
  renewalItem.value = {
    client_id: props.clientId,
    first_name: props.clientFirstName,
    last_name: props.clientLastName,
    badge: "RINNOVO",
    action_type: "subscription_expiring",
    message: sub
      ? `Rinnova ${sub.plan_type || "abbonamento"}`
      : "Nuovo abbonamento",
    urgency: 0,
    meta: sub
      ? {
          subscription_id: sub.id,
          plan_type: sub.plan_type || undefined,
          end_date: sub.end_date || undefined,
        }
      : {},
  };
  showRenewal.value = true;
};

const onSaved = () => {
  showRenewal.value = false;
  renewalItem.value = null;
  loadSubscriptions();
  toast.success("Aggiornato");
};

const cancelSub = async (id: number) => {
  if (!confirm("Annullare questo abbonamento?")) return;
  try {
    await api.put(`/payments/subscriptions/${id}/cancel`);
    toast.success("Abbonamento annullato");
    loadSubscriptions();
  } catch (err: unknown) {
    toast.error("Errore durante l'annullamento");
  }
};
</script>

<template>
  <div class="space-y-4">
    <!-- Header con CTA -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-habit-text">
          Storico abbonamenti
        </h3>
        <p class="text-xs text-habit-text-subtle mt-0.5">
          <span v-if="activeSubscription">
            Piano attivo:
            <span class="text-habit-text font-medium">{{
              activeSubscription.plan_type
            }}</span>
            —
            <span
              v-if="daysLeft(activeSubscription.end_date) !== null"
              :class="
                (daysLeft(activeSubscription.end_date) ?? 0) <= 14
                  ? 'text-habit-orange font-medium'
                  : 'text-habit-text-subtle'
              "
            >
              scade tra {{ daysLeft(activeSubscription.end_date) }} giorni
            </span>
          </span>
          <span v-else>Nessun abbonamento attivo</span>
        </p>
      </div>
      <button
        @click="openRenewal()"
        class="px-3 py-1.5 bg-habit-cyan text-white text-xs font-medium rounded-lg hover:bg-habit-orange transition-colors"
      >
        + Nuovo abbonamento
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-3">
      <div
        v-for="i in 2"
        :key="i"
        class="h-16 bg-habit-skeleton rounded-lg"
      ></div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="subscriptions.length === 0"
      class="bg-habit-bg border border-habit-border rounded-lg p-6 text-center text-habit-text-subtle"
    >
      <p class="text-sm">Nessun abbonamento registrato</p>
      <p class="text-xs mt-1">
        Crea il primo abbonamento con il bottone in alto
      </p>
    </div>

    <!-- Lista -->
    <ul v-else class="space-y-2">
      <li
        v-for="sub in subscriptions"
        :key="sub.id"
        class="bg-habit-bg border border-habit-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-habit-text">
              {{ sub.plan_type || "Senza nome" }}
            </span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold"
              :class="statusClass(sub.status)"
            >
              {{ statusLabel(sub.status) }}
            </span>
            <span
              v-if="sub.amount"
              class="text-xs text-habit-text-subtle"
            >
              €{{ sub.amount }} / {{ sub.billing_cycle }}
            </span>
          </div>
          <p class="text-xs text-habit-text-subtle mt-0.5">
            {{ formatDate(sub.start_date) }} → {{ formatDate(sub.end_date) }}
            <span
              v-if="sub.status === 'active' && daysLeft(sub.end_date) !== null"
              :class="
                (daysLeft(sub.end_date) ?? 0) <= 14
                  ? 'text-habit-orange'
                  : 'text-habit-text-subtle'
              "
            >
              · {{ daysLeft(sub.end_date) }} giorni rimanenti
            </span>
          </p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button
            v-if="sub.status === 'active'"
            @click="openRenewal(sub)"
            class="px-3 py-1.5 bg-habit-cyan/20 text-habit-cyan text-xs font-medium rounded-lg hover:bg-habit-cyan hover:text-white transition-colors"
          >
            Rinnova
          </button>
          <button
            v-if="sub.status === 'active'"
            @click="cancelSub(sub.id)"
            class="px-3 py-1.5 bg-habit-bg border border-habit-border text-red-400 text-xs rounded-lg hover:border-red-400 transition-colors"
          >
            Annulla
          </button>
        </div>
      </li>
    </ul>

    <!-- Modale rinnovo -->
    <SubscriptionRenewalModal
      v-if="showRenewal && renewalItem"
      :item="renewalItem"
      @close="showRenewal = false"
      @saved="onSaved"
    />
  </div>
</template>
