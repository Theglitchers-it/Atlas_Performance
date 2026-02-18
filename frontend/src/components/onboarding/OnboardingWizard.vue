<script setup lang="ts">
/**
 * OnboardingWizard - Full-screen wizard overlay per il primo accesso
 * Mostra step diversi in base al ruolo (owner/client)
 * Salva il completamento in localStorage
 */
import { ref, computed, watch } from "vue";

interface OnboardingStep {
  icon: string;
  title: string;
  description: string;
}

const props = withDefaults(
  defineProps<{
    role?: "owner" | "tenant_owner" | "client";
    visible?: boolean;
  }>(),
  {
    role: "owner",
    visible: false,
  },
);

const emit = defineEmits<{
  (e: "complete"): void;
  (e: "skip"): void;
}>();

const currentIndex = ref<number>(0);

const ownerSteps: OnboardingStep[] = [
  {
    icon: "\u{1F3CB}\u{FE0F}",
    title: "Benvenuto su Atlas!",
    description:
      "La piattaforma completa per gestire i tuoi clienti. Ti guideremo attraverso le funzionalit\u00E0 principali per iniziare subito a lavorare in modo pi\u00F9 efficiente.",
  },
  {
    icon: "\u{1F465}",
    title: "I Tuoi Clienti",
    description:
      "Gestisci tutti i tuoi clienti in un unico posto. Profili dettagliati, progressi, misurazioni e storico allenamenti sempre a portata di mano.",
  },
  {
    icon: "\u{1F4CB}",
    title: "Programmi & Schede",
    description:
      "Crea schede di allenamento personalizzate con il nostro workout builder. Libreria esercizi, template e programmazione periodizzata.",
  },
  {
    icon: "\u{1F4CA}",
    title: "Analytics & Insights",
    description:
      "Dashboard analytics per monitorare i progressi dei tuoi clienti, il volume di lavoro, la retention e molto altro. Dati che fanno la differenza.",
  },
  {
    icon: "\u{1F680}",
    title: "Sei Pronto!",
    description:
      "Hai tutto quello che ti serve per iniziare. Esplora la piattaforma, aggiungi i tuoi primi clienti e costruisci il tuo business.",
  },
];

const clientSteps: OnboardingStep[] = [
  {
    icon: "\u{1F44B}",
    title: "Benvenuto!",
    description:
      "Siamo felici di averti qui. Questa piattaforma ti aiuter\u00E0 a seguire il tuo percorso di allenamento e raggiungere i tuoi obiettivi.",
  },
  {
    icon: "\u{1F4AA}",
    title: "I Tuoi Allenamenti",
    description:
      "Troverai le schede assegnate dal tuo trainer. Registra serie, ripetizioni e carichi per ogni esercizio direttamente dall\u2019app.",
  },
  {
    icon: "\u{2705}",
    title: "Check-in Giornaliero",
    description:
      "Ogni giorno potrai compilare un breve check-in sulla tua readiness: sonno, energia, dolori muscolari. Il tuo trainer li utilizzer\u00E0 per adattare il programma.",
  },
  {
    icon: "\u{1F4C8}",
    title: "Progressi",
    description:
      "Monitora i tuoi progressi nel tempo: peso, misurazioni corporee, PR negli esercizi e tanto altro. Vedrai i risultati del tuo impegno.",
  },
  {
    icon: "\u{26A1}",
    title: "Iniziamo!",
    description:
      "Tutto pronto! Vai alla tua dashboard per vedere i tuoi allenamenti e iniziare il tuo percorso.",
  },
];

const steps = computed<OnboardingStep[]>(() =>
  props.role === "client" ? clientSteps : ownerSteps,
);
const storageKey = computed<string>(
  () =>
    `onboarding_completed_${props.role === "tenant_owner" ? "owner" : props.role}`,
);
const currentStep = computed<OnboardingStep>(
  () => steps.value[currentIndex.value],
);
const slideDirection = ref<"forward" | "backward">("forward");

const nextStep = (): void => {
  if (currentIndex.value < steps.value.length - 1) {
    slideDirection.value = "forward";
    currentIndex.value++;
  } else {
    markComplete();
    emit("complete");
  }
};

const prevStep = (): void => {
  if (currentIndex.value > 0) {
    slideDirection.value = "backward";
    currentIndex.value--;
  }
};

const handleSkip = (): void => {
  markComplete();
  emit("skip");
};

const markComplete = (): void => {
  try {
    localStorage.setItem(storageKey.value, "true");
  } catch (e) {
    // localStorage non disponibile (privacy mode, etc.)
  }
};

// Reset index quando il wizard viene riaperto
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      currentIndex.value = 0;
      slideDirection.value = "forward";
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding wizard"
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div
          class="bg-habit-card rounded-habit-lg max-w-lg w-full shadow-habit-lg overflow-hidden relative"
        >
          <!-- Close / Skip button in corner -->
          <button
            v-if="currentIndex < steps.length - 1"
            @click="handleSkip"
            class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-habit-text-muted hover:text-habit-text hover:bg-habit-card-hover transition-colors z-10"
            aria-label="Salta onboarding"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <!-- Step content -->
          <div class="p-8 pt-10 text-center">
            <!-- Animated icon -->
            <div
              :key="currentIndex"
              class="w-16 h-16 mx-auto rounded-full bg-habit-orange/15 flex items-center justify-center text-2xl mb-6 animate-bounce-in"
            >
              {{ currentStep.icon }}
            </div>

            <!-- Title -->
            <h2
              :key="'title-' + currentIndex"
              class="text-xl font-bold text-habit-text mb-3 animate-fade-in-up"
            >
              {{ currentStep.title }}
            </h2>

            <!-- Description -->
            <p
              :key="'desc-' + currentIndex"
              class="text-habit-text-muted text-sm leading-relaxed max-w-sm mx-auto animate-fade-in-up"
              style="animation-delay: 0.1s"
            >
              {{ currentStep.description }}
            </p>
          </div>

          <!-- Footer: dots + navigation buttons -->
          <div class="px-8 pb-8 flex items-center justify-between">
            <!-- Step indicator dots -->
            <div class="flex gap-2">
              <div
                v-for="(_s, i) in steps"
                :key="i"
                class="h-2 rounded-full transition-all duration-300 cursor-pointer"
                :class="
                  i === currentIndex
                    ? 'bg-habit-orange w-6'
                    : i < currentIndex
                      ? 'bg-habit-orange/40 w-2'
                      : 'bg-habit-skeleton w-2'
                "
                @click="
                  slideDirection = i > currentIndex ? 'forward' : 'backward';
                  currentIndex = i;
                "
              />
            </div>

            <!-- Navigation buttons -->
            <div class="flex items-center gap-3">
              <!-- Back button -->
              <button
                v-if="currentIndex > 0"
                @click="prevStep"
                class="px-4 py-2 text-sm text-habit-text-muted hover:text-habit-text transition-colors rounded-full hover:bg-habit-card-hover"
              >
                Indietro
              </button>

              <!-- Skip button -->
              <button
                v-if="currentIndex < steps.length - 1"
                @click="handleSkip"
                class="text-sm text-habit-text-muted hover:text-habit-text transition-colors"
              >
                Salta
              </button>

              <!-- Next / Finish button -->
              <button
                @click="nextStep"
                class="px-6 py-2 bg-habit-orange text-white rounded-full text-sm font-medium hover:bg-habit-orange-light transition-colors shadow-habit-glow"
              >
                {{ currentIndex === steps.length - 1 ? "Inizia!" : "Avanti" }}
              </button>
            </div>
          </div>

          <!-- Progress bar at bottom -->
          <div class="h-1 bg-habit-skeleton">
            <div
              class="h-full bg-habit-orange transition-all duration-500 ease-out"
              :style="{
                width: ((currentIndex + 1) / steps.length) * 100 + '%',
              }"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Re-trigger animation on key change */
.animate-bounce-in {
  animation: bounceIn 0.5s ease-out both;
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out both;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }

  50% {
    transform: scale(1.05);
  }

  70% {
    transform: scale(0.9);
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
