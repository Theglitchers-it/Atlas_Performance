<script setup lang="ts">
import { ref, computed } from "vue";
import { useNative } from "@/composables/useNative";

const props = withDefaults(
  defineProps<{
    threshold?: number;
    disabled?: boolean;
  }>(),
  {
    threshold: 80,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "refresh", resolve: (value?: unknown) => void): void;
}>();

const { hapticFeedback } = useNative();

const pulling = ref<boolean>(false);
const refreshing = ref<boolean>(false);
const pullDistance = ref<number>(0);
const startY = ref<number>(0);

const pullProgress = computed(() =>
  Math.min(pullDistance.value / props.threshold, 1),
);

const onTouchStart = (e: TouchEvent): void => {
  if (props.disabled || refreshing.value) return;
  // Solo se siamo in cima alla pagina
  const scrollTop =
    (e.currentTarget as HTMLElement).scrollTop || window.scrollY || 0;
  if (scrollTop > 5) return;

  startY.value = e.touches[0].clientY;
  pulling.value = true;
};

const onTouchMove = (e: TouchEvent): void => {
  if (!pulling.value || refreshing.value) return;

  const currentY = e.touches[0].clientY;
  const diff = currentY - startY.value;

  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, props.threshold * 1.5); // Resistenza
  } else {
    pulling.value = false;
    pullDistance.value = 0;
  }
};

const onTouchEnd = async (): Promise<void> => {
  if (!pulling.value) return;

  if (pullDistance.value >= props.threshold) {
    // Trigger refresh
    refreshing.value = true;
    hapticFeedback("medium");

    try {
      await new Promise<void>((resolve) => {
        emit("refresh", resolve as (value?: unknown) => void);
        // Timeout di sicurezza: se il callback non chiama resolve, ferma dopo 10s
        setTimeout(resolve, 10000);
      });
    } finally {
      refreshing.value = false;
    }
  }

  pulling.value = false;
  pullDistance.value = 0;
};
</script>

<template>
  <div
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    class="relative"
  >
    <!-- Indicatore pull-to-refresh -->
    <transition name="fade">
      <div
        v-if="pulling || refreshing"
        class="absolute top-0 left-0 right-0 flex justify-center z-10 pointer-events-none"
        :style="{
          transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        }"
      >
        <div class="mt-2 p-2">
          <div
            class="w-8 h-8 border-2 border-habit-orange rounded-full"
            :class="{
              'animate-spin border-t-transparent': refreshing,
              'border-t-transparent': !refreshing,
            }"
            :style="{
              transform: refreshing ? '' : `rotate(${pullProgress * 360}deg)`,
              opacity: pullProgress,
            }"
          />
        </div>
      </div>
    </transition>

    <!-- Contenuto con offset durante pull -->
    <div
      :style="{
        transform: pulling
          ? `translateY(${Math.min(pullDistance, threshold)}px)`
          : '',
        transition: pulling ? '' : 'transform 0.3s ease',
      }"
    >
      <slot />
    </div>
  </div>
</template>
