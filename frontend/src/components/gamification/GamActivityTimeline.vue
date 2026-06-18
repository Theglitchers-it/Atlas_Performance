<script setup lang="ts">
import { computed, ref } from 'vue'
import type { XPTransaction } from '@/types'
import { getTxTypeMeta } from '@/constants/gamification'

const props = defineProps<{
  transactions: XPTransaction[]
  loading?: boolean
}>()

const filterType = ref<string>('')
const search = ref<string>('')
const limit = ref<number>(20)

const types = computed(() => {
  const set = new Set<string>()
  for (const t of props.transactions) set.add(t.transaction_type || 'workout')
  return Array.from(set)
})

const filtered = computed<XPTransaction[]>(() => {
  let list = props.transactions
  if (filterType.value) list = list.filter(t => t.transaction_type === filterType.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.transaction_type || '').toLowerCase().includes(q)
    )
  }
  return list.slice(0, limit.value)
})

const totalShown = computed(() => filtered.value.length)
const totalAll = computed(() => props.transactions.length)
const canLoadMore = computed(() => limit.value < totalAll.value && !filterType.value && !search.value)

const formatRelative = (dateStr: string | null | undefined): string => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Adesso'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ore fa`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}g fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// expose per template
const meta = getTxTypeMeta
</script>

<template>
  <div>
    <!-- Filtri -->
    <div class="gam-glass-card p-3 mb-4 space-y-3">
      <div class="flex gap-2 items-center">
        <div class="relative flex-1 min-w-0">
          <input
            v-model="search"
            type="search"
            placeholder="Cerca attività..."
            class="w-full pl-8 pr-2 py-1.5 text-sm bg-habit-bg/40 border border-habit-border rounded-habit text-habit-text focus:border-habit-cyan focus:outline-none"
          />
          <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z"/>
          </svg>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          @click="filterType = ''"
          class="px-2.5 py-1 text-[11px] font-semibold rounded-full border transition"
          :class="filterType === '' ? 'bg-habit-cyan text-white border-habit-cyan' : 'bg-habit-bg/40 text-habit-text-subtle border-habit-border hover:border-habit-cyan/40 hover:text-habit-text'"
        >Tutti</button>
        <button
          v-for="t in types"
          :key="t"
          @click="filterType = t"
          class="px-2.5 py-1 text-[11px] font-semibold rounded-full border transition inline-flex items-center gap-1"
          :class="filterType === t ? 'bg-habit-cyan text-white border-habit-cyan' : 'bg-habit-bg/40 text-habit-text-subtle border-habit-border hover:border-habit-cyan/40 hover:text-habit-text'"
        >
          <span>{{ meta(t).emoji }}</span> {{ meta(t).label }}
        </button>
      </div>
    </div>

    <!-- Timeline -->
    <div v-if="loading" class="gam-glass-card p-4 text-center text-sm text-habit-text-subtle">
      Caricamento...
    </div>
    <div v-else-if="filtered.length === 0" class="gam-glass-card p-8 text-center">
      <div class="text-4xl mb-2 opacity-60">📜</div>
      <p class="text-sm text-habit-text-subtle">Nessuna attività trovata</p>
    </div>
    <div v-else class="gam-glass-card divide-y divide-habit-border/40">
      <div
        v-for="tx in filtered"
        :key="tx.id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 bg-habit-bg/60">
          {{ meta(tx.transaction_type).emoji }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-habit-text truncate">
            {{ tx.description || meta(tx.transaction_type).label }}
          </div>
          <div class="flex items-center gap-2 text-[10px] text-habit-text-subtle">
            <span class="px-1.5 py-0.5 rounded bg-habit-bg/40 uppercase font-semibold tracking-wider">{{ meta(tx.transaction_type).label }}</span>
            <span>{{ formatRelative(tx.created_at) }}</span>
          </div>
        </div>
        <span
          class="text-sm font-bold tabular-nums flex-shrink-0"
          :class="((tx.points ?? 0) >= 0) ? 'text-green-400' : 'text-red-400'"
        >
          {{ (tx.points ?? 0) >= 0 ? '+' : '' }}{{ tx.points ?? 0 }}
        </span>
      </div>
    </div>

    <div v-if="canLoadMore" class="flex justify-center mt-4">
      <button
        @click="limit += 20"
        class="text-xs font-semibold text-habit-cyan hover:underline"
      >Mostra altre 20</button>
    </div>
    <div v-if="totalAll > 0" class="text-center mt-2 text-[10px] text-habit-text-subtle">
      {{ totalShown }} di {{ totalAll }} attività
    </div>
  </div>
</template>
