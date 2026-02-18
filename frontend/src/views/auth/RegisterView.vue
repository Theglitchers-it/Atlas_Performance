<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import type { RegisterForm } from "@/types";

interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

const router = useRouter();
const authStore = useAuthStore();

const formData = ref<RegisterForm & { confirmPassword: string }>({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  businessName: "",
  password: "",
  confirmPassword: "",
});

const showPassword = ref<boolean>(false);
const showConfirmPassword = ref<boolean>(false);
const acceptTerms = ref<boolean>(false);
const errorMessage = ref<string>("");
const errors = ref<Record<string, string>>({});
const focusedField = ref<string>("");
const currentStep = ref<number>(1);
const formShake = ref<boolean>(false);

const isLoading = computed(() => authStore.loading);

// Password strength
const passwordChecks = computed<PasswordChecks>(() => ({
  length: formData.value.password.length >= 8,
  uppercase: /[A-Z]/.test(formData.value.password),
  lowercase: /[a-z]/.test(formData.value.password),
  number: /\d/.test(formData.value.password),
  symbol: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(formData.value.password),
}));

const passwordScore = computed<number>(() => {
  if (!formData.value.password) return 0;
  let score = 0;
  if (passwordChecks.value.length) score++;
  if (passwordChecks.value.uppercase) score++;
  if (passwordChecks.value.number) score++;
  if (passwordChecks.value.symbol) score++;
  return score;
});

const strengthLabel = computed<string>(() => {
  const labels = ["", "Debole", "Media", "Forte", "Ottima"];
  return labels[passwordScore.value];
});

const strengthColor = computed<string>(() => {
  const colors = ["", "#ef4444", "#f97316", "#22c55e", "#10b981"];
  return colors[passwordScore.value];
});

const passwordsMatch = computed<boolean | string>(() => {
  return (
    formData.value.confirmPassword &&
    formData.value.password === formData.value.confirmPassword
  );
});

const validateForm = (): boolean => {
  errors.value = {};

  if (!formData.value.firstName) {
    errors.value.firstName = "Nome obbligatorio";
  }
  if (!formData.value.lastName) {
    errors.value.lastName = "Cognome obbligatorio";
  }
  if (!formData.value.email) {
    errors.value.email = "Email obbligatoria";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = "Email non valida";
  }
  if (!formData.value.businessName) {
    errors.value.businessName = "Nome attivita obbligatorio";
  }
  if (!formData.value.password) {
    errors.value.password = "Password obbligatoria";
  } else if (formData.value.password.length < 8) {
    errors.value.password = "La password deve avere almeno 8 caratteri";
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.value.password)) {
    errors.value.password =
      "La password deve contenere maiuscola, minuscola e numero";
  }
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = "Le password non coincidono";
  }
  if (!acceptTerms.value) {
    errors.value.terms = "Devi accettare i termini e condizioni";
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  errorMessage.value = "";

  if (!validateForm()) {
    return;
  }

  const result = await authStore.register({
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    email: formData.value.email,
    phone: formData.value.phone,
    businessName: formData.value.businessName,
    password: formData.value.password,
  });

  if (result.success) {
    router.push("/");
  } else {
    errorMessage.value = result.message || "";
    formShake.value = true;
    setTimeout(() => (formShake.value = false), 600);
  }
};

const socialLogin = async (provider: string) => {
  const result = await authStore.socialLogin(provider.toLowerCase());
  if (result.success) {
    router.push("/");
  } else if (result.message !== "Login annullato") {
    errorMessage.value = result.message || "";
    formShake.value = true;
    setTimeout(() => (formShake.value = false), 600);
  }
};

const nextStep = () => {
  errors.value = {};
  if (!formData.value.firstName) {
    errors.value.firstName = "Nome obbligatorio";
  }
  if (!formData.value.lastName) {
    errors.value.lastName = "Cognome obbligatorio";
  }
  if (!formData.value.email) {
    errors.value.email = "Email obbligatoria";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = "Email non valida";
  }
  if (!formData.value.businessName) {
    errors.value.businessName = "Nome attivita obbligatorio";
  }

  if (Object.keys(errors.value).length === 0) {
    currentStep.value = 2;
  }
};

const prevStep = () => {
  currentStep.value = 1;
};
</script>

<template>
  <div class="auth-gradient-bg py-8 px-4 sm:px-6 lg:px-8">
    <!-- Floating Orbs -->
    <div class="auth-orb auth-orb-1 hidden sm:block"></div>
    <div class="auth-orb auth-orb-2 hidden sm:block"></div>
    <div class="auth-orb auth-orb-3 hidden sm:block"></div>

    <div class="max-w-md w-full relative z-10">
      <!-- Logo & Title -->
      <div class="text-center mb-6">
        <div
          class="auth-logo-glow mx-auto h-16 w-16 bg-gradient-to-br from-[#ff4c00] to-[#ff8c00] rounded-2xl flex items-center justify-center mb-5 shadow-lg"
        >
          <svg
            class="h-9 w-9 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold">
          <span class="text-white">Crea il tuo </span
          ><span
            class="bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent"
            >Account</span
          >
        </h1>
        <p class="mt-2 text-white/50 text-sm">
          Inizia la prova gratuita di 14 giorni
        </p>
      </div>

      <!-- Step Indicator -->
      <div class="flex items-center justify-center gap-3 mb-6">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            :class="
              currentStep >= 1
                ? 'bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] text-white'
                : 'bg-white/10 text-white/40'
            "
          >
            1
          </div>
          <span class="text-xs text-white/50 hidden sm:inline"
            >Dati personali</span
          >
        </div>
        <div class="w-8 h-px bg-white/20"></div>
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            :class="
              currentStep >= 2
                ? 'bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] text-white'
                : 'bg-white/10 text-white/40'
            "
          >
            2
          </div>
          <span class="text-xs text-white/50 hidden sm:inline">Sicurezza</span>
        </div>
      </div>

      <!-- Glass Card -->
      <div
        class="auth-glass-card p-8"
        :class="{ 'auth-form-shake': formShake }"
      >
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
            <p class="text-sm text-red-400">{{ errorMessage }}</p>
          </div>
        </Transition>

        <form @submit.prevent="handleSubmit">
          <!-- STEP 1: Personal Info -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 translate-x-4"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-4"
          >
            <div v-if="currentStep === 1" class="space-y-4">
              <!-- Name Row -->
              <div class="grid grid-cols-2 gap-3">
                <div class="auth-input-group">
                  <label
                    for="firstName"
                    class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                    >Nome *</label
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <input
                      id="firstName"
                      v-model="formData.firstName"
                      type="text"
                      autocomplete="given-name"
                      class="w-full pl-11 pr-4 py-3 text-sm"
                      :class="errors.firstName ? 'ring-1 ring-red-500/50' : ''"
                      placeholder="Mario"
                      @focus="focusedField = 'firstName'"
                      @blur="focusedField = ''"
                    />
                  </div>
                  <p
                    v-if="errors.firstName"
                    role="alert"
                    class="mt-1 text-xs text-red-400"
                  >
                    {{ errors.firstName }}
                  </p>
                </div>
                <div class="auth-input-group">
                  <label
                    for="lastName"
                    class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                    >Cognome *</label
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <input
                      id="lastName"
                      v-model="formData.lastName"
                      type="text"
                      autocomplete="family-name"
                      class="w-full pl-11 pr-4 py-3 text-sm"
                      :class="errors.lastName ? 'ring-1 ring-red-500/50' : ''"
                      placeholder="Rossi"
                      @focus="focusedField = 'lastName'"
                      @blur="focusedField = ''"
                    />
                  </div>
                  <p
                    v-if="errors.lastName"
                    role="alert"
                    class="mt-1 text-xs text-red-400"
                  >
                    {{ errors.lastName }}
                  </p>
                </div>
              </div>

              <!-- Email -->
              <div class="auth-input-group">
                <label
                  for="email"
                  class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                  >Email *</label
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
                    v-model="formData.email"
                    type="email"
                    autocomplete="email"
                    class="w-full pl-11 pr-4 py-3 text-sm"
                    :class="errors.email ? 'ring-1 ring-red-500/50' : ''"
                    placeholder="nome@esempio.com"
                    @focus="focusedField = 'email'"
                    @blur="focusedField = ''"
                  />
                </div>
                <p
                  v-if="errors.email"
                  role="alert"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ errors.email }}
                </p>
              </div>

              <!-- Phone -->
              <div class="auth-input-group">
                <label
                  for="phone"
                  class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                  >Telefono</label
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <input
                    id="phone"
                    v-model="formData.phone"
                    type="tel"
                    autocomplete="tel"
                    class="w-full pl-11 pr-4 py-3 text-sm"
                    placeholder="+39 333 1234567"
                    @focus="focusedField = 'phone'"
                    @blur="focusedField = ''"
                  />
                </div>
              </div>

              <!-- Business Name -->
              <div class="auth-input-group">
                <label
                  for="businessName"
                  class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                  >Nome Attivita *</label
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <input
                    id="businessName"
                    v-model="formData.businessName"
                    type="text"
                    class="w-full pl-11 pr-4 py-3 text-sm"
                    :class="errors.businessName ? 'ring-1 ring-red-500/50' : ''"
                    placeholder="Fitness Studio Mario"
                    @focus="focusedField = 'businessName'"
                    @blur="focusedField = ''"
                  />
                </div>
                <p
                  v-if="errors.businessName"
                  role="alert"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ errors.businessName }}
                </p>
              </div>

              <!-- Next Step Button -->
              <button
                type="button"
                @click="nextStep"
                class="auth-btn-gradient w-full flex justify-center items-center py-3.5 px-4 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-[#ff4c00]/40 focus:ring-offset-0"
              >
                Continua
                <svg
                  class="w-4 h-4 ml-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- Divider -->
              <div class="auth-divider my-5">
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
            </div>
          </Transition>

          <!-- STEP 2: Password & Terms -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 translate-x-4"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-4"
          >
            <div v-if="currentStep === 2" class="space-y-4">
              <!-- Back button -->
              <button
                type="button"
                @click="prevStep"
                class="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-2"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Indietro
              </button>

              <!-- Password -->
              <div class="auth-input-group">
                <label
                  for="password"
                  class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                  >Password *</label
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
                    v-model="formData.password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="w-full pl-11 pr-12 py-3 text-sm"
                    :class="errors.password ? 'ring-1 ring-red-500/50' : ''"
                    placeholder="Crea una password sicura"
                    @focus="focusedField = 'password'"
                    @blur="focusedField = ''"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    :aria-label="
                      showPassword ? 'Nascondi password' : 'Mostra password'
                    "
                    class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/30 hover:text-[#0283a7] transition-colors duration-200 focus:outline-none focus:ring-0"
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
                <p
                  v-if="errors.password"
                  role="alert"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ errors.password }}
                </p>
              </div>

              <!-- Password Strength Meter -->
              <div v-if="formData.password" class="space-y-3">
                <!-- Strength Bar -->
                <div class="flex items-center gap-2">
                  <div class="flex-1 flex gap-1.5">
                    <div
                      v-for="i in 4"
                      :key="i"
                      class="h-1.5 flex-1 rounded-full overflow-hidden bg-white/10"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-500 ease-out"
                        :style="{
                          width: passwordScore >= i ? '100%' : '0%',
                          backgroundColor:
                            passwordScore >= i ? strengthColor : 'transparent',
                        }"
                      ></div>
                    </div>
                  </div>
                  <span
                    class="text-xs font-medium min-w-[50px] text-right transition-colors duration-300"
                    :style="{ color: strengthColor }"
                    >{{ strengthLabel }}</span
                  >
                </div>

                <!-- Requirements Checklist -->
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div
                    class="flex items-center gap-2 text-xs transition-all duration-300"
                    :class="
                      passwordChecks.length
                        ? 'text-emerald-400'
                        : 'text-white/30'
                    "
                  >
                    <svg
                      class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300"
                      :class="passwordChecks.length ? 'scale-100' : 'scale-75'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        v-if="passwordChecks.length"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                      <circle v-else cx="12" cy="12" r="8" stroke-width="2" />
                    </svg>
                    8+ caratteri
                  </div>
                  <div
                    class="flex items-center gap-2 text-xs transition-all duration-300"
                    :class="
                      passwordChecks.uppercase
                        ? 'text-emerald-400'
                        : 'text-white/30'
                    "
                  >
                    <svg
                      class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300"
                      :class="
                        passwordChecks.uppercase ? 'scale-100' : 'scale-75'
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        v-if="passwordChecks.uppercase"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                      <circle v-else cx="12" cy="12" r="8" stroke-width="2" />
                    </svg>
                    Maiuscola
                  </div>
                  <div
                    class="flex items-center gap-2 text-xs transition-all duration-300"
                    :class="
                      passwordChecks.lowercase
                        ? 'text-emerald-400'
                        : 'text-white/30'
                    "
                  >
                    <svg
                      class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300"
                      :class="
                        passwordChecks.lowercase ? 'scale-100' : 'scale-75'
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        v-if="passwordChecks.lowercase"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                      <circle v-else cx="12" cy="12" r="8" stroke-width="2" />
                    </svg>
                    Minuscola
                  </div>
                  <div
                    class="flex items-center gap-2 text-xs transition-all duration-300"
                    :class="
                      passwordChecks.number
                        ? 'text-emerald-400'
                        : 'text-white/30'
                    "
                  >
                    <svg
                      class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300"
                      :class="passwordChecks.number ? 'scale-100' : 'scale-75'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        v-if="passwordChecks.number"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                      <circle v-else cx="12" cy="12" r="8" stroke-width="2" />
                    </svg>
                    Numero
                  </div>
                  <div
                    class="flex items-center gap-2 text-xs transition-all duration-300 col-span-2"
                    :class="
                      passwordChecks.symbol
                        ? 'text-emerald-400'
                        : 'text-white/30'
                    "
                  >
                    <svg
                      class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300"
                      :class="passwordChecks.symbol ? 'scale-100' : 'scale-75'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        v-if="passwordChecks.symbol"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="3"
                        d="M5 13l4 4L19 7"
                      />
                      <circle v-else cx="12" cy="12" r="8" stroke-width="2" />
                    </svg>
                    Simbolo speciale (!@#$...)
                  </div>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="auth-input-group">
                <label
                  for="confirmPassword"
                  class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                  >Conferma Password *</label
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <input
                    id="confirmPassword"
                    v-model="formData.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="w-full pl-11 pr-12 py-3 text-sm"
                    :class="
                      errors.confirmPassword ? 'ring-1 ring-red-500/50' : ''
                    "
                    placeholder="Ripeti la password"
                    @focus="focusedField = 'confirmPassword'"
                    @blur="focusedField = ''"
                  />
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    :aria-label="
                      showConfirmPassword
                        ? 'Nascondi password'
                        : 'Mostra password'
                    "
                    class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/30 hover:text-[#0283a7] transition-colors duration-200 focus:outline-none focus:ring-0"
                  >
                    <svg
                      v-if="!showConfirmPassword"
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
                  <!-- Match indicator -->
                  <Transition
                    enter-active-class="transition duration-200"
                    enter-from-class="opacity-0 scale-75"
                    enter-to-class="opacity-100 scale-100"
                  >
                    <div
                      v-if="passwordsMatch"
                      class="absolute right-10 top-1/2 -translate-y-1/2"
                    >
                      <svg
                        class="w-5 h-5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2.5"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </Transition>
                </div>
                <p
                  v-if="errors.confirmPassword"
                  role="alert"
                  class="mt-1 text-xs text-red-400"
                >
                  {{ errors.confirmPassword }}
                </p>
              </div>

              <!-- Terms -->
              <div class="pt-1">
                <label class="flex items-start cursor-pointer group">
                  <input
                    v-model="acceptTerms"
                    type="checkbox"
                    class="h-4 w-4 mt-0.5 rounded bg-white/5 border-white/15 text-[#0283a7] focus:ring-[#0283a7]/30 focus:ring-offset-0 transition-colors"
                  />
                  <span
                    class="ml-2.5 text-sm text-white/40 group-hover:text-white/60 transition-colors"
                  >
                    Accetto i
                    <a
                      href="#"
                      class="text-[#0283a7] hover:text-[#0283a7]/80 transition-colors"
                      >Termini di Servizio</a
                    >
                    e la
                    <a
                      href="#"
                      class="text-[#0283a7] hover:text-[#0283a7]/80 transition-colors"
                      >Privacy Policy</a
                    >
                  </span>
                </label>
                <p
                  v-if="errors.terms"
                  role="alert"
                  class="mt-1.5 ml-6.5 text-xs text-red-400"
                >
                  {{ errors.terms }}
                </p>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="isLoading"
                class="auth-btn-gradient w-full flex justify-center items-center py-3.5 px-4 text-sm mt-2 relative focus:outline-none focus:ring-2 focus:ring-[#ff4c00]/40 focus:ring-offset-0"
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
                {{
                  isLoading
                    ? "Registrazione in corso..."
                    : "Crea il tuo account"
                }}
              </button>
            </div>
          </Transition>
        </form>

        <!-- Login Link -->
        <div class="mt-6 text-center">
          <p class="text-sm text-white/40">
            Hai gia un account?
            <router-link
              to="/login"
              class="font-medium text-[#0283a7] hover:text-[#0283a7]/80 transition-colors ml-1"
            >
              Accedi
            </router-link>
          </p>
        </div>
      </div>

      <!-- Features Banner -->
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center"
        >
          <div
            class="text-2xl font-bold bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent"
          >
            14
          </div>
          <div class="text-[11px] text-white/40 mt-0.5">Giorni di prova</div>
        </div>
        <div
          class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center"
        >
          <div class="text-2xl font-bold text-[#0283a7]">5</div>
          <div class="text-[11px] text-white/40 mt-0.5">Clienti inclusi</div>
        </div>
        <div
          class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center"
        >
          <div class="text-2xl font-bold text-emerald-400">0</div>
          <div class="text-[11px] text-white/40 mt-0.5">Costi nascosti</div>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-white/25">
        &copy; 2025 Atlas. Tutti i diritti riservati.
      </p>
    </div>
  </div>
</template>
