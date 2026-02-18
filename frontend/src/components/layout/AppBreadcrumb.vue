<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { RouteParams } from "vue-router";
import { HomeIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

interface BreadcrumbMeta {
  label: string | ((params: RouteParams) => string);
  to?: string | null;
}

interface BreadcrumbItem {
  label: string;
  to: string | null;
  isLast: boolean;
}

const route = useRoute();

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const meta = route.meta?.breadcrumb as BreadcrumbMeta[] | undefined;
  if (!meta || !Array.isArray(meta) || meta.length === 0) return [];

  return meta.map((item: BreadcrumbMeta, index: number) => ({
    label:
      typeof item.label === "function" ? item.label(route.params) : item.label,
    to: item.to || null,
    isLast: index === meta.length - 1,
  }));
});

const hasBreadcrumbs = computed(() => breadcrumbs.value.length > 0);
</script>

<template>
  <nav
    v-if="hasBreadcrumbs"
    class="hidden lg:flex items-center gap-1.5 mb-4 text-sm"
    aria-label="Breadcrumb"
  >
    <!-- Home -->
    <router-link
      to="/"
      class="text-habit-text-subtle hover:text-habit-orange transition-colors duration-200"
      aria-label="Dashboard"
    >
      <HomeIcon class="w-4 h-4" />
    </router-link>

    <!-- Items -->
    <template v-for="(crumb, index) in breadcrumbs" :key="index">
      <ChevronRightIcon
        class="w-3.5 h-3.5 text-habit-text-subtle flex-shrink-0"
      />

      <router-link
        v-if="crumb.to && !crumb.isLast"
        :to="crumb.to"
        class="text-habit-text-subtle hover:text-habit-orange transition-colors duration-200 truncate max-w-[200px]"
      >
        {{ crumb.label }}
      </router-link>

      <span
        v-else
        class="font-medium truncate max-w-[200px]"
        :class="crumb.isLast ? 'text-habit-text' : 'text-habit-text-subtle'"
      >
        {{ crumb.label }}
      </span>
    </template>
  </nav>
</template>
