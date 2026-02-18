<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from "@headlessui/vue";
import { XMarkIcon, CheckIcon } from "@heroicons/vue/24/outline";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxClients: number;
  color: string;
  popular?: boolean;
  features: string[];
}

interface Props {
  open?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const authStore = useAuthStore();
const billingCycle = ref<"monthly" | "yearly">("monthly");
const loading = ref<string | null>(null);

const isClient = computed(() => authStore.userRole === "client");
const currentPlan = computed(
  () =>
    authStore.user?.subscription_plan ||
    authStore.user?.subscriptionPlan ||
    "free",
);

const plans = computed<Plan[]>(() => [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    yearlyPrice: 190,
    maxClients: 15,
    color: "habit-orange",
    features: [
      "Fino a 15 clienti",
      "Schede e programmi illimitati",
      "Chat con i clienti",
      "Calendario e prenotazioni",
      "Statistiche base",
    ],
  },
  {
    id: "professional",
    name: "Pro",
    monthlyPrice: 39,
    yearlyPrice: 390,
    maxClients: 50,
    color: "habit-cyan",
    popular: true,
    features: [
      "Fino a 50 clienti",
      "Tutto di Starter, e in aggiunta:",
      "Video library e corsi",
      "Nutrizione e meal planner",
      "Gamification e community",
      "Analytics avanzati",
      "AI Coach assistente",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 79,
    yearlyPrice: 790,
    maxClients: 999,
    color: "purple-500",
    features: [
      "Clienti illimitati",
      "Tutto di Pro, e in aggiunta:",
      "Multi-sede",
      "Staff con permessi personalizzati",
      "Branding personalizzato",
      "Supporto prioritario",
      "API access",
    ],
  },
]);

const getPrice = (plan: Plan): number => {
  return billingCycle.value === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
};

const getSaving = (plan: Plan): number => {
  const yearly = plan.yearlyPrice;
  const monthlyTotal = plan.monthlyPrice * 12;
  return monthlyTotal - yearly;
};

const isCurrentPlan = (planId: string): boolean => {
  return (
    currentPlan.value === planId ||
    (currentPlan.value === "pro" && planId === "professional")
  );
};

const isDowngrade = (planId: string): boolean => {
  const order = ["free", "starter", "professional", "enterprise"];
  const currentIdx = order.indexOf(
    currentPlan.value === "pro" ? "professional" : currentPlan.value,
  );
  const targetIdx = order.indexOf(planId);
  return targetIdx < currentIdx;
};

const handleUpgrade = async (plan: Plan) => {
  if (isCurrentPlan(plan.id) || isDowngrade(plan.id)) return;

  loading.value = plan.id;

  try {
    const response = await api.post("/payments/stripe/plan-upgrade", {
      plan: plan.id,
      billingCycle: billingCycle.value,
      successUrl: `${window.location.origin}/settings?upgrade=success&plan=${plan.id}`,
      cancelUrl: `${window.location.origin}/settings?upgrade=cancelled`,
    });

    if (response.data.success && response.data.data.url) {
      // Validate redirect URL is a Stripe checkout URL
      const redirectUrl = response.data.data.url;
      try {
        const parsed = new URL(redirectUrl);
        if (parsed.hostname.endsWith("stripe.com")) {
          window.location.href = redirectUrl;
        }
      } catch {
        /* invalid URL, ignore */
      }
    }
  } catch (err: unknown) {
    console.error("Errore upgrade:", err);
    const axiosErr = err as { response?: { data?: { message?: string } } };
    alert(
      axiosErr.response?.data?.message ||
        "Errore durante l'avvio del pagamento. Riprova.",
    );
  } finally {
    loading.value = null;
  }
};
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      </TransitionChild>

      <!-- Dialog container -->
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 scale-95 translate-y-2"
            enter-to="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leave-from="opacity-100 scale-100 translate-y-0"
            leave-to="opacity-0 scale-95 translate-y-2"
          >
            <DialogPanel
              class="w-full max-w-4xl bg-habit-card border border-habit-border rounded-2xl shadow-habit-lg overflow-hidden"
            >
              <!-- Header -->
              <div class="relative px-6 pt-6 pb-4">
                <button
                  @click="emit('close')"
                  class="absolute top-4 right-4 p-1.5 rounded-lg text-habit-text-muted hover:text-habit-text hover:bg-habit-bg-light transition-colors"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>

                <div class="text-center">
                  <DialogTitle class="text-2xl font-bold text-habit-text">
                    {{
                      isClient
                        ? "Scopri i piani Premium"
                        : "Scegli il piano giusto per te"
                    }}
                  </DialogTitle>
                  <p class="mt-2 text-habit-text-muted text-sm">
                    {{
                      isClient
                        ? "Chiedi al tuo trainer di passare a un piano premium per sbloccare tutte le funzionalita"
                        : "Sblocca tutte le funzionalita premium e fai crescere il tuo business"
                    }}
                  </p>

                  <!-- Billing Toggle -->
                  <div
                    class="mt-4 inline-flex items-center bg-habit-bg-light rounded-xl p-1"
                  >
                    <button
                      @click="billingCycle = 'monthly'"
                      class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                      :class="
                        billingCycle === 'monthly'
                          ? 'bg-habit-card text-habit-text shadow-sm'
                          : 'text-habit-text-muted hover:text-habit-text'
                      "
                    >
                      Mensile
                    </button>
                    <button
                      @click="billingCycle = 'yearly'"
                      class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                      :class="
                        billingCycle === 'yearly'
                          ? 'bg-habit-card text-habit-text shadow-sm'
                          : 'text-habit-text-muted hover:text-habit-text'
                      "
                    >
                      Annuale
                      <span class="ml-1 text-emerald-400 text-xs font-semibold"
                        >-17%</span
                      >
                    </button>
                  </div>
                </div>
              </div>

              <!-- Plans Grid -->
              <div class="px-6 pb-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    v-for="plan in plans"
                    :key="plan.id"
                    class="relative flex flex-col p-5 rounded-2xl border transition-all duration-200"
                    :class="[
                      plan.popular
                        ? 'border-habit-cyan/50 bg-habit-cyan/5 shadow-lg shadow-habit-cyan/10'
                        : 'border-habit-border bg-habit-bg-light/50 hover:border-habit-border-hover',
                      isCurrentPlan(plan.id)
                        ? 'ring-2 ring-habit-orange/50'
                        : '',
                    ]"
                  >
                    <!-- Popular Badge -->
                    <div
                      v-if="plan.popular"
                      class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-habit-cyan text-white text-xs font-semibold rounded-full"
                    >
                      Consigliato
                    </div>

                    <!-- Current Badge -->
                    <div
                      v-if="isCurrentPlan(plan.id)"
                      class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-habit-orange text-white text-xs font-semibold rounded-full"
                    >
                      Piano attuale
                    </div>

                    <!-- Plan Name -->
                    <h3 class="text-lg font-bold text-habit-text">
                      {{ plan.name }}
                    </h3>

                    <!-- Price -->
                    <div class="mt-2 flex items-baseline gap-1">
                      <span class="text-3xl font-bold text-habit-text"
                        >&euro;{{ getPrice(plan) }}</span
                      >
                      <span class="text-habit-text-muted text-sm"
                        >/{{
                          billingCycle === "yearly" ? "anno" : "mese"
                        }}</span
                      >
                    </div>

                    <!-- Yearly Saving -->
                    <p
                      v-if="billingCycle === 'yearly'"
                      class="mt-1 text-emerald-400 text-xs"
                    >
                      Risparmi &euro;{{ getSaving(plan) }}/anno
                    </p>

                    <!-- Features -->
                    <ul class="mt-4 space-y-2 flex-1">
                      <li
                        v-for="feature in plan.features"
                        :key="feature"
                        class="flex items-start gap-2 text-sm text-habit-text-muted"
                      >
                        <CheckIcon
                          class="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"
                        />
                        <span>{{ feature }}</span>
                      </li>
                    </ul>

                    <!-- CTA Button -->
                    <button
                      @click="handleUpgrade(plan)"
                      :disabled="
                        isCurrentPlan(plan.id) ||
                        isDowngrade(plan.id) ||
                        loading === plan.id
                      "
                      class="mt-5 w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                      :class="[
                        isCurrentPlan(plan.id)
                          ? 'bg-habit-bg-light text-habit-text-muted cursor-default border border-habit-border'
                          : isDowngrade(plan.id)
                            ? 'bg-habit-bg-light text-habit-text-subtle cursor-not-allowed border border-habit-border'
                            : plan.popular
                              ? 'bg-habit-cyan hover:bg-cyan-500 text-white shadow-sm'
                              : 'bg-habit-card hover:bg-habit-card-hover text-habit-text border border-habit-border',
                      ]"
                    >
                      <svg
                        v-if="loading === plan.id"
                        class="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        />
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <template v-if="loading === plan.id"
                        >Attendere...</template
                      >
                      <template v-else-if="isCurrentPlan(plan.id)"
                        >Piano attuale</template
                      >
                      <template v-else-if="isDowngrade(plan.id)"
                        >Downgrade</template
                      >
                      <template v-else>Passa a {{ plan.name }}</template>
                    </button>
                  </div>
                </div>

                <!-- Footer Note -->
                <p class="mt-4 text-center text-xs text-habit-text-subtle">
                  Pagamento sicuro con Stripe. Puoi cancellare in qualsiasi
                  momento.
                </p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
