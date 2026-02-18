/**
 * Tests for useOfflineWorkout composable
 * Tests workout and exercise caching in localStorage (web mode)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let useOfflineWorkout

describe('useOfflineWorkout', () => {
    beforeEach(async () => {
        vi.resetModules()
        window.Capacitor = undefined
        localStorage.clear()
        vi.clearAllMocks()

        const mod = await import('../useOfflineWorkout.js')
        useOfflineWorkout = mod.useOfflineWorkout
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return all expected properties and methods', () => {
        const result = useOfflineWorkout()

        expect(result).toHaveProperty('cachedWorkout')
        expect(result).toHaveProperty('cachedExercises')
        expect(result).toHaveProperty('cacheWorkout')
        expect(result).toHaveProperty('loadCachedWorkout')
        expect(result).toHaveProperty('cacheExercises')
        expect(result).toHaveProperty('loadCachedExercises')
        expect(result).toHaveProperty('clearCache')
    })

    it('should have null/empty initial state', () => {
        const { cachedWorkout, cachedExercises } = useOfflineWorkout()

        expect(cachedWorkout.value).toBeNull()
        expect(cachedExercises.value).toEqual([])
    })

    describe('cacheWorkout / loadCachedWorkout', () => {
        it('should cache a workout to localStorage', async () => {
            const workout = { id: '123', name: 'Push Day', exercises: ['bench', 'pushup'] }
            const { cacheWorkout } = useOfflineWorkout()

            await cacheWorkout(workout)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'cached_workout',
                expect.any(String)
            )

            const stored = JSON.parse(localStorage.setItem.mock.calls[0][1])
            expect(stored.workout).toEqual(workout)
            expect(stored.cachedAt).toBeDefined()
        })

        it('should update cachedWorkout ref after caching', async () => {
            const workout = { id: '123', name: 'Push Day' }
            const { cacheWorkout, cachedWorkout } = useOfflineWorkout()

            await cacheWorkout(workout)
            expect(cachedWorkout.value).toEqual(workout)
        })

        it('should load cached workout from localStorage', async () => {
            const workout = { id: '456', name: 'Leg Day' }
            const data = JSON.stringify({ workout, cachedAt: new Date().toISOString() })
            localStorage.getItem.mockReturnValueOnce(data)

            const { loadCachedWorkout, cachedWorkout } = useOfflineWorkout()
            const result = await loadCachedWorkout()

            expect(result).toEqual(workout)
            expect(cachedWorkout.value).toEqual(workout)
        })

        it('should return null when no cached workout exists', async () => {
            localStorage.getItem.mockReturnValueOnce(null)

            const { loadCachedWorkout } = useOfflineWorkout()
            const result = await loadCachedWorkout()

            expect(result).toBeNull()
        })

        it('should handle corrupted data gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            localStorage.getItem.mockReturnValueOnce('invalid json{{{')

            const { loadCachedWorkout } = useOfflineWorkout()
            const result = await loadCachedWorkout()

            expect(result).toBeNull()
            expect(consoleSpy).toHaveBeenCalled()
        })
    })

    describe('cacheExercises / loadCachedExercises', () => {
        it('should cache exercises to localStorage', async () => {
            const exercises = [
                { id: 1, name: 'Bench Press', muscle: 'chest' },
                { id: 2, name: 'Squat', muscle: 'legs' }
            ]
            const { cacheExercises } = useOfflineWorkout()

            await cacheExercises(exercises)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'cached_exercises',
                expect.any(String)
            )
        })

        it('should update cachedExercises ref after caching', async () => {
            const exercises = [{ id: 1, name: 'Deadlift' }]
            const { cacheExercises, cachedExercises } = useOfflineWorkout()

            await cacheExercises(exercises)
            expect(cachedExercises.value).toEqual(exercises)
        })

        it('should load cached exercises from localStorage', async () => {
            const exercises = [{ id: 1, name: 'Bench Press' }]
            const data = JSON.stringify({ exercises, cachedAt: new Date().toISOString() })
            localStorage.getItem.mockReturnValueOnce(data)

            const { loadCachedExercises, cachedExercises } = useOfflineWorkout()
            const result = await loadCachedExercises()

            expect(result).toEqual(exercises)
            expect(cachedExercises.value).toEqual(exercises)
        })

        it('should return empty array when no cached exercises', async () => {
            localStorage.getItem.mockReturnValueOnce(null)

            const { loadCachedExercises } = useOfflineWorkout()
            const result = await loadCachedExercises()

            expect(result).toEqual([])
        })

        it('should handle errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            localStorage.getItem.mockImplementationOnce(() => { throw new Error('Storage error') })

            const { loadCachedExercises } = useOfflineWorkout()
            const result = await loadCachedExercises()

            expect(result).toEqual([])
            expect(consoleSpy).toHaveBeenCalled()
        })
    })

    describe('clearCache', () => {
        it('should remove both keys from localStorage', async () => {
            const { clearCache } = useOfflineWorkout()
            await clearCache()

            expect(localStorage.removeItem).toHaveBeenCalledWith('cached_workout')
            expect(localStorage.removeItem).toHaveBeenCalledWith('cached_exercises')
        })

        it('should reset reactive state', async () => {
            const { cacheWorkout, cacheExercises, clearCache, cachedWorkout, cachedExercises } = useOfflineWorkout()

            await cacheWorkout({ id: '1', name: 'Test' })
            await cacheExercises([{ id: 1, name: 'Push Up' }])

            expect(cachedWorkout.value).not.toBeNull()
            expect(cachedExercises.value.length).toBe(1)

            await clearCache()

            expect(cachedWorkout.value).toBeNull()
            expect(cachedExercises.value).toEqual([])
        })

        it('should handle localStorage errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            localStorage.removeItem.mockImplementationOnce(() => { throw new Error('Storage error') })

            const { clearCache } = useOfflineWorkout()
            await expect(clearCache()).resolves.toBeUndefined()
            expect(consoleSpy).toHaveBeenCalled()
        })
    })
})
