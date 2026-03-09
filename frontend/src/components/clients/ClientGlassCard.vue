<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { Client } from '@/types'

interface ClientProgramSummary {
  program_count: number
  active_program_name: string | null
  active_program_weeks: number | null
  active_program_start: string | null
  active_program_end: string | null
  program_badge: 'has_active' | 'has_draft' | 'none'
}

interface Props {
  client: Client
  programSummary?: ClientProgramSummary
  index?: number
}

const props = withDefaults(defineProps<Props>(), { index: 0 })
const emit = defineEmits<{ (e: 'click', client: Client): void }>()

const cardEl = ref<HTMLElement | null>(null)
const glowEl = ref<HTMLElement | null>(null)

// Avatar gradient palettes
const gradientPalettes = [
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-yellow-500',
]

const initials = computed(() => {
  return (props.client.first_name?.charAt(0) || '') + (props.client.last_name?.charAt(0) || '')
})

const avatarGradient = computed(() => {
  const hash = (initials.value.charCodeAt(0) || 0) + (initials.value.charCodeAt(1) || 0)
  return gradientPalettes[hash % gradientPalettes.length]
})

const animDelay = computed(() => `${props.index * 30}ms`)

// Status badge
const statusConfig = computed(() => {
  switch (props.client.status) {
    case 'active': return { label: 'Attivo', cls: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20' }
    case 'inactive': return { label: 'Inattivo', cls: 'bg-gray-400/15 text-gray-400 border-gray-400/20' }
    case 'cancelled': return { label: 'Cancellato', cls: 'bg-red-400/15 text-red-400 border-red-400/20' }
    default: return { label: props.client.status, cls: 'bg-gray-400/15 text-gray-400 border-gray-400/20' }
  }
})

// Program badge
const programBadgeConfig = computed(() => {
  if (!props.programSummary) return null
  switch (props.programSummary.program_badge) {
    case 'has_active': return { label: 'Programma attivo', cls: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20' }
    case 'has_draft': return { label: 'Bozza', cls: 'bg-amber-400/15 text-amber-400 border-amber-400/20' }
    default: return null
  }
})

// Current week calculation
const currentWeek = computed(() => {
  if (!props.programSummary?.active_program_start) return null
  const start = new Date(props.programSummary.active_program_start)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  const total = props.programSummary.active_program_weeks
  if (diffWeeks < 1) return { current: 1, total }
  if (total && diffWeeks > total) return { current: total, total }
  return { current: diffWeeks, total }
})

// Days until expiry + color
const expiryInfo = computed(() => {
  if (!props.programSummary?.active_program_end) return null
  const end = new Date(props.programSummary.active_program_end)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return { days: 0, label: 'Scaduto', cls: 'text-red-400' }
  if (diffDays < 7) return { days: diffDays, label: `Scade tra ${diffDays}gg`, cls: 'text-red-400' }
  if (diffDays <= 14) return { days: diffDays, label: `Scade tra ${diffDays}gg`, cls: 'text-amber-400' }
  return { days: diffDays, label: `Scade tra ${diffDays}gg`, cls: 'text-emerald-400' }
})

// Fitness level label
const fitnessLabel = computed(() => {
  const map: Record<string, string> = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato', elite: 'Elite' }
  return map[props.client.fitness_level || ''] || null
})

// Goal label
const goalLabel = computed(() => {
  if (!props.client.primary_goal) return null
  return props.client.primary_goal.replace(/_/g, ' ')
})

// Mouse-follow glow
let rafId = 0
const handleMouseMove = (e: MouseEvent) => {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (!glowEl.value || !cardEl.value) return
    const rect = cardEl.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    glowEl.value.style.background = `radial-gradient(400px circle at ${x}px ${y}px, var(--glass-glow, rgba(255,255,255,0.04)), transparent 60%)`
  })
}

onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId) })
</script>

<template>
  <div
    ref="cardEl"
    @click="emit('click', client)"
    @mousemove="handleMouseMove"
    class="client-card group relative cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl transition-colors duration-200"
    :style="{ animationDelay: animDelay }"
  >
    <!-- Glow overlay -->
    <div
      ref="glowEl"
      class="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    ></div>

    <!-- Active indicator left bar -->
    <div
      class="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 group-hover:h-8 rounded-full bg-gradient-to-b from-habit-cyan to-blue-400 transition-all duration-300"
    ></div>

    <div class="relative flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 lg:gap-4 px-3 sm:px-4 lg:px-5 py-3 sm:py-3.5 lg:py-4">
      <!-- Top row: Avatar + Name + Badges -->
      <div class="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        <!-- Avatar -->
        <div
          class="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg"
          :class="avatarGradient"
        >
          <span class="text-white font-bold text-xs sm:text-sm">{{ initials }}</span>
        </div>

        <!-- Name + meta -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm sm:text-[15px] font-semibold text-habit-text truncate">
              {{ client.first_name }} {{ client.last_name }}
            </span>
            <!-- Status badge -->
            <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0" :class="statusConfig.cls">
              {{ statusConfig.label }}
            </span>
            <!-- Program badge -->
            <span
              v-if="programBadgeConfig"
              class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0"
              :class="programBadgeConfig.cls"
            >
              {{ programBadgeConfig.label }}
            </span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5 text-xs text-habit-text-subtle truncate">
            <span v-if="client.email" class="truncate">{{ client.email }}</span>
            <span v-if="goalLabel" class="hidden sm:inline">·</span>
            <span v-if="goalLabel" class="hidden sm:inline capitalize flex-shrink-0">{{ goalLabel }}</span>
            <span v-if="fitnessLabel" class="hidden lg:inline">·</span>
            <span v-if="fitnessLabel" class="hidden lg:inline flex-shrink-0">{{ fitnessLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="flex items-center gap-3 sm:gap-4 lg:gap-5 pl-[46px] sm:pl-0 flex-shrink-0">
        <!-- Streak -->
        <div v-if="client.streak_days" class="flex items-center gap-1 text-xs">
          <svg class="w-3.5 h-3.5 text-habit-orange" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
          </svg>
          <span class="text-habit-orange font-semibold tabular-nums">{{ client.streak_days }}d</span>
        </div>

        <!-- Level -->
        <div v-if="(client as any).level" class="flex items-center gap-1 text-xs text-habit-text-subtle">
          <span class="font-medium">Lv.<span class="text-habit-text">{{ (client as any).level }}</span></span>
        </div>

        <!-- XP -->
        <div v-if="(client as any).xp_points" class="hidden sm:flex items-center gap-1 text-xs text-habit-text-subtle">
          <span class="tabular-nums"><span class="text-habit-cyan font-medium">{{ (client as any).xp_points }}</span>XP</span>
        </div>

        <!-- Program info (inline on lg) -->
        <div v-if="programSummary" class="hidden lg:flex items-center gap-3 border-l border-habit-border pl-3">
          <div v-if="programSummary.active_program_name" class="text-xs">
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3 text-habit-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-habit-text font-medium truncate max-w-[140px]">{{ programSummary.active_program_name }}</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-habit-text-subtle">
              <span v-if="currentWeek" class="tabular-nums">Sett. {{ currentWeek.current }}<span v-if="currentWeek.total">/{{ currentWeek.total }}</span></span>
              <span v-if="expiryInfo" :class="expiryInfo.cls">{{ expiryInfo.label }}</span>
            </div>
          </div>
          <div v-else class="text-xs text-habit-text-subtle">
            {{ programSummary.program_count }} program{{ programSummary.program_count !== 1 ? 'mi' : 'ma' }}
          </div>
        </div>

        <!-- Arrow -->
        <svg
          class="w-3 h-3 text-habit-text-subtle/30 group-hover:text-habit-cyan/60 transition-all duration-300 group-hover:translate-x-0.5 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Mobile-only program info row -->
      <div v-if="programSummary && programSummary.active_program_name" class="lg:hidden pl-[46px] sm:pl-[52px] -mt-0.5">
        <div class="flex items-center gap-2 text-[11px]">
          <svg class="w-3 h-3 text-habit-cyan flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-habit-text font-medium truncate">{{ programSummary.active_program_name }}</span>
          <span v-if="currentWeek" class="text-habit-text-subtle tabular-nums flex-shrink-0">Sett. {{ currentWeek.current }}<span v-if="currentWeek.total">/{{ currentWeek.total }}</span></span>
          <span v-if="expiryInfo" class="flex-shrink-0" :class="expiryInfo.cls">{{ expiryInfo.label }}</span>
        </div>
      </div>

      <!-- Mobile: no program -->
      <div v-else-if="programSummary && !programSummary.active_program_name && programSummary.program_count > 0" class="lg:hidden pl-[46px] sm:pl-[52px] -mt-0.5">
        <span class="text-[11px] text-habit-text-subtle">{{ programSummary.program_count }} program{{ programSummary.program_count !== 1 ? 'mi' : 'ma' }}</span>
      </div>

      <div v-else-if="!programSummary" class="lg:hidden pl-[46px] sm:pl-[52px] -mt-0.5">
        <span class="text-[11px] text-habit-text-subtle/50">Nessun programma</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-card {
  animation: cardSlide 0.3s ease-out both;
}

:root:not(.dark) .client-card .pointer-events-none {
  --glass-glow: rgba(0, 0, 0, 0.03);
}

@keyframes cardSlide {
  from {
    opacity: 0;
    transform: translate3d(-8px, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>
