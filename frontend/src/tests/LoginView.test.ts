/**
 * Unit Tests - LoginView.vue
 * Tests login form rendering, validation, auth store interaction, and navigation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import LoginView from "@/views/auth/LoginView.vue";

// Mock vue-router
const mockPush = vi.fn();
const mockRoute = { query: {}, path: "/login" };
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}));

// Mock auth store
const mockLogin = vi.fn();
const mockSocialLogin = vi.fn();
vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    loading: false,
    login: mockLogin,
    socialLogin: mockSocialLogin,
    error: null,
  }),
}));

// Mock vue-toastification
vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("LoginView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockReset();
    mockLogin.mockReset();
    mockSocialLogin.mockReset();
    // Reset route query
    mockRoute.query = {};
  });

  const mountComponent = () => {
    return mount(LoginView, {
      global: {
        stubs: {
          "router-link": {
            template: '<a :href="to"><slot /></a>',
            props: ["to"],
          },
          Transition: {
            template: "<div><slot /></div>",
          },
        },
        plugins: [createPinia()],
      },
    });
  };

  it("renders the login form with email and password fields", () => {
    const wrapper = mountComponent();

    const emailInput = wrapper.find("input#email");
    const passwordInput = wrapper.find("input#password");

    expect(emailInput.exists()).toBe(true);
    expect(passwordInput.exists()).toBe(true);
    expect(emailInput.attributes("type")).toBe("email");
    expect(passwordInput.attributes("type")).toBe("password");
  });

  it('renders a submit button with "Accedi" text', () => {
    const wrapper = mountComponent();

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.exists()).toBe(true);
    expect(submitButton.text()).toContain("Accedi");
  });

  it("shows validation error when submitting empty form", async () => {
    const wrapper = mountComponent();

    const form = wrapper.find("form");
    await form.trigger("submit.prevent");
    await nextTick();

    // The component sets errorMessage when email/password are empty
    expect(wrapper.text()).toContain("Inserisci email e password");
  });

  it("shows error message on failed login", async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: "Credenziali non valide",
    });

    const wrapper = mountComponent();

    // Fill in email and password
    await wrapper.find("input#email").setValue("test@example.com");
    await wrapper.find("input#password").setValue("wrongpassword");

    // Submit the form
    const form = wrapper.find("form");
    await form.trigger("submit.prevent");
    await flushPromises();
    await nextTick();

    expect(mockLogin).toHaveBeenCalledWith("test@example.com", "wrongpassword");
    expect(wrapper.text()).toContain("Credenziali non valide");
  });

  it("navigates to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue({ success: true });

    const wrapper = mountComponent();

    await wrapper.find("input#email").setValue("admin@demo.local");
    await wrapper.find("input#password").setValue("demo1234");

    const form = wrapper.find("form");
    await form.trigger("submit.prevent");
    await flushPromises();

    // Wait for the success animation timeout (600ms)
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(mockLogin).toHaveBeenCalledWith("admin@demo.local", "demo1234");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("renders forgot password and register links", () => {
    const wrapper = mountComponent();
    const html = wrapper.html();

    expect(html).toContain("/forgot-password");
    expect(html).toContain("/register");
    expect(wrapper.text()).toContain("Password dimenticata?");
    expect(wrapper.text()).toContain("Registrati gratuitamente");
  });
});
