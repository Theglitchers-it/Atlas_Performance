<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { RankingInfo } from '@/types'

const props = defineProps<{
  ranking: RankingInfo | null
}>()

const { ranking } = toRefs(props)

const tier = computed<{ label: string; color: string; bgGradient: string }>(() => {
  if (!ranking.value) return { label: '—', color: 'text-habit-text-subtle', bgGradient: 'from-gray-600 to-gray-800' }
  const p = ranking.value.percentile
  if (p >= 95) return { label: 'Top 5%', color: 'text-yellow-400', bgGradient: 'from-yellow-500 to-orange-600' }
  if (p >= 75) return { label: 'Top 25%', color: 'text-purple-400', bgGradient: 'from-purple-500 to-pink-600' }
  if (p >= 50) return { label: 'Top 50%', color: 'text-blue-400', bgGradient: 'from-blue-500 to-cyan-600' }
  if (p >= 25) return { label: 'Top 75%', color: 'text-green-400', bgGradient: 'from-green-500 to-emerald-600' }
  return { label: 'In crescita', color: 'text-gray-400', bgGradient: 'from-gray-500 to-gray-700' }
})

const circumference = 2 * Math.PI * 36
const offset = computed(() => circumference * (1 - (ranking.value?.percentile ?? 0) / 100))
</script>

<template>
  <div class="gam-glass-card p-4">
    <div class="flex items-baseline justify-between mb-3">
      <div>
        <h4 class="text-sm font-semibold text-habit-text">Classifica tenant</h4>
        <p class="text-[11px] text-habit-text-subtle">Posizione tra gli atleti</p>
      </div>
      <span
        v-if="ranking"
        class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-habit-bg/60"
        :class="tier.color"
      >
        {{ tier.label }}
      </span>
    </div>

    <div v-if="ranking" class="flex items-center gap-4">
      <!-- Anello percentile -->
      <div class="relative w-20 h-20 flex-shrink-0">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.1)" stroke-width="6" fill="none" />
          <circle
            cx="40" cy="40" r="36"
            stroke="url(#rankGrad)"
            stroke-width="6"
            fill="none"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="offset"
            class="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="rankGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0283a7" />
              <stop offset="100%" stop-color="#ff4c00" />
            </linearGradient>
          </defs>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-xl font-bold text-habit-text tabular-nums leading-none">#{{ ranking.position }}</span>
          <span class="text-[9px] text-habit-text-subtle uppercase">su {{ ranking.total }}</span>
        </div>
      </div>

      <div class="flex-1 min-w-0 space-y-1">
        <div class="text-xs text-habit-text-subtle">
          Sei nel <span class="font-bold text-habit-text">top {{ 100 - ranking.percentile + 1 }}%</span> del tenant
        </div>
        <div v-if="ranking.next_user_name" class="text-xs text-habit-text-subtle">
          Mancano <span class="font-bold text-habit-cyan tabular-nums">{{ ranking.xp_to_next.toLocaleString('it-IT') }} XP</span>
          per superare <span class="font-bold text-habit-text">{{ ranking.next_user_name }}</span>
        </div>
        <div v-else class="text-xs text-yellow-400 font-bold">
          🥇 Sei al primo posto!
        </div>
      </div>
    </div>

    <div v-else class="text-center text-xs text-habit-text-subtle py-4">
      Classifica non disponibile
    </div>
  </div>
</template>
