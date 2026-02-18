/**
 * v-tooltip Directive
 * Uso: v-tooltip="'Testo tooltip'"
 *      v-tooltip.bottom="'Testo'"
 *      v-tooltip.left="'Testo'"
 */

import type { Directive, DirectiveBinding } from "vue";

type TooltipPosition = "top" | "bottom" | "left" | "right";

const POSITIONS: TooltipPosition[] = ["top", "bottom", "left", "right"];

interface TooltipHTMLElement extends HTMLElement {
  _tooltipCleanup?: () => void;
}

function getPosition(
  modifiers: DirectiveBinding["modifiers"],
): TooltipPosition {
  for (const pos of POSITIONS) {
    if (modifiers[pos]) return pos;
  }
  return "top";
}

function createTooltipEl(
  text: string,
  position: TooltipPosition,
): HTMLDivElement {
  const tooltip = document.createElement("div");
  tooltip.className = "v-tooltip";
  tooltip.setAttribute("data-position", position);
  tooltip.textContent = text;

  const arrow = document.createElement("div");
  arrow.className = "v-tooltip-arrow";
  tooltip.appendChild(arrow);

  document.body.appendChild(tooltip);
  return tooltip;
}

function positionTooltip(
  tooltip: HTMLElement,
  trigger: HTMLElement,
  position: TooltipPosition,
): void {
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;

  let top: number;
  let left: number;
  let pos: TooltipPosition = position;

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

  // Flip if overflow
  if (top < 0 && pos === "top") {
    pos = "bottom";
    top = triggerRect.bottom + gap;
    tooltip.setAttribute("data-position", pos);
  }
  if (top + tooltipRect.height > window.innerHeight && pos === "bottom") {
    pos = "top";
    top = triggerRect.top - tooltipRect.height - gap;
    tooltip.setAttribute("data-position", pos);
  }
  if (left < 0) left = 4;
  if (left + tooltipRect.width > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 4;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function setupTooltipHandlers(
  el: TooltipHTMLElement,
  binding: DirectiveBinding<string>,
): void {
  const position = getPosition(binding.modifiers);
  let tooltip: HTMLDivElement | null = null;
  let showTimeout: ReturnType<typeof setTimeout> | null = null;

  const showHandler = (): void => {
    if (showTimeout) clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      if (tooltip) {
        tooltip.remove();
      }
      tooltip = createTooltipEl(binding.value, position);
      // Position first (invisible)
      positionTooltip(tooltip, el, position);
      // Show with animation
      requestAnimationFrame(() => {
        if (tooltip) tooltip.classList.add("visible");
      });
    }, 300);
  };

  const hideHandler = (): void => {
    if (showTimeout) clearTimeout(showTimeout);
    if (tooltip) {
      tooltip.classList.remove("visible");
      setTimeout(() => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      }, 200);
    }
  };

  el.addEventListener("mouseenter", showHandler);
  el.addEventListener("mouseleave", hideHandler);
  el.addEventListener("focus", showHandler);
  el.addEventListener("blur", hideHandler);

  // Store cleanup references
  el._tooltipCleanup = (): void => {
    if (showTimeout) clearTimeout(showTimeout);
    el.removeEventListener("mouseenter", showHandler);
    el.removeEventListener("mouseleave", hideHandler);
    el.removeEventListener("focus", showHandler);
    el.removeEventListener("blur", hideHandler);
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  };
}

const tooltipDirective: Directive<TooltipHTMLElement, string> = {
  mounted(el: TooltipHTMLElement, binding: DirectiveBinding<string>): void {
    if (!binding.value) return;
    setupTooltipHandlers(el, binding);
  },

  updated(el: TooltipHTMLElement, binding: DirectiveBinding<string>): void {
    // If value changed, update stored text
    if (binding.value !== binding.oldValue) {
      // Clean old and re-mount
      if (el._tooltipCleanup) {
        el._tooltipCleanup();
      }
      // Re-mount with new value
      if (binding.value) {
        setupTooltipHandlers(el, binding);
      }
    }
  },

  unmounted(el: TooltipHTMLElement): void {
    if (el._tooltipCleanup) {
      el._tooltipCleanup();
      delete el._tooltipCleanup;
    }
  },
};

export default tooltipDirective;
