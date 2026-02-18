<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useNative } from "@/composables/useNative";

withDefaults(
  defineProps<{
    /** Testo accessibile per screen reader */
    label?: string;
    /** Variante estesa con testo visibile (pill shape) */
    extended?: boolean;
    /** Testo visibile nella variante extended */
    text?: string;
  }>(),
  {
    label: "Azione",
    extended: false,
    text: "",
  },
);

const emit = defineEmits<{
  (e: "click"): void;
}>();

const { isMobile, hapticTap } = useNative();

// Auto-hide su scroll down, show su scroll up
const visible = ref<boolean>(true);
let lastScrollY = 0;
let ticking = false;

const onScroll = (): void => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 100) {
      visible.value = false;
    } else {
      visible.value = true;
    }
    lastScrollY = currentY;
    ticking = false;
  });
};

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
});

const handleClick = (): void => {
  hapticTap();
  emit("click");
};
</script>

<template>
  <Transition name="fab">
    <button
      v-if="isMobile && visible"
      class="fixed bottom-20 right-4 z-40 flex items-center justify-center active:scale-95 transition-transform fab-button"
      :class="[
        extended ? 'rounded-full px-5 py-3.5 gap-2' : 'w-14 h-14 rounded-full',
      ]"
      :aria-label="label"
      @click="handleClick"
    >
      <slot>
        <!-- Default plus icon -->
        <svg
          class="w-6 h-6 text-white drop-shadow-sm"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </slot>
      <span v-if="extended && text" class="text-white text-sm font-semibold">{{
        text
      }}</span>
    </button>
  </Transition>
</template>

<style scoped>
.fab-button {
  background: linear-gradient(135deg, #ff4c00 0%, #ff6b2b 100%);
  box-shadow:
    0 4px 14px rgba(255, 76, 0, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.25);
}

:root.dark .fab-button,
.dark .fab-button {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow:
    0 4px 16px rgba(255, 76, 0, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.fab-enter-active {
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease;
}
.fab-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.15s ease;
}
.fab-enter-from {
  transform: scale(0.3) translateY(20px);
  opacity: 0;
}
.fab-leave-to {
  transform: scale(0.8) translateY(10px);
  opacity: 0;
}
</style>
