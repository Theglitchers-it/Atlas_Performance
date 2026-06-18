<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getInitials, getActionBadgeClass } from "@/composables/useFormatters";
import type { ActionItem, ActionItemsCounts, ActionTypeFilter } from "@/types";

const COLLAPSED_COUNT = 4;

const props = defineProps<{
  items: ActionItem[];
  counts: ActionItemsCounts | null;
  loading: boolean;
  actionTypeFilter: ActionTypeFilter;
  thresholdDays: number;
}>();

const emit = defineEmits<{
  (e: "update:actionTypeFilter", value: ActionTypeFilter): void;
  (e: "update:thresholdDays", value: number): void;
}>();

const router = useRouter();

const thresholdOptions = [7, 14, 30, 60, 90];

const EMPTY_MESSAGES: Record<ActionTypeFilter, string> = {
  all: "Tutti i clienti sono in regola con check e abbonamenti",
  renewal: "Nessun abbonamento in scadenza",
  checkin: "Nessun check corporeo in ritardo",
};

const actionTypeFilter = computed({
  get: () => props.actionTypeFilter,
  set: (v) => emit("update:actionTypeFilter", v),
});
const thresholdDays = computed({
  get: () => props.thresholdDays,
  set: (v) => emit("update:thresholdDays", v),
});

const filterOptions = computed<
  { value: ActionTypeFilter; label: string; count: number | null }[]
>(() => [
  { value: "all", label: "Tutti", count: props.counts?.total ?? null },
  {
    value: "renewal",
    label: "Rinnovi",
    count: props.counts?.expiring_subscriptions ?? null,
  },
  {
    value: "checkin",
    label: "Check",
    count: props.counts?.checkin_overdue ?? null,
  },
]);

const filteredItems = computed(() => {
  if (props.actionTypeFilter === "renewal") {
    return props.items.filter((i) => i.action_type === "subscription_expiring");
  }
  if (props.actionTypeFilter === "checkin") {
    return props.items.filter((i) => i.action_type === "checkin_overdue");
  }
  return props.items;
});

const isExpanded = ref(false);

// Reset espansione su cambio filtro/threshold: un click "Vedi tutti" su un
// filtro non deve trasferirsi automaticamente all'altro.
watch(
  () => [props.actionTypeFilter, props.thresholdDays],
  () => {
    isExpanded.value = false;
  }
);

const visibleItems = computed(() =>
  isExpanded.value
    ? filteredItems.value
    : filteredItems.value.slice(0, COLLAPSED_COUNT)
);

const hasMore = computed(() => filteredItems.value.length > COLLAPSED_COUNT);
const hiddenCount = computed(() => Math.max(0, filteredItems.value.length - COLLAPSED_COUNT));

const openClient = (clientId: number) => router.push(`/clients/${clientId}`);
</script>

<template>
  <div
    class="bg-habit-card border border-habit-border rounded-habit flex flex-col"
  >
    <!-- Header compatto -->
    <div
      class="px-4 py-3 border-b border-habit-border flex flex-wrap items-center gap-x-2 gap-y-2"
    >
      <div class="flex items-center gap-2 min-w-0 mr-auto">
        <div
          class="w-7 h-7 bg-habit-orange/15 rounded-lg flex items-center justify-center flex-shrink-0"
        >
          <svg
            class="w-3.5 h-3.5 text-habit-orange"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h2 class="text-sm sm:text-base font-semibold text-habit-text">
          Azioni Richieste
        </h2>
      </div>

      <select
        v-model="actionTypeFilter"
        aria-label="Filtra per tipo azione"
        class="bg-habit-bg border border-habit-border rounded px-1.5 py-0.5 text-xs text-habit-text focus:outline-none focus:border-habit-cyan tabular-nums flex-shrink-0"
      >
        <option v-for="opt in filterOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}<template v-if="opt.count !== null"> ({{ opt.count }})</template>
        </option>
      </select>

      <select
        v-model.number="thresholdDays"
        aria-label="Soglia giorni"
        class="bg-habit-bg border border-habit-border rounded px-1.5 py-0.5 text-xs text-habit-text focus:outline-none focus:border-habit-cyan tabular-nums flex-shrink-0"
      >
        <option v-for="d in thresholdOptions" :key="d" :value="d">
          {{ d }}gg
        </option>
      </select>
    </div>

    <!-- Body -->
    <div v-if="loading" class="p-4 xs:p-6">
      <div class="animate-pulse space-y-4">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-3"
        >
          <div class="w-9 h-9 bg-habit-skeleton rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
            <div class="h-3 bg-habit-skeleton rounded w-2/3"></div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="visibleItems.length === 0"
      class="p-6 text-center text-habit-text-subtle"
    >
      <svg
        class="w-10 h-10 mx-auto mb-3 text-habit-success"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-sm">Nessuna azione richiesta</p>
      <p class="text-xs mt-1">{{ EMPTY_MESSAGES[actionTypeFilter] }}</p>
    </div>

    <ul v-else class="divide-y divide-habit-border">
      <li
        v-for="item in visibleItems"
        :key="`${item.action_type}-${item.client_id}-${item.meta?.subscription_id ?? 0}`"
        class="px-4 xs:px-6 py-3 hover:bg-habit-card-hover transition-colors cursor-pointer flex items-center gap-3"
        @click="openClient(item.client_id)"
      >
        <div
          class="w-9 h-9 bg-habit-cyan/20 rounded-full flex items-center justify-center flex-shrink-0"
        >
          <span class="text-habit-cyan text-xs font-medium">{{
            getInitials(item.first_name, item.last_name)
          }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-habit-text truncate">
              {{ item.first_name }} {{ item.last_name }}
            </span>
            <span
              class="text-[10px] px-1.5 py-0.5 border rounded-full font-semibold uppercase tracking-wider"
              :class="getActionBadgeClass(item.badge)"
            >
              {{ item.badge }}
            </span>
          </div>
          <p class="text-xs text-habit-text-subtle truncate mt-0.5">
            {{ item.message }}
          </p>
        </div>
        <svg
          class="w-4 h-4 text-habit-text-subtle flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </li>
    </ul>

    <button
      v-if="!loading && hasMore"
      type="button"
      class="px-4 xs:px-6 py-3 border-t border-habit-border text-center text-xs text-habit-cyan hover:text-habit-orange transition-colors flex items-center justify-center gap-1.5 w-full"
      :aria-expanded="isExpanded"
      :aria-label="isExpanded ? 'Mostra meno azioni richieste' : `Mostra ${hiddenCount} altre azioni richieste`"
      @click="isExpanded = !isExpanded"
    >
      <span>{{ isExpanded ? 'Mostra meno' : `Vedi tutti (${filteredItems.length})` }}</span>
      <svg
        class="w-3.5 h-3.5 transition-transform duration-200"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
</template>
