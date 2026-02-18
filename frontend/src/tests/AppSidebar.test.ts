/**
 * Unit Tests - AppSidebar.vue
 * Tests navigation items rendering, user role display, and active route highlighting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AppSidebar from "@/components/layout/AppSidebar.vue";

// Mock vue-router
let mockRoutePath = "/";
vi.mock("vue-router", () => ({
  useRoute: () => ({
    path: mockRoutePath,
  }),
}));

// Mock auth store
let mockUserRole = "tenant_owner";
let mockIsTrainer = true;
let mockIsClient = false;
let mockUser: Record<string, any> | null = {
  firstName: "Mario",
  lastName: "Rossi",
  role: "tenant_owner",
};
vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    isTrainer: mockIsTrainer,
    isClient: mockIsClient,
    userRole: mockUserRole,
    user: mockUser,
    logout: vi.fn(),
  }),
}));

// Mock chat store
vi.mock("@/store/chat", () => ({
  useChatStore: () => ({
    totalUnread: 3,
    connectSocket: vi.fn(),
    fetchConversations: vi.fn(),
  }),
}));

// Mock @vueuse/core
vi.mock("@vueuse/core", () => ({
  useLocalStorage: (_key: string, defaultValue: any) => {
    const { ref } = require("vue");
    return ref(defaultValue);
  },
}));

// Mock useSidebarStats composable
vi.mock("@/composables/useSidebarStats", () => ({
  useSidebarStats: () => {
    const { ref, computed } = require("vue");
    return {
      stats: ref({
        stat1: { value: 25, label: "Clienti", icon: "" },
        stat2: { value: 48, label: "Schede", icon: "" },
      }),
      loading: ref(false),
      error: ref(null),
      roleLabel: computed(() => "Personal Trainer"),
      avatarGradient: computed(() => "from-[#ff4c00] to-[#ff8c00]"),
      userInitials: computed(() => "MR"),
      stat2AccentClass: computed(() => "text-habit-orange"),
      xpProgress: ref(0),
      userRole: computed(() => mockUserRole),
      refresh: vi.fn(),
    };
  },
}));

// Mock api service
vi.mock("@/services/api", () => ({
  default: {
    defaults: { baseURL: "http://localhost:3000/api" },
  },
}));

// Mock heroicons
vi.mock("@heroicons/vue/24/outline", () => {
  const iconStub = { template: "<svg />" };
  return {
    HomeIcon: iconStub,
    UserGroupIcon: iconStub,
    ClipboardDocumentListIcon: iconStub,
    CalendarIcon: iconStub,
    CalendarDaysIcon: iconStub,
    ChatBubbleLeftRightIcon: iconStub,
    VideoCameraIcon: iconStub,
    ChartBarIcon: iconStub,
    TrophyIcon: iconStub,
    Cog6ToothIcon: iconStub,
    ArrowLeftOnRectangleIcon: iconStub,
    HeartIcon: iconStub,
    ScaleIcon: iconStub,
    SparklesIcon: iconStub,
    UsersIcon: iconStub,
    ChevronRightIcon: iconStub,
    ChevronDoubleLeftIcon: iconStub,
    ChevronDoubleRightIcon: iconStub,
    ShieldCheckIcon: iconStub,
    BuildingOfficeIcon: iconStub,
    CurrencyEuroIcon: iconStub,
    MapPinIcon: iconStub,
    GiftIcon: iconStub,
    BeakerIcon: iconStub,
    DocumentTextIcon: iconStub,
    ClockIcon: iconStub,
    AcademicCapIcon: iconStub,
    XMarkIcon: iconStub,
  };
});

// Mock UpgradeModal child component
vi.mock("@/components/ui/UpgradeModal.vue", () => ({
  default: {
    template: '<div class="upgrade-modal-mock" />',
  },
}));

describe("AppSidebar", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoutePath = "/";
    mockUserRole = "tenant_owner";
    mockIsTrainer = true;
    mockIsClient = false;
    mockUser = { firstName: "Mario", lastName: "Rossi", role: "tenant_owner" };
  });

  const mountSidebar = (props = {}) => {
    return mount(AppSidebar, {
      props: {
        ...props,
      },
      global: {
        stubs: {
          "router-link": {
            template:
              '<a :href="to" :class="$attrs.class" :aria-current="$attrs[\'aria-current\']"><slot /></a>',
            props: ["to"],
          },
        },
        plugins: [createPinia()],
      },
    });
  };

  it("renders trainer navigation items for tenant_owner role", () => {
    const wrapper = mountSidebar();

    const text = wrapper.text();
    // Trainer menu groups should be displayed
    expect(text).toContain("Dashboard");
    expect(text).toContain("Clienti");
    expect(text).toContain("Schede");
    expect(text).toContain("Calendario");
    expect(text).toContain("Chat");
  });

  it("renders the role label for the user", () => {
    const wrapper = mountSidebar();

    // The sidebar stats composable provides roleLabel = 'Personal Trainer'
    expect(wrapper.text()).toContain("Personal Trainer");
  });

  it("renders user name in the profile card", () => {
    const wrapper = mountSidebar();

    expect(wrapper.text()).toContain("Mario");
    expect(wrapper.text()).toContain("Rossi");
  });

  it("highlights the active route with aria-current attribute", () => {
    mockRoutePath = "/clients";
    const wrapper = mountSidebar();

    // Find the link with aria-current="page"
    const activeLinks = wrapper.findAll('[aria-current="page"]');
    expect(activeLinks.length).toBeGreaterThanOrEqual(1);

    // The active link should be the Clienti item
    const clientsLink = activeLinks.find((link) =>
      link.text().includes("Clienti"),
    );
    expect(clientsLink).toBeDefined();
  });

  it("shows settings and logout items", () => {
    const wrapper = mountSidebar();

    const text = wrapper.text();
    expect(text).toContain("Impostazioni");
    expect(text).toContain("Esci");
  });

  it("has logout button with correct aria-label", () => {
    const wrapper = mountSidebar();

    const logoutBtn = wrapper.find('button[aria-label="Disconnettiti"]');
    expect(logoutBtn.exists()).toBe(true);
  });
});
