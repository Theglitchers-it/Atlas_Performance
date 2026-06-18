<script setup lang="ts">
import { ref, watch } from "vue";
import BottomSheet from "@/components/mobile/BottomSheet.vue";
import { AdjustmentsHorizontalIcon } from "@heroicons/vue/24/outline";

interface FilterValue {
  postType: string;
  from: string;
  sortBy: "recent" | "trending";
}

interface CategoryOption {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  open: boolean;
  initial: FilterValue;
  categories: CategoryOption[];
  totalCount?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "apply", value: FilterValue): void;
  (e: "reset"): void;
}>();

const local = ref<FilterValue>({ ...props.initial });

watch(
  () => props.initial,
  (val) => {
    local.value = { ...val };
  },
  { deep: true },
);

const apply = () => {
  emit("apply", { ...local.value });
  emit("update:open", false);
};

const reset = () => {
  local.value = { postType: "", from: "", sortBy: "recent" };
  emit("reset");
  emit("update:open", false);
};
</script>

<template>
  <BottomSheet
    :open="open"
    snap-point="full"
    @update:open="emit('update:open', $event)"
  >
    <div class="px-4 pb-2 pt-2">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold text-habit-text">Filtra post</h3>
        <button
          type="button"
          @click="reset"
          class="text-xs text-habit-text-muted hover:text-habit-orange transition-colors"
        >
          Reset
        </button>
      </div>

      <!-- From date -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-habit-text mb-2 uppercase tracking-wide">
          Da
        </label>
        <input
          v-model="local.from"
          type="date"
          class="w-full px-4 py-3 bg-habit-bg-light border-0 rounded-xl text-habit-text text-sm focus:ring-2 focus:ring-habit-orange/50"
        />
      </div>

      <!-- Sort -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-habit-text mb-2 uppercase tracking-wide">
          Ordina per
        </label>
        <div class="flex gap-2">
          <button
            v-for="opt in [
              { value: 'recent', label: 'Recenti' },
              { value: 'trending', label: 'Trending' },
            ]"
            :key="opt.value"
            type="button"
            @click="local.sortBy = opt.value as 'recent' | 'trending'"
            :class="[
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              local.sortBy === opt.value
                ? 'bg-habit-orange text-white'
                : 'bg-habit-bg-light text-habit-text-muted',
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Post category chip -->
      <div class="mb-5">
        <label class="block text-xs font-semibold text-habit-text mb-2 uppercase tracking-wide">
          Categoria
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat.value"
            type="button"
            @click="local.postType = local.postType === cat.value ? '' : cat.value"
            :class="[
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
              local.postType === cat.value
                ? 'bg-habit-cyan text-white'
                : 'bg-habit-bg-light text-habit-text-muted',
            ]"
          >
            <span v-if="cat.icon">{{ cat.icon }}</span>
            {{ cat.label }}
          </button>
        </div>
      </div>

    </div>
    <!-- Apply (sticky bottom) -->
    <div class="sticky bottom-0 left-0 right-0 px-4 py-3 bg-habit-card border-t border-habit-border">
      <button
        type="button"
        @click="apply"
        class="w-full bg-habit-text text-habit-card font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <span>Applica filtri<span v-if="totalCount != null"> ({{ totalCount }})</span></span>
        <AdjustmentsHorizontalIcon class="w-4 h-4" />
      </button>
    </div>
  </BottomSheet>
</template>
