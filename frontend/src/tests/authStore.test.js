/**
 * Tests for Auth Store (Pinia)
 * Tests the httpOnly cookie-based auth flow
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/store/auth'

// Mock router
vi.mock('@/router', () => ({
    default: { push: vi.fn() }
}))

// Mock API
const mockPost = vi.fn()
const mockGet = vi.fn()
const mockPut = vi.fn()
vi.mock('@/services/api', () => ({
    default: {
        post: (...args) => mockPost(...args),
        get: (...args) => mockGet(...args),
        put: (...args) => mockPut(...args),
        defaults: { headers: { common: {} } }
    }
}))

describe('Auth Store', () => {
    let store

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useAuthStore()
        mockPost.mockReset()
        mockGet.mockReset()
        mockPut.mockReset()
    })

    describe('initial state', () => {
        test('user is null', () => {
            expect(store.user).toBeNull()
        })

        test('loading is false', () => {
            expect(store.loading).toBe(false)
        })

        test('error is null', () => {
            expect(store.error).toBeNull()
        })

        test('initialAuthChecked is false', () => {
            expect(store.initialAuthChecked).toBe(false)
        })

        test('isAuthenticated is false when no user', () => {
            expect(store.isAuthenticated).toBe(false)
        })
    })

    describe('computed getters', () => {
        test('isAuthenticated is true when user exists', () => {
            store.user = { id: 1, role: 'tenant_owner' }
            expect(store.isAuthenticated).toBe(true)
        })

        test('isTrainer for tenant_owner', () => {
            store.user = { role: 'tenant_owner' }
            expect(store.isTrainer).toBe(true)
        })

        test('isTrainer for staff', () => {
            store.user = { role: 'staff' }
            expect(store.isTrainer).toBe(true)
        })

        test('isTrainer false for client', () => {
            store.user = { role: 'client' }
            expect(store.isTrainer).toBe(false)
        })

        test('isClient true', () => {
            store.user = { role: 'client' }
            expect(store.isClient).toBe(true)
        })

        test('isClient false for trainer', () => {
            store.user = { role: 'tenant_owner' }
            expect(store.isClient).toBe(false)
        })

        test('isSuperAdmin true', () => {
            store.user = { role: 'super_admin' }
            expect(store.isSuperAdmin).toBe(true)
        })

        test('isSuperAdmin false for others', () => {
            store.user = { role: 'tenant_owner' }
            expect(store.isSuperAdmin).toBe(false)
        })

        test('userRole returns role', () => {
            store.user = { role: 'staff' }
            expect(store.userRole).toBe('staff')
        })

        test('userRole null when no user', () => {
            expect(store.userRole).toBeNull()
        })

        test('tenantId returns tenantId', () => {
            store.user = { tenantId: 'abc-123' }
            expect(store.tenantId).toBe('abc-123')
        })

        test('tenantId null when no user', () => {
            expect(store.tenantId).toBeNull()
        })
    })

    describe('login', () => {
        test('success: sets user from response, no localStorage', async () => {
            const userData = { id: 1, email: 'a@b.com', role: 'tenant_owner' }
            mockPost.mockResolvedValue({
                data: { data: { user: userData } }
            })

            const result = await store.login('a@b.com', 'Pass1234')

            expect(result.success).toBe(true)
            expect(store.user).toEqual(userData)
            expect(store.isAuthenticated).toBe(true)
            expect(mockPost).toHaveBeenCalledWith('/auth/login', {
                email: 'a@b.com', password: 'Pass1234'
            })
        })

        test('failure: sets error', async () => {
            mockPost.mockRejectedValue({
                response: { data: { message: 'Credenziali non valide' } }
            })

            const result = await store.login('a@b.com', 'wrong')

            expect(result.success).toBe(false)
            expect(result.message).toBe('Credenziali non valide')
            expect(store.error).toBe('Credenziali non valide')
            expect(store.user).toBeNull()
        })

        test('loading state managed', async () => {
            mockPost.mockResolvedValue({
                data: { data: { user: { id: 1 } } }
            })

            expect(store.loading).toBe(false)
            const promise = store.login('a@b.com', 'Pass1234')
            expect(store.loading).toBe(true)
            await promise
            expect(store.loading).toBe(false)
        })
    })

    describe('register', () => {
        test('success: sets user', async () => {
            const userData = { id: 1, email: 'new@b.com', role: 'tenant_owner' }
            mockPost.mockResolvedValue({
                data: { data: { user: userData } }
            })

            const result = await store.register({ email: 'new@b.com' })

            expect(result.success).toBe(true)
            expect(store.user).toEqual(userData)
        })

        test('failure: sets error', async () => {
            mockPost.mockRejectedValue({
                response: { data: { message: 'Email gia in uso' } }
            })

            const result = await store.register({ email: 'dup@b.com' })

            expect(result.success).toBe(false)
            expect(store.error).toBe('Email gia in uso')
        })
    })

    describe('logout', () => {
        test('clears user and calls API', async () => {
            store.user = { id: 1, role: 'tenant_owner' }
            mockPost.mockResolvedValue({})

            await store.logout()

            expect(store.user).toBeNull()
            expect(store.isAuthenticated).toBe(false)
            expect(mockPost).toHaveBeenCalledWith('/auth/logout')
        })

        test('clears user even if API fails', async () => {
            store.user = { id: 1, role: 'tenant_owner' }
            mockPost.mockRejectedValue(new Error('network error'))

            await store.logout()

            expect(store.user).toBeNull()
        })
    })

    describe('checkAuth', () => {
        test('skips API call if user already loaded', async () => {
            store.user = { id: 1, role: 'tenant_owner' }

            const result = await store.checkAuth()

            expect(result).toBe(true)
            expect(store.initialAuthChecked).toBe(true)
            expect(mockGet).not.toHaveBeenCalled()
        })

        test('calls /auth/me and sets user', async () => {
            const userData = { id: 1, email: 'a@b.com', role: 'tenant_owner' }
            mockGet.mockResolvedValue({
                data: { data: { user: userData } }
            })

            const result = await store.checkAuth()

            expect(result).toBe(true)
            expect(store.user).toEqual(userData)
            expect(store.initialAuthChecked).toBe(true)
            expect(mockGet).toHaveBeenCalledWith('/auth/me')
        })

        test('returns false and clears user if /auth/me fails', async () => {
            mockGet.mockRejectedValue(new Error('401'))

            const result = await store.checkAuth()

            expect(result).toBe(false)
            expect(store.user).toBeNull()
            expect(store.initialAuthChecked).toBe(true)
        })
    })

    describe('changePassword', () => {
        test('success', async () => {
            mockPut.mockResolvedValue({})

            const result = await store.changePassword('old123', 'New12345')

            expect(result.success).toBe(true)
            expect(mockPut).toHaveBeenCalledWith('/auth/password', {
                currentPassword: 'old123', newPassword: 'New12345'
            })
        })

        test('failure', async () => {
            mockPut.mockRejectedValue({
                response: { data: { message: 'Password attuale errata' } }
            })

            const result = await store.changePassword('wrong', 'New12345')

            expect(result.success).toBe(false)
            expect(store.error).toBe('Password attuale errata')
        })
    })

    describe('no localStorage usage', () => {
        test('login does not touch localStorage', async () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem')
            mockPost.mockResolvedValue({
                data: { data: { user: { id: 1 } } }
            })

            await store.login('a@b.com', 'Pass1234')

            expect(spy).not.toHaveBeenCalled()
            spy.mockRestore()
        })

        test('register does not touch localStorage', async () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem')
            mockPost.mockResolvedValue({
                data: { data: { user: { id: 1 } } }
            })

            await store.register({ email: 'a@b.com' })

            expect(spy).not.toHaveBeenCalled()
            spy.mockRestore()
        })

        test('logout does not touch localStorage', async () => {
            const spy = vi.spyOn(Storage.prototype, 'removeItem')
            store.user = { id: 1 }
            mockPost.mockResolvedValue({})

            await store.logout()

            expect(spy).not.toHaveBeenCalled()
            spy.mockRestore()
        })
    })

    describe('role matrix', () => {
        const roles = ['super_admin', 'tenant_owner', 'staff', 'client']

        roles.forEach(role => {
            test(`${role}: isAuthenticated true`, () => {
                store.user = { role }
                expect(store.isAuthenticated).toBe(true)
            })
        })

        test('super_admin: isSuperAdmin=true, isTrainer=false, isClient=false', () => {
            store.user = { role: 'super_admin' }
            expect(store.isSuperAdmin).toBe(true)
            expect(store.isTrainer).toBe(false)
            expect(store.isClient).toBe(false)
        })

        test('tenant_owner: isSuperAdmin=false, isTrainer=true, isClient=false', () => {
            store.user = { role: 'tenant_owner' }
            expect(store.isSuperAdmin).toBe(false)
            expect(store.isTrainer).toBe(true)
            expect(store.isClient).toBe(false)
        })

        test('staff: isSuperAdmin=false, isTrainer=true, isClient=false', () => {
            store.user = { role: 'staff' }
            expect(store.isSuperAdmin).toBe(false)
            expect(store.isTrainer).toBe(true)
            expect(store.isClient).toBe(false)
        })

        test('client: isSuperAdmin=false, isTrainer=false, isClient=true', () => {
            store.user = { role: 'client' }
            expect(store.isSuperAdmin).toBe(false)
            expect(store.isTrainer).toBe(false)
            expect(store.isClient).toBe(true)
        })
    })
})
