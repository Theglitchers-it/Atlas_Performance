<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from "@headlessui/vue";
import {
  ExclamationTriangleIcon,
  TrashIcon,
  InformationCircleIcon,
} from "@heroicons/vue/24/outline";

type ConfirmVariant = "danger" | "warning" | "info";

interface VariantConfig {
  icon: Component;
  iconBg: string;
  iconColor: string;
  confirmBtn: string;
  confirmBtnDisabled: string;
}

interface Props {
  open?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: "Conferma azione",
  message: "Sei sicuro di voler procedere?",
  confirmText: "Conferma",
  cancelText: "Annulla",
  variant: "danger",
  loading: false,
});

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const variantConfig = computed<VariantConfig>(() => {
  switch (props.variant) {
    case "danger":
      return {
        icon: TrashIcon,
        iconBg: "bg-habit-red/10",
        iconColor: "text-habit-red",
        confirmBtn: "bg-habit-red hover:bg-red-600 text-white",
        confirmBtnDisabled: "bg-habit-red/50 text-white/70 cursor-not-allowed",
      };
    case "warning":
      return {
        icon: ExclamationTriangleIcon,
        iconBg: "bg-habit-orange/10",
        iconColor: "text-habit-orange",
        confirmBtn: "bg-habit-orange hover:bg-habit-orange-dark text-white",
        confirmBtnDisabled:
          "bg-habit-orange/50 text-white/70 cursor-not-allowed",
      };
    case "info":
    default:
      return {
        icon: InformationCircleIcon,
        iconBg: "bg-habit-cyan/10",
        iconColor: "text-habit-cyan",
        confirmBtn: "bg-habit-cyan hover:bg-habit-cyan/80 text-white",
        confirmBtnDisabled: "bg-habit-cyan/50 text-white/70 cursor-not-allowed",
      };
  }
});

const handleCancel = (): void => {
  if (!props.loading) emit("cancel");
};

const handleConfirm = (): void => {
  if (!props.loading) emit("confirm");
};
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-50" @close="handleCancel">
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

      <!-- Dialog container -->
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 scale-95 translate-y-2"
            enter-to="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leave-from="opacity-100 scale-100 translate-y-0"
            leave-to="opacity-0 scale-95 translate-y-2"
          >
            <DialogPanel
              class="w-full max-w-md bg-habit-card border border-habit-border rounded-habit p-6 shadow-habit-lg"
            >
              <div class="flex items-start gap-4">
                <!-- Icon -->
                <div
                  class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  :class="variantConfig.iconBg"
                >
                  <component
                    :is="variantConfig.icon"
                    class="w-5 h-5"
                    :class="variantConfig.iconColor"
                  />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <DialogTitle class="text-lg font-semibold text-habit-text">
                    {{ title }}
                  </DialogTitle>
                  <p class="mt-2 text-sm text-habit-text-muted leading-relaxed">
                    {{ message }}
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 justify-end mt-6">
                <button
                  @click="handleCancel"
                  :disabled="loading"
                  class="px-4 py-2 text-sm font-medium text-habit-text-muted bg-habit-bg-light border border-habit-border rounded-xl hover:bg-habit-card-hover hover:text-habit-text transition-all duration-200 disabled:opacity-50"
                >
                  {{ cancelText }}
                </button>
                <button
                  @click="handleConfirm"
                  :disabled="loading"
                  class="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
                  :class="
                    loading
                      ? variantConfig.confirmBtnDisabled
                      : variantConfig.confirmBtn
                  "
                >
                  <svg
                    v-if="loading"
                    class="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {{ loading ? "Attendere..." : confirmText }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
