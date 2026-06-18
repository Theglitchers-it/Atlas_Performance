<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import api from "@/services/api";
import type { ClientHealthSnapshot, HealthStatus } from "@/types";
import { getDietPhaseLabel } from "@/composables/useFormatters";

const props = defineProps<{
  clientId: number;
}>();

const snapshot = ref<ClientHealthSnapshot | null>(null);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  const res = await api
    .get(`/analytics/client-health/${props.clientId}`)
    .catch(() => null);
  snapshot.value = res?.data?.data || null;
  loading.value = false;
};

watch(() => props.clientId, load);
onMounted(load);

const statusColor = (s: HealthStatus | undefined) => {
  if (s === "red") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (s === "yellow") return "bg-habit-orange/15 text-habit-orange border-habit-orange/30";
  return "bg-habit-success/15 text-habit-success border-habit-success/30";
};

const statusLabel = (s: HealthStatus | undefined) => {
  if (s === "red") return "Attenzione";
  if (s === "yellow") return "Monitora";
  return "OK";
};

const phaseLabel = computed(() =>
  getDietPhaseLabel(snapshot.value?.client?.current_diet_phase ?? null),
);

const phaseColor = computed(() => {
  const p = snapshot.value?.client?.current_diet_phase;
  if (p === "cut") return "text-red-400";
  if (p === "bulk") return "text-habit-orange";
  if (p === "normocaloric") return "text-habit-cyan";
  return "text-habit-text-subtle";
});

const readinessColor = computed(() => {
  const r = snapshot.value?.readiness?.avg_7d;
  if (r == null) return "text-habit-text-subtle";
  if (r < 50) return "text-red-400";
  if (r < 65) return "text-habit-orange";
  return "text-habit-success";
});

const gapColor = computed(() => {
  const g = snapshot.value?.nutrition?.caloric_gap_pct;
  if (g == null) return "text-habit-text-subtle";
  const abs = Math.abs(g);
  if (abs >= 25) return "text-red-400";
  if (abs >= 15) return "text-habit-orange";
  return "text-habit-success";
});

const gapLabel = computed(() => {
  const g = snapshot.value?.nutrition?.caloric_gap_pct;
  if (g == null) return "—";
  if (g === 0) return "in target";
  return `${g > 0 ? "+" : ""}${g}%`;
});
</script>

<template>
  <div
    class="bg-habit-bg-light/40 border border-habit-border rounded-lg p-3"
  >
    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-4 bg-habit-skeleton rounded w-1/3"></div>
      <div class="h-12 bg-habit-skeleton rounded"></div>
    </div>

    <div v-else-if="snapshot" class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-xs font-semibold text-habit-text uppercase tracking-wider">
          Stato integrato
        </h4>
        <span
          class="text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider"
          :class="statusColor(snapshot.status)"
        >
          {{ statusLabel(snapshot.status) }}
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-habit-card border border-habit-border rounded p-2 text-center"
        >
          <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">
            Dieta
          </p>
          <p class="text-sm font-semibold tabular-nums" :class="phaseColor">
            {{ phaseLabel }}
          </p>
        </div>
        <div
          class="bg-habit-card border border-habit-border rounded p-2 text-center"
        >
          <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">
            Readiness 7gg
          </p>
          <p
            class="text-sm font-semibold tabular-nums"
            :class="readinessColor"
          >
            {{ snapshot.readiness.avg_7d ?? "—" }}<span
              v-if="snapshot.readiness.avg_7d"
              class="text-[10px] font-normal"
              >/100</span
            >
          </p>
          <p class="text-[9px] text-habit-text-subtle">
            {{ snapshot.readiness.entries_7d }} check
          </p>
        </div>
        <div
          class="bg-habit-card border border-habit-border rounded p-2 text-center"
        >
          <p class="text-[10px] text-habit-text-subtle uppercase tracking-wider">
            Gap kcal
          </p>
          <p class="text-sm font-semibold tabular-nums" :class="gapColor">
            {{ gapLabel }}
          </p>
          <p
            v-if="
              snapshot.nutrition.avg_calories_7d &&
              snapshot.nutrition.target_calories
            "
            class="text-[9px] text-habit-text-subtle tabular-nums"
          >
            {{ snapshot.nutrition.avg_calories_7d }}/{{
              snapshot.nutrition.target_calories
            }}
          </p>
          <p
            v-else-if="!snapshot.nutrition.has_active_plan"
            class="text-[9px] text-habit-text-subtle"
          >
            No piano attivo
          </p>
          <p v-else class="text-[9px] text-habit-text-subtle">
            No diario 7gg
          </p>
        </div>
      </div>

      <ul
        v-if="snapshot.warnings.length"
        class="space-y-1 pt-1 border-t border-habit-border/50"
      >
        <li
          v-for="w in snapshot.warnings"
          :key="w"
          class="text-[11px] text-habit-text-muted flex items-start gap-1.5"
        >
          <span class="text-habit-orange">⚠</span>
          <span>{{ w }}</span>
        </li>
      </ul>
    </div>

    <div v-else class="text-xs text-habit-text-subtle text-center py-2">
      Snapshot non disponibile
    </div>
  </div>
</template>
