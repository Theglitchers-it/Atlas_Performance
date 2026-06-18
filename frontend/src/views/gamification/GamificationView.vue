<script setup lang="ts">
import { computed, onMounted, ref, watch, defineAsyncComponent } from 'vue'
import { useGamificationStore } from '@/store/gamification'
import { useAuthStore } from '@/store/auth'
import { useRouteTabs } from '@/composables/useRouteTabs'

import GamSubTabsNav from '@/components/gamification/GamSubTabsNav.vue'
import GamHeroCard from '@/components/gamification/GamHeroCard.vue'
import GamSparklineXP from '@/components/gamification/GamSparklineXP.vue'
import GamStreakHeatmap from '@/components/gamification/GamStreakHeatmap.vue'
import GamNextAchievementCard from '@/components/gamification/GamNextAchievementCard.vue'
import GamWeeklyRecap from '@/components/gamification/GamWeeklyRecap.vue'
import GamRankingBadge from '@/components/gamification/GamRankingBadge.vue'
import GamWeeklyGoalsCard from '@/components/gamification/GamWeeklyGoalsCard.vue'
import GamAchievementFilters from '@/components/gamification/GamAchievementFilters.vue'
import GamAchievementGrid from '@/components/gamification/GamAchievementGrid.vue'
import GamActivityTimeline from '@/components/gamification/GamActivityTimeline.vue'

import TitleShowcase from '@/components/gamification/TitleShowcase.vue'
import TitleProgress from '@/components/gamification/TitleProgress.vue'

// Lazy load views grosse (Leaderboard / Challenges) come sub-tab content
const LeaderboardView = defineAsyncComponent(() => import('@/views/gamification/LeaderboardView.vue'))
const ChallengesView = defineAsyncComponent(() => import('@/views/gamification/ChallengesView.vue'))

import type { WeeklyGoalType } from '@/types'

const gamification = useGamificationStore()
const auth = useAuthStore()

const isTrainer = computed(() =>
  ['tenant_owner', 'staff', 'super_admin'].includes(auth.user?.role as string)
)

// Sub-tab routing: /insights?tab=gamification&sub=overview|achievements|...
const subTabs = [
  { key: 'overview', label: 'Panoramica', icon: '📊' },
  { key: 'achievements', label: 'Achievement', icon: '🏆' },
  { key: 'challenges', label: 'Sfide', icon: '🎯' },
  { key: 'titles', label: 'Titoli', icon: '👑' },
  { key: 'leaderboard', label: 'Classifica', icon: '📈' },
  { key: 'activity', label: 'Attività', icon: '📜' }
] as const

const { activeTab, switchTab } = useRouteTabs(subTabs, '/insights', 'overview', 'sub')

// Achievement filters
const achFilters = ref({
  category: '',
  rarity: '',
  unlockedOnly: false,
  sort: 'default' as 'recent' | 'progress' | 'rarity_desc' | 'default',
  search: ''
})

const achCategories = computed<string[]>(() => {
  const set = new Set<string>()
  for (const a of gamification.allAchievements as any[]) {
    if (a?.category) set.add(a.category)
  }
  return Array.from(set)
})

const filteredAchievements = computed(() => {
  let list = gamification.allAchievements as any[]
  if (achFilters.value.search) {
    const q = achFilters.value.search.toLowerCase()
    list = list.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    )
  }
  return list
})

const fetchAchievementsFiltered = async () => {
  await gamification.fetchAllAchievements({
    category: achFilters.value.category || undefined,
    rarity: achFilters.value.rarity || undefined,
    unlockedOnly: achFilters.value.unlockedOnly,
    sort: achFilters.value.sort === 'default' ? undefined : achFilters.value.sort
  } as any)
}

watch(() => [achFilters.value.category, achFilters.value.rarity, achFilters.value.unlockedOnly, achFilters.value.sort], fetchAchievementsFiltered)

const resetFilters = () => {
  achFilters.value = { category: '', rarity: '', unlockedOnly: false, sort: 'default', search: '' }
}

// Trainer client selector — refetch tab corrente con il nuovo cliente
const handleClientChange = async (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  await gamification.setClient(val ? parseInt(val) : null)
  await tabLoaders[activeTab.value as TabKey]?.()
}

// Tab loaders: lazy fetch on demand, riusati anche al mount
type TabKey = typeof subTabs[number]['key']

const tabLoaders: Partial<Record<TabKey, () => Promise<unknown>>> = {
  overview: () => {
    const cid = gamification.selectedClientId
    if (isTrainer.value && !cid) return Promise.resolve()
    return Promise.all([
      gamification.fetchXPSparkline(30, cid),
      gamification.fetchStreakHeatmap(new Date().getFullYear(), cid),
      gamification.fetchNextAchievement(cid),
      gamification.fetchRanking(cid),
      gamification.fetchWeeklyRecap(cid),
      gamification.fetchWeeklyGoals(cid)
    ])
  },
  achievements: () => Promise.all([
    gamification.fetchRecentAchievements(8),
    fetchAchievementsFiltered()
  ]),
  titles: () => Promise.all([
    gamification.fetchTitles(),
    gamification.fetchDisplayedTitle()
  ]),
  activity: () => gamification.fetchXPHistory(1)
}

watch(activeTab, async (newTab) => {
  await tabLoaders[newTab as TabKey]?.()
}, { immediate: false })

const onWeeklyGoalUpsert = async (payload: { goal_type: WeeklyGoalType; target_value: number }) => {
  await gamification.upsertWeeklyGoal(payload.goal_type, payload.target_value, gamification.selectedClientId)
}

const onWeeklyGoalDelete = async (id: number) => {
  await gamification.deleteWeeklyGoal(id, gamification.selectedClientId)
}

const handleSetDisplayed = (titleId: number) => gamification.setDisplayedTitle(titleId)
const handleRemoveDisplayed = () => gamification.setDisplayedTitle(null as any)
const handleViewAllTitles = () => switchTab('titles')

onMounted(async () => {
  await gamification.initialize(isTrainer.value)
  if (!isTrainer.value || gamification.selectedClientId) {
    // Carica i dati del tab corrente (fallback overview per challenges/leaderboard
    // che sono async components con i propri fetch)
    const loader = tabLoaders[activeTab.value as TabKey] ?? tabLoaders.overview
    await loader?.()
  }
})
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-habit-text">Gamification</h1>
        <p class="text-sm text-habit-text-subtle mt-1">
          Livello, XP, badge, sfide, classifica e goal settimanali
        </p>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-if="isTrainer"
          @change="handleClientChange"
          :value="gamification.selectedClientId || ''"
          class="bg-habit-card border border-habit-border rounded-habit px-3 py-2 text-habit-text text-sm focus:border-habit-cyan focus:outline-none"
        >
          <option value="">Seleziona cliente</option>
          <option v-for="c in gamification.clients" :key="c.id" :value="c.id">
            {{ (c as any).first_name }} {{ (c as any).last_name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Sub-tab Navigation -->
    <GamSubTabsNav
      :tabs="subTabs"
      :active="activeTab"
      @change="switchTab($event as any)"
    />

    <!-- No client selected (trainer) -->
    <div
      v-if="isTrainer && !gamification.selectedClientId"
      class="gam-glass-card p-12 text-center"
    >
      <div class="text-4xl mb-3">🎮</div>
      <h3 class="text-lg font-semibold text-habit-text mb-2">Seleziona un cliente</h3>
      <p class="text-habit-text-subtle text-sm">
        Scegli un cliente dal menu in alto per visualizzare i dati gamification
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="gamification.loading && !gamification.dashboard" class="space-y-4">
      <div class="gam-glass-card p-6 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 bg-habit-skeleton rounded-full"></div>
          <div class="flex-1 space-y-3">
            <div class="h-5 w-40 bg-habit-skeleton rounded"></div>
            <div class="h-3 w-full bg-habit-skeleton rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ OVERVIEW ============ -->
    <div v-else-if="activeTab === 'overview' && gamification.dashboard">
      <GamHeroCard
        :dashboard="gamification.dashboard"
        :sparkline="gamification.xpSparkline"
        :ranking="gamification.ranking"
      />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4" style="grid-auto-rows: 1fr;">
        <GamStreakHeatmap
          :data="gamification.streakHeatmap"
          :year="gamification.streakHeatmapYear"
          :streak-current="gamification.dashboard.streak"
        />
        <GamSparklineXP :data="gamification.xpSparkline" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4" style="grid-auto-rows: 1fr;">
        <GamNextAchievementCard :achievement="gamification.nextAchievement" />
        <GamWeeklyRecap :recap="gamification.weeklyRecap" />
        <GamRankingBadge :ranking="gamification.ranking" />
      </div>

      <GamWeeklyGoalsCard
        :goals="gamification.weeklyGoals"
        :week-start="gamification.weeklyGoalsWeekStart"
        :readonly="isTrainer"
        @upsert="onWeeklyGoalUpsert"
        @delete="onWeeklyGoalDelete"
      />
    </div>

    <!-- ============ ACHIEVEMENTS ============ -->
    <div v-else-if="activeTab === 'achievements'">
      <!-- Ultimi sbloccati -->
      <div v-if="gamification.recentAchievements.length" class="mb-5">
        <h3 class="text-sm font-semibold text-habit-text mb-2 px-1">🆕 Ultimi sbloccati</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <div
            v-for="ach in gamification.recentAchievements"
            :key="(ach as any).id"
            class="gam-glass-card p-2 text-center"
            :title="(ach as any).name + ' — ' + (ach as any).description"
          >
            <div class="text-2xl mb-1">🏆</div>
            <div class="text-[10px] text-habit-text truncate font-semibold">{{ (ach as any).name }}</div>
            <div class="text-[9px] text-habit-cyan font-bold">+{{ (ach as any).xp_reward }} XP</div>
          </div>
        </div>
      </div>

      <GamAchievementFilters
        :filters="achFilters"
        :categories="achCategories"
        @update="achFilters = $event"
        @reset="resetFilters"
      />

      <GamAchievementGrid
        :achievements="filteredAchievements"
        :loading="gamification.loading"
      />
    </div>

    <!-- ============ CHALLENGES ============ -->
    <div v-else-if="activeTab === 'challenges'">
      <Suspense>
        <ChallengesView />
        <template #fallback>
          <div class="gam-glass-card p-12 text-center text-sm text-habit-text-subtle">Caricamento sfide...</div>
        </template>
      </Suspense>
    </div>

    <!-- ============ TITLES ============ -->
    <div v-else-if="activeTab === 'titles'">
      <div v-if="gamification.titles.length" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TitleShowcase
          :titles="gamification.titles as any[]"
          :displayedTitle="gamification.displayedTitle as any"
          @set-displayed="handleSetDisplayed"
          @remove-displayed="handleRemoveDisplayed"
          @view-all="handleViewAllTitles"
        />
        <TitleProgress :titles="gamification.titles as any[]" />
      </div>
      <div v-else class="gam-glass-card p-12 text-center">
        <div class="text-4xl mb-3">👑</div>
        <p class="text-sm text-habit-text-subtle">Nessun titolo disponibile per ora</p>
      </div>
    </div>

    <!-- ============ LEADERBOARD ============ -->
    <div v-else-if="activeTab === 'leaderboard'">
      <Suspense>
        <LeaderboardView />
        <template #fallback>
          <div class="gam-glass-card p-12 text-center text-sm text-habit-text-subtle">Caricamento classifica...</div>
        </template>
      </Suspense>
    </div>

    <!-- ============ ACTIVITY ============ -->
    <div v-else-if="activeTab === 'activity'">
      <GamActivityTimeline
        :transactions="gamification.xpHistory"
        :loading="gamification.loading"
      />
    </div>
  </div>
</template>
