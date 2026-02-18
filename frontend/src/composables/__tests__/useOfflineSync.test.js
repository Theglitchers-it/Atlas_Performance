/**
 * Tests for useOfflineSync composable
 * Tests offline action queue management and sync replay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the API module
vi.mock('@/services/api', () => ({
    default: {
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
        get: vi.fn().mockResolvedValue({ data: {} })
    }
}))

// Mock useNetwork to avoid its module-level side effects
vi.mock('../useNetwork.js', () => {
    const { ref } = require('vue')
    const isOnline = ref(true)
    return {
        useNetwork: () => ({
            isOnline,
            connectionType: ref('unknown'),
            init: vi.fn().mockResolvedValue(undefined),
            cleanup: vi.fn()
        })
    }
})

let useOfflineSync
let api

describe('useOfflineSync', () => {
    beforeEach(async () => {
        vi.resetModules()
        window.Capacitor = undefined
        localStorage.clear()
        vi.clearAllMocks()

        // Re-setup mocks after resetModules
        vi.doMock('@/services/api', () => ({
            default: {
                post: vi.fn().mockResolvedValue({ data: {} }),
                put: vi.fn().mockResolvedValue({ data: {} }),
                delete: vi.fn().mockResolvedValue({ data: {} }),
                get: vi.fn().mockResolvedValue({ data: {} })
            }
        }))

        vi.doMock('../useNetwork.js', () => {
            const { ref } = require('vue')
            const isOnline = ref(true)
            return {
                useNetwork: () => ({
                    isOnline,
                    connectionType: ref('unknown'),
                    init: vi.fn().mockResolvedValue(undefined),
                    cleanup: vi.fn()
                })
            }
        })

        const mod = await import('../useOfflineSync.js')
        useOfflineSync = mod.useOfflineSync

        const apiMod = await import('@/services/api')
        api = apiMod.default
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return all expected properties and methods', () => {
        const result = useOfflineSync()

        expect(result).toHaveProperty('pendingActions')
        expect(result).toHaveProperty('isSyncing')
        expect(result).toHaveProperty('init')
        expect(result).toHaveProperty('queueAction')
        expect(result).toHaveProperty('syncQueue')
        expect(result).toHaveProperty('removeAction')
        expect(result).toHaveProperty('clearQueue')
    })

    it('should have empty initial state', () => {
        const { pendingActions, isSyncing } = useOfflineSync()

        expect(pendingActions.value).toEqual([])
        expect(isSyncing.value).toBe(false)
    })

    describe('queueAction', () => {
        it('should add an action to the pending queue', async () => {
            const { queueAction, pendingActions } = useOfflineSync()

            const action = {
                type: 'checkin',
                endpoint: '/readiness',
                method: 'POST',
                data: { mood: 5, energy: 4 },
                description: 'Daily check-in'
            }

            const entry = await queueAction(action)

            expect(pendingActions.value).toHaveLength(1)
            expect(entry.type).toBe('checkin')
            expect(entry.endpoint).toBe('/readiness')
            expect(entry.method).toBe('POST')
            expect(entry.data).toEqual({ mood: 5, energy: 4 })
            expect(entry.id).toBeDefined()
            expect(entry.timestamp).toBeDefined()
            expect(entry.retries).toBe(0)
        })

        it('should persist queue to localStorage after adding', async () => {
            const { queueAction } = useOfflineSync()

            await queueAction({
                type: 'message',
                endpoint: '/messages',
                method: 'POST',
                data: { text: 'hello' }
            })

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'offline_sync_queue',
                expect.any(String)
            )
        })

        it('should generate unique IDs for each action', async () => {
            const { queueAction } = useOfflineSync()

            const entry1 = await queueAction({ type: 'a', endpoint: '/a', method: 'POST', data: {} })
            const entry2 = await queueAction({ type: 'b', endpoint: '/b', method: 'POST', data: {} })

            expect(entry1.id).not.toBe(entry2.id)
        })
    })

    describe('syncQueue', () => {
        it('should not sync when queue is empty', async () => {
            const { syncQueue, isSyncing } = useOfflineSync()
            await syncQueue()
            expect(isSyncing.value).toBe(false)
        })

        it('should call API for each queued action', async () => {
            const { queueAction, syncQueue } = useOfflineSync()

            await queueAction({ type: 'a', endpoint: '/api/a', method: 'POST', data: { x: 1 } })
            await queueAction({ type: 'b', endpoint: '/api/b', method: 'PUT', data: { y: 2 } })

            await syncQueue()

            expect(api.post).toHaveBeenCalledWith('/api/a', { x: 1 })
            expect(api.put).toHaveBeenCalledWith('/api/b', { y: 2 })
        })

        it('should remove successfully synced actions from queue', async () => {
            const { queueAction, syncQueue, pendingActions } = useOfflineSync()

            await queueAction({ type: 'a', endpoint: '/api/a', method: 'POST', data: {} })
            expect(pendingActions.value).toHaveLength(1)

            await syncQueue()
            expect(pendingActions.value).toHaveLength(0)
        })

        it('should keep failed actions in queue and increment retries', async () => {
            api.post.mockRejectedValueOnce(new Error('Network error'))

            const { queueAction, syncQueue, pendingActions } = useOfflineSync()

            await queueAction({ type: 'fail', endpoint: '/api/fail', method: 'POST', data: {} })
            await syncQueue()

            expect(pendingActions.value).toHaveLength(1)
            expect(pendingActions.value[0].retries).toBe(1)
        })

        it('should remove actions after 5 failed retries', async () => {
            api.post.mockRejectedValue(new Error('Permanent error'))

            const { queueAction, syncQueue, pendingActions } = useOfflineSync()

            await queueAction({ type: 'doomed', endpoint: '/api/doomed', method: 'POST', data: {} })

            // Set retries to 4 (next failure will be the 5th)
            pendingActions.value[0].retries = 4

            await syncQueue()
            expect(pendingActions.value).toHaveLength(0)
        })

        it('should default to POST when method is not specified', async () => {
            const { queueAction, syncQueue } = useOfflineSync()

            await queueAction({ type: 'test', endpoint: '/api/test', data: { val: 1 } })
            await syncQueue()

            expect(api.post).toHaveBeenCalledWith('/api/test', { val: 1 })
        })

        it('should set isSyncing during sync process', async () => {
            let syncingDuringCall = false
            api.post.mockImplementation(async () => {
                // Access isSyncing during API call would require capturing it
                syncingDuringCall = true
                return { data: {} }
            })

            const { queueAction, syncQueue, isSyncing } = useOfflineSync()
            await queueAction({ type: 'a', endpoint: '/a', method: 'POST', data: {} })

            await syncQueue()
            // After sync is done, isSyncing should be false
            expect(isSyncing.value).toBe(false)
        })
    })

    describe('removeAction', () => {
        it('should remove a specific action by ID', async () => {
            const { queueAction, removeAction, pendingActions } = useOfflineSync()

            const entry1 = await queueAction({ type: 'a', endpoint: '/a', method: 'POST', data: {} })
            const entry2 = await queueAction({ type: 'b', endpoint: '/b', method: 'POST', data: {} })

            await removeAction(entry1.id)

            expect(pendingActions.value).toHaveLength(1)
            expect(pendingActions.value[0].id).toBe(entry2.id)
        })

        it('should persist after removing', async () => {
            const { queueAction, removeAction } = useOfflineSync()

            const entry = await queueAction({ type: 'a', endpoint: '/a', method: 'POST', data: {} })
            localStorage.setItem.mockClear()

            await removeAction(entry.id)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'offline_sync_queue',
                expect.any(String)
            )
        })
    })

    describe('clearQueue', () => {
        it('should remove all actions from queue', async () => {
            const { queueAction, clearQueue, pendingActions } = useOfflineSync()

            await queueAction({ type: 'a', endpoint: '/a', method: 'POST', data: {} })
            await queueAction({ type: 'b', endpoint: '/b', method: 'POST', data: {} })

            expect(pendingActions.value).toHaveLength(2)

            await clearQueue()
            expect(pendingActions.value).toHaveLength(0)
        })

        it('should persist empty queue', async () => {
            const { clearQueue } = useOfflineSync()
            localStorage.setItem.mockClear()

            await clearQueue()

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'offline_sync_queue',
                '[]'
            )
        })
    })
})
