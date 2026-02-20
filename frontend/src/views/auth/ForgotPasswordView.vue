<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import AuthThemeToggle from "@/components/auth/AuthThemeToggle.vue";

const email = ref<string>("");
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>("");
const successSent = ref<boolean>(false);
const focusedField = ref<string>("");

const handleSubmit = async () => {
  if (!email.value) {
    errorMessage.value = "Inserisci la tua email";
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await api.post("/auth/forgot-password", { email: email.value });
    successSent.value = true;
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || "Errore durante la richiesta";
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  successSent.value = false;
  email.value = "";
  errorMessage.value = "";
};
</script>

<template>
  <div class="auth-gradient-bg py-12 px-4 sm:px-6 lg:px-8">
    <AuthThemeToggle />
    <!-- Floating Orbs -->
    <div class="auth-orb auth-orb-1 hidden sm:block"></div>
    <div class="auth-orb auth-orb-2 hidden sm:block"></div>
    <div class="auth-orb auth-orb-3 hidden sm:block"></div>

    <div class="max-w-md w-full relative z-10">
      <!-- Logo & Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl sm:text-4xl font-display font-bold">
          <span class="bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent">ATLAS</span>
        </h1>
        <p class="text-sm font-medium text-habit-text/40 tracking-[0.2em] uppercase mt-1">Performance</p>
        <h2 class="text-xl sm:text-2xl font-bold mt-4">
          <span class="text-habit-text">Password </span
          ><span
            class="bg-gradient-to-r from-[#ff4c00] to-[#ff8c00] bg-clip-text text-transparent"
            >dimenticata?</span
          >
        </h2>
        <p class="mt-2 text-habit-text/50 text-sm">
          Ti invieremo le istruzioni per reimpostarla
        </p>
      </div>

      <!-- Glass Card -->
      <div class="auth-glass-card p-8">
        <!-- Success State -->
        <Transition
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="successSent" class="text-center py-4">
            <!-- Animated Checkmark -->
            <div class="mx-auto w-20 h-20 mb-6 relative">
              <div
                class="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"
                style="animation-duration: 2s"
              ></div>
              <div
                class="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-400/30"
              >
                <svg
                  class="w-10 h-10 text-white auth-checkmark-draw"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h3 class="text-xl font-bold text-habit-text mb-2">Email inviata!</h3>
            <p class="text-habit-text/50 text-sm mb-6 leading-relaxed">
              Se l'email esiste nel nostro sistema, riceverai le istruzioni per
              reimpostare la password.
            </p>

            <!-- Email display -->
            <div
              class="inline-flex items-center gap-2 px-4 py-2 bg-habit-text/5 rounded-xl border border-habit-text/10 mb-6"
            >
              <svg
                class="w-4 h-4 text-[#0283a7]"
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
              <span class="text-sm text-habit-text/60"
                >Controlla la tua casella di posta</span
              >
            </div>

            <div class="space-y-3">
              <button
                @click="resetForm"
                class="w-full py-3 px-4 text-sm text-habit-text/60 hover:text-habit-text bg-habit-text/5 hover:bg-habit-text/10 border border-habit-text/10 rounded-xl transition-all duration-200"
              >
                Non hai ricevuto l'email? Riprova
              </button>
              <router-link
                to="/login"
                class="block w-full py-3 px-4 text-sm text-center auth-btn-gradient focus:outline-none focus:ring-2 focus:ring-[#ff4c00]/40 focus:ring-offset-0"
              >
                Torna al login
              </router-link>
            </div>
          </div>
        </Transition>

        <!-- Form State -->
        <div v-if="!successSent">
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

          <!-- Info Box -->
          <div
            class="mb-5 p-3.5 bg-[#0283a7]/10 border border-[#0283a7]/20 rounded-xl flex items-start gap-3"
          >
            <svg
              class="w-5 h-5 text-[#0283a7] flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm text-[#0283a7]/80 leading-relaxed">
              Inserisci l'email associata al tuo account e ti invieremo un link
              per reimpostare la password.
            </p>
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
              <svg
                v-if="!isLoading"
                class="w-4 h-4 mr-2"
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
              {{ isLoading ? "Invio in corso..." : "Invia istruzioni" }}
            </button>
          </form>

          <!-- Back to Login -->
          <div class="mt-6 text-center">
            <router-link
              to="/login"
              class="inline-flex items-center gap-2 text-sm text-habit-text/40 hover:text-habit-text/70 transition-colors"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Torna al login
            </router-link>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-8 text-center text-xs text-habit-text/25">
        &copy; 2025 Atlas Performance. Tutti i diritti riservati.
      </p>
    </div>
  </div>
</template>
