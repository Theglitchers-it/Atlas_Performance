<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";

const props = withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    /** Snap point iniziale: 'half' (50vh) o 'full' (90vh) */
    snapPoint?: "half" | "full";
    /** Se true, è possibile chiudere trascinando verso il basso */
    closeable?: boolean;
    /** Altezza massima in vh per il punto 'full' */
    maxHeight?: number;
  }>(),
  {
    open: false,
    title: "",
    snapPoint: "half",
    closeable: true,
    maxHeight: 90,
  },
);

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "snap-change", value: string): void;
}>();

// Touch tracking
const dragging = ref<boolean>(false);
const startY = ref<number>(0);
const currentTranslateY = ref<number>(0);
const velocity = ref<number>(0);
const lastY = ref<number>(0);
const lastTime = ref<number>(0);

// Altezze snap point in px
const sheetHeight = computed(() => {
  if (typeof window === "undefined") return 400;
  const vh = window.innerHeight;
  return props.snapPoint === "full" ? vh * (props.maxHeight / 100) : vh * 0.5;
});

// Blocca scroll body quando aperto
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      currentTranslateY.value = 0;
    } else {
      document.body.style.overflow = "";
    }
  },
);

onBeforeUnmount(() => {
  document.body.style.overflow = "";
});

const close = (): void => {
  if (props.closeable) {
    emit("update:open", false);
  }
};

const onBackdropClick = (): void => {
  close();
};

// Touch gesture handlers
const onTouchStart = (e: TouchEvent): void => {
  if (!props.closeable) return;
  const touch = e.touches[0];
  startY.value = touch.clientY;
  lastY.value = touch.clientY;
  lastTime.value = Date.now();
  dragging.value = true;
  velocity.value = 0;
};

const onTouchMove = (e: TouchEvent): void => {
  if (!dragging.value) return;
  const touch = e.touches[0];
  const diff = touch.clientY - startY.value;
  const now = Date.now();
  const dt = now - lastTime.value;

  // Calcola velocità
  if (dt > 0) {
    velocity.value = (touch.clientY - lastY.value) / dt;
  }
  lastY.value = touch.clientY;
  lastTime.value = now;

  // Solo trascinare verso il basso (diff > 0)
  if (diff > 0) {
    currentTranslateY.value = diff * 0.7; // Resistenza
  } else {
    // Espansione leggera verso l'alto con molta resistenza
    currentTranslateY.value = diff * 0.2;
  }
};

const onTouchEnd = (): void => {
  if (!dragging.value) return;
  dragging.value = false;

  const shouldClose =
    currentTranslateY.value > sheetHeight.value * 0.3 || velocity.value > 0.5;

  if (shouldClose && props.closeable) {
    close();
  }

  // Reset translate
  currentTranslateY.value = 0;
};

const sheetStyle = computed(() => {
  const height = sheetHeight.value;
  const base = {
    height: `${height}px`,
    maxHeight: `${props.maxHeight}vh`,
  };

  if (dragging.value) {
    return {
      ...base,
      transform: `translateY(${Math.max(currentTranslateY.value, -50)}px)`,
      transition: "none",
    };
  }
  return base;
});
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="bottomsheet-backdrop">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        @click="onBackdropClick"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="bottomsheet">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        class="fixed bottom-0 left-0 right-0 z-[61] bg-habit-card rounded-t-3xl shadow-2xl safe-bottom overflow-hidden"
        :style="sheetStyle"
      >
        <!-- Drag Handle -->
        <div
          class="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div class="w-10 h-1 bg-habit-text-subtle/30 rounded-full" />
        </div>

        <!-- Header -->
        <div
          v-if="title || $slots.header"
          class="px-4 pb-3 border-b border-habit-border"
        >
          <slot name="header">
            <h3 class="text-base font-semibold text-habit-text text-center">
              {{ title }}
            </h3>
          </slot>
        </div>

        <!-- Content -->
        <div
          class="overflow-y-auto overscroll-contain"
          :style="{ maxHeight: `calc(${maxHeight}vh - 80px)` }"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bottomsheet-enter-active {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.bottomsheet-leave-active {
  transition: transform 0.25s ease-in;
}
.bottomsheet-enter-from,
.bottomsheet-leave-to {
  transform: translateY(100%);
}

.bottomsheet-backdrop-enter-active {
  transition: opacity 0.3s ease;
}
.bottomsheet-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.bottomsheet-backdrop-enter-from,
.bottomsheet-backdrop-leave-to {
  opacity: 0;
}
</style>
