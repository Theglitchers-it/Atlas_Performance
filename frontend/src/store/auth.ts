/**
 * Auth Store - Pinia
 * Gestione autenticazione utente
 * I token JWT sono gestiti tramite httpOnly cookies (web) o Preferences + Bearer header (native)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { setNativeToken, clearNativeToken } from '@/services/api'
import router from '@/router'
import type { User } from '@/types'

interface AuthResult {
    success: boolean
    message?: string | null
}

// Helper per gestire token su piattaforma nativa
const isNativePlatform = (): boolean => {
    try {
        return window.Capacitor?.isNativePlatform() || false
    } catch {
        return false
    }
}

const saveTokenNative = async (token: string): Promise<void> => {
    if (!isNativePlatform() || !token) return
    try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.set({ key: 'auth_token', value: token })
        setNativeToken(token)
    } catch (e) {
        console.error('[AUTH] Errore salvataggio token nativo:', e)
    }
}

const loadTokenNative = async (): Promise<string | null> => {
    if (!isNativePlatform()) return null
    try {
        const { Preferences } = await import('@capacitor/preferences')
        const { value } = await Preferences.get({ key: 'auth_token' })
        if (value) {
            setNativeToken(value)
        }
        return value
    } catch (e) {
        console.error('[AUTH] Errore caricamento token nativo:', e)
        return null
    }
}

const clearTokenNative = async (): Promise<void> => {
    if (!isNativePlatform()) return
    try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.remove({ key: 'auth_token' })
        clearNativeToken()
    } catch (e) {
        console.error('[AUTH] Errore rimozione token nativo:', e)
    }
}

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref<User | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const initialAuthChecked = ref(false)

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const isTrainer = computed(() => user.value?.role === 'tenant_owner' || user.value?.role === 'staff')
    const isClient = computed(() => user.value?.role === 'client')
    const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
    const userRole = computed(() => user.value?.role || null)
    const tenantId = computed(() => user.value?.tenantId || null)

    // Actions

    const login = async (email: string, password: string): Promise<AuthResult> => {
        loading.value = true
        error.value = null

        try {
            const response = await api.post('/auth/login', { email, password })
            user.value = response.data.data.user

            if (isNativePlatform() && response.data.data.token) {
                await saveTokenNative(response.data.data.token)
            }

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore durante il login'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const register = async (userData: Record<string, any>): Promise<AuthResult> => {
        loading.value = true
        error.value = null

        try {
            const response = await api.post('/auth/register', userData)
            user.value = response.data.data.user

            if (isNativePlatform() && response.data.data.token) {
                await saveTokenNative(response.data.data.token)
            }

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore durante la registrazione'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const logout = async (): Promise<void> => {
        try {
            await api.post('/auth/logout')
        } catch (err) {
            console.error('Errore logout:', err)
        } finally {
            user.value = null
            await clearTokenNative()
            router.push('/login')
        }
    }

    const checkAuth = async (): Promise<boolean> => {
        if (user.value) {
            initialAuthChecked.value = true
            return true
        }

        await loadTokenNative()
        loading.value = true

        try {
            const response = await api.get('/auth/me')
            user.value = response.data.data.user
            initialAuthChecked.value = true
            return true
        } catch (err) {
            user.value = null
            initialAuthChecked.value = true
            return false
        } finally {
            loading.value = false
        }
    }

    const updateProfile = async (profileData: Partial<User>): Promise<AuthResult> => {
        loading.value = true
        error.value = null

        try {
            const response = await api.put('/auth/profile', profileData)
            user.value = { ...user.value!, ...response.data.user }
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore aggiornamento profilo'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const socialLogin = async (provider: string): Promise<AuthResult> => {
        loading.value = true
        error.value = null

        try {
            const response = await api.get(`/auth/oauth/${provider}`)
            const { url } = response.data.data

            const allowedHosts = ['accounts.google.com', 'github.com', 'discord.com', 'login.microsoftonline.com']
            try {
                const parsedUrl = new URL(url)
                if (!allowedHosts.some(h => parsedUrl.hostname.endsWith(h))) {
                    loading.value = false
                    return { success: false, message: 'Provider OAuth non riconosciuto.' }
                }
            } catch {
                loading.value = false
                return { success: false, message: 'URL OAuth non valido.' }
            }

            const width = 600
            const height = 700
            const left = window.screenX + (window.outerWidth - width) / 2
            const top = window.screenY + (window.outerHeight - height) / 2
            const popup = window.open(
                url,
                'oauth-popup',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
            )

            if (!popup) {
                loading.value = false
                return { success: false, message: 'Il popup è stato bloccato dal browser. Abilita i popup per questo sito.' }
            }

            return new Promise<AuthResult>((resolve) => {
                let resolved = false

                const handleMessage = (event: MessageEvent) => {
                    if (event.origin !== window.location.origin) return
                    if (event.source !== popup) return
                    if (!event.data || event.data.type !== 'oauth-callback') return
                    if (resolved) return
                    resolved = true

                    window.removeEventListener('message', handleMessage)
                    clearInterval(pollTimer)

                    if (event.data.success) {
                        const data = event.data.data
                        user.value = data.user
                        loading.value = false
                        resolve({ success: true })
                    } else {
                        error.value = event.data.error || 'Errore login sociale'
                        loading.value = false
                        resolve({ success: false, message: error.value! })
                    }
                }

                window.addEventListener('message', handleMessage)

                const pollTimer = setInterval(() => {
                    if (popup.closed && !resolved) {
                        resolved = true
                        clearInterval(pollTimer)
                        window.removeEventListener('message', handleMessage)
                        loading.value = false
                        resolve({ success: false, message: 'Login annullato' })
                    }
                }, 500)
            })
        } catch (err: any) {
            const message = err.response?.data?.message || 'Errore durante il login sociale'
            error.value = message
            loading.value = false
            return { success: false, message }
        }
    }

    const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
        loading.value = true
        error.value = null

        try {
            await api.put('/auth/password', { currentPassword, newPassword })
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore cambio password'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    return {
        user,
        loading,
        error,
        initialAuthChecked,
        isAuthenticated,
        isTrainer,
        isClient,
        isSuperAdmin,
        userRole,
        tenantId,
        login,
        register,
        socialLogin,
        logout,
        checkAuth,
        updateProfile,
        changePassword
    }
})
