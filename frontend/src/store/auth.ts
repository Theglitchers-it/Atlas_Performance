/**
 * Auth Store - Pinia
 * Gestione autenticazione utente
 * I token JWT sono gestiti tramite httpOnly cookies (web) o Preferences + Bearer header (native)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { setNativeToken, clearNativeToken, startProactiveRefresh, stopProactiveRefresh } from '@/services/api'
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
    const oauthProvidersLoaded = ref(false)
    const enabledOAuthProviders = ref<string[]>([])
    let oauthProvidersPromise: Promise<string[]> | null = null

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const isTrainer = computed(() => user.value?.role === 'tenant_owner' || user.value?.role === 'staff')
    const isClient = computed(() => user.value?.role === 'client')
    const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
    const userRole = computed(() => user.value?.role || null)
    const tenantId = computed(() => user.value?.tenantId || null)

    // ===== Fase 1: Multi-role getters (user_roles) =====
    const roles = computed(() => user.value?.roles || [])
    const hasRole = (role: string): boolean => roles.value.includes(role as any)
    const hasAnyRole = (...candidates: string[]): boolean =>
        candidates.some(c => roles.value.includes(c as any))
    const isGymAdmin = computed(() => hasRole('gym_admin') || user.value?.role === 'tenant_owner')
    const isNutritionist = computed(() => hasRole('nutritionist'))
    const isAppTrainer = computed(() => hasRole('trainer') || hasRole('gym_admin'))
    const isMultiRole = computed(() => roles.value.length > 1)

    // Mappa ruoli V2 (user_roles) -> ruoli legacy usati nel gating di route/UI.
    const ROLE_V2_TO_LEGACY: Record<string, string> = {
        gym_admin: 'tenant_owner',
        trainer: 'staff',
        nutritionist: 'staff',
        front_desk: 'staff',
        accountant: 'staff',
        community_moderator: 'staff',
        client: 'client'
    }
    // Ruoli "effettivi": ruolo primario legacy + roles[] V2 mappati. Allinea il gating
    // frontend a userHasAnyRole del backend (array-aware), evitando che un utente
    // autorizzato dal backend via roles[] venga bloccato dal router/UI.
    const effectiveRoles = computed<string[]>(() => {
        const set = new Set<string>()
        if (user.value?.role) set.add(user.value.role)
        for (const r of (user.value?.roles || [])) {
            set.add(r as string)
            const legacy = ROLE_V2_TO_LEGACY[r as string]
            if (legacy) set.add(legacy)
        }
        return [...set]
    })
    const canAccessRoles = (allowed?: string[] | null): boolean => {
        if (!allowed || allowed.length === 0) return true
        return allowed.some(r => effectiveRoles.value.includes(r))
    }
    const canModerate = computed(() => canAccessRoles(['tenant_owner', 'staff', 'super_admin']))

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

            startProactiveRefresh()
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore durante il login'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
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

            startProactiveRefresh()
            return { success: true }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore durante la registrazione'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
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
            stopProactiveRefresh()
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
            startProactiveRefresh()
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore aggiornamento profilo'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const loadOAuthProviders = async (force = false): Promise<string[]> => {
        if (!force && oauthProvidersLoaded.value) return enabledOAuthProviders.value
        if (oauthProvidersPromise && !force) return oauthProvidersPromise
        oauthProvidersPromise = (async () => {
            try {
                const response = await api.get('/auth/oauth/providers')
                const enabled = response.data?.data?.enabled
                enabledOAuthProviders.value = Array.isArray(enabled) ? enabled : []
                oauthProvidersLoaded.value = true
            } catch {
                // Non memoizzare il fallimento: lasciamo oauthProvidersLoaded=false così
                // la prossima chiamata ritenta. enabledOAuthProviders resta com'era (default []).
            } finally {
                oauthProvidersPromise = null
            }
            return enabledOAuthProviders.value
        })()
        return oauthProvidersPromise
    }

    const isOAuthProviderEnabled = (provider: string): boolean =>
        enabledOAuthProviders.value.includes(provider.toLowerCase())

    const socialLogin = async (provider: string): Promise<AuthResult> => {
        // Lock anti doppio-click: se un flow OAuth è già in corso, ignora la richiesta successiva
        // (evita 2 popup, 2 listener postMessage, 2 pollTimer concorrenti).
        if (loading.value) {
            return { success: false, message: 'Login già in corso, attendere…' }
        }

        const normalized = provider.toLowerCase()
        if (oauthProvidersLoaded.value && !enabledOAuthProviders.value.includes(normalized)) {
            return { success: false, message: 'Provider non configurato. Contatta l’amministratore.' }
        }

        loading.value = true
        error.value = null

        try {
            const response = await api.get(`/auth/oauth/${normalized}`)
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
                        startProactiveRefresh()
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
        } catch (err: unknown) {
            const fallback = err instanceof Error ? err.message : 'Errore durante il login sociale'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            const message = axiosErr.response?.data?.message || fallback
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore cambio password'
            const axiosErr = err as { response?: { data?: { message?: string } } }
            error.value = axiosErr.response?.data?.message || message
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
        // Fase 1 multi-role
        roles,
        hasRole,
        hasAnyRole,
        isGymAdmin,
        isNutritionist,
        isAppTrainer,
        isMultiRole,
        effectiveRoles,
        canAccessRoles,
        canModerate,
        // Actions
        login,
        register,
        socialLogin,
        logout,
        checkAuth,
        updateProfile,
        changePassword,
        loadOAuthProviders,
        isOAuthProviderEnabled,
        enabledOAuthProviders,
        oauthProvidersLoaded
    }
})
