/**
 * useOfflineWorkout Composable
 * Cache workout del giorno per accesso offline
 */

import { ref, type Ref } from 'vue'

const WORKOUT_KEY = 'cached_workout'
const EXERCISES_KEY = 'cached_exercises'

interface UseOfflineWorkoutReturn {
    cachedWorkout: Ref<Record<string, any> | null>
    cachedExercises: Ref<Record<string, any>[]>
    cacheWorkout: (workout: Record<string, any>) => Promise<void>
    loadCachedWorkout: () => Promise<Record<string, any> | null>
    cacheExercises: (exercises: Record<string, any>[]) => Promise<void>
    loadCachedExercises: () => Promise<Record<string, any>[]>
    clearCache: () => Promise<void>
}

export function useOfflineWorkout(): UseOfflineWorkoutReturn {
    const cachedWorkout = ref<Record<string, any> | null>(null)
    const cachedExercises = ref<Record<string, any>[]>([])

    /**
     * Salva workout in cache locale
     */
    const cacheWorkout = async (workout: Record<string, any>): Promise<void> => {
        try {
            const data = JSON.stringify({
                workout,
                cachedAt: new Date().toISOString()
            })

            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                await Preferences.set({ key: WORKOUT_KEY, value: data })
            } else {
                localStorage.setItem(WORKOUT_KEY, data)
            }

            cachedWorkout.value = workout
        } catch (e) {
            console.error('[OFFLINE-WORKOUT] Errore cache workout:', e)
        }
    }

    /**
     * Carica workout dalla cache locale
     */
    const loadCachedWorkout = async (): Promise<Record<string, any> | null> => {
        try {
            let raw: string | null = null

            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                const { value } = await Preferences.get({ key: WORKOUT_KEY })
                raw = value
            } else {
                raw = localStorage.getItem(WORKOUT_KEY)
            }

            if (raw) {
                const parsed = JSON.parse(raw)
                cachedWorkout.value = parsed.workout
                return parsed.workout
            }
        } catch (e) {
            console.error('[OFFLINE-WORKOUT] Errore caricamento cache:', e)
        }
        return null
    }

    /**
     * Salva libreria esercizi in cache locale
     */
    const cacheExercises = async (exercises: Record<string, any>[]): Promise<void> => {
        try {
            const data = JSON.stringify({
                exercises,
                cachedAt: new Date().toISOString()
            })

            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                await Preferences.set({ key: EXERCISES_KEY, value: data })
            } else {
                localStorage.setItem(EXERCISES_KEY, data)
            }

            cachedExercises.value = exercises
        } catch (e) {
            console.error('[OFFLINE-WORKOUT] Errore cache esercizi:', e)
        }
    }

    /**
     * Carica esercizi dalla cache locale
     */
    const loadCachedExercises = async (): Promise<Record<string, any>[]> => {
        try {
            let raw: string | null = null

            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                const { value } = await Preferences.get({ key: EXERCISES_KEY })
                raw = value
            } else {
                raw = localStorage.getItem(EXERCISES_KEY)
            }

            if (raw) {
                const parsed = JSON.parse(raw)
                cachedExercises.value = parsed.exercises
                return parsed.exercises
            }
        } catch (e) {
            console.error('[OFFLINE-WORKOUT] Errore caricamento cache esercizi:', e)
        }
        return []
    }

    /**
     * Pulisci cache
     */
    const clearCache = async (): Promise<void> => {
        try {
            if (window.Capacitor?.isNativePlatform()) {
                const { Preferences } = await import('@capacitor/preferences')
                await Preferences.remove({ key: WORKOUT_KEY })
                await Preferences.remove({ key: EXERCISES_KEY })
            } else {
                localStorage.removeItem(WORKOUT_KEY)
                localStorage.removeItem(EXERCISES_KEY)
            }
            cachedWorkout.value = null
            cachedExercises.value = []
        } catch (e) {
            console.error('[OFFLINE-WORKOUT] Errore pulizia cache:', e)
        }
    }

    return {
        cachedWorkout,
        cachedExercises,
        cacheWorkout,
        loadCachedWorkout,
        cacheExercises,
        loadCachedExercises,
        clearCache
    }
}
