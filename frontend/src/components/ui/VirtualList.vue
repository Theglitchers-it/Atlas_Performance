<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";

interface Props {
  items?: unknown[];
  itemHeight?: number;
  overscan?: number;
  containerHeight?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  itemHeight: 72,
  overscan: 5,
  containerHeight: "auto",
});

const emit = defineEmits<{
  (e: "scroll-end"): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const scrollTop = ref(0);
const containerSize = ref(0);

// Calcola il range visibile
const totalHeight = computed(() => props.items.length * props.itemHeight);

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight) - props.overscan;
  return Math.max(0, start);
});

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerSize.value / props.itemHeight);
  const end =
    Math.floor(scrollTop.value / props.itemHeight) +
    visibleCount +
    props.overscan;
  return Math.min(props.items.length, end);
});

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value).map((item, i) => ({
    item,
    index: startIndex.value + i,
  }));
});

const offsetY = computed(() => startIndex.value * props.itemHeight);

let raf: number | null = null;
const onScroll = () => {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    if (!containerRef.value) {
      raf = null;
      return;
    }
    scrollTop.value = containerRef.value.scrollTop;

    // Emetti scroll-end quando siamo vicini al fondo (200px)
    const remaining = totalHeight.value - scrollTop.value - containerSize.value;
    if (remaining < 200) {
      emit("scroll-end");
    }
    raf = null;
  });
};

const updateContainerSize = (): void => {
  if (containerRef.value) {
    containerSize.value = containerRef.value.clientHeight;
  }
};

onMounted(() => {
  updateContainerSize();
  window.addEventListener("resize", updateContainerSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateContainerSize);
  if (raf) cancelAnimationFrame(raf);
});

// Ricalcola quando cambia la lista
watch(() => props.items.length, updateContainerSize);

const containerStyle = computed(() => {
  if (props.containerHeight === "auto") {
    return { height: "100%", overflow: "auto" };
  }
  return { height: `${props.containerHeight}px`, overflow: "auto" };
});

// Esponi scroll per PullToRefresh
defineExpose({ containerRef, scrollTop });
</script>

<template>
  <div
    ref="containerRef"
    :style="containerStyle"
    class="overscroll-contain scroll-container"
    @scroll.passive="onScroll"
  >
    <!-- Spacer totale per dimensione scroll -->
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <!-- Items visibili offset -->
      <div :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="{ item, index } in visibleItems"
          :key="index"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="item" :index="index" />
        </div>
      </div>
    </div>
  </div>
</template>
