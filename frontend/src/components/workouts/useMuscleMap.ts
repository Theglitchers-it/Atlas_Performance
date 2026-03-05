import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { MUSCLE_NAME_MAP, ALL_MUSCLE_KEYS } from './muscleMapPaths'

export interface MuscleGroupInput {
  name: string
  name_it?: string
  is_primary?: boolean
  activation_percentage?: number
}

interface MuscleStyle {
  fill: string
  opacity: number
}

const COLOR_PRIMARY = '#0283a7'   // habit-cyan
const COLOR_SECONDARY = '#ff4c00' // habit-orange
const COLOR_NONE = 'transparent'

/**
 * Map activation_percentage (0–100) to opacity (0.3–1.0).
 * Missing or 0 defaults to 0.7.
 */
function activationToOpacity(pct: number | undefined): number {
  if (!pct || pct <= 0) return 0.7
  return 0.3 + (Math.min(pct, 100) / 100) * 0.7
}

/**
 * Resolve a muscle group's name variants to path keys.
 */
function resolvePathKeys(group: MuscleGroupInput): string[] {
  const candidates = [
    group.name_it?.toLowerCase(),
    group.name?.toLowerCase(),
  ].filter(Boolean) as string[]

  for (const name of candidates) {
    if (MUSCLE_NAME_MAP[name]) return MUSCLE_NAME_MAP[name]
  }
  return []
}

export function useMuscleMap(muscleGroups: MaybeRefOrGetter<MuscleGroupInput[] | undefined>) {
  // Build a map of pathKey → { fill, opacity }
  const styleMap = computed<Record<string, MuscleStyle>>(() => {
    const groups = toValue(muscleGroups)
    if (!groups || groups.length === 0) return {}

    // Check for "Full Body"
    const isFullBody = groups.some((g) => {
      const n = (g.name_it || g.name || '').toLowerCase()
      return n === 'full body' || n === 'tutto il corpo'
    })

    if (isFullBody) {
      const map: Record<string, MuscleStyle> = {}
      for (const key of ALL_MUSCLE_KEYS) {
        map[key] = { fill: COLOR_PRIMARY, opacity: 0.5 }
      }
      return map
    }

    const map: Record<string, MuscleStyle> = {}

    for (const group of groups) {
      const keys = resolvePathKeys(group)
      const fill = group.is_primary ? COLOR_PRIMARY : COLOR_SECONDARY
      const opacity = activationToOpacity(group.activation_percentage)

      for (const key of keys) {
        // Primary takes precedence over secondary if same muscle targeted twice
        if (!map[key] || (group.is_primary && map[key].fill !== COLOR_PRIMARY)) {
          map[key] = { fill, opacity }
        }
      }
    }

    return map
  })

  function getMuscleStyle(pathKey: string): MuscleStyle {
    return styleMap.value[pathKey] || { fill: COLOR_NONE, opacity: 0 }
  }

  const hasAnyMuscle = computed(() => Object.keys(styleMap.value).length > 0)

  return { getMuscleStyle, hasAnyMuscle, styleMap }
}
