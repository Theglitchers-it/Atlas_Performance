<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useToast } from "vue-toastification";
import AuthThemeToggle from "@/components/auth/AuthThemeToggle.vue";

interface DemoAccount {
  role: string;
  label: string;
  email: string;
  password: string;
  icon: string;
  color: string;
  desc: string;
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const email = ref<string>("");
const password = ref<string>("");
const showPassword = ref<boolean>(false);
const rememberMe = ref<boolean>(false);
const errorMessage = ref<string>("");
const focusedField = ref<string>("");
const showDemoAccounts = ref<boolean>(false);

const isLoading = computed(() => authStore.loading);
const formShake = ref<boolean>(false);
const showSuccess = ref<boolean>(false);
const navigating = ref<boolean>(false);

// ── Demo Accounts (solo in development) ──
const demoAccounts: DemoAccount[] = import.meta.env.DEV
  ? [
      {
        role: "super_admin",
        label: "Super Admin",
        email: "superadmin@demo.local",
        password: "demo1234",
        icon: "🛡️",
        color: "#ef4444",
        desc: "Gestione globale piattaforma",
      },
      {
        role: "tenant_owner",
        label: "Personal Trainer",
        email: "personaltrainer@demo.local",
        password: "demo1234",
        icon: "💪",
        color: "#ff4c00",
        desc: "Gestione studio e clienti",
      },
      {
        role: "staff",
        label: "Staff",
        email: "staff@demo.local",
        password: "demo1234",
        icon: "👤",
        color: "#0283a7",
        desc: "Collaboratore dello studio",
      },
      {
        role: "client",
        label: "Cliente",
        email: "client@demo.local",
        password: "demo1234",
        icon: "🏃",
        color: "#22c55e",
        desc: "Vista allenamenti e progressi",
      },
    ]
  : [];

const fillDemoCredentials = (account: DemoAccount) => {
  email.value = account.email;
  password.value = account.password;
  showDemoAccounts.value = false;
  toast.success(`Credenziali ${account.label} inserite!`, { timeout: 1500 });
};

// ── Typing Animation ──
const typingPhrases: string[] = [
  "Gestisci i tuoi clienti con facilità",
  "Traccia i progressi in tempo reale",
  "Fai crescere il tuo business fitness",
  "Crea schede personalizzate in secondi",
  "Monitora performance e obiettivi",
];
const currentPhrase = ref<string>("");
const typingIndex = ref<number>(0);
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let charIndex = 0;
let isDeleting = false;
let pauseTimeout: ReturnType<typeof setTimeout> | null = null;

const typeNextChar = () => {
  const phrase = typingPhrases[typingIndex.value];

  if (!isDeleting) {
    currentPhrase.value = phrase.substring(0, charIndex + 1);
    charIndex++;

    if (charIndex >= phrase.length) {
      pauseTimeout = setTimeout(() => {
        isDeleting = true;
        typeNextChar();
      }, 2200);
      return;
    }
    typingTimer = setTimeout(typeNextChar, 50 + Math.random() * 40);
  } else {
    currentPhrase.value = phrase.substring(0, charIndex - 1);
    charIndex--;

    if (charIndex <= 0) {
      isDeleting = false;
      typingIndex.value = (typingIndex.value + 1) % typingPhrases.length;
      typingTimer = setTimeout(typeNextChar, 400);
      return;
    }
    typingTimer = setTimeout(typeNextChar, 25);
  }
};

// ── Lifecycle ──
onMounted(() => {
  typeNextChar();

  // Anti-autofill: alcuni browser/password manager riempiono i campi
  // anche con autocomplete=off. Forziamo clear dopo il primo paint.
  setTimeout(() => {
    email.value = "";
    password.value = "";
  }, 100);

  authStore.loadOAuthProviders();
});

const googleEnabled = computed(() => authStore.isOAuthProviderEnabled('google'));
const discordEnabled = computed(() => authStore.isOAuthProviderEnabled('discord'));

const onSocialClick = (provider: string) => {
  const enabled = authStore.isOAuthProviderEnabled(provider.toLowerCase());
  if (!enabled) {
    toast.info(`${provider} OAuth non è configurato. Aggiungi le credenziali nel file .env per abilitarlo.`);
    return;
  }
  socialLogin(provider);
};

// Trick readonly→editable: i browser non autofillano i campi readonly.
// Rimuoviamo readonly al primo focus o interazione utente.
const onFieldInteract = (e: FocusEvent | MouseEvent) => {
  const target = e.target as HTMLInputElement;
  if (target && target.hasAttribute("readonly")) {
    target.removeAttribute("readonly");
  }
};

onUnmounted(() => {
  if (typingTimer) clearTimeout(typingTimer);
  if (pauseTimeout) clearTimeout(pauseTimeout);
});

// ── Auth ──
const triggerShake = () => {
  formShake.value = true;
  setTimeout(() => (formShake.value = false), 600);
};

const handleSubmit = async () => {
  errorMessage.value = "";

  if (!email.value || !password.value) {
    errorMessage.value = "Inserisci email e password";
    triggerShake();
    return;
  }

  const result = await authStore.login(email.value, password.value);

  if (result.success) {
    navigating.value = true;
    const rd = route.query.redirect;
    const defaultPath = authStore.userRole === 'client' ? '/my-dashboard' : '/';
    const safeRedirect = (() => {
      if (!rd || typeof rd !== "string") return defaultPath;
      try {
        const url = new URL(rd, window.location.origin);
        return url.origin === window.location.origin ? url.pathname + url.search : defaultPath;
      } catch { return defaultPath; }
    })();
    router.push(safeRedirect);
  } else {
    errorMessage.value = result.message || "";
    triggerShake();
  }
};

const socialLogin = async (provider: string) => {
  const result = await authStore.socialLogin(provider.toLowerCase());
  if (result.success) {
    navigating.value = true;
    const rd = route.query.redirect;
    const safeRedirect = (() => {
      if (!rd || typeof rd !== "string") return "/";
      try {
        const url = new URL(rd, window.location.origin);
        return url.origin === window.location.origin ? url.pathname + url.search : "/";
      } catch { return "/"; }
    })();
    router.push(safeRedirect);
  } else if (result.message !== "Login annullato") {
    errorMessage.value = result.message || "";
    triggerShake();
  }
};
</script>

<template>
  <div class="auth-gradient-bg py-8 px-3 sm:px-6 lg:px-8">
    <!-- Aurora background (3 blur-blobs animati, prefers-reduced-motion safe) -->
    <div class="auth-aurora-layer" aria-hidden="true">
      <div class="auth-aurora-blob blob-1"></div>
      <div class="auth-aurora-blob blob-2"></div>
      <div class="auth-aurora-blob blob-3"></div>
    </div>

    <!-- Navigating: show only logo + spinner -->
    <div v-if="navigating" class="max-w-md w-full relative z-10 flex flex-col items-center justify-center" style="min-height: 60vh;">
      <h1 class="text-3xl sm:text-4xl font-display font-bold mb-4">
        <span class="bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent">ATLAS</span>
      </h1>
      <p class="text-sm font-medium text-habit-text/40 tracking-[0.2em] uppercase mb-6">Performance</p>
      <svg class="animate-spin h-8 w-8 text-[#ff4c00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <template v-else>
    <div class="max-w-md w-full relative z-10">
      <!-- Logo & Title -->
      <div class="relative text-center mb-6">
        <!-- Theme toggle integrato in alto a destra del riquadro -->
        <div class="absolute top-0 right-0">
          <AuthThemeToggle inline />
        </div>
        <h1 class="text-3xl sm:text-4xl font-display font-bold">
          <span class="bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent">ATLAS</span>
        </h1>
        <p class="text-sm font-medium text-habit-text/40 tracking-[0.2em] uppercase mt-1">Performance</p>

        <!-- Typing Animation -->
        <div class="mt-3 h-6 flex items-center justify-center">
          <p class="text-habit-text/50 text-sm">
            {{ currentPhrase }}<span class="auth-typing-cursor"></span>
          </p>
        </div>
      </div>

      <!-- Glass Card con outline gradient 2026 -->
      <div class="auth-glass-shell">
        <div
          class="auth-glass-card p-8"
          :class="{ 'auth-form-shake': formShake }"
        >
        <div v-if="showSuccess" class="auth-success-flash"></div>
        <!-- Session Expired Alert (premium 2026) -->
        <div
          v-if="route.query.expired"
          role="status"
          aria-live="polite"
          class="auth-expired-banner mb-5 flex items-start gap-3"
        >
          <div
            class="auth-expired-icon flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff4c00]/20 to-red-500/15 border border-[#ff4c00]/30 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-[#ff4c00]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l2.5 1.5M12 3a9 9 0 100 18 9 9 0 000-18z"
              />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-[#ff4c00] leading-tight">
              Sessione scaduta
            </p>
            <p class="text-xs text-habit-text/55 mt-0.5 leading-snug">
              Per la tua sicurezza ti abbiamo disconnesso. Effettua di nuovo l'accesso.
            </p>
          </div>
        </div>

        <!-- Error Alert -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="errorMessage"
            role="alert"
            class="mb-5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-3"
          >
            <svg
              class="w-5 h-5 text-red-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p class="text-sm text-red-500 dark:text-red-400">{{ errorMessage }}</p>
          </div>
        </Transition>

        <!-- Demo Accounts Toggle -->
        <div class="mb-5">
          <button
            type="button"
            @click="showDemoAccounts = !showDemoAccounts"
            :aria-expanded="showDemoAccounts ? 'true' : 'false'"
            aria-controls="atlas-demo-accounts-panel"
            class="w-full flex items-center justify-between px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-[#ff4c00]/10 to-[#0283a7]/10 border border-[#ff4c00]/20 rounded-xl text-sm text-habit-text/70 hover:text-habit-text hover:border-[#ff4c00]/40 active:scale-[0.99] transition-all duration-200"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-4 h-4 text-[#ff4c00]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Account Demo
            </span>
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="showDemoAccounts ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <!-- Demo Accounts Grid -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div v-if="showDemoAccounts" id="atlas-demo-accounts-panel" class="mt-3 grid grid-cols-2 gap-2">
              <div
                v-for="account in demoAccounts"
                :key="account.role"
                @click="fillDemoCredentials(account)"
                class="auth-demo-card"
                :class="{ active: email === account.email }"
              >
                <span class="text-xl flex-shrink-0">{{ account.icon }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-habit-text/90 truncate">
                    {{ account.label }}
                  </p>
                  <p class="text-[10px] text-habit-text/40 truncate">
                    {{ account.desc }}
                  </p>
                </div>
              </div>
              <div class="col-span-2 text-center">
                <p class="text-[10px] text-habit-text/30 mt-1">
                  Password:
                  <span class="text-habit-text/50 font-mono">demo1234</span>
                </p>
              </div>
            </div>
          </Transition>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5" autocomplete="off" :aria-busy="isLoading ? 'true' : 'false'">
          <!-- Honeypot: i password manager riempiono questi (primi nel form, nomi standard) e ignorano i campi reali sotto -->
          <input
            type="text"
            name="username"
            autocomplete="username"
            tabindex="-1"
            aria-hidden="true"
            style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"
          />
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            tabindex="-1"
            aria-hidden="true"
            style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"
          />

          <!-- Email -->
          <div class="auth-input-group">
            <label
              for="atlas-login-id"
              class="block text-xs font-medium text-habit-text/50 uppercase tracking-wider mb-2"
              >Email</label
            >
            <div class="relative">
              <svg
                class="auth-input-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                id="atlas-login-id"
                v-model="email"
                type="email"
                name="atlas-login-id"
                autocomplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                readonly
                required
                class="w-full pl-11 pr-4 py-3 text-sm"
                placeholder="nome@esempio.com"
                @focus="onFieldInteract($event); focusedField = 'email'"
                @mousedown="onFieldInteract"
                @blur="focusedField = ''"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="auth-input-group">
            <label
              for="atlas-login-secret"
              class="block text-xs font-medium text-habit-text/50 uppercase tracking-wider mb-2"
              >Password</label
            >
            <div class="relative">
              <svg
                class="auth-input-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                id="atlas-login-secret"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="atlas-login-secret"
                autocomplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                readonly
                required
                class="w-full pl-11 pr-12 py-3 text-sm"
                placeholder="La tua password"
                @focus="onFieldInteract($event); focusedField = 'password'"
                @mousedown="onFieldInteract"
                @blur="focusedField = ''"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :aria-label="
                  showPassword ? 'Nascondi password' : 'Mostra password'
                "
                :aria-pressed="showPassword ? 'true' : 'false'"
                class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-habit-text/30 hover:text-[#0283a7] transition-colors duration-200 focus:outline-none focus:ring-0"
              >
                <svg
                  v-if="!showPassword"
                  class="h-[18px] w-[18px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  v-else
                  class="h-[18px] w-[18px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Remember & Forgot -->
          <div class="flex items-center justify-between">
            <label class="flex items-center cursor-pointer group">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="h-4 w-4 rounded bg-habit-text/5 border-habit-text/15 text-[#0283a7] focus:ring-[#0283a7]/30 focus:ring-offset-0 transition-colors"
              />
              <span
                class="ml-2.5 text-sm text-habit-text/45 group-hover:text-habit-text/60 transition-colors"
                >Ricordami</span
              >
            </label>
            <router-link
              to="/forgot-password"
              class="text-sm text-[#0283a7]/80 hover:text-[#0283a7] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-[#0283a7] hover:after:w-full after:transition-all after:duration-300"
            >
              Password dimenticata?
            </router-link>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isLoading"
            class="auth-btn-gradient w-full inline-flex justify-center items-center gap-2 py-3.5 px-4 text-sm font-semibold relative min-h-[48px] active:scale-[0.985] transition-transform focus:outline-none focus:ring-2 focus:ring-[#ff4c00]/40 focus:ring-offset-0"
          >
            <div v-if="isLoading" class="shimmer-overlay"></div>
            <svg
              v-if="isLoading"
              class="animate-spin h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{{ isLoading ? "Accesso in corso…" : "Accedi" }}</span>
            <svg
              v-if="!isLoading"
              class="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5-5 5M5 12h13" />
            </svg>
          </button>
        </form>

        <!-- Divider -->
        <div class="auth-divider my-6">
          <span>oppure</span>
        </div>

        <!-- Social Login -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            @click="onSocialClick('Google')"
            :disabled="!googleEnabled"
            :title="googleEnabled ? '' : 'Google OAuth non configurato. Aggiungi GOOGLE_CLIENT_ID nel file .env'"
            type="button"
            class="auth-social-btn auth-social-google focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button
            @click="onSocialClick('Discord')"
            :disabled="!discordEnabled"
            :title="discordEnabled ? '' : 'Discord OAuth non configurato. Aggiungi DISCORD_CLIENT_ID nel file .env'"
            type="button"
            class="auth-social-btn auth-social-discord focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
              <path
                d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
              />
            </svg>
            Discord
          </button>
        </div>

        <!-- Register Link -->
        <div class="mt-6 text-center">
          <p class="text-sm text-habit-text/40">
            Non hai un account?
            <router-link
              to="/register"
              class="font-medium text-[#0283a7] hover:text-[#0283a7]/80 transition-colors ml-1"
            >
              Registrati gratuitamente
            </router-link>
          </p>
        </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-habit-text/25">
        &copy; {{ new Date().getFullYear() }} Atlas Performance. Tutti i diritti riservati.
      </p>
    </div>
    </template>
  </div>
</template>
