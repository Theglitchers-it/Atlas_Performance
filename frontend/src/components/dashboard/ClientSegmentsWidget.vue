<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import { getTagClass, getTagLabel } from "@/composables/useFormatters";

interface Segments {
  nuovo: number;
  medio: number;
  top: number;
  vecchio: number;
  dormiente: number;
  custom: number;
}

const router = useRouter();
const segments = ref<Segments | null>(null);
const loading = ref(true);

const loadSegments = async () => {
  loading.value = true;
  const res = await api.get("/analytics/client-segments").catch(() => null);
  segments.value = res?.data?.data || null;
  loading.value = false;
};

onMounted(loadSegments);

const orderedTags: (keyof Segments)[] = [
  "nuovo",
  "medio",
  "top",
  "vecchio",
  "dormiente",
];

const total = computed(() => {
  if (!segments.value) return 0;
  return orderedTags.reduce((s, t) => s + (segments.value?.[t] || 0), 0);
});

const percent = (count: number): number => {
  if (!total.value) return 0;
  return Math.round((count / total.value) * 100);
};

const goToTag = (tag: string) => {
  router.push(`/clients?tag=${tag}`);
};
</script>

<template>
  <div class="bg-habit-card border border-habit-border rounded-habit p-4 sm:p-6">
    <div class="flex items-start justify-between gap-3 mb-4">
      <div class="min-w-0">
        <h2 class="text-base sm:text-lg font-semibold text-habit-text">
          Composizione portafoglio
        </h2>
        <p class="text-xs text-habit-text-subtle mt-0.5">
          Segmenti clienti per fidelizzazione
          <span v-if="segments && total > 0" class="text-habit-text font-medium">
            · {{ total }} {{ total === 1 ? 'cliente' : 'clienti' }}
          </span>
        </p>
      </div>
      <router-link
        to="/clients"
        class="text-xs text-habit-cyan hover:text-habit-orange transition-colors flex-shrink-0 inline-flex items-center gap-1"
      >
        Vedi tutti
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </router-link>
    </div>

    <div v-if="loading" class="animate-pulse grid grid-cols-2 sm:grid-cols-5 gap-2">
      <div
        v-for="i in 5"
        :key="i"
        class="h-24 sm:h-24 bg-habit-skeleton rounded-xl"
        :class="i === 5 ? 'col-span-2 sm:col-span-1' : ''"
      ></div>
    </div>

    <div
      v-else-if="!segments || total === 0"
      class="py-8 text-center"
    >
      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-habit-bg-light flex items-center justify-center">
        <svg class="w-6 h-6 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p class="text-sm text-habit-text-subtle">Nessun cliente segmentato</p>
      <p class="text-xs text-habit-text-subtle/70 mt-1">I tag vengono calcolati automaticamente dopo i primi abbonamenti</p>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <button
        v-for="(tag, idx) in orderedTags"
        :key="tag"
        @click="goToTag(tag)"
        class="relative flex flex-col items-center justify-center gap-0.5 p-3 sm:p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer overflow-hidden"
        :class="[
          getTagClass(tag),
          idx === orderedTags.length - 1 && orderedTags.length % 2 === 1 ? 'col-span-2 sm:col-span-1' : ''
        ]"
        :aria-label="`${segments[tag]} clienti ${getTagLabel(tag)}, ${percent(segments[tag])}% del totale`"
      >
        <span class="text-2xl sm:text-3xl font-bold tabular-nums leading-none">
          {{ segments[tag] }}
        </span>
        <span class="text-[10px] uppercase tracking-wider font-bold mt-1.5">
          {{ getTagLabel(tag) }}
        </span>
        <span
          v-if="segments[tag] > 0"
          class="text-[10px] font-medium opacity-70 tabular-nums mt-0.5"
        >
          {{ percent(segments[tag]) }}%
        </span>
      </button>
    </div>
  </div>
</template>
