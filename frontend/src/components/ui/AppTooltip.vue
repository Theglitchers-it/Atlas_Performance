<template>
  <div
    class="inline-flex"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot />
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="visible"
          ref="tooltipEl"
          class="v-tooltip visible"
          :data-position="computedPosition"
          :style="tooltipStyle"
        >
          {{ text }}
          <div class="v-tooltip-arrow"></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface Props {
  text: string;
  position?: TooltipPosition;
  delay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  position: "top",
  delay: 300,
});

const visible = ref(false);
const tooltipEl = ref<HTMLDivElement | null>(null);
const tooltipStyle = ref<Record<string, string>>({});
const computedPosition = ref<TooltipPosition>(props.position);
let showTimeout: ReturnType<typeof setTimeout> | null = null;

const show = async (e: MouseEvent | FocusEvent) => {
  if (showTimeout) clearTimeout(showTimeout);
  showTimeout = setTimeout(async () => {
    visible.value = true;
    await nextTick();
    positionTooltip(e);
  }, props.delay);
};

const hide = () => {
  if (showTimeout) clearTimeout(showTimeout);
  visible.value = false;
};

const positionTooltip = (e: MouseEvent | FocusEvent) => {
  if (!tooltipEl.value) return;

  const trigger = (e.currentTarget || e.target) as HTMLElement;
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltipEl.value.getBoundingClientRect();
  const gap = 8;

  let top: number, left: number;
  let pos: TooltipPosition = props.position;

  // Calculate position
  switch (pos) {
    case "top":
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case "bottom":
      top = triggerRect.bottom + gap;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case "left":
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.left - tooltipRect.width - gap;
      break;
    case "right":
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.right + gap;
      break;
  }

  // Flip if out of viewport
  if (top < 0 && pos === "top") {
    pos = "bottom";
    top = triggerRect.bottom + gap;
  }
  if (top + tooltipRect.height > window.innerHeight && pos === "bottom") {
    pos = "top";
    top = triggerRect.top - tooltipRect.height - gap;
  }
  if (left < 0) left = 4;
  if (left + tooltipRect.width > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 4;
  }

  computedPosition.value = pos;
  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
};
</script>
