<script setup lang="ts">
import type { Component } from "vue";
import { useNative } from "@/composables/useNative";
import BottomSheet from "./BottomSheet.vue";

interface ActionSheetAction {
  label: string;
  icon?: Component;
  variant?: "default" | "danger";
  handler?: () => void;
}

const props = withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    /** Array di azioni: [{ label, icon?, variant?: 'default'|'danger', handler }] */
    actions?: ActionSheetAction[];
  }>(),
  {
    open: false,
    title: "",
    actions: () => [],
  },
);

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

const { hapticTap } = useNative();

const close = (): void => {
  emit("update:open", false);
};

const handleAction = (action: ActionSheetAction): void => {
  hapticTap();
  close();
  if (action.handler) {
    // Piccolo delay per far finire l'animazione di chiusura
    setTimeout(() => action.handler!(), 200);
  }
};
</script>

<template>
  <BottomSheet
    :open="open"
    :title="title"
    snap-point="half"
    @update:open="emit('update:open', $event)"
  >
    <div class="px-4 py-2">
      <!-- Azioni -->
      <button
        v-for="(action, i) in actions"
        :key="i"
        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors min-h-[56px]"
        :class="[
          action.variant === 'danger'
            ? 'text-red-500 hover:bg-red-500/10 active:bg-red-500/20'
            : 'text-habit-text hover:bg-habit-bg-light active:bg-habit-bg-light/80',
        ]"
        @click="handleAction(action)"
      >
        <!-- Icon slot -->
        <component
          v-if="action.icon"
          :is="action.icon"
          class="w-5 h-5 flex-shrink-0"
        />
        <span class="text-sm font-medium">{{ action.label }}</span>
      </button>

      <!-- Separatore -->
      <div class="my-2 border-t border-habit-border" />

      <!-- Annulla -->
      <button
        class="w-full flex items-center justify-center px-4 py-3.5 rounded-xl text-habit-text-subtle hover:bg-habit-bg-light active:bg-habit-bg-light/80 transition-colors min-h-[56px]"
        @click="close"
      >
        <span class="text-sm font-semibold">Annulla</span>
      </button>
    </div>
  </BottomSheet>
</template>
