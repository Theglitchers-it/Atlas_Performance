<script setup lang="ts">
import { computed, toRefs } from 'vue'
import SparkLine from '@/components/ui/SparkLine.vue'
import type { XPSparkPoint } from '@/types'

const props = withDefaults(defineProps<{
  data: XPSparkPoint[]
  height?: number
  color?: string
  title?: string
}>(), {
  height: 60,
  color: '#00bfff',
  title: 'XP ultimi 30 giorni'
})

const { data } = toRefs(props)

const values = computed<number[]>(() => data.value.map(d => d.xp))
const total = computed<number>(() => values.value.reduce((s, v) => s + v, 0))
const avg = computed<number>(() => values.value.length ? Math.round(total.value / values.value.length) : 0)
const max = computed<number>(() => values.value.length ? Math.max(...values.value) : 0)
const activeDays = computed<number>(() => values.value.filter(v => v > 0).length)
</script>

<template>
  <div class="gam-glass-card p-4">
    <div class="flex items-baseline justify-between mb-2">
      <h4 class="text-sm font-semibold text-habit-text">{{ title }}</h4>
      <span class="text-xs text-habit-cyan font-bold tabular-nums">+{{ total.toLocaleString('it-IT') }} XP</span>
    </div>
    <SparkLine
      v-if="values.length > 1"
      :data="values"
      :color="color"
      :height="height"
      :width="320"
      :show-area="true"
      :stroke-width="2"
      :animate="true"
      class="w-full"
      :style="{ height: height + 'px' }"
    />
    <div v-else class="h-[60px] flex items-center justify-center text-xs text-habit-text-subtle">
      Nessuna attività XP nel periodo
    </div>
    <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-habit-border/40">
      <div class="text-center">
        <div class="text-sm font-bold text-habit-text tabular-nums">{{ avg }}</div>
        <div class="text-[10px] text-habit-text-subtle uppercase">Media/gg</div>
      </div>
      <div class="text-center">
        <div class="text-sm font-bold text-habit-text tabular-nums">{{ max }}</div>
        <div class="text-[10px] text-habit-text-subtle uppercase">Picco</div>
      </div>
      <div class="text-center">
        <div class="text-sm font-bold text-green-400 tabular-nums">{{ activeDays }}</div>
        <div class="text-[10px] text-habit-text-subtle uppercase">Giorni attivi</div>
      </div>
    </div>
  </div>
</template>
