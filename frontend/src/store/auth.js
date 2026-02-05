/**
 * Auth Store - Pinia
 * Gestione autenticazione utente
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref(null)
    const token = ref(localStorage.getItem('token') || null)
    const refreshToken = ref(localStorage.getItem('refreshToken') || null)
    const loading = ref(false)
    const error = ref(null)

    // Getters
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const isTrainer = computed(() => user.value?.role === 'tenant_owner' || user.value?.role === 'staff')
    const isClient = computed(() => user.value?.role === 'client')
    const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
    const userRole = computed(() => user.value?.role || null)
    const tenantId = computed(() => user.value?.tenantId || null)

    // Actions

    /**
     * Login utente
     */
    const login = async (email, password) => {
        loading.value = true
        error.value = null

        try {
            const response = await api.post('/auth/login', { email, password })

            token.value = response.data.data.accessToken
            refreshToken.value = response.data.data.refreshToken
            user.value = response.data.data.user

            localStorage.setItem('token', token.value)
            localStorage.setItem('refreshToken', refreshToken.value)

            // Set auth header
            api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Errore durante il login'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    /**
     * Registrazione nuovo PT
     */
    const register = async (userData) => {
        loading.value = true
        error.value = null

        try {
            const response = await api.post('/auth/register', userData)

            token.value = response.data.data.accessToken
            refreshToken.value = response.data.data.refreshToken
            user.value = response.data.data.user

            localStorage.setItem('token', token.value)
            localStorage.setItem('refreshToken', refreshToken.value)

            api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Errore durante la registrazione'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    /**
     * Logout
     */
    const logout = async () => {
        try {
            await api.post('/auth/logout')
        } catch (err) {
            console.error('Errore logout:', err)
        } finally {
            // Clear state
            user.value = null
            token.value = null
            refreshToken.value = null

            // Clear storage
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')

            // Remove auth header
            delete api.defaults.headers.common['Authorization']

            // Redirect to login
            router.push('/login')
        }
    }

    /**
     * Verifica token esistente all'avvio
     */
    const checkAuth = async () => {
        if (!token.value) return false

        loading.value = true

        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
            const response = await api.get('/auth/me')

            user.value = response.data.data.user
            return true
        } catch (err) {
            // Try refresh token
            if (refreshToken.value) {
                const refreshed = await refreshAccessToken()
                if (refreshed) return true
            }

            // Clear invalid tokens
            await logout()
            return false
        } finally {
            loading.value = false
        }
    }

    /**
     * Refresh access token
     */
    const refreshAccessToken = async () => {
        if (!refreshToken.value) return false

        try {
            const response = await api.post('/auth/refresh-token', {
                refreshToken: refreshToken.value
            })

            token.value = response.data.data.accessToken
            localStorage.setItem('token', token.value)
            api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

            return true
        } catch (err) {
            console.error('Errore refresh token:', err)
            return false
        }
    }

    /**
     * Aggiorna profilo utente
     */
    const updateProfile = async (profileData) => {
        loading.value = true
        error.value = null

        try {
            const response = await api.put('/auth/profile', profileData)
            user.value = { ...user.value, ...response.data.user }
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Errore aggiornamento profilo'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    /**
     * Cambio password
     */
    const changePassword = async (currentPassword, newPassword) => {
        loading.value = true
        error.value = null

        try {
            await api.put('/auth/password', { currentPassword, newPassword })
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Errore cambio password'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    return {
        // State
        user,
        token,
        loading,
        error,
        // Getters
        isAuthenticated,
        isTrainer,
        isClient,
        isSuperAdmin,
        userRole,
        tenantId,
        // Actions
        login,
        register,
        logout,
        checkAuth,
        refreshAccessToken,
        updateProfile,
        changePassword
    }
})
