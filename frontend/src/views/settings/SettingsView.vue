<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/store/auth";
import { useRouter, useRoute } from "vue-router";
import api from "@/services/api";
import UpgradeModal from "@/components/ui/UpgradeModal.vue";

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
}

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

// Local state
const successMessage = ref<string>("");
const errorMessage = ref<string>("");
const users = ref<TeamMember[]>([]);
const usersLoading = ref<boolean>(false);
const showUpgradeModal = ref<boolean>(false);

// Computed
const user = computed(() => auth.user);
const isTenantOwner = computed(
  () => auth.user?.role === "tenant_owner" || auth.user?.role === "super_admin",
);

const canUpgrade = computed<boolean>(() => {
  const plan = (auth.user as any)?.subscription_plan || "free";
  return (
    auth.user?.role === "tenant_owner" && ["free", "starter"].includes(plan)
  );
});

const planLabel = computed<string>(() => {
  const labels: Record<string, string> = {
    free: "Gratuito",
    starter: "Starter",
    professional: "Pro",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  const plan = (auth.user as any)?.subscription_plan || "";
  return labels[plan] || plan || "Gratuito";
});

const planBadgeClass = computed<string>(() => {
  const classes: Record<string, string> = {
    free: "bg-gray-500/15 text-habit-text-subtle",
    starter: "bg-blue-500/15 text-blue-400",
    professional: "bg-habit-cyan/15 text-habit-cyan",
    pro: "bg-habit-cyan/15 text-habit-cyan",
    enterprise: "bg-purple-500/15 text-purple-400",
  };
  const plan = (auth.user as any)?.subscription_plan || "";
  return classes[plan] || "bg-gray-500/15 text-habit-text-subtle";
});

const statusLabel = computed<string>(() => {
  const labels: Record<string, string> = {
    active: "Attivo",
    trial: "Prova",
    past_due: "Scaduto",
    cancelled: "Cancellato",
  };
  const status = (auth.user as any)?.subscription_status || "";
  return labels[status] || status || "Prova";
});

const statusBadgeClass = computed<string>(() => {
  const classes: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400",
    trial: "bg-yellow-500/15 text-yellow-400",
    past_due: "bg-red-500/15 text-red-400",
    cancelled: "bg-red-500/15 text-red-400",
  };
  const status = (auth.user as any)?.subscription_status || "";
  return classes[status] || "bg-yellow-500/15 text-yellow-400";
});

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Fetch team members
const fetchUsers = async () => {
  if (!isTenantOwner.value) return;
  usersLoading.value = true;
  try {
    const response = await api.get("/users", { params: { limit: 50 } });
    users.value = response.data.data.users || [];
  } catch (err) {
    console.error("Errore caricamento utenti:", err);
  } finally {
    usersLoading.value = false;
  }
};

const roleLabel = (role: string | undefined): string => {
  if (!role) return "-";
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    tenant_owner: "Titolare",
    staff: "Collaboratore",
    client: "Cliente",
  };
  return labels[role] || role;
};

const roleBadgeClass = (role: string | undefined): string => {
  if (!role) return "bg-gray-500/15 text-habit-text-subtle";
  const classes: Record<string, string> = {
    super_admin: "bg-purple-500/15 text-purple-400",
    tenant_owner: "bg-habit-cyan/15 text-habit-cyan",
    staff: "bg-blue-500/15 text-blue-400",
    client: "bg-emerald-500/15 text-emerald-400",
  };
  return classes[role] || "bg-gray-500/15 text-habit-text-subtle";
};

const statusBadge = (status: string): string => {
  if (status === "active") return "bg-emerald-500/15 text-emerald-400";
  if (status === "pending") return "bg-yellow-500/15 text-yellow-400";
  return "bg-red-500/15 text-red-400";
};

const statusText = (status: string): string => {
  const labels: Record<string, string> = {
    active: "Attivo",
    inactive: "Inattivo",
    pending: "In attesa",
    suspended: "Sospeso",
  };
  return labels[status] || status;
};

onMounted(async () => {
  if (!auth.user) await auth.checkAuth();
  fetchUsers();

  // Gestisci ritorno da Stripe checkout
  if (route.query.upgrade === "success") {
    successMessage.value =
      "Upgrade completato con successo! Il tuo piano e stato aggiornato.";
    // Forza ricaricamento dati utente per aggiornare il piano
    try {
      const response = await api.get("/auth/me");
      if (response.data.data.user) {
        auth.user = response.data.data.user;
      }
    } catch (e) {
      /* ignore */
    }
    router.replace({ path: "/settings" });
  } else if (route.query.upgrade === "cancelled") {
    errorMessage.value = "Upgrade annullato. Puoi riprovare quando vuoi.";
    router.replace({ path: "/settings" });
  }
});
</script>

<template>
  <div class="max-w-3xl mx-auto overflow-x-hidden">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
          Impostazioni
        </h1>
        <p class="text-habit-text-subtle text-sm mt-1">
          Gestisci il tuo account e il team
        </p>
      </div>
      <button
        @click="router.push('/profile')"
        class="w-full sm:w-auto px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-cyan-500 transition-colors text-sm font-medium"
      >
        Modifica Profilo
      </button>
    </div>

    <div class="space-y-4 sm:space-y-6">
      <!-- Success/Error Messages -->
      <div
        v-if="successMessage"
        class="bg-emerald-500/10 border border-emerald-500/30 rounded-habit p-3"
      >
        <p class="text-emerald-400 text-sm">{{ successMessage }}</p>
      </div>
      <div
        v-if="errorMessage"
        class="bg-red-500/10 border border-red-500/30 rounded-habit p-3"
      >
        <p class="text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Account Info Card -->
      <div
        class="bg-habit-card border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <h2
          class="text-habit-text font-semibold mb-3 sm:mb-4 text-sm sm:text-base"
        >
          Informazioni Account
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
          <div class="min-w-0">
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Nome Completo
            </p>
            <p class="text-habit-text text-sm mt-0.5 truncate">
              {{ user?.firstName }} {{ user?.lastName }}
            </p>
          </div>
          <div class="min-w-0">
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Email
            </p>
            <p class="text-habit-text text-sm mt-0.5 truncate">
              {{ user?.email || "-" }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Ruolo
            </p>
            <span
              :class="[
                'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5',
                roleBadgeClass(user?.role),
              ]"
            >
              {{ roleLabel(user?.role) }}
            </span>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Membro dal
            </p>
            <p class="text-habit-text text-sm mt-0.5">
              {{ formatDate(user?.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Subscription Card -->
      <div
        class="bg-habit-card border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">
            Abbonamento
          </h2>
          <button
            v-if="canUpgrade"
            @click="showUpgradeModal = true"
            class="px-3 py-1.5 bg-gradient-to-r from-habit-orange to-habit-cyan text-white rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Passa a Pro
          </button>
        </div>
        <div class="grid grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Piano
            </p>
            <span
              :class="[
                'inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium mt-1',
                planBadgeClass,
              ]"
            >
              {{ planLabel }}
            </span>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Stato
            </p>
            <span
              :class="[
                'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                statusBadgeClass,
              ]"
            >
              {{ statusLabel }}
            </span>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[10px] sm:text-xs uppercase tracking-wide"
            >
              Max Clienti
            </p>
            <p class="text-habit-text text-sm mt-0.5">
              {{ (user as any)?.max_clients || 5 }}
            </p>
          </div>
        </div>
        <div
          v-if="(user as any)?.trial_ends_at"
          class="mt-3 sm:mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
        >
          <p class="text-yellow-400 text-xs sm:text-sm">
            Periodo di prova termina il:
            <strong>{{ formatDate((user as any)?.trial_ends_at) }}</strong>
          </p>
        </div>
      </div>

      <!-- Team Members (tenant_owner only) -->
      <div
        v-if="isTenantOwner"
        class="bg-habit-card border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">
            Team
          </h2>
          <span class="text-habit-text-subtle text-xs"
            >{{ users.length }} membri</span
          >
        </div>

        <!-- Loading -->
        <div v-if="usersLoading" class="animate-pulse space-y-3">
          <div
            class="h-12 bg-habit-skeleton rounded"
            v-for="i in 3"
            :key="i"
          ></div>
        </div>

        <!-- Users List -->
        <div v-else-if="users.length > 0" class="space-y-2 sm:space-y-3">
          <div
            v-for="member in users"
            :key="member.id"
            class="flex items-center justify-between gap-2 bg-habit-bg-light/50 rounded-lg p-2.5 sm:p-3"
          >
            <div class="flex items-center gap-2 sm:gap-3 min-w-0">
              <div
                class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-habit-card-hover to-habit-bg-light flex items-center justify-center text-habit-text text-xs sm:text-sm font-bold flex-shrink-0"
              >
                {{ (member.first_name?.[0] || "").toUpperCase()
                }}{{ (member.last_name?.[0] || "").toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p
                  class="text-habit-text text-xs sm:text-sm font-medium truncate"
                >
                  {{ member.first_name }} {{ member.last_name }}
                </p>
                <p
                  class="text-habit-text-subtle text-[10px] sm:text-xs truncate"
                >
                  {{ member.email }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <span
                :class="[
                  'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap',
                  statusBadge(member.status),
                ]"
              >
                {{ statusText(member.status) }}
              </span>
              <span
                :class="[
                  'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap',
                  roleBadgeClass(member.role),
                ]"
              >
                {{ roleLabel(member.role) }}
              </span>
            </div>
          </div>
        </div>

        <p v-else class="text-habit-text-subtle text-sm">
          Nessun membro nel team
        </p>
      </div>

      <!-- Quick Links -->
      <div
        class="bg-habit-card border border-habit-border rounded-habit p-4 sm:p-6"
      >
        <h2
          class="text-habit-text font-semibold mb-3 sm:mb-4 text-sm sm:text-base"
        >
          Link Rapidi
        </h2>
        <div class="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            @click="router.push('/profile')"
            class="flex items-center gap-2 sm:gap-3 bg-habit-bg-light/50 rounded-lg p-2.5 sm:p-3 hover:bg-habit-card-hover transition-colors text-left min-w-0"
          >
            <svg
              class="w-4 h-4 sm:w-5 sm:h-5 text-habit-cyan flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <div class="min-w-0">
              <p
                class="text-habit-text text-xs sm:text-sm font-medium truncate"
              >
                Modifica Profilo
              </p>
              <p class="text-habit-text-subtle text-[10px] sm:text-xs truncate">
                Nome, telefono, password
              </p>
            </div>
          </button>
          <button
            @click="router.push('/dashboard')"
            class="flex items-center gap-2 sm:gap-3 bg-habit-bg-light/50 rounded-lg p-2.5 sm:p-3 hover:bg-habit-card-hover transition-colors text-left min-w-0"
          >
            <svg
              class="w-4 h-4 sm:w-5 sm:h-5 text-habit-cyan flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <div class="min-w-0">
              <p
                class="text-habit-text text-xs sm:text-sm font-medium truncate"
              >
                Dashboard
              </p>
              <p class="text-habit-text-subtle text-[10px] sm:text-xs truncate">
                Torna alla panoramica
              </p>
            </div>
          </button>
          <button
            @click="router.push('/clients')"
            class="flex items-center gap-2 sm:gap-3 bg-habit-bg-light/50 rounded-lg p-2.5 sm:p-3 hover:bg-habit-card-hover transition-colors text-left min-w-0"
          >
            <svg
              class="w-4 h-4 sm:w-5 sm:h-5 text-habit-cyan flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div class="min-w-0">
              <p
                class="text-habit-text text-xs sm:text-sm font-medium truncate"
              >
                Gestisci Clienti
              </p>
              <p class="text-habit-text-subtle text-[10px] sm:text-xs truncate">
                Lista e dettagli clienti
              </p>
            </div>
          </button>
          <button
            @click="auth.logout()"
            class="flex items-center gap-2 sm:gap-3 bg-habit-bg-light/50 rounded-lg p-2.5 sm:p-3 hover:bg-habit-card-hover transition-colors text-left min-w-0"
          >
            <svg
              class="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <div class="min-w-0">
              <p class="text-red-400 text-xs sm:text-sm font-medium truncate">
                Esci
              </p>
              <p class="text-habit-text-subtle text-[10px] sm:text-xs truncate">
                Disconnetti da questo dispositivo
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Upgrade Modal -->
    <UpgradeModal :open="showUpgradeModal" @close="showUpgradeModal = false" />
  </div>
</template>
