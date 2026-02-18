<script setup lang="ts">
import { computed } from "vue";
import { useNetwork } from "@/composables/useNetwork";
import { useOfflineSync } from "@/composables/useOfflineSync";
import { WifiIcon } from "@heroicons/vue/24/outline";

const { isOnline } = useNetwork();
const { pendingActions, isSyncing } = useOfflineSync();

const pendingCount = computed<number>(() => pendingActions.value.length);
const showBanner = computed<boolean>(
  () => !isOnline.value || (isSyncing.value && pendingCount.value > 0),
);
</script>

<template>
  <transition name="slide-down">
    <div v-if="showBanner" class="fixed top-16 left-0 right-0 z-40 safe-top">
      <!-- Banner offline -->
      <div
        v-if="!isOnline"
        class="bg-amber-500/95 backdrop-blur-sm text-white text-center py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2"
      >
        <WifiIcon class="w-4 h-4" />
        <span>
          Sei offline
          <span v-if="pendingCount > 0">
            &mdash; {{ pendingCount }}
            {{ pendingCount === 1 ? "azione" : "azioni" }} in coda
          </span>
        </span>
      </div>

      <!-- Banner syncing -->
      <div
        v-else-if="isSyncing"
        class="bg-habit-orange/90 backdrop-blur-sm text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2"
      >
        <div
          class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        <span>Sincronizzazione in corso...</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
