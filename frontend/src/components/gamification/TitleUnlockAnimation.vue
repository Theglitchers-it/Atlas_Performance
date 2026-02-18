<script setup lang="ts">
/**
 * TitleUnlockAnimation - Animazione sblocco titolo
 * Overlay fullscreen con animazione quando un nuovo titolo viene sbloccato
 */
import { ref, watch, onBeforeUnmount } from "vue";

interface UnlockTitle {
  id: number;
  title_name: string;
  title_description?: string;
  exercise_name?: string;
  rarity: string;
  threshold_value: number;
  metric_type: string;
}

interface RarityConfig {
  label: string;
  color: string;
  gradient: string;
  particles: string;
}

interface Props {
  title?: UnlockTitle | null;
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: null,
  show: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "set-displayed", id: number): void;
}>();

const animationPhase = ref(0); // 0=hidden, 1=background, 2=icon, 3=text, 4=actions
let timer: ReturnType<typeof setTimeout> | null = null;

const rarityConfig: Record<string, RarityConfig> = {
  common: {
    label: "Comune",
    color: "text-habit-text-muted",
    gradient: "from-gray-600 to-gray-700",
    particles: "bg-habit-text-subtle",
  },
  uncommon: {
    label: "Non comune",
    color: "text-green-300",
    gradient: "from-green-700 to-green-800",
    particles: "bg-green-400",
  },
  rare: {
    label: "Raro",
    color: "text-blue-300",
    gradient: "from-blue-700 to-blue-800",
    particles: "bg-blue-400",
  },
  epic: {
    label: "Epico",
    color: "text-purple-300",
    gradient: "from-purple-700 to-purple-800",
    particles: "bg-purple-400",
  },
  legendary: {
    label: "Leggendario",
    color: "text-yellow-300",
    gradient: "from-yellow-600 to-amber-700",
    particles: "bg-yellow-400",
  },
};

const getRarity = (r: string): RarityConfig =>
  rarityConfig[r] || rarityConfig.common;

const startAnimation = (): void => {
  animationPhase.value = 1;
  timer = setTimeout(() => {
    animationPhase.value = 2;
    timer = setTimeout(() => {
      animationPhase.value = 3;
      timer = setTimeout(() => {
        animationPhase.value = 4;
      }, 600);
    }, 500);
  }, 300);
};

const handleClose = (): void => {
  animationPhase.value = 0;
  emit("close");
};

const handleSetDisplayed = (): void => {
  emit("set-displayed", props.title?.id as number);
  handleClose();
};

watch(
  () => props.show,
  (newVal) => {
    if (newVal && props.title) {
      startAnimation();
    } else {
      animationPhase.value = 0;
    }
  },
);

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show && title && animationPhase > 0"
        role="dialog"
        aria-modal="true"
        aria-label="Titolo sbloccato"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="handleClose"
      >
        <!-- Background overlay -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

        <!-- Particles (decorative dots) -->
        <div
          v-if="animationPhase >= 2"
          class="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <div
            v-for="i in 12"
            :key="i"
            :class="[
              'absolute w-1.5 h-1.5 rounded-full opacity-60',
              getRarity(title.rarity).particles,
            ]"
            :style="{
              left: 10 + Math.random() * 80 + '%',
              top: 10 + Math.random() * 80 + '%',
              animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: Math.random() * 2 + 's',
            }"
          ></div>
        </div>

        <!-- Content card -->
        <div
          :class="[
            'relative z-10 max-w-sm w-full mx-4 rounded-2xl border p-8 text-center transition-all duration-500',
            animationPhase >= 2
              ? 'scale-100 opacity-100'
              : 'scale-50 opacity-0',
            `bg-gradient-to-b ${getRarity(title.rarity).gradient}`,
            'border-habit-border',
          ]"
        >
          <!-- Rarity label -->
          <div
            v-if="animationPhase >= 3"
            :class="[
              'text-xs font-bold uppercase tracking-widest mb-4 transition-all duration-500',
              getRarity(title.rarity).color,
              animationPhase >= 3
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4',
            ]"
          >
            {{ getRarity(title.rarity).label }}
          </div>

          <!-- Crown icon -->
          <div
            :class="[
              'text-6xl mb-4 transition-all duration-700',
              animationPhase >= 2
                ? 'scale-100 opacity-100'
                : 'scale-0 opacity-0',
            ]"
            style="text-shadow: 0 0 30px rgba(255, 200, 0, 0.3)"
          >
            &#128081;
          </div>

          <!-- Title text -->
          <div
            :class="[
              'transition-all duration-500',
              animationPhase >= 3
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4',
            ]"
          >
            <div
              class="text-[10px] text-white/50 uppercase tracking-wider mb-1"
            >
              Nuovo Titolo Sbloccato
            </div>
            <h2 class="text-xl font-bold text-white mb-2">
              {{ title.title_name }}
            </h2>
            <p
              v-if="title.title_description"
              class="text-sm text-white/70 mb-1"
            >
              {{ title.title_description }}
            </p>
            <p v-if="title.exercise_name" class="text-xs text-white/50">
              {{ title.exercise_name }}
            </p>
            <div class="flex items-center justify-center gap-2 mt-3">
              <span class="text-sm text-white/60">Soglia:</span>
              <span class="text-sm font-bold text-white"
                >{{ title.threshold_value }}
                {{
                  title.metric_type === "weight_kg"
                    ? "kg"
                    : title.metric_type === "consecutive_days"
                      ? "giorni"
                      : title.metric_type === "reps"
                        ? "reps"
                        : ""
                }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div
            v-if="animationPhase >= 4"
            :class="[
              'flex gap-3 mt-6 transition-all duration-500',
              animationPhase >= 4
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4',
            ]"
          >
            <button
              @click="handleClose"
              class="flex-1 px-4 py-2.5 rounded-xl border border-habit-border-light text-white/70 hover:text-white hover:bg-habit-card-hover text-sm font-medium transition"
            >
              Chiudi
            </button>
            <button
              @click="handleSetDisplayed"
              class="flex-1 px-4 py-2.5 rounded-xl bg-habit-card-hover text-white hover:bg-habit-card-hover/80 text-sm font-medium transition backdrop-blur-sm"
            >
              Imposta Titolo
            </button>
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

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-20px) scale(1.3);
    opacity: 0.8;
  }
}
</style>
