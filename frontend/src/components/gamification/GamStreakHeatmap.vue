<script setup lang="ts">
import { computed, toRefs } from 'vue'
import HeatmapGrid from '@/components/ui/HeatmapGrid.vue'
import type { StreakHeatmapDay } from '@/types'

const props = defineProps<{
  data: StreakHeatmapDay[]
  year: number
  streakCurrent?: number
}>()

const { data, year, streakCurrent } = toRefs(props)

const mapped = computed(() => data.value.map(d => ({ date: d.date, value: d.activities })))
const totalActivities = computed<number>(() => data.value.reduce((s, d) => s + d.activities, 0))
const activeDays = computed<number>(() => data.value.filter(d => d.activities > 0).length)
const bestDay = computed<StreakHeatmapDay | null>(() => {
  if (!data.value.length) return null
  return data.value.reduce((best, d) => d.activities > (best?.activities || 0) ? d : best, null as StreakHeatmapDay | null)
})

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="gam-glass-card p-4">
    <div class="flex items-baseline justify-between mb-3">
      <div>
        <h4 class="text-sm font-semibold text-habit-text">Attività anno {{ year }}</h4>
        <p class="text-[11px] text-habit-text-subtle">Workout + check-in giornalieri</p>
      </div>
      <div v-if="streakCurrent != null && streakCurrent > 0" class="flex items-center gap-1 text-orange-400 text-sm font-bold">
        <span>🔥</span>
        <span class="tabular-nums">{{ streakCurrent }}gg</span>
      </div>
    </div>

    <div class="overflow-x-auto">
      <HeatmapGrid
        :data="mapped"
        :weeks="52"
        :cell-size="11"
        :cell-gap="2"
        :color-scale="['#1e1e1e30', '#0283a740', '#0283a780', '#0283a7c0', '#00bfff']"
      />
    </div>

    <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-habit-border/40">
      <div class="text-center">
        <div class="text-sm font-bold text-habit-cyan tabular-nums">{{ activeDays }}</div>
        <div class="text-[10px] text-habit-text-subtle uppercase">Giorni attivi</div>
      </div>
      <div class="text-center">
        <div class="text-sm font-bold text-habit-text tabular-nums">{{ totalActivities }}</div>
        <div class="text-[10px] text-habit-text-subtle uppercase">Attività totali</div>
      </div>
      <div class="text-center">
        <div v-if="bestDay" class="text-sm font-bold text-yellow-400 tabular-nums">{{ bestDay.activities }}× <span class="text-[10px] font-normal text-habit-text-subtle">{{ formatDate(bestDay.date) }}</span></div>
        <div v-else class="text-sm font-bold text-habit-text-subtle">—</div>
        <div class="text-[10px] text-habit-text-subtle uppercase">Miglior giorno</div>
      </div>
    </div>
  </div>
</template>
