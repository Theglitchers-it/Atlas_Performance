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

interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar: string;
}

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  color: string;
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
        email: "admin@demo.local",
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
  "Gestisci i tuoi clienti con facilita",
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

// ── Testimonials ──
const testimonials: Testimonial[] = [
  {
    name: "Marco R.",
    role: "Personal Trainer, Roma",
    text: "Atlas Performance ha rivoluzionato il modo in cui gestisco i miei 30+ clienti. Risparmo ore ogni settimana!",
    rating: 5,
    avatar: "MR",
  },
  {
    name: "Sara L.",
    role: "PT & Nutrizionista, Milano",
    text: "Le schede personalizzate e il tracking progressi sono incredibili. I miei clienti adorano l'app.",
    rating: 5,
    avatar: "SL",
  },
  {
    name: "Andrea B.",
    role: "Studio Fitness, Napoli",
    text: "Dalla gestione appuntamenti alla fatturazione, tutto in un unico posto. Consigliatissimo.",
    rating: 5,
    avatar: "AB",
  },
];
const currentTestimonial = ref<number>(0);
let testimonialTimer: ReturnType<typeof setInterval> | null = null;

const nextTestimonial = () => {
  currentTestimonial.value =
    (currentTestimonial.value + 1) % testimonials.length;
};

const setTestimonial = (index: number) => {
  currentTestimonial.value = index;
  resetTestimonialTimer();
};

const resetTestimonialTimer = () => {
  if (testimonialTimer) clearInterval(testimonialTimer);
  testimonialTimer = setInterval(nextTestimonial, 5000);
};

// ── Stats Counter ──
const stats: StatItem[] = [
  { value: 1200, suffix: "+", label: "Personal Trainer", color: "#ff4c00" },
  { value: 50000, suffix: "+", label: "Clienti attivi", color: "#0283a7" },
  { value: 1, suffix: "M+", label: "Workout creati", color: "#22c55e" },
];
const countersVisible = ref<boolean>(false);
const animatedValues = ref<number[]>([0, 0, 0]);

const animateCounters = () => {
  if (countersVisible.value) return;
  countersVisible.value = true;

  stats.forEach((stat, index) => {
    const duration = 2000;
    const steps = 60;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      animatedValues.value[index] = Math.round(stat.value * eased);

      if (step >= steps) {
        animatedValues.value[index] = stat.value;
        clearInterval(timer);
      }
    }, duration / steps);
  });
};

const formatNumber = (num: number): string => {
  if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "K";
  return num.toString();
};

// ── Lifecycle ──
onMounted(() => {
  typeNextChar();
  resetTestimonialTimer();
  setTimeout(animateCounters, 1200);
});

onUnmounted(() => {
  if (typingTimer) clearTimeout(typingTimer);
  if (pauseTimeout) clearTimeout(pauseTimeout);
  if (testimonialTimer) clearInterval(testimonialTimer);
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
    showSuccess.value = true;
    await new Promise((resolve) => setTimeout(resolve, 600));
    const rd = route.query.redirect;
    const safeRedirect = (() => {
      if (!rd || typeof rd !== "string") return "/";
      try {
        const url = new URL(rd, window.location.origin);
        return url.origin === window.location.origin ? url.pathname + url.search : "/";
      } catch { return "/"; }
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
    showSuccess.value = true;
    await new Promise((resolve) => setTimeout(resolve, 600));
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
  <div class="auth-gradient-bg py-8 px-4 sm:px-6 lg:px-8">
    <AuthThemeToggle />
    <div class="max-w-md w-full relative z-10">
      <!-- Logo & Title -->
      <div class="text-center mb-6">
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

      <!-- Glass Card -->
      <div
        class="auth-glass-card p-8"
        :class="{ 'auth-form-shake': formShake }"
      >
        <div v-if="showSuccess" class="auth-success-flash"></div>
        <!-- Session Expired Alert -->
        <div
          v-if="route.query.expired"
          role="alert"
          class="mb-5 p-3.5 bg-[#ff4c00]/10 border border-[#ff4c00]/25 rounded-xl flex items-center gap-3"
        >
          <svg
            class="w-5 h-5 text-[#ff4c00] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm text-[#ff4c00]">
            La tua sessione e' scaduta. Effettua nuovamente l'accesso.
          </p>
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
            class="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#ff4c00]/10 to-[#0283a7]/10 border border-[#ff4c00]/20 rounded-xl text-sm text-habit-text/70 hover:text-habit-text hover:border-[#ff4c00]/40 transition-all duration-200"
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
            <div v-if="showDemoAccounts" class="mt-3 grid grid-cols-2 gap-2">
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

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Email -->
          <div class="auth-input-group">
            <label
              for="email"
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
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                class="w-full pl-11 pr-4 py-3 text-sm"
                placeholder="nome@esempio.com"
                @focus="focusedField = 'email'"
                @blur="focusedField = ''"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="auth-input-group">
            <label
              for="password"
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
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="w-full pl-11 pr-12 py-3 text-sm"
                placeholder="La tua password"
                @focus="focusedField = 'password'"
                @blur="focusedField = ''"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :aria-label="
                  showPassword ? 'Nascondi password' : 'Mostra password'
                "
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
            class="auth-btn-gradient w-full flex justify-center items-center py-3.5 px-4 text-sm relative focus:outline-none focus:ring-2 focus:ring-[#ff4c00]/40 focus:ring-offset-0"
          >
            <div v-if="isLoading" class="shimmer-overlay"></div>
            <svg
              v-if="isLoading"
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ isLoading ? "Accesso in corso..." : "Accedi" }}
          </button>
        </form>

        <!-- Divider -->
        <div class="auth-divider my-6">
          <span>oppure</span>
        </div>

        <!-- Social Login -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            @click="socialLogin('Google')"
            type="button"
            class="auth-social-btn auth-social-google focus:outline-none focus:ring-0"
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
            @click="socialLogin('GitHub')"
            type="button"
            class="auth-social-btn auth-social-github focus:outline-none focus:ring-0"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
            GitHub
          </button>
          <button
            @click="socialLogin('Discord')"
            type="button"
            class="auth-social-btn auth-social-discord focus:outline-none focus:ring-0"
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

      <!-- Testimonial Carousel -->
      <div class="mt-6">
        <div class="auth-testimonial-card">
          <div class="flex items-start gap-3">
            <!-- Avatar -->
            <div
              class="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff4c00] to-[#ff8c00] flex items-center justify-center"
            >
              <span class="text-white text-xs font-bold">{{
                testimonials[currentTestimonial].avatar
              }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-habit-text/90">{{
                  testimonials[currentTestimonial].name
                }}</span>
                <div class="flex gap-0.5">
                  <svg
                    v-for="s in testimonials[currentTestimonial].rating"
                    :key="s"
                    class="w-3 h-3 text-[#ff8c00]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                </div>
              </div>
              <p class="text-xs text-habit-text/40">
                {{ testimonials[currentTestimonial].role }}
              </p>
              <p class="text-sm text-habit-text/60 mt-2 leading-relaxed italic">
                "{{ testimonials[currentTestimonial].text }}"
              </p>
            </div>
          </div>

          <!-- Dots -->
          <div class="flex items-center justify-center gap-2 mt-4">
            <div
              v-for="(_, idx) in testimonials"
              :key="idx"
              @click="setTestimonial(idx)"
              class="auth-testimonial-dot"
              :class="{ active: currentTestimonial === idx }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Stats Counter -->
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div v-for="(stat, idx) in stats" :key="idx" class="auth-stat-card">
          <div class="text-2xl font-bold" :style="{ color: stat.color }">
            {{
              stat.value >= 1000000
                ? (animatedValues[idx] / 1000000).toFixed(
                    animatedValues[idx] === stat.value ? 0 : 1,
                  )
                : formatNumber(animatedValues[idx])
            }}{{ stat.suffix }}
          </div>
          <div class="text-[11px] text-habit-text/40 mt-1">{{ stat.label }}</div>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-habit-text/25">
        &copy; 2025 Atlas Performance. Tutti i diritti riservati.
      </p>
    </div>
  </div>
</template>
