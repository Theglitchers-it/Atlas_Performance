<script setup lang="ts">
import { computed } from 'vue'
import type { NextAchievement } from '@/types'
import { getRarityMeta } from '@/constants/gamification'

const props = defineProps<{
  achievement: NextAchievement | null
}>()

const meta = computed(() => getRarityMeta(props.achievement?.rarity))
const pct = computed(() => Math.min(100, props.achievement?.progress_pct ?? 0))
</script>

<template>
  <div class="gam-glass-card p-4 relative" :class="achievement ? meta.border : ''">
    <div v-if="!achievement" class="text-center py-6">
      <div class="text-4xl mb-2 opacity-60">🏆</div>
      <p class="text-sm text-habit-text-subtle">Tutti gli achievement sbloccati!</p>
    </div>

    <div v-else>
      <div class="flex items-start gap-3 mb-3">
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border bg-gradient-to-br"
          :class="[meta.border, meta.gradient]"
        >
          🎯
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-habit-bg/40" :class="meta.color">
              {{ meta.label }}
            </span>
            <span class="text-[10px] text-habit-cyan font-bold">+{{ achievement.xp_reward }} XP</span>
          </div>
          <h4 class="text-sm font-semibold text-habit-text truncate">{{ achievement.name }}</h4>
          <p class="text-xs text-habit-text-subtle line-clamp-2">{{ achievement.description }}</p>
        </div>
      </div>

      <div class="mb-1.5">
        <div class="flex justify-between text-[11px] text-habit-text-subtle mb-1">
          <span class="font-medium">Progresso</span>
          <span class="tabular-nums font-semibold text-habit-text">{{ achievement.progress_value }} / {{ achievement.requirement_value }}</span>
        </div>
        <div class="w-full h-2.5 bg-habit-bg/60 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full gam-shimmer-bar"
            :style="{ width: pct + '%', background: 'linear-gradient(90deg, #0283a7 0%, #ff4c00 100%)' }"
          ></div>
        </div>
      </div>

      <div class="flex justify-between text-[10px] text-habit-text-subtle mt-2">
        <span class="font-medium">{{ pct.toFixed(1) }}% completato</span>
        <span class="font-medium">Mancano <span class="text-habit-cyan font-bold tabular-nums">{{ achievement.xp_remaining }}</span></span>
      </div>
    </div>
  </div>
</template>
