<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import { PhoneIcon, ChatBubbleLeftEllipsisIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { daysFromNow, getTagClass, getTagLabel, sortTagsByPriority } from '@/composables/useFormatters'
import { useAuthStore } from '@/store/auth'
import { formatPhoneInternational, fillTemplate, buildWhatsAppUrl } from '@/composables/usePhoneFormatter'
import ClientPhotoUpload from './ClientPhotoUpload.vue'
import ClientActivationToggle from './ClientActivationToggle.vue'
import SparkLine from '@/components/ui/SparkLine.vue'
import ActionSheet from '@/components/mobile/ActionSheet.vue'
import type { Client, ActionItem } from '@/types'

const auth = useAuthStore()
const router = useRouter()

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
  pendingAction?: ActionItem | null
  selectable?: boolean
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), { index: 0, pendingAction: null, selectable: false, selected: false })
const emit = defineEmits<{
  (e: 'click', client: Client): void
  (e: 'action-click', action: ActionItem): void
  (e: 'toggle-select', id: number): void
  (e: 'photo-updated', payload: { id: number; photoUrl: string | null }): void
  (e: 'status-changed', payload: { id: number; status: 'active' | 'inactive' }): void
}>()

const onCardClick = (e: MouseEvent) => {
  if (props.selectable) {
    e.preventDefault()
    e.stopPropagation()
    emit('toggle-select', props.client.id)
    return
  }
  emit('click', props.client)
}

const actionButtonLabel = computed(() => {
  if (!props.pendingAction) return null
  switch (props.pendingAction.action_type) {
    case 'subscription_expiring': return 'Rinnova'
    case 'checkin_overdue': return 'Programma check'
    case 'new_no_check': return 'Primo check'
    default: return null
  }
})

const handleActionClick = (e: Event) => {
  e.stopPropagation()
  if (props.pendingAction) emit('action-click', props.pendingAction)
}

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

const subscriptionInfo = computed(() => {
  const diff = daysFromNow(props.client.active_subscription_end_date)
  if (diff === null) return null
  if (diff < 0) return { label: 'Scaduto', cls: 'text-red-400' }
  if (diff === 0) return { label: 'Scade oggi', cls: 'text-red-400' }
  if (diff < 7) return { label: `Scade ${diff}gg`, cls: 'text-red-400' }
  if (diff <= 14) return { label: `Scade ${diff}gg`, cls: 'text-amber-400' }
  return { label: `Scade ${diff}gg`, cls: 'text-emerald-400' }
})

const lastCheckInfo = computed(() => {
  const diff = daysFromNow(props.client.last_measurement_date)
  if (diff === null) return { label: 'Mai', cls: 'text-habit-text-subtle' }
  const ago = Math.max(0, -diff)
  if (ago === 0) return { label: 'Oggi', cls: 'text-emerald-400' }
  if (ago <= 30) return { label: `${ago}gg fa`, cls: 'text-habit-text' }
  if (ago <= 60) return { label: `${ago}gg fa`, cls: 'text-amber-400' }
  return { label: `${ago}gg fa`, cls: 'text-red-400' }
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

// ==========================================
// Fase 7: photo, compleanno, activity recap
// ==========================================
const showPhotoModal = ref(false)
// Stato locale per UI immediata; il parent rinfresca via @photo-updated → fetchClients()
const photoUrl = ref<string | null>(props.client.photo_url || null)

const onPhotoUpdated = (url: string | null) => {
  photoUrl.value = url
  emit('photo-updated', { id: props.client.id, photoUrl: url })
}

// Compleanno: badge se entro 7gg
const birthdayInfo = computed(() => {
  if (!props.client.date_of_birth) return null
  const dob = new Date(props.client.date_of_birth)
  if (Number.isNaN(dob.getTime())) return null
  const now = new Date()
  const thisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  if (thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    thisYear.setFullYear(now.getFullYear() + 1)
  }
  const days = Math.ceil((thisYear.getTime() - now.getTime()) / 86400000)
  if (days > 7 || days < 0) return null
  if (days === 0) return { label: 'Compleanno oggi! 🎂', cls: 'bg-pink-400/15 text-pink-400 border-pink-400/20' }
  return { label: `🎂 ${days}gg`, cls: 'bg-pink-400/15 text-pink-400 border-pink-400/20' }
})

const recapWorkoutInfo = computed(() => {
  if (!props.client.recap_last_workout_at) return null
  const diff = daysFromNow(props.client.recap_last_workout_at)
  if (diff === null) return null
  const ago = Math.max(0, -diff)
  if (ago === 0) return 'Oggi'
  if (ago === 1) return 'Ieri'
  return `${ago}gg fa`
})

const recapCheckinInfo = computed(() => {
  if (!props.client.recap_last_checkin_at) return null
  const diff = daysFromNow(props.client.recap_last_checkin_at)
  if (diff === null) return null
  const ago = Math.max(0, -diff)
  if (ago === 0) return 'Oggi'
  if (ago === 1) return 'Ieri'
  return `${ago}gg fa`
})

const weightSparkData = computed<number[]>(() => {
  const trend = props.client.weight_trend_30d
  if (!Array.isArray(trend) || trend.length < 2) return []
  return trend.map(t => Number(t.w)).filter(n => !Number.isNaN(n))
})

const primaryTrainerLabel = computed(() => {
  const fn = props.client.primary_trainer_first_name
  const ln = props.client.primary_trainer_last_name
  if (!fn) return null
  return `${fn} ${(ln || '').charAt(0)}.`
})

// ==========================================
// Fase 9: Quick actions inline
// ==========================================
const phoneIntl = computed(() => formatPhoneInternational(props.client.phone))

const waMessage = computed(() => {
  const template = `Ciao {{nome}}! Sono {{trainer_name}} di {{business_name}}, volevo dirti...`
  return fillTemplate(template, {
    nome: props.client.first_name || '',
    cognome: props.client.last_name || '',
    trainer_name: `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim() || 'il tuo trainer',
    business_name: (auth.user as any)?.businessName || 'Atlas'
  })
})

const waHref = computed(() => buildWhatsAppUrl(props.client.phone, waMessage.value))

const stopProp = (e: Event) => e.stopPropagation()

// ==========================================
// Sheet "Messaggio" mobile (accorpa WhatsApp + Chat in-app)
// ==========================================
interface MessageAction {
  label: string
  icon: Component
  handler: () => void
}

const showMessageSheet = ref(false)

const messageActions = computed<MessageAction[]>(() => {
  const list: MessageAction[] = []
  if (waHref.value) {
    list.push({
      label: 'Apri WhatsApp',
      icon: ChatBubbleLeftEllipsisIcon,
      handler: () => {
        const href = waHref.value
        if (!href) return
        window.open(href, '_blank', 'noopener,noreferrer')
      },
    })
  }
  list.push({
    label: 'Chat in-app',
    icon: ChatBubbleLeftRightIcon,
    handler: () => router.push(`/chat?clientId=${props.client.id}`),
  })
  return list
})

const onMessageClick = () => {
  showMessageSheet.value = true
}
</script>

<template>
  <div
    ref="cardEl"
    @click="onCardClick"
    @mousemove="handleMouseMove"
    :class="[
      'client-card group relative cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl transition-colors duration-200',
      { 'is-selected': selectable && selected }
    ]"
    :style="{ animationDelay: animDelay }"
  >
    <!-- Selection checkbox (Fase 8 bulk operations) -->
    <div v-if="selectable" class="select-checkbox" @click.stop="emit('toggle-select', client.id)">
      <span class="checkbox" :class="{ checked: selected }">{{ selected ? '✓' : '' }}</span>
    </div>
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
        <!-- Avatar: foto reale o gradient con iniziali (Fase 7) -->
        <button
          type="button"
          @click.stop="showPhotoModal = true"
          class="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden shadow-lg relative group/avatar"
          title="Modifica foto cliente"
        >
          <img
            v-if="photoUrl"
            :src="photoUrl"
            :alt="`Foto ${client.first_name}`"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gradient-to-br flex items-center justify-center" :class="avatarGradient">
            <span class="text-white font-bold text-xs sm:text-sm">{{ initials }}</span>
          </div>
          <span class="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">📷</span>
        </button>

        <!-- Name + meta -->
        <div class="flex-1 min-w-0">
          <!-- Riga 1: Nome + Status (sempre) + altri badge (solo desktop) -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm sm:text-[15px] font-semibold text-habit-text truncate min-w-0">
              {{ client.first_name }} {{ client.last_name }}
            </span>
            <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0" :class="statusConfig.cls">
              {{ statusConfig.label }}
            </span>
            <!-- Desktop only: extra badge sulla stessa riga -->
            <span
              v-if="birthdayInfo"
              class="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0"
              :class="birthdayInfo.cls"
            >{{ birthdayInfo.label }}</span>
            <span
              v-if="primaryTrainerLabel"
              class="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0 bg-indigo-400/15 text-indigo-400 border-indigo-400/20"
              :title="`Trainer principale: ${client.primary_trainer_first_name} ${client.primary_trainer_last_name}`"
            >👤 {{ primaryTrainerLabel }}</span>
            <span
              v-if="programBadgeConfig"
              class="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0"
              :class="programBadgeConfig.cls"
            >{{ programBadgeConfig.label }}</span>
            <template v-for="tag in sortTagsByPriority(client.tags || [], 2)" :key="tag">
              <span class="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0 uppercase tracking-wider" :class="getTagClass(tag)">
                {{ getTagLabel(tag) }}
              </span>
            </template>
            <span
              v-if="(client.tags || []).length > 2"
              class="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] text-habit-text-subtle"
              :title="(client.tags || []).slice(2).map(getTagLabel).join(', ')"
            >+{{ (client.tags || []).length - 2 }}</span>
          </div>

          <!-- Riga 2 mobile only: badge secondari su riga propria -->
          <div
            v-if="birthdayInfo || primaryTrainerLabel || programBadgeConfig || (client.tags || []).length"
            class="flex sm:hidden flex-wrap items-center gap-1 mt-1"
          >
            <span
              v-if="birthdayInfo"
              class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border"
              :class="birthdayInfo.cls"
            >{{ birthdayInfo.label }}</span>
            <span
              v-if="primaryTrainerLabel"
              class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border bg-indigo-400/15 text-indigo-400 border-indigo-400/20"
            >👤 {{ primaryTrainerLabel }}</span>
            <span
              v-if="programBadgeConfig"
              class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border"
              :class="programBadgeConfig.cls"
            >{{ programBadgeConfig.label }}</span>
            <template v-for="tag in sortTagsByPriority(client.tags || [], 2)" :key="`m-${tag}`">
              <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full border uppercase tracking-wider" :class="getTagClass(tag)">
                {{ getTagLabel(tag) }}
              </span>
            </template>
            <span
              v-if="(client.tags || []).length > 2"
              class="px-1.5 py-0.5 text-[10px] text-habit-text-subtle"
              :title="(client.tags || []).slice(2).map(getTagLabel).join(', ')"
            >+{{ (client.tags || []).length - 2 }}</span>
          </div>

          <!-- Goal + fitness (testo sottile) -->
          <div v-if="goalLabel || fitnessLabel" class="flex items-center gap-1.5 mt-0.5 text-xs text-habit-text-subtle truncate">
            <span v-if="goalLabel" class="capitalize flex-shrink-0">{{ goalLabel }}</span>
            <span v-if="goalLabel && fitnessLabel" class="hidden sm:inline">·</span>
            <span v-if="fitnessLabel" class="hidden sm:inline flex-shrink-0">{{ fitnessLabel }}</span>
          </div>
        </div>

        <!-- Arrow mobile: sempre in alto a dx accanto al nome -->
        <svg
          class="sm:hidden w-3 h-3 text-habit-text-subtle/40 flex-shrink-0 self-center"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Stats row desktop only: dati operativi con icone -->
      <div class="hidden sm:flex items-center gap-3 sm:gap-4 lg:gap-5 flex-shrink-0">
        <!-- Abbonamento -->
        <div class="flex items-center gap-1 text-xs tabular-nums" :title="client.active_subscription_end_date ? `Scade il ${new Date(client.active_subscription_end_date).toLocaleDateString('it-IT')}` : 'Nessun abbonamento attivo'">
          <svg class="w-3.5 h-3.5 text-habit-text-subtle/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span v-if="subscriptionInfo" :class="subscriptionInfo.cls" class="font-medium">{{ subscriptionInfo.label }}</span>
          <span v-else class="text-habit-text-subtle">—</span>
        </div>

        <!-- Ultimo check corporeo -->
        <div class="hidden sm:flex items-center gap-1 text-xs tabular-nums" :title="client.last_measurement_date ? `Ultimo check: ${new Date(client.last_measurement_date).toLocaleDateString('it-IT')}` : 'Nessun check corporeo registrato'">
          <svg class="w-3.5 h-3.5 text-habit-text-subtle/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span :class="lastCheckInfo.cls" class="font-medium">Check {{ lastCheckInfo.label }}</span>
        </div>

        <!-- Programma settimana X/Y -->
        <div v-if="currentWeek" class="hidden lg:flex items-center gap-1 text-xs tabular-nums" :title="programSummary?.active_program_name || 'Programma'">
          <svg class="w-3.5 h-3.5 text-habit-text-subtle/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-habit-text font-medium">W{{ currentWeek.current }}<span v-if="currentWeek.total" class="text-habit-text-subtle">/{{ currentWeek.total }}</span></span>
        </div>

        <!-- Action button contestuale -->
        <button
          v-if="actionButtonLabel"
          @click="handleActionClick"
          class="flex-shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors"
          :class="
            pendingAction?.badge === 'NUOVO'
              ? 'bg-habit-orange/20 text-habit-orange hover:bg-habit-orange hover:text-white'
              : 'bg-habit-cyan/20 text-habit-cyan hover:bg-habit-cyan hover:text-white'
          "
        >
          {{ actionButtonLabel }}
        </button>

        <!-- Arrow -->
        <svg
          class="w-3 h-3 text-habit-text-subtle/30 group-hover:text-habit-cyan/60 transition-all duration-300 group-hover:translate-x-0.5 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Mobile row: dati operativi + action button -->
      <div class="sm:hidden pl-[46px] flex flex-col gap-1.5">
        <!-- Compressed stats: subscription · check · settimana · workout · check-in palestra -->
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
          <span v-if="subscriptionInfo" :class="subscriptionInfo.cls" class="font-medium">{{ subscriptionInfo.label }}</span>
          <span v-else class="text-habit-text-subtle">No sub</span>
          <span class="text-habit-text-subtle/40">&middot;</span>
          <span :class="lastCheckInfo.cls">Check {{ lastCheckInfo.label }}</span>
          <template v-if="currentWeek">
            <span class="text-habit-text-subtle/40">&middot;</span>
            <span class="text-habit-text-subtle">W{{ currentWeek.current }}<span v-if="currentWeek.total">/{{ currentWeek.total }}</span></span>
          </template>
          <template v-if="recapWorkoutInfo">
            <span class="text-habit-text-subtle/40">&middot;</span>
            <span class="text-habit-text-subtle">💪 {{ recapWorkoutInfo }}</span>
          </template>
          <template v-if="recapCheckinInfo">
            <span class="text-habit-text-subtle/40">&middot;</span>
            <span class="text-habit-text-subtle">📍 {{ recapCheckinInfo }}</span>
          </template>
        </div>
        <!-- Action button contestuale (Primo check / Rinnova / ecc.) — pill mobile prominente -->
        <button
          v-if="actionButtonLabel"
          @click="handleActionClick"
          class="self-start inline-flex items-center gap-1 px-3 py-1 text-[12px] font-semibold rounded-full transition-colors"
          :class="
            pendingAction?.badge === 'NUOVO'
              ? 'bg-habit-orange/15 text-habit-orange hover:bg-habit-orange hover:text-white'
              : 'bg-habit-cyan/15 text-habit-cyan hover:bg-habit-cyan hover:text-white'
          "
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
          {{ actionButtonLabel }}
        </button>
      </div>
    </div>

    <!-- Fase 7: Activity recap row + Fase 9: Quick actions inline
         Sempre visibile: contiene toggle Disattiva + bottoni messaggio (chat in-app è sempre disponibile) -->
    <div
      class="recap-row px-3 sm:px-4 lg:px-5 pb-2.5 sm:pb-3 -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-habit-text-subtle"
      @click.stop
    >
      <!-- Activity recap (sm+ only — su mobile sono nei compressed stats sopra) -->
      <span v-if="recapWorkoutInfo" class="hidden sm:flex items-center gap-1" :title="`Ultimo workout: ${recapWorkoutInfo}`">
        💪 <span>{{ recapWorkoutInfo }}</span>
      </span>
      <span v-if="recapCheckinInfo" class="hidden sm:flex items-center gap-1" :title="`Ultimo check-in palestra: ${recapCheckinInfo}`">
        📍 <span>{{ recapCheckinInfo }}</span>
      </span>
      <!-- Sparkline peso -->
      <span v-if="weightSparkData.length >= 2" class="flex items-center gap-1" title="Peso ultimi 30 giorni">
        ⚖️
        <SparkLine :data="weightSparkData" color="#3b82f6" :height="14" :width="50" />
      </span>

      <!-- Spacer -->
      <span class="flex-1"></span>

      <!-- Activation toggle compact (Fase 2) -->
      <ClientActivationToggle
        :client-id="client.id"
        :status="client.status"
        @changed="(s) => emit('status-changed', { id: client.id, status: s })"
      />

      <!-- Quick actions (Fase 9) — telefono unificato, SVG mobile + emoji desktop -->
      <a
        v-if="phoneIntl"
        :href="`tel:${client.phone}`"
        @click="stopProp"
        class="qa-btn"
        title="Chiama"
        aria-label="Chiama"
      >
        <PhoneIcon class="w-4 h-4 sm:hidden" />
        <span class="hidden sm:inline">📞</span>
      </a>

      <!-- Mobile only: bottone Messaggio → apre ActionSheet con WA + Chat in-app -->
      <button
        type="button"
        @click.stop="onMessageClick"
        class="qa-btn sm:!hidden"
        title="Messaggio"
        aria-label="Invia messaggio"
      >
        <ChatBubbleLeftEllipsisIcon class="w-4 h-4" />
      </button>

      <!-- Desktop ≥ sm: emoji classiche WA / email / chat in-app (telefono già sopra) -->
      <a
        v-if="waHref"
        :href="waHref"
        target="_blank"
        rel="noopener noreferrer"
        @click="stopProp"
        class="qa-btn !hidden sm:!inline-flex"
        title="Apri WhatsApp con messaggio precompilato"
      >💬</a>
      <a
        v-if="client.email"
        :href="`mailto:${client.email}`"
        @click="stopProp"
        class="qa-btn !hidden sm:!inline-flex"
        title="Email"
      >✉️</a>
      <router-link
        :to="`/chat?clientId=${client.id}`"
        @click="stopProp"
        class="qa-btn !hidden sm:!inline-flex"
        title="Chat in-app"
      >🗨️</router-link>
    </div>
  </div>

  <!-- Modal foto (Fase 7) -->
  <ClientPhotoUpload
    :visible="showPhotoModal"
    :client-id="client.id"
    :current-photo="photoUrl"
    @close="showPhotoModal = false"
    @updated="onPhotoUpdated"
  />

  <!-- Sheet azioni messaggio (mobile only) -->
  <ActionSheet
    v-model:open="showMessageSheet"
    title="Invia messaggio"
    :actions="messageActions"
  />
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

/* Fase 7 + 9: recap row + quick actions */
.recap-row {
  border-top: 1px solid var(--habit-border, rgba(255,255,255,0.05));
  padding-top: 8px;
}

.qa-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: inherit;
  text-decoration: none;
  font-size: 13px;
  transition: background 0.15s, transform 0.15s;
}
.qa-btn:hover {
  background: rgba(99,102,241,0.15);
  transform: scale(1.1);
}

/* Fase 8: Selection mode */
.client-card.is-selected {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}
.select-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}
.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 2px solid rgba(148,163,184,0.5);
  border-radius: 6px;
  background: rgba(255,255,255,0.95);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.15s;
}
.checkbox.checked {
  background: #6366f1;
  border-color: #6366f1;
}
</style>
