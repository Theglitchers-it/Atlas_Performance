<script setup lang="ts">
/**
 * FeatureSpotlight - Overlay spotlight per evidenziare elementi della pagina
 * Mostra un cutout attorno all'elemento target con tooltip esplicativo
 * Usa getBoundingClientRect() per posizionamento dinamico
 */
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";

interface SpotlightStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TargetRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const props = withDefaults(
  defineProps<{
    steps: SpotlightStep[];
    visible?: boolean;
  }>(),
  {
    visible: false,
  },
);

const emit = defineEmits<{
  (e: "complete"): void;
  (e: "skip"): void;
}>();

const uid = Math.random().toString(36).substring(2, 9);
const maskId = `spotlight-mask-${uid}`;
const stepIndex = ref<number>(0);
const targetRect = ref<TargetRect | null>(null);
const currentTarget = ref<Element | null>(null);

const PADDING = 8; // px di padding attorno all'elemento evidenziato
const TOOLTIP_OFFSET = 12; // px di distanza tra highlight e tooltip

const currentStepData = computed<SpotlightStep>(
  () => props.steps[stepIndex.value] || ({} as SpotlightStep),
);

// Stile del box highlight attorno all'elemento target
const highlightStyle = computed(() => {
  if (!targetRect.value) return { display: "none" } as Record<string, string>;
  const r = targetRect.value;
  return {
    top: r.top - PADDING + "px",
    left: r.left - PADDING + "px",
    width: r.width + PADDING * 2 + "px",
    height: r.height + PADDING * 2 + "px",
  };
});

// Stile del tooltip posizionato in base a step.position
const tooltipStyle = computed<Record<string, string>>(() => {
  if (!targetRect.value) return { display: "none" };
  const r = targetRect.value;
  const pos = currentStepData.value.position || "bottom";
  const maxWidth = 288; // max-w-xs = 20rem = 320px, usiamo 288 per sicurezza

  let style: Record<string, string> = {};

  switch (pos) {
    case "top":
      style = {
        bottom: window.innerHeight - r.top + TOOLTIP_OFFSET + PADDING + "px",
        left:
          Math.max(
            8,
            Math.min(
              r.left + r.width / 2 - maxWidth / 2,
              window.innerWidth - maxWidth - 8,
            ),
          ) + "px",
      };
      break;
    case "bottom":
      style = {
        top: r.bottom + TOOLTIP_OFFSET + PADDING + "px",
        left:
          Math.max(
            8,
            Math.min(
              r.left + r.width / 2 - maxWidth / 2,
              window.innerWidth - maxWidth - 8,
            ),
          ) + "px",
      };
      break;
    case "left":
      style = {
        top: Math.max(8, r.top + r.height / 2 - 60) + "px",
        right: window.innerWidth - r.left + TOOLTIP_OFFSET + PADDING + "px",
      };
      break;
    case "right":
      style = {
        top: Math.max(8, r.top + r.height / 2 - 60) + "px",
        left: r.right + TOOLTIP_OFFSET + PADDING + "px",
      };
      break;
    default:
      style = {
        top: r.bottom + TOOLTIP_OFFSET + PADDING + "px",
        left:
          Math.max(
            8,
            Math.min(
              r.left + r.width / 2 - maxWidth / 2,
              window.innerWidth - maxWidth - 8,
            ),
          ) + "px",
      };
  }

  return style;
});

// Trova l'elemento target e aggiorna la posizione
const updateTargetPosition = (): void => {
  const step = props.steps[stepIndex.value];
  if (!step) {
    currentTarget.value = null;
    targetRect.value = null;
    return;
  }

  const el = document.querySelector(step.target);
  if (el) {
    currentTarget.value = el;
    const rect = el.getBoundingClientRect();
    targetRect.value = {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
    // Scrolla l'elemento in vista se necessario
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Riaggiorna la posizione dopo lo scroll
      setTimeout(updateTargetPosition, 400);
    }
  } else {
    currentTarget.value = null;
    targetRect.value = null;
  }
};

const next = (): void => {
  if (stepIndex.value < props.steps.length - 1) {
    stepIndex.value++;
  } else {
    emit("complete");
  }
};

const handleSkip = (): void => {
  emit("skip");
};

// Aggiorna posizione al cambio step
watch(stepIndex, async () => {
  await nextTick();
  updateTargetPosition();
});

// Reset e avvia quando diventa visibile
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      stepIndex.value = 0;
      await nextTick();
      updateTargetPosition();
      window.addEventListener("resize", updateTargetPosition);
      window.addEventListener("scroll", updateTargetPosition, true);
      window.addEventListener("keydown", handleKeydown);
    } else {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
      window.removeEventListener("keydown", handleKeydown);
    }
  },
);

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === "Escape") {
    handleSkip();
  }
};

onMounted(() => {
  if (props.visible) {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);
    window.addEventListener("keydown", handleKeydown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateTargetPosition);
  window.removeEventListener("scroll", updateTargetPosition, true);
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="spotlight-fade">
      <div
        v-if="visible && currentTarget"
        role="dialog"
        aria-modal="true"
        aria-label="Guida funzionalita"
        class="fixed inset-0 z-[90]"
      >
        <!-- Dark overlay with pointer to allow clicking through to dismiss -->
        <div
          class="absolute inset-0 bg-black/50 transition-opacity duration-300"
          @click="next"
        />

        <!-- SVG overlay with cutout hole for the target element -->
        <svg
          v-if="targetRect"
          class="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask :id="maskId">
              <rect width="100%" height="100%" fill="white" />
              <rect
                :x="targetRect.left - PADDING"
                :y="targetRect.top - PADDING"
                :width="targetRect.width + PADDING * 2"
                :height="targetRect.height + PADDING * 2"
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="black"
            fill-opacity="0"
            :mask="`url(#${maskId})`"
          />
        </svg>

        <!-- Highlight ring around target element -->
        <div
          class="absolute rounded-lg ring-4 ring-habit-orange shadow-habit-glow pointer-events-none transition-all duration-500 ease-out"
          :style="highlightStyle"
        >
          <!-- Pulse ring animation -->
          <div
            class="absolute inset-0 rounded-lg ring-2 ring-habit-orange/40 animate-ping pointer-events-none"
          />
        </div>

        <!-- Tooltip card -->
        <div
          class="absolute bg-habit-card rounded-habit-sm p-4 shadow-habit-lg max-w-xs transition-all duration-500 ease-out z-10"
          :style="tooltipStyle"
        >
          <!-- Arrow indicator based on position -->
          <div
            v-if="currentStepData.position === 'bottom'"
            class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-habit-card rotate-45 rounded-sm"
          />
          <div
            v-else-if="currentStepData.position === 'top'"
            class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-habit-card rotate-45 rounded-sm"
          />
          <div
            v-else-if="currentStepData.position === 'left'"
            class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-habit-card rotate-45 rounded-sm"
          />
          <div
            v-else-if="currentStepData.position === 'right'"
            class="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-habit-card rotate-45 rounded-sm"
          />

          <!-- Title -->
          <div class="text-sm font-semibold text-habit-text mb-1">
            {{ currentStepData.title }}
          </div>

          <!-- Description -->
          <p class="text-xs text-habit-text-muted leading-relaxed mb-3">
            {{ currentStepData.description }}
          </p>

          <!-- Footer: counter + actions -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-habit-text-subtle font-medium">
              {{ stepIndex + 1 }}/{{ steps.length }}
            </span>
            <div class="flex items-center gap-2">
              <button
                @click.stop="handleSkip"
                class="text-xs text-habit-text-muted hover:text-habit-text transition-colors px-2 py-1 rounded"
              >
                Salta
              </button>
              <button
                @click.stop="next"
                class="text-xs bg-habit-orange text-white px-3 py-1.5 rounded-full font-medium hover:bg-habit-orange-light transition-colors"
              >
                {{ stepIndex === steps.length - 1 ? "Fine" : "Avanti" }}
              </button>
            </div>
          </div>

          <!-- Progress bar mini -->
          <div
            class="mt-3 h-0.5 bg-habit-skeleton rounded-full overflow-hidden"
          >
            <div
              class="h-full bg-habit-orange transition-all duration-300 rounded-full"
              :style="{ width: ((stepIndex + 1) / steps.length) * 100 + '%' }"
            />
          </div>
        </div>

        <!-- Keyboard hint -->
        <div
          class="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/40 pointer-events-none select-none"
        >
          Premi
          <kbd
            class="px-1.5 py-0.5 bg-white/10 rounded text-white/60 font-mono text-[10px]"
            >Esc</kbd
          >
          per saltare
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.spotlight-fade-enter-active,
.spotlight-fade-leave-active {
  transition: opacity 0.3s ease;
}

.spotlight-fade-enter-from,
.spotlight-fade-leave-to {
  opacity: 0;
}

/* Override Tailwind ring on focus for internal buttons */
button:focus {
  outline: none;
  box-shadow: none;
  ring: none;
}
</style>
