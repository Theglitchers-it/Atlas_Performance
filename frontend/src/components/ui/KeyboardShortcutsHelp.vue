<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from "@headlessui/vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  category: string;
  items: ShortcutItem[];
}

interface Props {
  open?: boolean;
}

withDefaults(defineProps<Props>(), {
  open: false,
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const shortcuts: ShortcutGroup[] = [
  {
    category: "Navigazione",
    items: [
      { keys: ["/", "/"], description: "Focus sulla ricerca" },
      { keys: ["?"], description: "Mostra/nascondi questa guida" },
      { keys: ["Esc"], description: "Chiudi modale o menu" },
    ],
  },
  {
    category: "Azioni rapide",
    items: [
      { keys: ["N"], description: "Nuovo elemento (nella pagina corrente)" },
    ],
  },
];
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md bg-habit-card border border-habit-border rounded-habit p-6 shadow-habit-lg"
            >
              <!-- Header -->
              <div class="flex items-center justify-between mb-5">
                <DialogTitle class="text-lg font-semibold text-habit-text">
                  Scorciatoie da tastiera
                </DialogTitle>
                <button
                  @click="emit('close')"
                  class="p-1.5 text-habit-text-muted hover:text-habit-text hover:bg-habit-bg-light rounded-lg transition-colors duration-200"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- Shortcuts list -->
              <div class="space-y-5">
                <div v-for="group in shortcuts" :key="group.category">
                  <h4
                    class="text-xs font-semibold text-habit-text-subtle uppercase tracking-wider mb-3"
                  >
                    {{ group.category }}
                  </h4>
                  <div class="space-y-2">
                    <div
                      v-for="shortcut in group.items"
                      :key="shortcut.description"
                      class="flex items-center justify-between py-1.5"
                    >
                      <span class="text-sm text-habit-text-muted">
                        {{ shortcut.description }}
                      </span>
                      <div class="flex gap-1">
                        <kbd
                          v-for="key in shortcut.keys"
                          :key="key"
                          class="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium text-habit-text bg-habit-bg-light border border-habit-border rounded-lg shadow-sm"
                        >
                          {{ key }}
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="mt-5 pt-4 border-t border-habit-border">
                <p class="text-xs text-habit-text-subtle text-center">
                  Premi
                  <kbd
                    class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-habit-text bg-habit-bg-light border border-habit-border rounded"
                    >?</kbd
                  >
                  per chiudere
                </p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
