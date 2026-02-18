<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useRouter } from "vue-router";

interface Props {
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorInfo {
  message: string;
  info: string;
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: "Si e' verificato un errore",
  fallbackMessage: "Qualcosa e' andato storto. Prova a ricaricare la pagina.",
});

const router = useRouter();
const hasError = ref(false);
const errorInfo = ref<ErrorInfo | null>(null);

onErrorCaptured(
  (err: Error, _instance: ComponentPublicInstance | null, info: string) => {
    hasError.value = true;
    errorInfo.value = {
      message: err?.message || "Errore sconosciuto",
      info: info,
    };
    console.error("[ErrorBoundary] Captured error:", err, info);
    return false;
  },
);

const handleRetry = () => {
  hasError.value = false;
  errorInfo.value = null;
};

const goHome = () => {
  hasError.value = false;
  errorInfo.value = null;
  router.push("/");
};
</script>

<template>
  <slot v-if="!hasError" />
  <div
    v-else
    role="alert"
    class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
  >
    <div
      class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4"
    >
      <svg
        class="w-8 h-8 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <h2 class="text-lg font-semibold text-habit-text mb-2">
      {{ fallbackTitle }}
    </h2>
    <p class="text-habit-text-muted text-sm mb-6 max-w-md">
      {{ fallbackMessage }}
    </p>
    <div class="flex gap-3">
      <button
        @click="handleRetry"
        class="px-5 py-2.5 bg-habit-orange text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
      >
        Riprova
      </button>
      <button
        @click="goHome"
        class="px-5 py-2.5 bg-habit-card border border-habit-border text-habit-text rounded-xl text-sm font-medium hover:bg-habit-card-hover transition-colors"
      >
        Torna alla Dashboard
      </button>
    </div>
    <details v-if="errorInfo" class="mt-4 text-left max-w-md w-full">
      <summary class="text-xs text-habit-text-subtle cursor-pointer">
        Dettagli errore
      </summary>
      <pre
        class="mt-2 p-3 bg-habit-bg-light rounded-lg text-xs text-red-400 overflow-auto max-h-40"
        >{{ errorInfo.message }}
Info: {{ errorInfo.info }}</pre
      >
    </details>
  </div>
</template>
