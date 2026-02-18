<template>
  <div
    class="bg-habit-bg border border-habit-border rounded-habit overflow-hidden"
  >
    <!-- Toolbar: Search + Slot -->
    <div
      v-if="searchable || $slots.toolbar"
      class="p-4 border-b border-habit-border"
    >
      <div class="flex flex-col sm:flex-row gap-4 items-center">
        <!-- Search -->
        <div v-if="searchable" class="flex-1 w-full sm:w-auto">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-habit-text-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              :value="searchModel"
              @input="onSearchInput"
              type="text"
              autocomplete="off"
              :placeholder="searchPlaceholder"
              class="w-full pl-10 pr-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-habit-text placeholder-habit-text-subtle transition-all duration-200"
            />
          </div>
        </div>
        <!-- Toolbar slot -->
        <slot name="toolbar" />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="p-6">
      <div class="animate-pulse space-y-4">
        <!-- Skeleton header -->
        <div class="flex gap-4 pb-3 border-b border-habit-border">
          <div v-for="col in columns" :key="col.key" class="flex-1">
            <div class="h-3 bg-habit-skeleton rounded w-2/3"></div>
          </div>
        </div>
        <!-- Skeleton rows -->
        <div v-for="i in skeletonRows" :key="i" class="flex gap-4 py-2">
          <div v-for="col in columns" :key="col.key" class="flex-1">
            <div
              class="h-4 bg-habit-skeleton rounded"
              :style="{ width: `${50 + Math.random() * 40}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="displayData.length === 0" class="p-4">
      <EmptyState
        :icon="emptyIcon"
        :title="emptyTitle"
        :description="emptyDescription"
        :action-text="emptyActionText"
        :action-to="emptyActionTo"
        @action="$emit('empty-action')"
      />
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <!-- Selectable checkbox header -->
            <th v-if="selectable" class="w-12 px-4 py-3">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="toggleSelectAll"
                class="rounded border-habit-border text-habit-orange focus:ring-habit-orange"
              />
            </th>
            <!-- Column headers -->
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              :class="[
                col.sortable ? 'sortable' : '',
                col.hideBelow === 'sm' ? 'hidden sm:table-cell' : '',
                col.hideBelow === 'md' ? 'hidden md:table-cell' : '',
                col.hideBelow === 'lg' ? 'hidden lg:table-cell' : '',
                col.hideBelow === 'xl' ? 'hidden xl:table-cell' : '',
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : 'text-left',
              ]"
              :style="col.width ? { width: col.width } : {}"
              @click="col.sortable ? toggleSort(col.key) : null"
            >
              <div
                class="flex items-center gap-1"
                :class="{
                  'justify-end': col.align === 'right',
                  'justify-center': col.align === 'center',
                }"
              >
                {{ col.label }}
                <!-- Sort indicator -->
                <template v-if="col.sortable">
                  <svg
                    v-if="sortKey === col.key && sortOrder === 'asc'"
                    class="w-4 h-4 text-habit-orange"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  <svg
                    v-else-if="sortKey === col.key && sortOrder === 'desc'"
                    class="w-4 h-4 text-habit-orange"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 text-habit-text-subtle opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </template>
              </div>
            </th>
            <!-- Actions column -->
            <th v-if="$slots.actions" class="w-16 px-4 py-3 text-right">
              <span class="sr-only">Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in displayData"
            :key="getRowKey(row, index)"
            :class="[
              hoverable ? 'hoverable' : '',
              striped ? 'striped' : '',
              isRowSelected(row) ? 'bg-habit-orange/5' : '',
            ]"
            @click="hoverable ? $emit('row-click', row) : null"
          >
            <!-- Selectable checkbox -->
            <td v-if="selectable" class="w-12 px-4 py-3" @click.stop>
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                @change="toggleSelect(row)"
                class="rounded border-habit-border text-habit-orange focus:ring-habit-orange"
              />
            </td>
            <!-- Data cells -->
            <td
              v-for="col in visibleColumns"
              :key="col.key"
              :class="[
                col.hideBelow === 'sm' ? 'hidden sm:table-cell' : '',
                col.hideBelow === 'md' ? 'hidden md:table-cell' : '',
                col.hideBelow === 'lg' ? 'hidden lg:table-cell' : '',
                col.hideBelow === 'xl' ? 'hidden xl:table-cell' : '',
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : '',
              ]"
            >
              <!-- Custom cell slot -->
              <slot
                :name="`cell-${col.key}`"
                :row="row"
                :value="getNestedValue(row, col.key)"
                :column="col"
              >
                {{ getNestedValue(row, col.key) }}
              </slot>
            </td>
            <!-- Actions -->
            <td
              v-if="$slots.actions"
              class="w-16 px-4 py-3 text-right"
              @click.stop
            >
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="displayData.length > 0 && showPagination"
      class="px-6 py-4 border-t border-habit-border"
    >
      <div class="flex items-center justify-between">
        <p class="text-sm text-habit-text-subtle">
          <template v-if="serverPagination">
            Pagina {{ currentPage }} di {{ totalPagesComputed }} ({{
              totalItems
            }}
            risultati)
          </template>
          <template v-else>
            Pagina {{ internalPage }} di {{ totalPagesComputed }} ({{
              filteredData.length
            }}
            risultati)
          </template>
        </p>
        <div class="flex gap-2">
          <button
            @click="prevPage"
            :disabled="currentPageComputed <= 1"
            class="px-3 py-1 border border-habit-border rounded-xl text-sm text-habit-text-muted disabled:opacity-50 disabled:cursor-not-allowed hover:bg-habit-card-hover hover:border-habit-cyan transition-colors"
          >
            Precedente
          </button>
          <!-- Page numbers (max 5 visible) -->
          <template v-if="totalPagesComputed <= 5">
            <button
              v-for="p in totalPagesComputed"
              :key="p"
              @click="goToPage(p)"
              :class="[
                'px-3 py-1 border rounded-xl text-sm transition-colors',
                currentPageComputed === p
                  ? 'bg-habit-orange border-habit-orange text-white'
                  : 'border-habit-border text-habit-text-muted hover:bg-habit-card-hover hover:border-habit-cyan',
              ]"
            >
              {{ p }}
            </button>
          </template>
          <button
            @click="nextPage"
            :disabled="currentPageComputed >= totalPagesComputed"
            class="px-3 py-1 border border-habit-border rounded-xl text-sm text-habit-text-muted disabled:opacity-50 disabled:cursor-not-allowed hover:bg-habit-card-hover hover:border-habit-cyan transition-colors"
          >
            Successiva
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Component } from "vue";
import EmptyState from "@/components/ui/EmptyState.vue";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  paginated?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  totalPages?: number;
  serverPagination?: boolean;
  selectable?: boolean;
  rowKey?: string;
  hoverable?: boolean;
  striped?: boolean;
  emptyIcon?: Component | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionText?: string;
  emptyActionTo?: string;
  skeletonRows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  searchable: false,
  searchPlaceholder: "Cerca...",
  searchKeys: () => [],
  paginated: false,
  pageSize: 20,
  currentPage: 1,
  totalItems: 0,
  totalPages: 0,
  serverPagination: false,
  selectable: false,
  rowKey: "id",
  hoverable: false,
  striped: false,
  emptyIcon: null,
  emptyTitle: "Nessun dato",
  emptyDescription: "",
  emptyActionText: "",
  emptyActionTo: "",
  skeletonRows: 5,
});

const emit = defineEmits<{
  (e: "row-click", row: Record<string, unknown>): void;
  (e: "sort", payload: { key: string; order: string }): void;
  (e: "page-change", page: number): void;
  (e: "search", query: string): void;
  (e: "selection-change", keys: unknown[]): void;
  (e: "empty-action"): void;
}>();

// Search
const searchModel = ref("");
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const onSearchInput = (e: Event) => {
  searchModel.value = (e.target as HTMLInputElement).value;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    emit("search", searchModel.value);
  }, 300);
};

// Sorting
const sortKey = ref("");
const sortOrder = ref<"asc" | "desc">("asc");

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
  emit("sort", { key: sortKey.value, order: sortOrder.value });
};

// Selection
const selectedRows = ref<Set<unknown>>(new Set());

const allSelected = computed(() => {
  if (props.data.length === 0) return false;
  return props.data.every((row) => selectedRows.value.has(getRowKey(row)));
});

const someSelected = computed(() => {
  return props.data.some((row) => selectedRows.value.has(getRowKey(row)));
});

const isRowSelected = (row: Record<string, unknown>) => {
  return selectedRows.value.has(getRowKey(row));
};

const toggleSelect = (row: Record<string, unknown>) => {
  const key = getRowKey(row);
  const newSet = new Set(selectedRows.value);
  if (newSet.has(key)) {
    newSet.delete(key);
  } else {
    newSet.add(key);
  }
  selectedRows.value = newSet;
  emit("selection-change", Array.from(newSet));
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedRows.value = new Set();
  } else {
    selectedRows.value = new Set(props.data.map((row) => getRowKey(row)));
  }
  emit("selection-change", Array.from(selectedRows.value));
};

// Visible columns (no hidden flag for now, all shown)
const visibleColumns = computed(() => props.columns);

// Client-side filtering
const filteredData = computed(() => {
  let result = [...props.data];

  // Client-side search
  if (
    searchModel.value &&
    props.searchKeys.length > 0 &&
    !props.serverPagination
  ) {
    const q = searchModel.value.toLowerCase();
    result = result.filter((row) =>
      props.searchKeys.some((key) => {
        const val = getNestedValue(row, key);
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }

  // Client-side sorting
  if (sortKey.value && !props.serverPagination) {
    result.sort((a, b) => {
      const aVal = getNestedValue(a, sortKey.value);
      const bVal = getNestedValue(b, sortKey.value);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), "it", {
        numeric: true,
      });
      return sortOrder.value === "asc" ? cmp : -cmp;
    });
  }

  return result;
});

// Internal pagination (client-side)
const internalPage = ref(1);

const totalPagesComputed = computed(() => {
  if (props.serverPagination) return props.totalPages;
  if (!props.paginated) return 1;
  return Math.ceil(filteredData.value.length / props.pageSize) || 1;
});

const currentPageComputed = computed(() => {
  return props.serverPagination ? props.currentPage : internalPage.value;
});

const showPagination = computed(() => {
  return props.paginated && totalPagesComputed.value > 1;
});

// Paginated display data
const displayData = computed(() => {
  if (props.serverPagination) return filteredData.value;
  if (!props.paginated) return filteredData.value;

  const start = (internalPage.value - 1) * props.pageSize;
  return filteredData.value.slice(start, start + props.pageSize);
});

const prevPage = () => {
  if (props.serverPagination) {
    emit("page-change", props.currentPage - 1);
  } else {
    if (internalPage.value > 1) internalPage.value--;
  }
};

const nextPage = () => {
  if (props.serverPagination) {
    emit("page-change", props.currentPage + 1);
  } else {
    if (internalPage.value < totalPagesComputed.value) internalPage.value++;
  }
};

const goToPage = (page: number) => {
  if (props.serverPagination) {
    emit("page-change", page);
  } else {
    internalPage.value = page;
  }
};

// Reset page when search changes
watch(searchModel, () => {
  if (!props.serverPagination) {
    internalPage.value = 1;
  }
});

// Utils
const getRowKey = (
  row: Record<string, unknown>,
  index?: number,
): string | number => {
  return (row?.[props.rowKey] as string | number) ?? index ?? 0;
};

const getNestedValue = (obj: Record<string, unknown>, key: string): unknown => {
  if (!key || !obj) return undefined;
  return key
    .split(".")
    .reduce(
      (acc: unknown, part: string) => (acc as Record<string, unknown>)?.[part],
      obj,
    );
};
</script>
