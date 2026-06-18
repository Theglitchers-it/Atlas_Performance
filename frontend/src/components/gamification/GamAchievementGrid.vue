<script setup lang="ts">
import { computed } from 'vue'
import { getRarityMeta } from '@/constants/gamification'

interface Achievement {
  id: number
  name: string
  description: string
  icon_url: string | null
  category: string
  rarity: string
  xp_reward: number
  requirement_value: number
  progress_value?: number
  unlocked?: number | boolean
  unlocked_at?: string | null
  progress_pct?: number
}

const props = defineProps<{
  achievements: Achievement[]
  loading?: boolean
}>()

const isUnlocked = (a: Achievement) => a.unlocked === 1 || a.unlocked === true || !!a.unlocked_at

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

const total = computed(() => props.achievements.length)
const unlocked = computed(() => props.achievements.filter(isUnlocked).length)
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between mb-3 px-1">
      <h3 class="text-sm font-semibold text-habit-text">
        {{ unlocked }} / {{ total }} sbloccati
      </h3>
      <span class="text-xs text-habit-text-subtle tabular-nums">
        {{ total > 0 ? Math.round((unlocked / total) * 100) : 0 }}% completati
      </span>
    </div>

    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div v-for="i in 8" :key="i" class="gam-glass-card p-4 animate-pulse">
        <div class="h-10 w-10 bg-habit-skeleton rounded-lg mb-3"></div>
        <div class="h-3 w-3/4 bg-habit-skeleton rounded mb-2"></div>
        <div class="h-2 w-full bg-habit-skeleton rounded"></div>
      </div>
    </div>

    <div
      v-else-if="achievements.length === 0"
      class="gam-glass-card p-8 text-center"
    >
      <div class="text-4xl mb-2 opacity-60">🔍</div>
      <p class="text-sm text-habit-text-subtle">Nessun achievement trovato con i filtri attuali</p>
    </div>

    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      style="grid-auto-rows: 1fr;"
    >
      <div
        v-for="a in achievements"
        :key="a.id"
        class="gam-glass-card p-3 flex flex-col h-full"
        :class="[
          getRarityMeta(a.rarity).border,
          !isUnlocked(a) ? 'opacity-70' : ''
        ]"
      >
        <div class="flex items-start justify-between gap-1.5 mb-2">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 bg-habit-bg/40 border" :class="getRarityMeta(a.rarity).border">
            <span v-if="!isUnlocked(a)">🔒</span>
            <span v-else>🏆</span>
          </div>
          <span
            class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            :class="[getRarityMeta(a.rarity).color, getRarityMeta(a.rarity).bg]"
          >{{ getRarityMeta(a.rarity).label }}</span>
        </div>

        <h4 class="text-sm font-semibold text-habit-text mb-1 line-clamp-2">{{ a.name }}</h4>
        <p class="text-xs text-habit-text-subtle line-clamp-2 mb-2 flex-1">{{ a.description }}</p>

        <!-- Barra progress se non sbloccato -->
        <div v-if="!isUnlocked(a) && a.requirement_value > 0" class="mb-2">
          <div class="flex justify-between text-[10px] text-habit-text-subtle mb-0.5">
            <span class="tabular-nums">{{ a.progress_value || 0 }} / {{ a.requirement_value }}</span>
            <span class="tabular-nums">{{ Math.min(100, a.progress_pct || 0).toFixed(0) }}%</span>
          </div>
          <div class="w-full h-1 bg-habit-bg/60 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-habit-cyan to-orange-500 rounded-full transition-all"
              :style="{ width: Math.min(100, a.progress_pct || 0) + '%' }"
            ></div>
          </div>
        </div>

        <div class="flex justify-between items-center mt-auto">
          <span class="text-[11px] text-habit-cyan font-bold tabular-nums">+{{ a.xp_reward }} XP</span>
          <span v-if="isUnlocked(a) && a.unlocked_at" class="text-[10px] text-habit-text-subtle">{{ formatDate(a.unlocked_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
