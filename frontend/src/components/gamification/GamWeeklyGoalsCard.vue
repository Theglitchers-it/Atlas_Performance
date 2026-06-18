<script setup lang="ts">
import { ref, toRefs, computed } from 'vue'
import type { WeeklyGoal, WeeklyGoalType } from '@/types'

const props = defineProps<{
  goals: WeeklyGoal[]
  weekStart: string | null
  readonly?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'upsert', payload: { goal_type: WeeklyGoalType; target_value: number }): void
  (e: 'delete', id: number): void
}>()

const { goals, weekStart, readonly } = toRefs(props)

const showForm = ref(false)
const formType = ref<WeeklyGoalType>('xp')
const formTarget = ref<number>(500)
const saving = ref(false)

const goalTypeMeta: Record<WeeklyGoalType, { label: string; emoji: string; unit: string; color: string; defaultTarget: number }> = {
  xp: { label: 'XP', emoji: '⚡', unit: 'XP', color: 'text-habit-cyan', defaultTarget: 500 },
  workouts: { label: 'Workout', emoji: '💪', unit: 'sessioni', color: 'text-green-400', defaultTarget: 3 },
  challenges: { label: 'Sfide', emoji: '🎯', unit: 'completate', color: 'text-purple-400', defaultTarget: 1 },
  streak: { label: 'Streak', emoji: '🔥', unit: 'giorni', color: 'text-orange-400', defaultTarget: 7 }
}

const goalTypes: WeeklyGoalType[] = ['xp', 'workouts', 'challenges', 'streak']

const usedTypes = computed(() => new Set(goals.value.map(g => g.goal_type)))
const availableTypes = computed(() => goalTypes.filter(t => !usedTypes.value.has(t)))

const formatWeekStart = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
}

const openForm = (preselect?: WeeklyGoalType) => {
  if (preselect) formType.value = preselect
  else if (availableTypes.value.length) formType.value = availableTypes.value[0]
  formTarget.value = goalTypeMeta[formType.value].defaultTarget
  showForm.value = true
}

const onTypeChange = () => {
  formTarget.value = goalTypeMeta[formType.value].defaultTarget
}

const submitForm = async () => {
  if (saving.value || formTarget.value <= 0) return
  saving.value = true
  emit('upsert', { goal_type: formType.value, target_value: formTarget.value })
  showForm.value = false
  saving.value = false
}

const onDelete = (id: number) => {
  if (confirm('Eliminare questo goal?')) emit('delete', id)
}
</script>

<template>
  <div class="gam-glass-card p-4">
    <div class="flex items-baseline justify-between mb-3 gap-2">
      <div class="min-w-0">
        <h4 class="text-sm font-semibold text-habit-text">Goal settimanali</h4>
        <p class="text-[11px] text-habit-text-subtle truncate">
          <span v-if="weekStart">{{ formatWeekStart(weekStart) }}</span>
          <span v-else>Settimana corrente</span>
        </p>
      </div>
      <button
        v-if="!readonly && availableTypes.length && !showForm"
        @click="openForm()"
        class="text-xs font-semibold text-habit-cyan hover:underline whitespace-nowrap flex items-center gap-1"
      >
        <span class="text-base leading-none">+</span> Aggiungi
      </button>
    </div>

    <!-- Form aggiunta -->
    <div v-if="showForm" class="mb-3 p-3 rounded-lg bg-habit-bg/40 border border-habit-border/40 space-y-2">
      <div class="flex gap-2">
        <select v-model="formType" @change="onTypeChange" class="flex-1 bg-habit-card border border-habit-border rounded-habit px-2 py-1.5 text-sm text-habit-text focus:border-habit-cyan focus:outline-none">
          <option v-for="t in availableTypes" :key="t" :value="t">{{ goalTypeMeta[t].emoji }} {{ goalTypeMeta[t].label }}</option>
        </select>
        <input
          v-model.number="formTarget"
          type="number"
          min="1"
          class="w-24 bg-habit-card border border-habit-border rounded-habit px-2 py-1.5 text-sm text-habit-text focus:border-habit-cyan focus:outline-none tabular-nums"
        />
        <span class="self-center text-xs text-habit-text-subtle">{{ goalTypeMeta[formType].unit }}</span>
      </div>
      <div class="flex justify-end gap-2">
        <button @click="showForm = false" class="text-xs text-habit-text-subtle px-3 py-1 rounded hover:bg-habit-bg/40">Annulla</button>
        <button @click="submitForm" :disabled="saving" class="text-xs font-semibold text-white px-3 py-1 rounded bg-habit-cyan hover:bg-habit-cyan/80 disabled:opacity-50">Salva</button>
      </div>
    </div>

    <!-- Lista goal -->
    <div v-if="goals.length === 0 && !showForm" class="text-center py-4 text-xs text-habit-text-subtle">
      <span v-if="readonly">Nessun goal impostato per questa settimana</span>
      <span v-else>Imposta i tuoi obiettivi settimanali per restare motivato</span>
    </div>

    <div v-else-if="goals.length > 0" class="space-y-2">
      <div
        v-for="g in goals"
        :key="g.id"
        class="p-2.5 rounded-lg bg-habit-bg/40 border"
        :class="g.achieved ? 'border-green-500/40' : 'border-habit-border/40'"
      >
        <div class="flex items-center justify-between mb-1.5 gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-lg">{{ goalTypeMeta[g.goal_type].emoji }}</span>
            <span class="text-sm font-semibold text-habit-text">{{ goalTypeMeta[g.goal_type].label }}</span>
            <span v-if="g.achieved" class="text-[10px] font-bold uppercase text-green-400 px-1.5 py-0.5 rounded bg-green-500/20">✓ Fatto</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-sm tabular-nums">
              <span class="font-bold" :class="goalTypeMeta[g.goal_type].color">{{ g.current_value }}</span>
              <span class="text-habit-text-subtle"> / {{ g.target_value }}</span>
            </span>
            <button
              v-if="!readonly"
              @click="onDelete(g.id)"
              class="text-habit-text-subtle hover:text-red-400 transition"
              title="Elimina goal"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="w-full h-1.5 bg-habit-bg/60 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: g.progress_pct + '%', background: g.achieved ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #0283a7, #ff4c00)' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
