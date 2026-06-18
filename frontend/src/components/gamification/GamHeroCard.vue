<script setup lang="ts">
import { computed } from 'vue'
import SparkLine from '@/components/ui/SparkLine.vue'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import type { GamificationDashboard, XPSparkPoint, RankingInfo } from '@/types'

const props = defineProps<{
  dashboard: GamificationDashboard | null
  sparkline: XPSparkPoint[]
  ranking: RankingInfo | null
  loading?: boolean
}>()

const xpTarget = computed(() => props.dashboard?.xp ?? 0)
const levelTarget = computed(() => props.dashboard?.level ?? 0)
const badgesTarget = computed(() => props.dashboard?.achievementsUnlocked ?? 0)
const titlesTarget = computed(() => props.dashboard?.titlesUnlocked ?? 0)
const challengesTarget = computed(() => props.dashboard?.activeChallenges ?? 0)
const positionTarget = computed(() => props.ranking?.position ?? 0)

const { formattedValue: xpFormatted } = useAnimatedNumber(xpTarget, { duration: 1200 })
const { displayValue: levelDisplay } = useAnimatedNumber(levelTarget, { duration: 800, formatNumber: false })
const { displayValue: badgesDisplay } = useAnimatedNumber(badgesTarget, { duration: 800, formatNumber: false })
const { displayValue: titlesDisplay } = useAnimatedNumber(titlesTarget, { duration: 800, formatNumber: false })
const { displayValue: challengesDisplay } = useAnimatedNumber(challengesTarget, { duration: 800, formatNumber: false })
const { displayValue: positionDisplay } = useAnimatedNumber(positionTarget, { duration: 800, formatNumber: false })

const sparkData = computed<number[]>(() => props.sparkline.map(p => p.xp))
const sparkTotal = computed<number>(() => props.sparkline.reduce((s, p) => s + p.xp, 0))

const xpProgressPct = computed(() => Math.min(100, Math.max(0, props.dashboard?.xpProgress ?? 0)))
</script>

<template>
  <div class="gam-glass-card gam-gradient-hero p-5 sm:p-6 mb-5">
    <!-- Layout fisso: badge | xp+spark | stats. Non flippa bruscamente. -->
    <div class="grid gap-5 sm:gap-6" style="grid-template-columns: minmax(0, auto) minmax(0, 1fr); grid-template-areas: 'badge xp' 'stats stats';" :class="{ 'sm:!grid-cols-[auto_1fr_auto]': true }">
      <!-- Badge livello -->
      <div style="grid-area: badge;" class="sm:!col-start-1 sm:!row-start-1">
        <div class="relative">
          <div
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-300/20"
            style="background: conic-gradient(from 180deg at 50% 50%, #0283a7 0%, #ff4c00 100%);"
          >
            <div class="w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full bg-habit-bg flex flex-col items-center justify-center">
              <div class="text-2xl sm:text-3xl font-bold text-habit-text leading-none">{{ levelDisplay }}</div>
              <div class="text-[9px] sm:text-[10px] text-habit-text-subtle uppercase tracking-wider mt-0.5">Livello</div>
            </div>
          </div>
          <div
            v-if="(dashboard?.streak ?? 0) > 0"
            class="absolute -bottom-1 -right-1 bg-gradient-to-br from-orange-500 to-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md"
            :title="`Streak: ${dashboard?.streak} giorni`"
          >
            🔥 {{ dashboard?.streak }}
          </div>
        </div>
      </div>

      <!-- XP + sparkline -->
      <div style="grid-area: xp;" class="min-w-0 flex flex-col justify-center sm:!col-start-2 sm:!row-start-1">
        <div class="flex items-baseline justify-between mb-1.5 gap-3">
          <span class="text-xs sm:text-sm font-semibold text-habit-text-subtle uppercase tracking-wider">Punti Esperienza</span>
          <span class="text-xl sm:text-2xl font-bold text-habit-cyan tabular-nums">{{ xpFormatted }} <span class="text-[10px] text-habit-text-subtle font-medium">XP</span></span>
        </div>
        <div class="w-full h-3 bg-habit-bg/60 rounded-full overflow-hidden mb-1.5">
          <div
            class="h-full rounded-full gam-shimmer-bar"
            :style="{ width: xpProgressPct + '%', background: 'linear-gradient(90deg, #0283a7 0%, #00bfff 50%, #ff4c00 100%)' }"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] sm:text-xs text-habit-text-subtle mb-3">
          <span>Lv. {{ dashboard?.level ?? 0 }}</span>
          <span class="font-medium">{{ dashboard?.xpInLevel ?? 0 }} / {{ dashboard?.xpNeeded ?? 0 }} XP</span>
          <span>Lv. {{ (dashboard?.level ?? 0) + 1 }}</span>
        </div>
        <!-- Sparkline XP 30 giorni -->
        <div v-if="sparkData.length > 1" class="flex items-center gap-2 text-[10px] text-habit-text-subtle">
          <span class="whitespace-nowrap">30gg:</span>
          <div class="flex-1 min-w-0">
            <SparkLine :data="sparkData" color="#00bfff" :height="28" :width="220" :show-area="true" :stroke-width="1.5" :animate="true" class="w-full h-7" />
          </div>
          <span class="whitespace-nowrap font-semibold text-habit-cyan tabular-nums">+{{ sparkTotal.toLocaleString('it-IT') }} XP</span>
        </div>
      </div>

      <!-- 4 Mini-stats -->
      <div style="grid-area: stats;" class="grid grid-cols-4 gap-2 sm:!col-start-3 sm:!row-start-1 sm:!grid-cols-1 sm:gap-2 sm:min-w-[110px]">
        <div class="bg-habit-bg/60 rounded-lg px-2.5 py-2 text-center border border-habit-border/40">
          <div class="text-base sm:text-lg font-bold text-yellow-400 tabular-nums leading-tight">{{ badgesDisplay }}</div>
          <div class="text-[9px] sm:text-[10px] text-habit-text-subtle uppercase font-medium">Badge</div>
        </div>
        <div class="bg-habit-bg/60 rounded-lg px-2.5 py-2 text-center border border-habit-border/40">
          <div class="text-base sm:text-lg font-bold text-purple-400 tabular-nums leading-tight">{{ titlesDisplay }}</div>
          <div class="text-[9px] sm:text-[10px] text-habit-text-subtle uppercase font-medium">Titoli</div>
        </div>
        <div class="bg-habit-bg/60 rounded-lg px-2.5 py-2 text-center border border-habit-border/40">
          <div class="text-base sm:text-lg font-bold text-green-400 tabular-nums leading-tight">{{ challengesDisplay }}</div>
          <div class="text-[9px] sm:text-[10px] text-habit-text-subtle uppercase font-medium">Sfide</div>
        </div>
        <div
          class="bg-habit-bg/60 rounded-lg px-2.5 py-2 text-center border border-habit-border/40"
          :title="ranking ? `Posizione ${ranking.position} su ${ranking.total} (top ${100 - ranking.percentile + ranking.percentile}%)` : ''"
        >
          <div class="text-base sm:text-lg font-bold text-habit-cyan tabular-nums leading-tight">
            <span v-if="ranking">#{{ positionDisplay }}</span>
            <span v-else class="text-habit-text-subtle">—</span>
          </div>
          <div class="text-[9px] sm:text-[10px] text-habit-text-subtle uppercase font-medium">Rank</div>
        </div>
      </div>
    </div>
  </div>
</template>
