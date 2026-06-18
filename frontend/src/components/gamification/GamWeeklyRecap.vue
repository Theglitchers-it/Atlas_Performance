<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { WeeklyRecap } from '@/types'

const props = defineProps<{
  recap: WeeklyRecap | null
}>()

const { recap } = toRefs(props)

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

interface DeltaItem {
  label: string
  emoji: string
  thisVal: number
  lastVal: number
  delta: number
  positive: boolean
  color: string
}

const items = computed<DeltaItem[]>(() => {
  if (!recap.value) return []
  const r = recap.value
  const calc = (t: number, l: number) => {
    const d = t - l
    return { d, positive: d >= 0 }
  }
  const xpD = calc(r.this_week.xp, r.last_week.xp)
  const wkD = calc(r.this_week.workouts, r.last_week.workouts)
  const acD = calc(r.this_week.achievements, r.last_week.achievements)
  return [
    { label: 'XP', emoji: '⚡', thisVal: r.this_week.xp, lastVal: r.last_week.xp, delta: xpD.d, positive: xpD.positive, color: 'text-habit-cyan' },
    { label: 'Workout', emoji: '💪', thisVal: r.this_week.workouts, lastVal: r.last_week.workouts, delta: wkD.d, positive: wkD.positive, color: 'text-green-400' },
    { label: 'Badge', emoji: '🏆', thisVal: r.this_week.achievements, lastVal: r.last_week.achievements, delta: acD.d, positive: acD.positive, color: 'text-yellow-400' }
  ]
})
</script>

<template>
  <div class="gam-glass-card p-4">
    <div class="flex items-baseline justify-between mb-3">
      <div>
        <h4 class="text-sm font-semibold text-habit-text">Recap settimanale</h4>
        <p class="text-[11px] text-habit-text-subtle">
          <span v-if="recap">Settimana dal {{ formatDate(recap.week_start) }}</span>
          <span v-else>Nessun dato</span>
        </p>
      </div>
      <div v-if="recap" class="flex items-center gap-1.5 text-sm" :class="recap.xp_delta_pct >= 0 ? 'text-green-400' : 'text-red-400'">
        <svg v-if="recap.xp_delta_pct >= 0" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 17l6-6 4 4 8-8v6h-2v-3l-6 6-4-4-6 6z"/></svg>
        <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3l6 6 4-4 8 8v-6h-2v3l-6-6-4 4-6-6z"/></svg>
        <span class="font-bold tabular-nums">{{ recap.xp_delta_pct >= 0 ? '+' : '' }}{{ recap.xp_delta_pct }}%</span>
      </div>
    </div>

    <div v-if="recap" class="space-y-2">
      <div
        v-for="it in items"
        :key="it.label"
        class="flex items-center gap-3 p-2 rounded-lg bg-habit-bg/40"
      >
        <div class="text-2xl">{{ it.emoji }}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-semibold text-habit-text">{{ it.label }}</span>
            <span class="text-xs text-habit-text-subtle">vs settimana scorsa: {{ it.lastVal }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-xl font-bold tabular-nums" :class="it.color">{{ it.thisVal.toLocaleString('it-IT') }}</span>
            <span
              v-if="it.delta !== 0"
              class="text-[11px] font-bold tabular-nums"
              :class="it.positive ? 'text-green-400' : 'text-red-400'"
            >
              {{ it.positive ? '+' : '' }}{{ it.delta.toLocaleString('it-IT') }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center text-xs text-habit-text-subtle py-4">
      Inizia ad allenarti per vedere il recap settimanale
    </div>
  </div>
</template>
