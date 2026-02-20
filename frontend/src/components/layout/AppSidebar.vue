<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useLocalStorage } from "@vueuse/core";
import { useSidebarStats } from "@/composables/useSidebarStats";
import UpgradeModal from "@/components/ui/UpgradeModal.vue";
import api from "@/services/api";
import {
  HomeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  ChartBarIcon,
  TrophyIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  HeartIcon,
  SparklesIcon,
  UsersIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CurrencyEuroIcon,
  MapPinIcon,
  GiftIcon,
  BeakerIcon,
  DocumentTextIcon,
  ClockIcon,
  AcademicCapIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";

interface Props {
  drawer?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  drawer: false,
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const route = useRoute();
const authStore = useAuthStore();
const chatStore = useChatStore();

const isCollapsed = useLocalStorage("sidebar-collapsed", false);
const isTrainer = computed(() => authStore.isTrainer);
const isSuperAdmin = computed(() => authStore.userRole === "super_admin");
const user = computed(() => authStore.user as Record<string, any> | null);
const showUpgradeModal = ref(false);

const sidebarAvatarUrl = computed(() => {
  const u = user.value as any;
  const rawUrl = u?.avatarUrl || u?.avatar_url;
  if (!rawUrl) return null;
  return rawUrl.startsWith("http")
    ? rawUrl
    : `${api.defaults.baseURL?.replace("/api", "") || ""}${rawUrl}`;
});

// Mostra card upgrade: per tenant_owner su piano free/starter, e per tutti i client
const showUpgradeCard = computed(() => {
  if (authStore.userRole === "super_admin") return false;
  if (authStore.userRole === "client") return true;
  const u = user.value as any;
  const plan = u?.subscription_plan || u?.subscriptionPlan || "free";
  return (
    authStore.userRole === "tenant_owner" && ["free", "starter"].includes(plan)
  );
});

// Sidebar stats composable
const {
  stats: sidebarStats,
  loading: statsLoading,
  roleLabel,
  avatarGradient,
  userInitials,
  stat2AccentClass,
  xpProgress,
  userRole,
} = useSidebarStats();

// ==========================================
// Group color definitions
// ==========================================
const GROUP_COLORS: Record<string, any> = {
  principale: {
    iconBg: "bg-[#ff4c00]/10",
    iconBgActive: "bg-[#ff4c00]/20",
    iconText: "text-[#ff4c00]",
    activeBar: "bg-[#ff4c00]",
    activeBg: "bg-[#ff4c00]/[0.08]",
    hoverBg: "hover:bg-[#ff4c00]/[0.05]",
  },
  gestione: {
    iconBg: "bg-[#0283a7]/10",
    iconBgActive: "bg-[#0283a7]/20",
    iconText: "text-[#0283a7]",
    activeBar: "bg-[#0283a7]",
    activeBg: "bg-[#0283a7]/[0.08]",
    hoverBg: "hover:bg-[#0283a7]/[0.05]",
  },
  salute: {
    iconBg: "bg-emerald-500/10",
    iconBgActive: "bg-emerald-500/20",
    iconText: "text-emerald-500",
    activeBar: "bg-emerald-500",
    activeBg: "bg-emerald-500/[0.08]",
    hoverBg: "hover:bg-emerald-500/[0.05]",
  },
  community: {
    iconBg: "bg-[#8b5cf6]/10",
    iconBgActive: "bg-[#8b5cf6]/20",
    iconText: "text-[#8b5cf6]",
    activeBar: "bg-[#8b5cf6]",
    activeBg: "bg-[#8b5cf6]/[0.08]",
    hoverBg: "hover:bg-[#8b5cf6]/[0.05]",
  },
  analytics: {
    iconBg: "bg-[#3b82f6]/10",
    iconBgActive: "bg-[#3b82f6]/20",
    iconText: "text-[#3b82f6]",
    activeBar: "bg-[#3b82f6]",
    activeBg: "bg-[#3b82f6]/[0.08]",
    hoverBg: "hover:bg-[#3b82f6]/[0.05]",
  },
  impostazioni: {
    iconBg: "bg-habit-text-subtle/10",
    iconBgActive: "bg-habit-text-subtle/20",
    iconText: "text-habit-text-muted",
    activeBar: "bg-habit-text-muted",
    activeBg: "bg-habit-card-hover",
    hoverBg: "hover:bg-habit-card-hover/50",
  },
  admin: {
    iconBg: "bg-purple-500/10",
    iconBgActive: "bg-purple-500/20",
    iconText: "text-purple-400",
    activeBar: "bg-purple-500",
    activeBg: "bg-purple-500/[0.08]",
    hoverBg: "hover:bg-purple-500/[0.05]",
  },
};

// ==========================================
// Drawer-specific colors (bolder, always-colored icons)
// ==========================================
const DRAWER_COLORS: Record<string, any> = {
  principale: {
    iconBg: "bg-[#ff4c00]/15",
    iconBgActive: "bg-[#ff4c00]/25",
    iconText: "text-[#ff4c00]",
    iconTextInactive: "text-[#ff4c00]",
    activeBar: "bg-[#ff4c00]",
    activeBg: "bg-[#ff4c00]/[0.12]",
    hoverBg: "hover:bg-[#ff4c00]/[0.08]",
    dividerColor: "bg-[#ff4c00]",
  },
  gestione: {
    iconBg: "bg-[#0283a7]/15",
    iconBgActive: "bg-[#0283a7]/25",
    iconText: "text-[#0283a7]",
    iconTextInactive: "text-[#0283a7]",
    activeBar: "bg-[#0283a7]",
    activeBg: "bg-[#0283a7]/[0.12]",
    hoverBg: "hover:bg-[#0283a7]/[0.08]",
    dividerColor: "bg-[#0283a7]",
  },
  salute: {
    iconBg: "bg-emerald-500/15",
    iconBgActive: "bg-emerald-500/25",
    iconText: "text-emerald-500",
    iconTextInactive: "text-emerald-500",
    activeBar: "bg-emerald-500",
    activeBg: "bg-emerald-500/[0.12]",
    hoverBg: "hover:bg-emerald-500/[0.08]",
    dividerColor: "bg-emerald-500",
  },
  community: {
    iconBg: "bg-[#8b5cf6]/15",
    iconBgActive: "bg-[#8b5cf6]/25",
    iconText: "text-[#8b5cf6]",
    iconTextInactive: "text-[#8b5cf6]",
    activeBar: "bg-[#8b5cf6]",
    activeBg: "bg-[#8b5cf6]/[0.12]",
    hoverBg: "hover:bg-[#8b5cf6]/[0.08]",
    dividerColor: "bg-[#8b5cf6]",
  },
  analytics: {
    iconBg: "bg-[#3b82f6]/15",
    iconBgActive: "bg-[#3b82f6]/25",
    iconText: "text-[#3b82f6]",
    iconTextInactive: "text-[#3b82f6]",
    activeBar: "bg-[#3b82f6]",
    activeBg: "bg-[#3b82f6]/[0.12]",
    hoverBg: "hover:bg-[#3b82f6]/[0.08]",
    dividerColor: "bg-[#3b82f6]",
  },
  impostazioni: {
    iconBg: "bg-habit-text-subtle/15",
    iconBgActive: "bg-habit-text-subtle/25",
    iconText: "text-habit-text-muted",
    iconTextInactive: "text-habit-text-subtle",
    activeBar: "bg-habit-text-muted",
    activeBg: "bg-habit-card-hover",
    hoverBg: "hover:bg-habit-card-hover/50",
    dividerColor: "bg-habit-text-subtle",
  },
  admin: {
    iconBg: "bg-purple-500/15",
    iconBgActive: "bg-purple-500/25",
    iconText: "text-purple-400",
    iconTextInactive: "text-purple-400",
    activeBar: "bg-purple-500",
    activeBg: "bg-purple-500/[0.12]",
    hoverBg: "hover:bg-purple-500/[0.08]",
    dividerColor: "bg-purple-500",
  },
};

// ==========================================
// Menu structures — grouped
// ==========================================
const trainerMenuGroups = [
  {
    id: "principale",
    label: "Principale",
    color: GROUP_COLORS.principale,
    items: [
      { name: "Dashboard", path: "/", icon: HomeIcon },
      { name: "Calendario", path: "/calendar", icon: CalendarDaysIcon },
    ],
  },
  {
    id: "gestione",
    label: "Gestione",
    color: GROUP_COLORS.gestione,
    items: [
      { name: "Clienti", path: "/clients", icon: UserGroupIcon },
      { name: "Schede", path: "/workouts", icon: ClipboardDocumentListIcon },
      { name: "Esercizi", path: "/exercises", icon: SparklesIcon },
      { name: "Programmi", path: "/programs", icon: CalendarIcon },
      { name: "Sessioni", path: "/sessions", icon: ClockIcon },
    ],
  },
  {
    id: "salute",
    label: "Salute & Nutrizione",
    color: GROUP_COLORS.salute,
    items: [
      { name: "Nutrizione", path: "/nutrition", icon: HeartIcon },
      { name: "Readiness", path: "/readiness", icon: HeartIcon },
    ],
  },
  {
    id: "community",
    label: "Community & Media",
    color: GROUP_COLORS.community,
    items: [
      { name: "Chat", path: "/chat", icon: ChatBubbleLeftRightIcon },
      { name: "Community", path: "/community", icon: UsersIcon },
      { name: "Classi", path: "/classes", icon: AcademicCapIcon },
      { name: "Video", path: "/videos", icon: VideoCameraIcon },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    color: GROUP_COLORS.analytics,
    items: [
      { name: "Analytics", path: "/analytics", icon: ChartBarIcon },
      { name: "Volume", path: "/volume", icon: BeakerIcon },
      { name: "Gamification", path: "/gamification", icon: TrophyIcon },
    ],
  },
  {
    id: "impostazioni",
    label: "Impostazioni",
    color: GROUP_COLORS.impostazioni,
    items: [
      { name: "Sedi", path: "/locations", icon: MapPinIcon },
      { name: "Referral", path: "/referral", icon: GiftIcon },
    ],
  },
];

const clientMenuGroups = [
  {
    id: "principale",
    label: null,
    color: GROUP_COLORS.principale,
    items: [
      { name: "Home", path: "/my-dashboard", icon: HomeIcon },
      {
        name: "Allenamento",
        path: "/my-workout",
        icon: ClipboardDocumentListIcon,
      },
      { name: "Progressi", path: "/my-progress", icon: ChartBarIcon },
      { name: "Check-in", path: "/checkin", icon: HeartIcon },
    ],
  },
  {
    id: "community",
    label: "Community",
    color: GROUP_COLORS.community,
    items: [
      { name: "Chat", path: "/chat", icon: ChatBubbleLeftRightIcon },
      { name: "Community", path: "/community", icon: UsersIcon },
      { name: "Calendario", path: "/calendar", icon: CalendarDaysIcon },
      { name: "Video", path: "/videos", icon: VideoCameraIcon },
      { name: "Badge", path: "/gamification", icon: TrophyIcon },
    ],
  },
];

const adminMenuGroup = {
  id: "admin",
  label: "Admin",
  color: GROUP_COLORS.admin,
  items: [
    { name: "Admin Panel", path: "/admin", icon: ShieldCheckIcon },
    { name: "Tenant", path: "/admin/tenants", icon: BuildingOfficeIcon },
    { name: "Fatturazione", path: "/admin/billing", icon: CurrencyEuroIcon },
    { name: "Audit Log", path: "/admin/audit", icon: DocumentTextIcon },
  ],
};

// Inizializza chat per badge unread
onMounted(() => {
  if (authStore.user) {
    chatStore.connectSocket();
    chatStore.fetchConversations();
  }
});

// Computed menu groups con badge chat iniettato
const menuGroups = computed(() => {
  const base = isSuperAdmin.value
    ? trainerMenuGroups
    : isTrainer.value
      ? trainerMenuGroups
      : clientMenuGroups;

  // Deep clone e inietta badge chat + drawer colors
  const groups = base.map((group) => ({
    ...group,
    color: props.drawer ? DRAWER_COLORS[group.id] || group.color : group.color,
    items: group.items.map((item) => ({
      ...item,
      badge:
        item.path === "/chat" && chatStore.totalUnread > 0
          ? chatStore.totalUnread > 99
            ? "99+"
            : chatStore.totalUnread
          : null,
    })),
  }));

  // Aggiungi admin group per super_admin
  if (isSuperAdmin.value) {
    const adminGroup = { ...adminMenuGroup } as any;
    if (props.drawer)
      adminGroup.color = DRAWER_COLORS.admin || adminGroup.color;
    groups.push(adminGroup);
  }

  return groups;
});

const isActive = (path: string) => {
  if (path === "/" || path === "/my-dashboard") return route.path === path;
  return route.path.startsWith(path);
};

const handleLogout = () => {
  authStore.logout();
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const planLabels: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  professional: "Pro",
  enterprise: "Enterprise",
};
const getPlanLabel = (plan: string | undefined): string =>
  plan ? planLabels[plan] || plan : "";
</script>

<template>
  <aside
    role="navigation"
    aria-label="Menu principale"
    class="bg-habit-card rounded-r-2xl shadow-[4px_0_16px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.2)] overflow-x-hidden transition-all duration-300 flex flex-col"
    :class="[
      drawer
        ? 'h-full w-64'
        : 'fixed left-0 top-16 bottom-0 hidden lg:block z-30',
      !drawer && (isCollapsed ? 'w-14' : 'w-64'),
    ]"
  >
    <!-- Scrollable inner container -->
    <div class="flex-1 overflow-y-auto sidebar-scroll min-h-0">
      <nav
        :class="[
          isCollapsed && !drawer ? 'px-2 py-4' : drawer ? 'px-3 py-3' : 'p-4',
        ]"
      >
        <!-- ============ PROFILE CARD ============ -->

        <!-- Collapsed: avatar + expand toggle -->
        <div
          v-if="isCollapsed && !drawer"
          class="mb-4 flex flex-col items-center gap-2"
        >
          <button
            @click="toggleCollapse"
            :aria-label="'Espandi sidebar'"
            :title="'Espandi'"
            class="relative group p-1.5 rounded-lg text-habit-text-subtle hover:bg-habit-card-hover/50 hover:text-habit-text-muted active:scale-95 transition-all duration-200"
          >
            <ChevronDoubleRightIcon class="w-4 h-4" />
            <div
              class="sidebar-tooltip absolute left-[44px] top-0 px-3 py-2 bg-habit-card border border-habit-border rounded-xl z-[60] shadow-habit-lg whitespace-nowrap"
            >
              <span class="text-habit-text text-sm font-medium"
                >Espandi sidebar</span
              >
            </div>
          </button>
          <router-link to="/profile" class="relative group">
            <img
              v-if="sidebarAvatarUrl"
              :src="sidebarAvatarUrl"
              :alt="userInitials"
              class="w-9 h-9 rounded-xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-110"
            />
            <div
              v-else
              class="w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110"
              :class="avatarGradient"
            >
              <span class="text-white font-semibold text-xs">{{
                userInitials
              }}</span>
            </div>
            <!-- Tooltip -->
            <div
              class="sidebar-tooltip absolute left-full ml-3 top-0 px-3 py-2 bg-habit-card border border-habit-border rounded-xl z-[60] shadow-habit-lg whitespace-nowrap"
            >
              <p class="text-habit-text text-sm font-semibold">
                {{ user?.firstName }} {{ user?.lastName }}
              </p>
              <p class="text-habit-text-subtle text-xs mt-0.5">
                {{ roleLabel }}
              </p>
            </div>
          </router-link>
        </div>

        <!-- Expanded: stats card with collapse toggle inline (desktop only) -->
        <router-link
          v-if="!isCollapsed && !drawer"
          to="/profile"
          class="block mb-4 p-3 bg-habit-bg-light rounded-2xl border border-habit-border/50 hover:border-habit-cyan/30 transition-all duration-300 group"
        >
          <!-- Avatar + Nome + Ruolo + Collapse toggle -->
          <div class="flex items-center gap-2.5 mb-2.5">
            <img
              v-if="sidebarAvatarUrl"
              :src="sidebarAvatarUrl"
              :alt="userInitials"
              class="w-10 h-10 rounded-xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
            />
            <div
              v-else
              class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
              :class="avatarGradient"
            >
              <span class="text-white font-bold text-sm">{{
                userInitials
              }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-habit-text font-semibold text-sm truncate">
                {{ user?.firstName }} {{ user?.lastName }}
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <p class="text-habit-text-subtle text-xs">{{ roleLabel }}</p>
                <span
                  v-if="
                    userRole === 'tenant_owner' &&
                    (user?.subscription_plan || user?.subscriptionPlan)
                  "
                  class="px-1.5 py-0.5 text-[9px] font-semibold rounded-full leading-none"
                  :class="{
                    'bg-purple-500/20 text-purple-400': [
                      'pro',
                      'professional',
                      'enterprise',
                    ].includes(
                      user?.subscription_plan || user?.subscriptionPlan,
                    ),
                    'bg-habit-orange/20 text-habit-orange':
                      (user?.subscription_plan || user?.subscriptionPlan) ===
                      'starter',
                    'bg-gray-500/20 text-gray-400':
                      (user?.subscription_plan || user?.subscriptionPlan) ===
                      'free',
                  }"
                >
                  {{
                    getPlanLabel(
                      user?.subscription_plan || user?.subscriptionPlan,
                    )
                  }}
                </span>
              </div>
            </div>
            <!-- Collapse toggle -->
            <button
              @click.prevent="toggleCollapse"
              :aria-label="'Comprimi sidebar'"
              :title="'Comprimi'"
              class="flex-shrink-0 p-1.5 rounded-lg text-habit-text-subtle hover:bg-habit-card-hover/50 hover:text-habit-text-muted active:scale-95 transition-all duration-200"
            >
              <ChevronDoubleLeftIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2 text-center">
            <div
              class="p-2 bg-habit-card rounded-xl flex flex-col items-center justify-center min-h-[48px]"
            >
              <div
                v-if="statsLoading"
                class="animate-pulse flex flex-col items-center"
              >
                <div class="h-4 w-8 bg-habit-skeleton rounded mb-1"></div>
                <div class="h-3 w-10 bg-habit-skeleton rounded"></div>
              </div>
              <template v-else>
                <p
                  class="text-habit-text font-bold text-sm leading-none mb-0.5"
                >
                  {{ sidebarStats.stat1.value }}
                </p>
                <p class="text-habit-text-subtle text-[10px] leading-none">
                  {{ sidebarStats.stat1.label }}
                </p>
              </template>
            </div>
            <div
              class="p-2 bg-habit-card rounded-xl flex flex-col items-center justify-center min-h-[48px]"
            >
              <div
                v-if="statsLoading"
                class="animate-pulse flex flex-col items-center"
              >
                <div class="h-4 w-8 bg-habit-skeleton rounded mb-1"></div>
                <div class="h-3 w-10 bg-habit-skeleton rounded"></div>
              </div>
              <template v-else>
                <p
                  class="font-bold text-sm leading-none mb-0.5"
                  :class="stat2AccentClass"
                >
                  {{ sidebarStats.stat2.value }}
                </p>
                <p class="text-habit-text-subtle text-[10px] leading-none">
                  {{ sidebarStats.stat2.label }}
                </p>
              </template>
            </div>
          </div>

          <!-- XP Progress Bar (client only) -->
          <div
            v-if="userRole === 'client' && !statsLoading"
            class="mt-2.5 pt-2.5 border-t border-habit-border/50"
          >
            <div
              class="flex items-center justify-between text-[10px] text-habit-text-subtle mb-1"
            >
              <span>XP Progress</span>
              <span class="text-habit-orange font-medium"
                >{{ xpProgress }}%</span
              >
            </div>
            <div class="h-1.5 bg-habit-bg rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-habit-orange to-habit-cyan rounded-full transition-all duration-700 ease-out"
                :style="{ width: `${xpProgress}%` }"
              ></div>
            </div>
          </div>
        </router-link>

        <!-- Drawer: close button + header -->
        <div v-if="drawer" class="flex items-center justify-between mb-2 px-1">
          <span class="font-display font-bold text-lg">
            <span class="bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent">ATLAS</span>
            <span class="text-habit-text/40 font-medium text-xs ml-1 tracking-[0.15em] uppercase">Performance</span>
          </span>
          <button
            @click="emit('close')"
            aria-label="Chiudi menu"
            class="p-1.5 rounded-lg hover:bg-habit-card-hover/50 transition-colors text-habit-text-muted hover:text-habit-text"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Drawer: compact profile row -->
        <router-link
          v-if="drawer"
          to="/profile"
          class="flex items-center gap-3 mb-3 px-2 py-2 rounded-xl hover:bg-habit-card-hover/50 transition-all duration-200 group"
        >
          <img
            v-if="sidebarAvatarUrl"
            :src="sidebarAvatarUrl"
            :alt="userInitials"
            class="w-9 h-9 rounded-xl object-cover shadow-md flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          />
          <div
            v-else
            class="w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            :class="avatarGradient"
          >
            <span class="text-white font-bold text-xs">{{ userInitials }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p
              class="text-habit-text font-semibold text-sm truncate leading-tight"
            >
              {{ user?.firstName }} {{ user?.lastName }}
            </p>
            <span class="text-habit-text-subtle text-[11px]">{{
              roleLabel
            }}</span>
          </div>
          <ChevronRightIcon
            class="w-4 h-4 text-habit-text-subtle group-hover:text-habit-text transition-colors flex-shrink-0"
          />
        </router-link>

        <!-- ============ GROUPED MENU ============ -->

        <div
          v-for="(group, groupIndex) in menuGroups"
          :key="group.id"
          :class="
            groupIndex > 0
              ? isCollapsed && !drawer
                ? 'mt-2'
                : drawer
                  ? 'mt-2'
                  : 'mt-4'
              : ''
          "
        >
          <!-- Section label (desktop expanded only) -->
          <p
            v-if="!isCollapsed && !drawer && group.label"
            class="px-3 mb-1.5 text-[10px] font-semibold text-habit-text-subtle uppercase tracking-wider"
          >
            {{ group.label }}
          </p>

          <!-- Drawer: colored divider with micro-label -->
          <div
            v-if="drawer && groupIndex > 0"
            class="flex items-center gap-2 mx-3 mb-1.5"
          >
            <div
              class="w-6 h-[2px] rounded-full opacity-60"
              :class="group.color.dividerColor"
            ></div>
            <span
              class="text-[9px] font-semibold uppercase tracking-widest opacity-40 text-habit-text-subtle"
              >{{ group.label }}</span
            >
          </div>

          <!-- Collapsed group separator -->
          <div
            v-if="isCollapsed && !drawer && groupIndex > 0"
            class="w-6 h-px bg-habit-border/50 mx-auto mb-2"
          ></div>

          <!-- Items -->
          <ul
            :class="
              isCollapsed && !drawer
                ? 'space-y-1'
                : drawer
                  ? 'space-y-px'
                  : 'space-y-0.5'
            "
          >
            <li v-for="item in group.items" :key="item.path">
              <router-link
                :to="item.path"
                :aria-current="isActive(item.path) ? 'page' : undefined"
                class="relative flex items-center gap-3 transition-all duration-200 group"
                :class="[
                  isCollapsed && !drawer
                    ? 'justify-center p-1.5 rounded-lg'
                    : drawer
                      ? 'px-2.5 py-1.5 min-h-[36px] rounded-xl'
                      : 'px-3 py-2 min-h-[40px] rounded-lg',
                  isActive(item.path)
                    ? [
                        group.color.activeBg,
                        'text-habit-text',
                        drawer ? 'shadow-sm' : '',
                      ]
                    : [
                        'text-habit-text-muted',
                        group.color.hoverBg,
                        'hover:text-habit-text',
                      ],
                ]"
                :title="isCollapsed && !drawer ? item.name : ''"
              >
                <!-- Active bar -->
                <span
                  v-if="isActive(item.path)"
                  :class="[
                    group.color.activeBar,
                    drawer
                      ? 'absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-full'
                      : 'sidebar-active-bar',
                  ]"
                ></span>

                <!-- Icon container -->
                <div
                  class="flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  :class="[
                    isCollapsed && !drawer
                      ? 'w-10 h-10 rounded-xl'
                      : drawer
                        ? 'w-8 h-8 rounded-xl'
                        : 'w-8 h-8 rounded-lg',
                    isActive(item.path)
                      ? group.color.iconBgActive
                      : group.color.iconBg,
                  ]"
                >
                  <component
                    :is="item.icon"
                    class="flex-shrink-0 transition-colors duration-200"
                    :class="[
                      isCollapsed && !drawer
                        ? 'w-5 h-5'
                        : drawer
                          ? 'w-[19px] h-[19px]'
                          : 'w-[18px] h-[18px]',
                      isActive(item.path)
                        ? group.color.iconText
                        : drawer
                          ? [
                              group.color.iconTextInactive,
                              'opacity-70 group-hover:opacity-100',
                            ]
                          : 'text-habit-text-muted group-hover:text-habit-text',
                    ]"
                  />
                </div>

                <!-- Text (expanded) -->
                <span
                  v-if="!isCollapsed || drawer"
                  :class="
                    drawer
                      ? 'text-[13px] font-semibold truncate'
                      : 'text-sm font-medium truncate'
                  "
                >
                  {{ item.name }}
                </span>

                <!-- Badge (expanded) -->
                <span
                  v-if="item.badge && (!isCollapsed || drawer)"
                  class="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-habit-orange/20 text-habit-orange"
                >
                  {{ item.badge }}
                </span>

                <!-- Badge dot (collapsed) -->
                <span
                  v-if="item.badge && isCollapsed && !drawer"
                  class="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-habit-orange rounded-full border-2 border-habit-card"
                ></span>

                <!-- Tooltip (collapsed) -->
                <div
                  v-if="isCollapsed && !drawer"
                  class="sidebar-tooltip absolute left-[60px] px-3 py-2 bg-habit-card border border-habit-border rounded-xl z-[60] shadow-habit-lg whitespace-nowrap"
                >
                  <span class="text-habit-text text-sm font-medium">{{
                    item.name
                  }}</span>
                  <span
                    v-if="item.badge"
                    class="ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-habit-orange/20 text-habit-orange"
                  >
                    {{ item.badge }}
                  </span>
                </div>
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <!-- ============ SETTINGS & LOGOUT (Desktop) — inside scrollable ============ -->
      <div
        v-if="!drawer"
        class="border-t border-habit-border/50"
        :class="isCollapsed ? 'px-2 pt-3 pb-2' : 'px-4 pt-3 pb-2'"
      >
        <ul :class="isCollapsed ? 'space-y-1' : 'space-y-0.5'">
          <!-- Impostazioni -->
          <li>
            <router-link
              to="/settings"
              class="relative flex items-center gap-3 rounded-lg transition-all duration-200 group"
              :class="[
                isCollapsed ? 'justify-center p-1.5' : 'px-3 py-2 min-h-[40px]',
                isActive('/settings')
                  ? 'bg-habit-card-hover text-habit-text'
                  : 'text-habit-text-muted hover:bg-habit-card-hover/50 hover:text-habit-text',
              ]"
              :title="isCollapsed ? 'Impostazioni' : ''"
            >
              <span
                v-if="isActive('/settings')"
                class="sidebar-active-bar bg-habit-text-muted"
              ></span>
              <div
                class="flex items-center justify-center flex-shrink-0 rounded-lg transition-all duration-200"
                :class="
                  isCollapsed
                    ? 'w-10 h-10 rounded-xl bg-habit-text-subtle/10'
                    : 'w-8 h-8 bg-habit-text-subtle/10'
                "
              >
                <Cog6ToothIcon
                  :class="isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'"
                />
              </div>
              <span v-if="!isCollapsed" class="text-sm font-medium"
                >Impostazioni</span
              >
              <div
                v-if="isCollapsed"
                class="sidebar-tooltip absolute left-[60px] px-3 py-2 bg-habit-card border border-habit-border rounded-xl z-[60] shadow-habit-lg whitespace-nowrap"
              >
                <span class="text-habit-text text-sm font-medium"
                  >Impostazioni</span
                >
              </div>
            </router-link>
          </li>

          <!-- Esci -->
          <li>
            <button
              @click="handleLogout"
              aria-label="Disconnettiti"
              class="w-full relative flex items-center gap-3 rounded-lg transition-all duration-200 group text-red-400 hover:bg-red-500/[0.05] hover:text-red-500"
              :class="
                isCollapsed ? 'justify-center p-1.5' : 'px-3 py-2 min-h-[40px]'
              "
              :title="isCollapsed ? 'Esci' : ''"
            >
              <div
                class="flex items-center justify-center flex-shrink-0 rounded-lg bg-red-500/10 transition-all duration-200"
                :class="isCollapsed ? 'w-10 h-10 rounded-xl' : 'w-8 h-8'"
              >
                <ArrowLeftOnRectangleIcon
                  :class="isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'"
                />
              </div>
              <span v-if="!isCollapsed" class="text-sm font-medium">Esci</span>
              <div
                v-if="isCollapsed"
                class="sidebar-tooltip absolute left-[60px] px-3 py-2 bg-habit-card border border-habit-border rounded-xl z-[60] shadow-habit-lg whitespace-nowrap"
              >
                <span class="text-red-400 text-sm font-medium">Esci</span>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <!-- ============ SETTINGS & LOGOUT (Drawer — compact row) — inside scrollable ============ -->
      <div v-if="drawer" class="border-t border-habit-border/50 px-3 py-2">
        <div class="flex items-center gap-2 px-1">
          <router-link
            to="/settings"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-200"
            :class="
              isActive('/settings')
                ? 'bg-habit-card-hover text-habit-text'
                : 'text-habit-text-muted hover:bg-habit-card-hover/50 hover:text-habit-text'
            "
          >
            <Cog6ToothIcon class="w-[18px] h-[18px]" />
            <span class="text-xs font-medium">Impostazioni</span>
          </router-link>
          <div class="w-1 h-1 rounded-full bg-habit-border flex-shrink-0"></div>
          <button
            @click="handleLogout"
            aria-label="Disconnettiti"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/[0.08] hover:text-red-500"
          >
            <ArrowLeftOnRectangleIcon class="w-[18px] h-[18px]" />
            <span class="text-xs font-medium">Esci</span>
          </button>
        </div>
      </div>

      <!-- ============ UPGRADE CARD — inside scrollable ============ -->

      <!-- Desktop expanded -->
      <div
        v-if="!isCollapsed && !drawer && showUpgradeCard"
        class="mx-4 mb-3 p-3.5 bg-gradient-to-br from-habit-orange/20 to-habit-purple/20 rounded-2xl border border-habit-orange/30"
      >
        <div class="text-xl mb-1.5">⭐</div>
        <h4 class="text-habit-text font-semibold text-sm mb-1">Passa a Pro</h4>
        <p class="text-habit-text-muted text-xs mb-3">
          Sblocca tutte le funzionalità premium
        </p>
        <button
          @click="showUpgradeModal = true"
          class="w-full btn-primary btn-sm"
        >
          Scopri di più
        </button>
      </div>

      <!-- Desktop collapsed -->
      <div
        v-if="isCollapsed && !drawer && showUpgradeCard"
        class="mb-3 flex justify-center"
      >
        <button
          @click="showUpgradeModal = true"
          class="relative group w-10 h-10 rounded-xl bg-gradient-to-br from-habit-orange/20 to-habit-purple/20 border border-habit-orange/30 flex items-center justify-center hover:from-habit-orange/30 hover:to-habit-purple/30 transition-all duration-200"
          title="Passa a Pro"
        >
          <span class="text-base">⭐</span>
          <div
            class="sidebar-tooltip absolute left-[60px] px-3 py-2 bg-habit-card border border-habit-border rounded-xl z-[60] shadow-habit-lg whitespace-nowrap"
          >
            <span class="text-habit-text text-sm font-medium">Passa a Pro</span>
          </div>
        </button>
      </div>

      <!-- Drawer: compact single-line upgrade -->
      <button
        v-if="drawer && showUpgradeCard"
        @click="showUpgradeModal = true"
        class="mx-3 mb-3 w-[calc(100%-1.5rem)] flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-habit-orange/15 to-habit-purple/15 rounded-xl border border-habit-orange/20 hover:border-habit-orange/40 transition-all duration-200 group"
      >
        <span class="text-base">⭐</span>
        <span class="text-habit-text font-semibold text-xs flex-1 text-left"
          >Passa a Pro</span
        >
        <ChevronRightIcon
          class="w-3.5 h-3.5 text-habit-orange/60 group-hover:text-habit-orange transition-colors"
        />
      </button>
    </div>

    <!-- toggle rimosso dal fondo, ora e' in alto nella nav -->
  </aside>

  <!-- Upgrade Modal -->
  <UpgradeModal :open="showUpgradeModal" @close="showUpgradeModal = false" />
</template>
