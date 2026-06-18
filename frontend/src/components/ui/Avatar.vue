<script setup lang="ts">
import { computed } from "vue";
import { CheckBadgeIcon } from "@heroicons/vue/24/solid";

interface Props {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  verified?: boolean;
  ring?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  firstName: "",
  lastName: "",
  size: "md",
  verified: false,
  ring: false,
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case "xs": return "w-6 h-6 text-[10px]";
    case "sm": return "w-8 h-8 text-xs";
    case "md": return "w-10 h-10 text-sm";
    case "lg": return "w-12 h-12 text-base";
    case "xl": return "w-16 h-16 text-lg";
    case "2xl": return "w-24 h-24 text-2xl";
  }
});

const badgeSize = computed(() => {
  switch (props.size) {
    case "xs":
    case "sm": return "w-3 h-3 -bottom-0.5 -right-0.5";
    case "md": return "w-4 h-4 -bottom-0.5 -right-0.5";
    case "lg": return "w-5 h-5 -bottom-0.5 -right-0.5";
    case "xl": return "w-6 h-6 bottom-0 right-0";
    case "2xl": return "w-7 h-7 bottom-1 right-1";
  }
});

const initials = computed(() => {
  const f = (props.firstName || "").trim();
  const l = (props.lastName || "").trim();
  if (!f && !l) return "?";
  return `${f[0] || ""}${l[0] || ""}`.toUpperCase();
});

const bgGradient = computed(() => {
  const seed = (props.firstName || props.lastName || "?").charCodeAt(0) % 6;
  const gradients = [
    "from-habit-orange to-pink-500",
    "from-habit-cyan to-blue-600",
    "from-purple-500 to-indigo-600",
    "from-green-500 to-emerald-600",
    "from-yellow-500 to-orange-500",
    "from-rose-500 to-red-600",
  ];
  return gradients[seed];
});
</script>

<template>
  <div class="relative inline-block flex-shrink-0">
    <div
      :class="[
        sizeClasses,
        'rounded-full overflow-hidden flex items-center justify-center font-bold text-white bg-gradient-to-br',
        bgGradient,
        ring ? 'ring-2 ring-habit-orange ring-offset-2 ring-offset-habit-card' : '',
      ]"
    >
      <img
        v-if="src"
        :src="src"
        :alt="`${firstName} ${lastName}`"
        class="w-full h-full object-cover"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span v-else>{{ initials }}</span>
    </div>
    <span
      v-if="verified"
      :class="[
        badgeSize,
        'absolute bg-habit-cyan rounded-full flex items-center justify-center ring-2 ring-habit-card',
      ]"
      aria-label="Verificato"
    >
      <CheckBadgeIcon class="w-full h-full text-white" />
    </span>
  </div>
</template>
