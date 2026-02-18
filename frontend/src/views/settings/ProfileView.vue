<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/store/auth";
import { useToast } from "vue-toastification";
import { useUnsavedChanges } from "@/composables/useUnsavedChanges";
import api from "@/services/api";
import {
  CameraIcon,
  PencilIcon,
  LockClosedIcon,
  BellIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
  MegaphoneIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
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

const auth = useAuthStore();
const toast = useToast();
const isDirty = ref<boolean>(false);
useUnsavedChanges(isDirty);

// === STATE ===
const saving = ref<boolean>(false);
const savingPassword = ref<boolean>(false);
const editingProfile = ref<boolean>(false);
const uploadingAvatar = ref<boolean>(false);
const avatarPreview = ref<string | null>(null);
const avatarFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Business info
const businessForm = ref<BusinessFormData>({ businessName: "", phone: "" });
const savingBusiness = ref<boolean>(false);
const editingBusiness = ref<boolean>(false);

// Notification preferences
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

// Profile form
const profileForm = ref<ProfileFormData>({
  firstName: "",
  lastName: "",
  phone: "",
});

// Password form
const passwordForm = ref<PasswordFormData>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// === COMPUTED ===
const user = computed(() => auth.user);
const isTenantOwner = computed<boolean>(
  () => auth.user?.role === "tenant_owner" || auth.user?.role === "super_admin",
);

const roleLabel = computed<string>(() => {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    tenant_owner: "Titolare",
    staff: "Collaboratore",
    client: "Cliente",
  };
  const role = auth.user?.role || "";
  return labels[role] || role || "-";
});

const roleBadgeClass = computed<string>(() => {
  const classes: Record<string, string> = {
    super_admin: "bg-purple-500/15 text-purple-400",
    tenant_owner: "bg-habit-cyan/15 text-habit-cyan",
    staff: "bg-blue-500/15 text-blue-400",
    client: "bg-emerald-500/15 text-emerald-400",
  };
  const role = auth.user?.role || "";
  return classes[role] || "bg-gray-500/15 text-habit-text-subtle";
});

const userInitials = computed<string>(() => {
  const f = user.value?.firstName?.[0] || "";
  const l = user.value?.lastName?.[0] || "";
  return (f + l).toUpperCase();
});

const avatarGradient = computed<string>(() => {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-habit-cyan to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-habit-orange to-red-500",
    "from-pink-500 to-rose-600",
  ];
  const idx = (user.value?.id || 0) % gradients.length;
  return gradients[idx];
});

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

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const passwordValid = computed<boolean>(() => {
  return (
    passwordForm.value.currentPassword.length > 0 &&
    passwordForm.value.newPassword.length >= 8 &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword
  );
});

// === PROFILE ACTIONS ===
const startEdit = () => {
  profileForm.value = {
    firstName: auth.user?.firstName || "",
    lastName: auth.user?.lastName || "",
    phone: auth.user?.phone || "",
  };
  editingProfile.value = true;
};

const cancelEdit = () => {
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
    const response = await api.put(
      `/users/${auth.user!.id}`,
      profileForm.value,
    );
    if (response.data.data?.user) {
      auth.user = {
        ...auth.user!,
        ...normalizeUser(response.data.data.user),
      } as any;
    } else {
      auth.user = {
        ...auth.user!,
        firstName: profileForm.value.firstName,
        lastName: profileForm.value.lastName,
        phone: profileForm.value.phone,
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

// === AVATAR ===
const triggerAvatarUpload = () => {
  fileInputRef.value?.click();
};

const onAvatarSelected = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Immagine troppo grande (max 5MB)");
    return;
  }

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
    passwordForm.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore cambio password");
  } finally {
    savingPassword.value = false;
  }
};

// === NOTIFICATION PREFERENCES ===
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
    // Use defaults
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

// Auto-save notification preferences with debounce (skip initial load)
watch(
  notifPrefs,
  () => {
    if (!notifLoaded.value) return;
    if (notifSaveTimeout) clearTimeout(notifSaveTimeout);
    notifSaveTimeout = setTimeout(() => saveNotifPrefs(), 600);
  },
  { deep: true },
);

// === BUSINESS INFO ===
const loadBusinessInfo = async () => {
  try {
    const response = await api.get("/users/me/business");
    const d = response.data.data;
    businessForm.value = {
      businessName: d.business_name || "",
      phone: d.phone || "",
    };
  } catch {
    // Not a tenant owner or error
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

// === INIT ===
onMounted(async () => {
  if (!auth.user) auth.checkAuth();
  loadNotifPrefs();
  if (isTenantOwner.value) loadBusinessInfo();
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-1">
    <!-- Page Header -->
    <div class="mb-5 sm:mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-habit-text">
        Il Mio Profilo
      </h1>
      <p class="text-habit-text-subtle text-sm mt-1">
        Gestisci le tue informazioni e preferenze
      </p>
    </div>

    <div class="space-y-4 sm:space-y-5">
      <!-- ==================== SECTION 1: PROFILE HEADER ==================== -->
      <div
        class="bg-habit-card border border-habit-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
      >
        <div
          class="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5"
        >
          <!-- Avatar -->
          <div class="relative group flex-shrink-0">
            <button
              @click="triggerAvatarUpload"
              class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-habit-cyan/50 focus:ring-offset-2 focus:ring-offset-habit-card transition-transform duration-200 hover:scale-105"
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
                <span class="text-white font-bold text-xl sm:text-2xl">{{
                  userInitials
                }}</span>
              </div>
              <div
                class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <CameraIcon class="w-6 h-6 text-white" />
              </div>
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="onAvatarSelected"
            />
            <!-- Avatar preview confirm/cancel -->
            <div
              v-if="avatarPreview"
              class="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5"
            >
              <button
                @click="confirmAvatarUpload"
                :disabled="uploadingAvatar"
                class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                <CheckIcon class="w-4 h-4" />
              </button>
              <button
                @click="cancelAvatarUpload"
                class="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-400 transition-colors"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- User info -->
          <div class="flex-1 text-center sm:text-left min-w-0">
            <h2 class="text-habit-text text-lg sm:text-xl font-bold truncate">
              {{ user?.firstName }} {{ user?.lastName }}
            </h2>
            <p class="text-habit-text-subtle text-sm mt-0.5">
              {{ user?.email }}
            </p>
            <div
              class="flex items-center justify-center sm:justify-start gap-2 mt-2"
            >
              <span
                :class="[
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  roleBadgeClass,
                ]"
              >
                {{ roleLabel }}
              </span>
              <span
                v-if="(user as any)?.status === 'active' || user?.isActive"
                class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400"
              >
                Attivo
              </span>
            </div>
            <p class="text-habit-text-subtle text-xs mt-2.5">
              Membro dal {{ formatDate(user?.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <!-- ==================== SECTION 2: PERSONAL INFO ==================== -->
      <div
        class="bg-habit-card border border-habit-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-lg bg-habit-cyan/10 flex items-center justify-center flex-shrink-0"
            >
              <PencilIcon class="w-4 h-4 text-habit-cyan" />
            </div>
            <h2 class="text-habit-text font-semibold text-sm sm:text-base">
              Informazioni Personali
            </h2>
          </div>
          <button
            v-if="!editingProfile"
            @click="startEdit"
            class="text-xs text-habit-cyan hover:text-cyan-300 transition-colors font-medium"
          >
            Modifica
          </button>
        </div>

        <!-- View Mode -->
        <div
          v-if="!editingProfile"
          class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
        >
          <div>
            <p
              class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5"
            >
              Nome
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ user?.firstName || "-" }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5"
            >
              Cognome
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ user?.lastName || "-" }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5"
            >
              Email
            </p>
            <div class="flex items-center gap-1.5">
              <p class="text-habit-text text-sm truncate">
                {{ user?.email || "-" }}
              </p>
              <LockClosedIcon
                class="w-3 h-3 text-habit-text-subtle flex-shrink-0"
                title="Non modificabile"
              />
            </div>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5"
            >
              Telefono
            </p>
            <p class="text-habit-text text-sm">
              {{ user?.phone || "Non impostato" }}
            </p>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="space-y-3 sm:space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
                >Nome *</label
              >
              <input
                v-model="profileForm.firstName"
                type="text"
                autocomplete="given-name"
                class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/30 outline-none transition-colors"
              />
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
                >Cognome *</label
              >
              <input
                v-model="profileForm.lastName"
                type="text"
                autocomplete="family-name"
                class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/30 outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label
              class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
              >Telefono</label
            >
            <input
              v-model="profileForm.phone"
              type="tel"
              autocomplete="tel"
              placeholder="+39 333 1234567"
              class="w-full sm:w-72 bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-habit-cyan focus:ring-1 focus:ring-habit-cyan/30 outline-none transition-colors"
            />
          </div>
          <p class="text-habit-text-subtle text-xs flex items-center gap-1">
            <LockClosedIcon class="w-3 h-3 flex-shrink-0" /> L'email non puo
            essere modificata
          </p>
          <div class="flex gap-3 pt-1">
            <button
              @click="cancelEdit"
              class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="saveProfile"
              :disabled="
                saving || !profileForm.firstName || !profileForm.lastName
              "
              class="px-5 py-2 bg-habit-cyan text-white rounded-xl hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ saving ? "Salvataggio..." : "Salva" }}
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== SECTION 3: BUSINESS INFO (tenant_owner only) ==================== -->
      <div
        v-if="isTenantOwner"
        class="bg-habit-card border border-habit-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-lg bg-habit-orange/10 flex items-center justify-center flex-shrink-0"
            >
              <BuildingOfficeIcon class="w-4 h-4 text-habit-orange" />
            </div>
            <h2 class="text-habit-text font-semibold text-sm sm:text-base">
              Info Business
            </h2>
          </div>
          <button
            v-if="!editingBusiness"
            @click="editingBusiness = true"
            class="text-xs text-habit-orange hover:text-orange-400 transition-colors font-medium"
          >
            Modifica
          </button>
        </div>

        <!-- View mode -->
        <div
          v-if="!editingBusiness"
          class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
        >
          <div>
            <p
              class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5"
            >
              Nome Attivita
            </p>
            <p class="text-habit-text text-sm font-medium">
              {{ businessForm.businessName || "-" }}
            </p>
          </div>
          <div>
            <p
              class="text-habit-text-subtle text-[11px] uppercase tracking-wide mb-0.5"
            >
              Telefono Business
            </p>
            <p class="text-habit-text text-sm">
              {{ businessForm.phone || "Non impostato" }}
            </p>
          </div>
        </div>

        <!-- Edit mode -->
        <div v-else class="space-y-3 sm:space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
                >Nome Attivita *</label
              >
              <input
                v-model="businessForm.businessName"
                type="text"
                class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-habit-orange focus:ring-1 focus:ring-habit-orange/30 outline-none transition-colors"
              />
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
                >Telefono Business</label
              >
              <input
                v-model="businessForm.phone"
                type="tel"
                placeholder="+39 02 1234567"
                class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-habit-orange focus:ring-1 focus:ring-habit-orange/30 outline-none transition-colors"
              />
            </div>
          </div>
          <div class="flex gap-3 pt-1">
            <button
              @click="editingBusiness = false"
              class="px-4 py-2 border border-habit-border text-habit-text-muted rounded-xl hover:bg-habit-card-hover transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              @click="saveBusinessInfo"
              :disabled="savingBusiness || !businessForm.businessName"
              class="px-5 py-2 bg-habit-orange text-white rounded-xl hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ savingBusiness ? "Salvataggio..." : "Salva" }}
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== SECTION 4: NOTIFICATION PREFERENCES ==================== -->
      <div
        class="bg-habit-card border border-habit-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
      >
        <div class="flex items-center gap-2 mb-4 sm:mb-5">
          <div
            class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0"
          >
            <BellIcon class="w-4 h-4 text-emerald-400" />
          </div>
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">
            Preferenze Notifiche
          </h2>
          <span
            v-if="savingNotif"
            class="text-habit-text-subtle text-[11px] ml-auto"
            >Salvataggio...</span
          >
        </div>

        <!-- Canali -->
        <div class="mb-4">
          <div class="flex items-center gap-1.5 mb-2.5">
            <DevicePhoneMobileIcon
              class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0"
            />
            <p
              class="text-habit-text-muted text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold"
            >
              Canali
            </p>
          </div>
          <div class="space-y-2.5">
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">Email</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.emailEnabled"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">Push</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.pushEnabled"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">In-app</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.inAppEnabled"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
          </div>
        </div>

        <div class="border-t border-habit-border/40 my-3 sm:my-4"></div>

        <!-- Attivita -->
        <div class="mb-4">
          <div class="flex items-center gap-1.5 mb-2.5">
            <BellAlertIcon
              class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0"
            />
            <p
              class="text-habit-text-muted text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold"
            >
              Attivita
            </p>
          </div>
          <div class="space-y-2.5">
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">Promemoria workout</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.workoutReminders"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">Promemoria check-in</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.checkinReminders"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">Achievement e badge</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.achievementNotifications"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
            <label
              class="flex items-center justify-between cursor-pointer py-0.5"
            >
              <span class="text-habit-text text-sm">Messaggi chat</span>
              <div class="relative flex-shrink-0 ml-3">
                <input
                  v-model="notifPrefs.chatNotifications"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
                ></div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
          </div>
        </div>

        <div class="border-t border-habit-border/40 my-3 sm:my-4"></div>

        <!-- Marketing -->
        <div>
          <div class="flex items-center gap-1.5 mb-2.5">
            <MegaphoneIcon
              class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0"
            />
            <p
              class="text-habit-text-muted text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold"
            >
              Marketing
            </p>
          </div>
          <label
            class="flex items-center justify-between cursor-pointer py-0.5"
          >
            <div class="min-w-0 mr-3">
              <span class="text-habit-text text-sm">Email promozionali</span>
              <p class="text-habit-text-subtle text-xs mt-0.5">
                Novita, aggiornamenti e offerte
              </p>
            </div>
            <div class="relative flex-shrink-0">
              <input
                v-model="notifPrefs.marketingEmails"
                type="checkbox"
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-habit-bg-light border border-habit-border rounded-full peer-checked:bg-emerald-500 transition-colors"
              ></div>
              <div
                class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"
              ></div>
            </div>
          </label>
        </div>
      </div>

      <!-- ==================== SECTION 5: SECURITY ==================== -->
      <div
        class="bg-habit-card border border-habit-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
      >
        <div class="flex items-center gap-2 mb-4">
          <div
            class="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0"
          >
            <ShieldCheckIcon class="w-4 h-4 text-yellow-500" />
          </div>
          <h2 class="text-habit-text font-semibold text-sm sm:text-base">
            Sicurezza
          </h2>
        </div>

        <div class="space-y-3 sm:space-y-4">
          <div>
            <label
              class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
              >Password Attuale</label
            >
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Inserisci la password attuale"
              class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-colors"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
                >Nuova Password</label
              >
              <input
                v-model="passwordForm.newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Min. 8 caratteri"
                class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-colors"
              />
              <p
                v-if="
                  passwordForm.newPassword &&
                  passwordForm.newPassword.length < 8
                "
                class="text-red-400 text-xs mt-1"
              >
                Minimo 8 caratteri
              </p>
            </div>
            <div>
              <label
                class="block text-habit-text-subtle text-[11px] uppercase tracking-wide mb-1"
                >Conferma Password</label
              >
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Ripeti password"
                class="w-full bg-habit-bg-light border border-habit-border rounded-xl px-3 py-2.5 text-habit-text text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-colors"
              />
              <p
                v-if="
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword
                "
                class="text-red-400 text-xs mt-1"
              >
                Non coincidono
              </p>
            </div>
          </div>
          <button
            @click="handleChangePassword"
            :disabled="savingPassword || !passwordValid"
            class="px-5 py-2 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            {{ savingPassword ? "Aggiornamento..." : "Cambia Password" }}
          </button>
        </div>
      </div>

      <!-- ==================== SECTION 6: ACCOUNT ==================== -->
      <div
        class="bg-habit-card border border-red-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0"
          >
            <ArrowRightOnRectangleIcon class="w-4 h-4 text-red-400" />
          </div>
          <h2 class="text-red-400 font-semibold text-sm sm:text-base">
            Account
          </h2>
        </div>
        <p class="text-habit-text-subtle text-sm mb-3">
          Disconnetti il tuo account da tutti i dispositivi.
        </p>
        <button
          @click="auth.logout()"
          class="px-4 py-2 border border-red-500/40 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors text-sm font-medium"
        >
          Disconnetti da tutti i dispositivi
        </button>
      </div>
    </div>
  </div>
</template>
