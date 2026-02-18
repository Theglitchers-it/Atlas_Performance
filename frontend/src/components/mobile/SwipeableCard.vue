<script setup lang="ts">
import { ref } from "vue";
import { useNative } from "@/composables/useNative";

const props = withDefaults(
  defineProps<{
    /** Soglia in px per attivare l'azione */
    threshold?: number;
    /** Abilita swipe a sinistra (delete/archive) */
    swipeLeft?: boolean;
    /** Abilita swipe a destra (azione positiva) */
    swipeRight?: boolean;
  }>(),
  {
    threshold: 80,
    swipeLeft: true,
    swipeRight: false,
  },
);

const emit = defineEmits<{
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
}>();

const { hapticFeedback } = useNative();

const offsetX = ref<number>(0);
const startX = ref<number>(0);
const startY = ref<number>(0);
const swiping = ref<boolean>(false);
const isHorizontal = ref<boolean | null>(null);

const onTouchStart = (e: TouchEvent): void => {
  startX.value = e.touches[0].clientX;
  startY.value = e.touches[0].clientY;
  swiping.value = true;
  isHorizontal.value = null;
};

const onTouchMove = (e: TouchEvent): void => {
  if (!swiping.value) return;

  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const diffX = currentX - startX.value;
  const diffY = currentY - startY.value;

  // Determina direzione principale al primo movimento significativo
  if (
    isHorizontal.value === null &&
    (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)
  ) {
    isHorizontal.value = Math.abs(diffX) > Math.abs(diffY);
  }

  // Se lo scroll e verticale, ignora
  if (!isHorizontal.value) return;

  // Limita direzione in base a props
  if (diffX > 0 && !props.swipeRight) return;
  if (diffX < 0 && !props.swipeLeft) return;

  offsetX.value = diffX * 0.7; // Resistenza
};

const onTouchEnd = (): void => {
  if (!swiping.value) return;

  if (Math.abs(offsetX.value) >= props.threshold) {
    hapticFeedback("medium");

    if (offsetX.value < 0 && props.swipeLeft) {
      emit("swipe-left");
    } else if (offsetX.value > 0 && props.swipeRight) {
      emit("swipe-right");
    }
  }

  // Reset
  swiping.value = false;
  isHorizontal.value = null;
  offsetX.value = 0;
};
</script>

<template>
  <div class="relative overflow-hidden rounded-habit-sm">
    <!-- Sfondo azione sinistra (appare con swipe a sinistra) -->
    <div
      v-if="swipeLeft && offsetX < 0"
      class="absolute inset-0 flex items-center justify-end px-6 bg-red-500/90"
    >
      <slot name="left-action">
        <svg
          class="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </slot>
    </div>

    <!-- Sfondo azione destra (appare con swipe a destra) -->
    <div
      v-if="swipeRight && offsetX > 0"
      class="absolute inset-0 flex items-center justify-start px-6 bg-green-500/90"
    >
      <slot name="right-action">
        <svg
          class="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </slot>
    </div>

    <!-- Contenuto card -->
    <div
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      class="relative bg-habit-card touch-pan-y"
      :style="{
        transform: `translateX(${offsetX}px)`,
        transition: swiping ? '' : 'transform 0.3s ease',
      }"
    >
      <slot />
    </div>
  </div>
</template>
