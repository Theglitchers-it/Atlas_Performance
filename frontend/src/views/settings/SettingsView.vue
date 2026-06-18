<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import api from "@/services/api";
import UpgradeModal from "@/components/ui/UpgradeModal.vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import {
  CreditCardIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  BellAlertIcon,
  BuildingOfficeIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  MegaphoneIcon,
  ArrowRightOnRectangleIcon,
  LockClosedIcon,
  PencilIcon,
  ChevronRightIcon,
  MapPinIcon,
} from "@heroicons/vue/24/outline";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  city: string;
}

interface AccountStats {
  posts: number;
  followers: number;
  following: number;
  xp: number;
  level: number;
  streak: number;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface BusinessFormData {
  businessName: string;
  phone: string;
}

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  workoutReminders: boolean;
  checkinReminders: boolean;
  achievementNotifications: boolean;
  chatNotifications: boolean;
  marketingEmails: boolean;
}

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
}

const auth = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

// Local state
const successMessage = ref<string>("");
const errorMessage = ref<string>("");
const users = ref<TeamMember[]>([]);
const usersLoading = ref<boolean>(false);
const showUpgradeModal = ref<boolean>(false);
const showLogoutConfirm = ref<boolean>(false);

const isClient = computed(() => auth.user?.role === "client");
const isDark = computed(() => themeStore.isDark);

const isDirty = ref<boolean>(false);
useUnsavedChanges(isDirty);

// Profile form (Section: Personal Info)
const profileForm = ref<ProfileFormData>({ firstName: "", lastName: "", phone: "", bio: "", city: "" });
const editingProfile = ref<boolean>(false);
const saving = ref<boolean>(false);

// Account stats (per riepilogo)
const accountStats = ref<AccountStats | null>(null);
const loadingStats = ref<boolean>(false);

// Logout-all dispositivi
const showLogoutAllConfirm = ref<boolean>(false);
const loggingOutAll = ref<boolean>(false);

// Avatar upload
const avatarPreview = ref<string | null>(null);
const avatarFile = ref<File | null>(null);
const uploadingAvatar = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Business form (Section: Business — tenant_owner only)
const businessForm = ref<BusinessFormData>({ businessName: "", phone: "" });
const editingBusiness = ref<boolean>(false);
const savingBusiness = ref<boolean>(false);

// Notification preferences (Section: Notifications)
const notifPrefs = ref<NotificationPreferences>({
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  workoutReminders: true,
  checkinReminders: true,
  achievementNotifications: true,
  chatNotifications: true,
  marketingEmails: false,
});
const savingNotif = ref<boolean>(false);
const notifLoaded = ref<boolean>(false);
let notifSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Password form (Section: Security)
const passwordForm = ref<PasswordFormData>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const savingPassword = ref<boolean>(false);

// Computed
const userInitials = computed<string>(() => {
  const f = user.value?.firstName?.[0] || "";
  const l = user.value?.lastName?.[0] || "";
  return (f + l).toUpperCase() || "?";
});

const avatarGradient = computed<string>(() => "from-habit-orange to-amber-500");

const avatarUrl = computed<string | null>(() => {
  if (avatarPreview.value) return avatarPreview.value;
  const u = user.value as any;
  const rawUrl = u?.avatarUrl || u?.avatar_url;
  if (rawUrl) {
    return rawUrl.startsWith("http")
      ? rawUrl
      : `${api.defaults.baseURL?.replace("/api", "") || ""}${rawUrl}`;
  }
  return null;
});

const passwordValid = computed<boolean>(
  () =>
    passwordForm.value.currentPassword.length > 0 &&
    passwordForm.value.newPassword.length >= 8 &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword,
);

// === PROFILE ACTIONS ===
const startEditProfile = () => {
  profileForm.value = {
    firstName: auth.user?.firstName || "",
    lastName: auth.user?.lastName || "",
    phone: (auth.user as any)?.phone || "",
    bio: (auth.user as any)?.bio || "",
    city: (auth.user as any)?.city || "",
  };
  editingProfile.value = true;
};

const cancelEditProfile = () => {
  editingProfile.value = false;
  isDirty.value = false;
};

watch(
  profileForm,
  () => {
    if (editingProfile.value) isDirty.value = true;
  },
  { deep: true },
);

const normalizeUser = (raw: Record<string, any>): Record<string, any> => {
  if (!raw) return {};
  return {
    id: raw.id,
    email: raw.email,
    role: raw.role,
    phone: raw.phone,
    status: raw.status,
    firstName: raw.firstName || raw.first_name,
    lastName: raw.lastName || raw.last_name,
    avatarUrl: raw.avatarUrl || raw.avatar_url,
    tenantId: raw.tenantId || raw.tenant_id,
    createdAt: raw.createdAt || raw.created_at,
  };
};

const saveProfile = async () => {
  saving.value = true;
  try {
    // PUT /users/me/profile gestisce firstName/lastName/bio/city con whitelist server-side (F6)
    const meResp = await api.put("/users/me/profile", {
      firstName: profileForm.value.firstName,
      lastName: profileForm.value.lastName,
      bio: profileForm.value.bio || null,
      city: profileForm.value.city || null,
    });
    // Per phone usiamo l'endpoint generico user-update perché non è nel whitelist /me/profile
    if (profileForm.value.phone !== ((auth.user as any)?.phone || "")) {
      await api.put(`/users/${auth.user!.id}`, { phone: profileForm.value.phone });
    }
    if (meResp.data.data) {
      auth.user = {
        ...auth.user!,
        ...normalizeUser(meResp.data.data),
        phone: profileForm.value.phone,
        bio: profileForm.value.bio,
        city: profileForm.value.city,
      } as any;
    }
    editingProfile.value = false;
    isDirty.value = false;
    toast.success("Profilo aggiornato");
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore aggiornamento profilo");
  } finally {
    saving.value = false;
  }
};

// Account stats (XP, livello, follower, post) — solo client
const loadAccountStats = async () => {
  if (!isClient.value || !auth.user?.id) return;
  loadingStats.value = true;
  try {
    const [profileRes, gamRes] = await Promise.allSettled([
      api.get(`/users/${auth.user.id}/profile`),
      api.get("/gamification/dashboard"),
    ]);
    const stats: AccountStats = {
      posts: 0, followers: 0, following: 0,
      xp: 0, level: 1, streak: 0,
    };
    if (profileRes.status === "fulfilled") {
      const s = profileRes.value.data.data?.stats || {};
      stats.posts = s.posts || 0;
      stats.followers = s.followers || 0;
      stats.following = s.following || 0;
    }
    if (gamRes.status === "fulfilled") {
      const d = gamRes.value.data.data || {};
      stats.xp = d.xp_points || d.xpPoints || 0;
      stats.level = d.level || 1;
      stats.streak = d.streak_days || d.streakDays || 0;
    }
    accountStats.value = stats;
  } catch {
    // silent
  } finally {
    loadingStats.value = false;
  }
};

const handleLogoutAll = async () => {
  showLogoutAllConfirm.value = false;
  loggingOutAll.value = true;
  try {
    await api.post("/auth/logout-all");
    toast.success("Disconnesso da tutti i dispositivi");
    await auth.logout();
    router.push("/login");
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore logout dispositivi");
  } finally {
    loggingOutAll.value = false;
  }
};

// Tab navigation: smooth scroll alle sezioni
const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
};

const settingsSections = computed(() => {
  const base = [
    { id: "personali", label: "Profilo" },
    { id: "preferenze", label: "Preferenze" },
    { id: "sicurezza", label: "Sicurezza" },
    { id: "account", label: "Account" },
  ];
  // Sezione "Sedi" visibile solo agli atleti (per scegliere sede preferita)
  if (isClient.value) {
    base.splice(2, 0, { id: "sedi", label: "Sedi" });
  }
  if (isTenantOwner.value) {
    base.splice(1, 0, { id: "business", label: "Business" });
    base.splice(-1, 0, { id: "team", label: "Team" });
  } else if (!isClient.value) {
    base.splice(-1, 0, { id: "abbonamento", label: "Abbonamento" });
  }
  return base;
});

// === SEDI (atleta sceglie sede preferita) ===
interface AtletaLocation {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
  status: string;
}
const availableLocations = ref<AtletaLocation[]>([]);
const preferredLocationId = ref<number | null>(null);
const loadingLocations = ref<boolean>(false);
const savingLocation = ref<boolean>(false);

const loadLocationsForAthlete = async () => {
  if (!isClient.value) return;
  loadingLocations.value = true;
  try {
    const [locsRes, meRes] = await Promise.all([
      api.get("/locations"),
      api.get("/clients/me"),
    ]);
    const list = locsRes.data?.data?.locations || locsRes.data?.data || [];
    availableLocations.value = Array.isArray(list)
      ? list.filter((l: any) => l.status === "active")
      : [];
    preferredLocationId.value = meRes.data?.data?.client?.preferred_location_id ?? null;
  } catch (err) {
    console.error("[SEDI] Errore caricamento sedi:", err);
  } finally {
    loadingLocations.value = false;
  }
};

const savePreferredLocation = async (newId: number | null) => {
  savingLocation.value = true;
  try {
    await api.put("/clients/me/preferred-location", { locationId: newId });
    preferredLocationId.value = newId;
    toast.success("Sede preferita aggiornata");
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore aggiornamento sede");
  } finally {
    savingLocation.value = false;
  }
};

// === AVATAR ===
const triggerAvatarUpload = () => fileInputRef.value?.click();

const onAvatarSelected = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Immagine troppo grande (max 5MB)");
    return;
  }
  // Revoca preview precedente per evitare memory leak su selezione ripetuta
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value);
  avatarFile.value = file;
  avatarPreview.value = URL.createObjectURL(file);
};

const confirmAvatarUpload = async () => {
  if (!avatarFile.value) return;
  uploadingAvatar.value = true;
  try {
    const formData = new FormData();
    formData.append("avatar", avatarFile.value);
    const response = await api.post("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const newUrl = response.data.data?.avatarUrl;
    if (newUrl) {
      auth.user = { ...auth.user!, avatarUrl: newUrl } as any;
    }
    toast.success("Avatar aggiornato");
    cancelAvatarUpload();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore upload avatar");
    // Reset stato anche su errore per evitare preview "bloccato" + leak Object URL
    cancelAvatarUpload();
  } finally {
    uploadingAvatar.value = false;
  }
};

const cancelAvatarUpload = () => {
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value);
  avatarPreview.value = null;
  avatarFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
};

// === PASSWORD ===
const handleChangePassword = async () => {
  savingPassword.value = true;
  try {
    await api.post("/auth/change-password", {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });
    toast.success("Password cambiata con successo");
    passwordForm.value = { currentPassword: "", newPassword: "", confirmPassword: "" };
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore cambio password");
  } finally {
    savingPassword.value = false;
  }
};

// === NOTIFICATIONS ===
const loadNotifPrefs = async () => {
  try {
    const response = await api.get("/notifications/preferences");
    const p = response.data.data;
    notifPrefs.value = {
      emailEnabled: !!p.email_enabled,
      pushEnabled: !!p.push_enabled,
      inAppEnabled: !!p.in_app_enabled,
      workoutReminders: !!p.workout_reminders,
      checkinReminders: !!p.checkin_reminders,
      achievementNotifications: !!p.achievement_notifications,
      chatNotifications: !!p.chat_notifications,
      marketingEmails: !!p.marketing_emails,
    };
  } catch {
    // defaults
  } finally {
    setTimeout(() => {
      notifLoaded.value = true;
    }, 100);
  }
};

const saveNotifPrefs = async () => {
  savingNotif.value = true;
  try {
    await api.put("/notifications/preferences", notifPrefs.value);
  } catch {
    toast.error("Errore salvataggio preferenze");
  } finally {
    savingNotif.value = false;
  }
};

watch(
  notifPrefs,
  () => {
    if (!notifLoaded.value) return;
    if (notifSaveTimeout) clearTimeout(notifSaveTimeout);
    notifSaveTimeout = setTimeout(() => saveNotifPrefs(), 600);
  },
  { deep: true },
);

// === BUSINESS ===
const loadBusinessInfo = async () => {
  try {
    const response = await api.get("/users/me/business");
    const d = response.data.data;
    businessForm.value = {
      businessName: d.business_name || "",
      phone: d.phone || "",
    };
  } catch {
    // not owner
  }
};

const saveBusinessInfo = async () => {
  savingBusiness.value = true;
  try {
    await api.put("/users/me/business", businessForm.value);
    toast.success("Info business aggiornate");
    editingBusiness.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore salvataggio");
  } finally {
    savingBusiness.value = false;
  }
};

const handleLogout = async () => {
  showLogoutConfirm.value = false;
  await auth.logout();
  router.push("/login");
};

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
  loadNotifPrefs();
  if (isTenantOwner.value) loadBusinessInfo();
  if (isClient.value) {
    loadAccountStats();
    loadLocationsForAthlete();
  }

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
    <div class="mb-4 sm:mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Profilo
      </h1>
      <p class="text-habit-text-subtle text-sm mt-1">
        {{ isClient ? "Gestisci il tuo account e preferenze" : "Gestisci account, team e impostazioni" }}
      </p>
    </div>

    <!-- Tab nav sticky (smooth scroll, solid no bleed) -->
    <div class="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 -mx-3 sm:-mx-4 mb-4 px-3 sm:px-4 py-2.5 bg-habit-bg border-b border-black/5 dark:border-white/5">
      <div class="flex gap-1.5 overflow-x-auto scrollbar-none">
        <button
          v-for="sec in settingsSections"
          :key="sec.id"
          type="button"
          @click="scrollToSection(sec.id)"
          class="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-habit-card/60 border border-white/10 text-habit-text-muted hover:bg-habit-card hover:text-habit-text hover:border-habit-cyan/30 transition-all whitespace-nowrap"
        >
          {{ sec.label }}
        </button>
      </div>
    </div>

    <!-- Profile Hero + Stats unificati (glass card 2026) -->
    <div
      class="relative overflow-hidden rounded-3xl mb-4 sm:mb-6 border border-white/10
             bg-gradient-to-br from-habit-card via-habit-card to-habit-bg-light/50
             shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
    >
      <!-- Mesh gradient blobs decorativi -->
      <div class="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-habit-orange/15 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-habit-cyan/10 blur-3xl"></div>
      <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-purple-500/8 blur-3xl"></div>

      <div class="relative p-4 sm:p-5">
        <!-- Riga 1: Avatar + Info utente compatti -->
        <div class="flex items-center gap-3 sm:gap-4">
          <!-- Avatar -->
          <div class="relative group flex-shrink-0">
            <button
              @click="triggerAvatarUpload"
              class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-habit-cyan/50 transition-transform duration-200 hover:scale-105 shadow-lg"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="user?.firstName"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full bg-gradient-to-br flex items-center justify-center"
                :class="avatarGradient"
              >
                <span class="text-white font-bold text-lg sm:text-xl">{{ userInitials }}</span>
              </div>
              <div class="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon class="w-5 h-5 text-white" />
              </div>
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="onAvatarSelected"
            />
            <div
              v-if="avatarPreview"
              class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1"
            >
              <button
                @click="confirmAvatarUpload"
                :disabled="uploadingAvatar"
                class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-400 disabled:opacity-50"
              >
                <CheckIcon class="w-3.5 h-3.5" />
              </button>
              <button
                @click="cancelAvatarUpload"
                class="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-400"
              >
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h2 class="text-habit-text text-base sm:text-lg font-bold truncate leading-tight">
              {{ user?.firstName }} {{ user?.lastName }}
            </h2>
            <p class="text-habit-text-subtle text-xs sm:text-sm truncate mt-0.5">
              {{ user?.email }}
            </p>
            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold',
                  roleBadgeClass(user?.role),
                ]"
              >
                {{ roleLabel(user?.role) }}
              </span>
              <span class="text-habit-text-subtle text-[10px] sm:text-xs">
                · da {{ formatDate(user?.createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div v-if="isClient && accountStats" class="my-4 h-px bg-gradient-to-r from-transparent via-habit-border/60 to-transparent"></div>

        <!-- Riga 2: Stats inline compatte (solo client) -->
        <div v-if="isClient && accountStats" class="grid grid-cols-6 gap-1.5 sm:gap-2">
          <div class="text-center">
            <p class="text-habit-orange text-sm sm:text-base font-bold leading-none">{{ accountStats.xp }}</p>
            <p class="text-habit-text-subtle text-[9px] sm:text-[10px] uppercase tracking-wide mt-1">XP</p>
          </div>
          <div class="text-center">
            <p class="text-habit-cyan text-sm sm:text-base font-bold leading-none">{{ accountStats.level }}</p>
            <p class="text-habit-text-subtle text-[9px] sm:text-[10px] uppercase tracking-wide mt-1">Livello</p>
          </div>
          <div class="text-center">
            <p class="text-pink-400 text-sm sm:text-base font-bold leading-none flex items-center justify-center gap-0.5">
              {{ accountStats.streak }}<span class="text-[10px]">🔥</span>
            </p>
            <p class="text-habit-text-subtle text-[9px] sm:text-[10px] uppercase tracking-wide mt-1">Streak</p>
          </div>
          <div class="text-center">
            <p class="text-habit-text text-sm sm:text-base font-bold leading-none">{{ accountStats.posts }}</p>
            <p class="text-habit-text-subtle text-[9px] sm:text-[10px] uppercase tracking-wide mt-1">Post</p>
          </div>
          <div class="text-center">
            <p class="text-habit-text text-sm sm:text-base font-bold leading-none">{{ accountStats.followers }}</p>
            <p class="text-habit-text-subtle text-[9px] sm:text-[10px] uppercase tracking-wide mt-1">Follower</p>
          </div>
          <div class="text-center">
            <p class="text-habit-text text-sm sm:text-base font-bold leading-none">{{ accountStats.following }}</p>
            <p class="text-habit-text-subtle text-[9px] sm:text-[10px] uppercase tracking-wide mt-1">Seguiti</p>
          </div>
        </div>
      </div>
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

      <!-- Informazioni Personali -->
      <div id="personali" class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-habit-cyan/10 flex items-center justify-center flex-shrink-0">
              <PencilIcon class="w-4 h-4 text-habit-cyan" />
            </div>
            <h2 class="text-habit-text font-semibold text-sm sm:text-base">
              Informazioni Personali
            </h2>
          </div>
          <button
            v-if="!editingProfile"
            @click="startEditProfile"
            class="text-xs text-habit-cyan hover:text-cyan-300 font-medium"
          >
            Modifica
          </button>
        </div>

        <div v-if="!editingProfile" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Nome</p>
            <p class="text-habit-text text-sm font-medium">{{ user?.firstName || "-" }}</p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Cognome</p>
            <p class="text-habit-text text-sm font-medium">{{ user?.lastName || "-" }}</p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Email</p>
            <div class="flex items-center gap-1.5">
              <p class="text-habit-text text-sm truncate">{{ user?.email || "-" }}</p>
              <LockClosedIcon class="w-3 h-3 text-habit-text-subtle flex-shrink-0" title="Non modificabile" />
            </div>
          </div>
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Telefono</p>
            <p class="text-habit-text text-sm">{{ (user as any)?.phone || "Non impostato" }}</p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Città</p>
            <p class="text-habit-text text-sm">{{ (user as any)?.city || "Non impostata" }}</p>
          </div>
          <div class="sm:col-span-2">
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Bio</p>
            <p class="text-habit-text text-sm whitespace-pre-wrap">{{ (user as any)?.bio || "Aggiungi una breve presentazione visibile nel tuo profilo Community" }}</p>
          </div>
        </div>

        <div v-else class="space-y-3 sm:space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Nome *</label>
              <input
                v-model="profileForm.firstName"
                type="text"
                autocomplete="given-name"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-cyan/60 focus:ring-2 focus:ring-habit-cyan/20 focus:bg-habit-bg-light outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Cognome *</label>
              <input
                v-model="profileForm.lastName"
                type="text"
                autocomplete="family-name"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-cyan/60 focus:ring-2 focus:ring-habit-cyan/20 focus:bg-habit-bg-light outline-none transition-all"
              />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Telefono</label>
              <input
                v-model="profileForm.phone"
                type="tel"
                autocomplete="tel"
                placeholder="+39 333 1234567"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-cyan/60 focus:ring-2 focus:ring-habit-cyan/20 focus:bg-habit-bg-light outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Città</label>
              <input
                v-model="profileForm.city"
                type="text"
                maxlength="120"
                placeholder="es. Olbia"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-cyan/60 focus:ring-2 focus:ring-habit-cyan/20 focus:bg-habit-bg-light outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Bio</label>
            <textarea
              v-model="profileForm.bio"
              rows="3"
              maxlength="1000"
              placeholder="Raccontaci qualcosa di te, visibile nel tuo profilo Community..."
              class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/30 outline-none resize-none"
            ></textarea>
            <p class="text-habit-text-subtle text-[11px] text-right mt-1">{{ profileForm.bio.length }}/1000</p>
          </div>
          <p class="text-habit-text-subtle text-xs flex items-center gap-1">
            <LockClosedIcon class="w-3 h-3 flex-shrink-0" /> L'email non puo essere modificata
          </p>
          <div class="flex gap-3 pt-1">
            <button
              @click="cancelEditProfile"
              class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="saveProfile"
              :disabled="saving || !profileForm.firstName || !profileForm.lastName"
              class="px-5 py-2 bg-gradient-to-r from-habit-cyan to-blue-600 text-white rounded-2xl hover:shadow-lg hover:shadow-habit-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all"
            >
              {{ saving ? "Salvataggio..." : "Salva" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Info Business (tenant_owner only) -->
      <div
        v-if="isTenantOwner"
        id="business"
        class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-habit-orange/10 flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon class="w-4 h-4 text-habit-orange" />
            </div>
            <h2 class="text-habit-text font-semibold text-sm sm:text-base">
              Info Business
            </h2>
          </div>
          <button
            v-if="!editingBusiness"
            @click="editingBusiness = true"
            class="text-xs text-habit-orange hover:text-orange-400 font-medium"
          >
            Modifica
          </button>
        </div>

        <div v-if="!editingBusiness" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Nome Attivita</p>
            <p class="text-habit-text text-sm font-medium">{{ businessForm.businessName || "-" }}</p>
          </div>
          <div>
            <p class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5">Telefono Business</p>
            <p class="text-habit-text text-sm">{{ businessForm.phone || "Non impostato" }}</p>
          </div>
        </div>

        <div v-else class="space-y-3 sm:space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Nome Attivita *</label>
              <input
                v-model="businessForm.businessName"
                type="text"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-orange/60 focus:ring-2 focus:ring-habit-orange/20 focus:bg-habit-bg-light outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Telefono Business</label>
              <input
                v-model="businessForm.phone"
                type="tel"
                placeholder="+39 02 1234567"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-habit-orange/60 focus:ring-2 focus:ring-habit-orange/20 focus:bg-habit-bg-light outline-none transition-all"
              />
            </div>
          </div>
          <div class="flex gap-3 pt-1">
            <button
              @click="editingBusiness = false"
              class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover text-sm"
            >
              Annulla
            </button>
            <button
              @click="saveBusinessInfo"
              :disabled="savingBusiness || !businessForm.businessName"
              class="px-5 py-2 bg-gradient-to-r from-habit-orange to-amber-500 text-white rounded-2xl hover:shadow-lg hover:shadow-habit-orange/30 disabled:opacity-40 text-sm font-semibold transition-all"
            >
              {{ savingBusiness ? "Salvataggio..." : "Salva" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Preferenze (Tema) -->
      <div id="preferenze" class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32">
        <div class="flex items-center gap-2 mb-3 sm:mb-4">
          <Cog6ToothIcon class="w-4 h-4 sm:w-5 sm:h-5 text-habit-text-muted" />
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">
            Preferenze App
          </h2>
        </div>

        <button
          @click="themeStore.toggleTheme()"
          class="w-full flex items-center justify-between gap-3 py-2 hover:bg-habit-bg-light/30 -mx-2 px-2 rounded-lg transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-habit-bg-light flex items-center justify-center flex-shrink-0">
              <MoonIcon v-if="isDark" class="w-4 h-4 text-habit-text" />
              <SunIcon v-else class="w-4 h-4 text-habit-orange" />
            </div>
            <div class="text-left min-w-0">
              <p class="text-habit-text text-sm font-medium">Tema</p>
              <p class="text-habit-text-subtle text-xs">
                {{ isDark ? "Scuro" : "Chiaro" }} — tap per cambiare
              </p>
            </div>
          </div>
          <div :class="['relative w-11 h-6 rounded-full transition-colors flex-shrink-0', isDark ? 'bg-habit-cyan' : 'bg-habit-bg-light']">
            <span :class="['absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', isDark ? 'left-5' : 'left-0.5']"></span>
          </div>
        </button>
      </div>

      <!-- Preferenze Notifiche granulari -->
      <div class="bg-habit-card border border-white/10 rounded-3xl p-4 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div class="flex items-center gap-2 mb-4 sm:mb-5">
          <div class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <BellIcon class="w-4 h-4 text-emerald-400" />
          </div>
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">
            Preferenze Notifiche
          </h2>
          <span v-if="savingNotif" class="text-habit-text-subtle text-[11px] ml-auto">Salvataggio...</span>
        </div>

        <!-- Canali -->
        <div class="mb-4">
          <div class="flex items-center gap-1.5 mb-2.5">
            <DevicePhoneMobileIcon class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0" />
            <p class="text-habit-text-muted text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">Canali</p>
          </div>
          <div class="space-y-2.5">
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">Email</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.emailEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">Push</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.pushEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">In-app</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.inAppEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
          </div>
        </div>

        <div class="border-t border-habit-border/40 my-3 sm:my-4"></div>

        <!-- Attivita -->
        <div class="mb-4">
          <div class="flex items-center gap-1.5 mb-2.5">
            <BellAlertIcon class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0" />
            <p class="text-habit-text-muted text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">Attivita</p>
          </div>
          <div class="space-y-2.5">
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">Promemoria workout</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.workoutReminders" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">Promemoria check-in</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.checkinReminders" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">Achievement e badge</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.achievementNotifications" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer py-0.5">
              <span class="text-habit-text text-sm">Messaggi chat</span>
              <div class="relative flex-shrink-0 ml-3">
                <input v-model="notifPrefs.chatNotifications" type="checkbox" class="sr-only peer" />
                <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
              </div>
            </label>
          </div>
        </div>

        <div class="border-t border-habit-border/40 my-3 sm:my-4"></div>

        <!-- Marketing -->
        <div>
          <div class="flex items-center gap-1.5 mb-2.5">
            <MegaphoneIcon class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0" />
            <p class="text-habit-text-muted text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">Marketing</p>
          </div>
          <label class="flex items-center justify-between cursor-pointer py-0.5">
            <div class="min-w-0 mr-3">
              <span class="text-habit-text text-sm">Email promozionali</span>
              <p class="text-habit-text-subtle text-xs mt-0.5">Novita, aggiornamenti e offerte</p>
            </div>
            <div class="relative flex-shrink-0">
              <input v-model="notifPrefs.marketingEmails" type="checkbox" class="sr-only peer" />
              <div class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>
      </div>

      <!-- Sedi (solo atleta: scelta sede preferita) -->
      <div
        v-if="isClient"
        id="sedi"
        class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32"
      >
        <div class="flex items-center gap-2 mb-4">
          <div class="w-7 h-7 rounded-lg bg-habit-orange/10 flex items-center justify-center flex-shrink-0">
            <MapPinIcon class="w-4 h-4 text-habit-orange" />
          </div>
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">Sedi</h2>
        </div>

        <p class="text-xs text-habit-text-subtle mb-4">
          Imposta la sede dove ti alleni di solito. Vedrai per default classi e
          appuntamenti di questa sede.
        </p>

        <div v-if="loadingLocations" class="py-6 text-center text-sm text-habit-text-subtle">
          Caricamento sedi…
        </div>

        <div v-else-if="availableLocations.length === 0" class="py-6 text-center">
          <p class="text-sm text-habit-text-subtle">
            Nessuna sede disponibile in questo momento.
          </p>
        </div>

        <div v-else class="space-y-2">
          <!-- Opzione "Nessuna preferenza" -->
          <button
            type="button"
            @click="savePreferredLocation(null)"
            :disabled="savingLocation"
            class="w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left"
            :class="
              preferredLocationId === null
                ? 'border-habit-orange bg-habit-orange/5'
                : 'border-habit-border hover:border-habit-text-subtle/40 hover:bg-habit-bg-light/40'
            "
          >
            <div class="min-w-0">
              <div class="text-sm font-medium text-habit-text">Tutte le sedi</div>
              <div class="text-xs text-habit-text-subtle mt-0.5">
                Nessuna sede preferita - vedo classi e appuntamenti ovunque
              </div>
            </div>
            <CheckIcon
              v-if="preferredLocationId === null"
              class="w-5 h-5 text-habit-orange flex-shrink-0"
            />
          </button>

          <!-- Lista sedi -->
          <button
            v-for="loc in availableLocations"
            :key="loc.id"
            type="button"
            @click="savePreferredLocation(loc.id)"
            :disabled="savingLocation"
            class="w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left"
            :class="
              preferredLocationId === loc.id
                ? 'border-habit-orange bg-habit-orange/5'
                : 'border-habit-border hover:border-habit-text-subtle/40 hover:bg-habit-bg-light/40'
            "
          >
            <div class="min-w-0">
              <div class="text-sm font-medium text-habit-text">{{ loc.name }}</div>
              <div
                v-if="loc.city || loc.address"
                class="text-xs text-habit-text-subtle mt-0.5 truncate"
              >
                {{ [loc.address, loc.city].filter(Boolean).join(" - ") }}
              </div>
            </div>
            <CheckIcon
              v-if="preferredLocationId === loc.id"
              class="w-5 h-5 text-habit-orange flex-shrink-0"
            />
          </button>
        </div>
      </div>

      <!-- Sicurezza (cambio password form) -->
      <div id="sicurezza" class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon class="w-4 h-4 text-yellow-500" />
          </div>
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">Sicurezza</h2>
        </div>

        <div class="space-y-3 sm:space-y-4">
          <div>
            <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Password Attuale</label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Inserisci la password attuale"
              class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20 focus:bg-habit-bg-light outline-none transition-all"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Nuova Password</label>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Min. 8 caratteri"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20 focus:bg-habit-bg-light outline-none transition-all"
              />
              <p
                v-if="passwordForm.newPassword && passwordForm.newPassword.length < 8"
                class="text-red-400 text-xs mt-1"
              >Minimo 8 caratteri</p>
            </div>
            <div>
              <label class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1">Conferma Password</label>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Ripeti password"
                class="w-full bg-habit-bg-light/60 border border-white/10 rounded-2xl px-3.5 py-2.5 text-habit-text text-sm focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20 focus:bg-habit-bg-light outline-none transition-all"
              />
              <p
                v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword"
                class="text-red-400 text-xs mt-1"
              >Non coincidono</p>
            </div>
          </div>
          <button
            @click="handleChangePassword"
            :disabled="savingPassword || !passwordValid"
            class="px-5 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-2xl hover:shadow-lg hover:shadow-yellow-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all"
          >
            {{ savingPassword ? "Aggiornamento..." : "Cambia Password" }}
          </button>
        </div>
      </div>

      <!-- Subscription Card (solo non-client) -->
      <div
        v-if="!isClient"
        id="abbonamento"
        class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32"
      >
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <div class="flex items-center gap-2">
            <CreditCardIcon class="w-4 h-4 sm:w-5 sm:h-5 text-habit-text-muted" />
            <h2 class="text-habit-text font-semibold text-sm sm:text-base">
              Abbonamento
            </h2>
          </div>
          <button
            v-if="canUpgrade"
            @click="showUpgradeModal = true"
            class="px-3.5 py-1.5 bg-gradient-to-r from-habit-orange via-pink-500 to-habit-cyan text-white rounded-full text-xs sm:text-sm font-bold hover:shadow-lg hover:shadow-habit-orange/30 transition-all"
          >
            ⭐ Passa a Pro
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
        id="team"
        class="bg-habit-card border border-white/10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 scroll-mt-32"
      >
        <div class="flex items-center justify-between mb-3 sm:mb-4">
          <div class="flex items-center gap-2">
            <UserGroupIcon class="w-4 h-4 sm:w-5 sm:h-5 text-habit-text-muted" />
            <h2 class="text-habit-text font-semibold text-sm sm:text-base">
              Team
            </h2>
          </div>
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

      <!-- Account / Logout -->
      <div id="account" class="space-y-3 scroll-mt-32">
        <button
          type="button"
          @click="showLogoutConfirm = true"
          class="w-full bg-habit-card border border-white/10 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 hover:border-red-500/40 hover:bg-red-500/5 hover:shadow-lg hover:shadow-red-500/10 transition-all group"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <ArrowRightOnRectangleIcon class="w-4 h-4 text-red-500" />
            </div>
            <div class="text-left min-w-0">
              <p class="text-red-500 text-sm font-semibold">Esci</p>
              <p class="text-habit-text-subtle text-xs">
                Disconnettiti da questo dispositivo
              </p>
            </div>
          </div>
          <ChevronRightIcon class="w-4 h-4 text-habit-text-subtle group-hover:text-red-500 transition-colors flex-shrink-0" />
        </button>

        <button
          type="button"
          @click="showLogoutAllConfirm = true"
          :disabled="loggingOutAll"
          class="w-full bg-habit-card border border-white/10 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 hover:border-red-500/40 hover:bg-red-500/5 hover:shadow-lg hover:shadow-red-500/10 transition-all group disabled:opacity-60"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <DevicePhoneMobileIcon class="w-4 h-4 text-red-500" />
            </div>
            <div class="text-left min-w-0">
              <p class="text-red-500 text-sm font-semibold">Esci da tutti i dispositivi</p>
              <p class="text-habit-text-subtle text-xs">
                Revoca i token su mobile, web e PWA
              </p>
            </div>
          </div>
          <ChevronRightIcon class="w-4 h-4 text-habit-text-subtle group-hover:text-red-500 transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>

    <!-- Upgrade Modal -->
    <UpgradeModal :open="showUpgradeModal" @close="showUpgradeModal = false" />

    <!-- Logout Confirm (singolo device) -->
    <ConfirmDialog
      :open="showLogoutConfirm"
      title="Esci dall'account?"
      message="Verrai disconnesso da questo dispositivo. Dovrai effettuare di nuovo il login per accedere."
      confirm-text="Sì, esci"
      cancel-text="Annulla"
      variant="warning"
      @confirm="handleLogout"
      @cancel="showLogoutConfirm = false"
    />

    <!-- Logout All Confirm -->
    <ConfirmDialog
      :open="showLogoutAllConfirm"
      title="Esci da tutti i dispositivi?"
      message="Verrai disconnesso ovunque tu sia loggato (mobile, web, PWA). Tutte le sessioni attive saranno revocate immediatamente."
      confirm-text="Sì, esci ovunque"
      cancel-text="Annulla"
      variant="danger"
      :loading="loggingOutAll"
      @confirm="handleLogoutAll"
      @cancel="showLogoutAllConfirm = false"
    />
  </div>
</template>
