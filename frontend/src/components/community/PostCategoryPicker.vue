<script setup lang="ts">
import {
  MegaphoneIcon,
  LightBulbIcon,
  FireIcon,
  TrophyIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowRightIcon,
} from "@heroicons/vue/24/outline";
import type { Component } from "vue";

interface Category {
  value: string;
  label: string;
  icon: Component;
}

interface Props {
  modelValue: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "continue"): void;
  (e: "cancel"): void;
}>();

const categories: Category[] = [
  { value: "announcement", label: "Annunci", icon: MegaphoneIcon },
  { value: "tip", label: "Consigli", icon: LightBulbIcon },
  { value: "motivation", label: "Motivazione", icon: FireIcon },
  { value: "achievement", label: "Traguardi", icon: TrophyIcon },
  { value: "question", label: "Domande", icon: QuestionMarkCircleIcon },
  { value: "post", label: "Generale", icon: ChatBubbleLeftEllipsisIcon },
];
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-bold text-habit-text">Nuovo post</h2>
      <p class="text-sm text-habit-text-muted mt-1">Seleziona la categoria</p>
    </div>

    <div class="grid grid-cols-2 gap-2 sm:gap-3">
      <button
        v-for="cat in categories"
        :key="cat.value"
        type="button"
        @click="emit('update:modelValue', cat.value)"
        :class="[
          'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-colors min-w-0',
          modelValue === cat.value
            ? 'bg-habit-text text-habit-card border-habit-text'
            : 'bg-habit-bg-light text-habit-text border-transparent hover:border-habit-border',
        ]"
      >
        <span
          :class="[
            'w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0',
            modelValue === cat.value
              ? 'bg-habit-card/20'
              : 'bg-habit-card',
          ]"
        >
          <component :is="cat.icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </span>
        <span class="truncate">{{ cat.label }}</span>
      </button>
    </div>

    <div class="flex gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-habit-bg-light text-habit-text-muted hover:text-habit-text transition-colors"
      >
        Annulla
      </button>
      <button
        type="button"
        @click="emit('continue')"
        :disabled="!modelValue"
        :class="[
          'flex-1 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
          modelValue
            ? 'bg-habit-orange text-white hover:opacity-90'
            : 'bg-habit-bg-light text-habit-text-subtle cursor-not-allowed',
        ]"
      >
        Continua
        <ArrowRightIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
