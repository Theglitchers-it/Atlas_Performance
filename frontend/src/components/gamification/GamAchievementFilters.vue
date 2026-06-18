<script setup lang="ts">
import { computed, toRefs } from 'vue'

interface Filters {
  category: string
  rarity: string
  unlockedOnly: boolean
  sort: 'recent' | 'progress' | 'rarity_desc' | 'default'
  search: string
}

const props = defineProps<{
  filters: Filters
  categories: string[]
}>()

const emit = defineEmits<{
  (e: 'update', filters: Filters): void
  (e: 'reset'): void
}>()

const { filters } = toRefs(props)

const rarities = [
  { value: '', label: 'Tutte' },
  { value: 'common', label: 'Comune' },
  { value: 'uncommon', label: 'Non comune' },
  { value: 'rare', label: 'Raro' },
  { value: 'epic', label: 'Epico' },
  { value: 'legendary', label: 'Leggendario' }
]

const categoryLabels: Record<string, string> = {
  workout: '💪 Allenamento',
  consistency: '🔥 Costanza',
  strength: '🏋️ Forza',
  progress: '📈 Progressi',
  social: '👥 Sociale',
  special: '⭐ Speciale'
}

const sortOptions = [
  { value: 'default', label: 'Categoria' },
  { value: 'recent', label: 'Recenti' },
  { value: 'progress', label: 'Più vicini' },
  { value: 'rarity_desc', label: 'Rarità ↓' }
]

const update = (patch: Partial<Filters>) => {
  emit('update', { ...filters.value, ...patch })
}

const hasActiveFilters = computed(() =>
  filters.value.category !== '' ||
  filters.value.rarity !== '' ||
  filters.value.unlockedOnly ||
  filters.value.search !== '' ||
  filters.value.sort !== 'default'
)
</script>

<template>
  <div class="gam-glass-card p-3 mb-4 space-y-3">
    <!-- Search + sort + toggle sbloccati -->
    <div class="flex flex-wrap gap-2 items-center">
      <div class="relative flex-1 min-w-[180px]">
        <input
          :value="filters.search"
          @input="update({ search: ($event.target as HTMLInputElement).value })"
          type="search"
          placeholder="Cerca badge..."
          class="w-full pl-8 pr-2 py-1.5 text-sm bg-habit-bg/40 border border-habit-border rounded-habit text-habit-text focus:border-habit-cyan focus:outline-none"
        />
        <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z"/>
        </svg>
      </div>

      <select
        :value="filters.sort"
        @change="update({ sort: ($event.target as HTMLSelectElement).value as any })"
        class="bg-habit-bg/40 border border-habit-border rounded-habit px-2 py-1.5 text-xs text-habit-text focus:border-habit-cyan focus:outline-none"
      >
        <option v-for="o in sortOptions" :key="o.value" :value="o.value">Ordina: {{ o.label }}</option>
      </select>

      <label class="flex items-center gap-1.5 text-xs text-habit-text cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="filters.unlockedOnly"
          @change="update({ unlockedOnly: ($event.target as HTMLInputElement).checked })"
          class="h-4 w-4 rounded bg-habit-bg/40 border-habit-border text-habit-cyan focus:ring-habit-cyan/30"
        />
        Solo sbloccati
      </label>

      <button
        v-if="hasActiveFilters"
        @click="emit('reset')"
        class="text-xs text-habit-text-subtle hover:text-red-400 transition px-2 py-1"
        title="Reset filtri"
      >Reset</button>
    </div>

    <!-- Pill rarità -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="r in rarities"
        :key="r.value"
        @click="update({ rarity: r.value })"
        class="px-2.5 py-1 text-[11px] font-semibold rounded-full border transition"
        :class="filters.rarity === r.value
          ? 'bg-habit-cyan text-white border-habit-cyan'
          : 'bg-habit-bg/40 text-habit-text-subtle border-habit-border hover:border-habit-cyan/40 hover:text-habit-text'"
      >{{ r.label }}</button>
    </div>

    <!-- Pill categorie -->
    <div v-if="categories.length" class="flex flex-wrap gap-1.5">
      <button
        @click="update({ category: '' })"
        class="px-2.5 py-1 text-[11px] font-semibold rounded-full border transition"
        :class="filters.category === ''
          ? 'bg-habit-cyan text-white border-habit-cyan'
          : 'bg-habit-bg/40 text-habit-text-subtle border-habit-border hover:border-habit-cyan/40 hover:text-habit-text'"
      >Tutte categorie</button>
      <button
        v-for="c in categories"
        :key="c"
        @click="update({ category: c })"
        class="px-2.5 py-1 text-[11px] font-semibold rounded-full border transition"
        :class="filters.category === c
          ? 'bg-habit-cyan text-white border-habit-cyan'
          : 'bg-habit-bg/40 text-habit-text-subtle border-habit-border hover:border-habit-cyan/40 hover:text-habit-text'"
      >{{ categoryLabels[c] || c }}</button>
    </div>
  </div>
</template>
