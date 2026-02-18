/**
 * API Service - Axios Instance (TypeScript)
 * Configurazione centralizzata chiamate HTTP
 * I token JWT sono gestiti tramite httpOnly cookies (web) o Bearer token (native)
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import router from '@/router'

// Rileva se siamo in Capacitor nativo
const isNativePlatform = (): boolean => {
    try {
        return window.Capacitor?.isNativePlatform() || false
    } catch {
        return false
    }
}

// Su native, usiamo l'URL completo del backend. Su web, usiamo il proxy Vite.
const getBaseURL = (): string => {
    if (isNativePlatform()) {
        return import.meta.env.VITE_API_URL || 'https://api.atlas-pt.com/api'
    }
    return import.meta.env.VITE_API_URL || '/api'
}

const api: AxiosInstance = axios.create({
    baseURL: getBaseURL(),
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // Invia cookies httpOnly automaticamente
})

// Token storage per piattaforma nativa
let _nativeToken: string | null = null

/**
 * Setta il token JWT per le richieste native (chiamato da auth store)
 */
export const setNativeToken = (token: string | null): void => {
    _nativeToken = token
}

/**
 * Rimuove il token JWT nativo (chiamato al logout)
 */
export const clearNativeToken = (): void => {
    _nativeToken = null
}

/**
 * Ritorna il token nativo corrente
 */
export const getNativeToken = (): string | null => _nativeToken

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Su piattaforma nativa, aggiungi Authorization header con Bearer token
    if (isNativePlatform() && _nativeToken) {
        config.headers['Authorization'] = `Bearer ${_nativeToken}`
    }

    const method = (config.method || 'get').toLowerCase()
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
        const contentType = config.headers?.['Content-Type'] || config.headers?.['content-type']
        // Se non c'è Content-Type esplicito o è il default JSON, forza application/json
        if (!contentType || contentType === 'application/json') {
            config.headers['Content-Type'] = 'application/json'
            // Se non c'è data, invia body vuoto per garantire che il browser invii il Content-Type
            if (config.data === undefined || config.data === null) {
                config.data = {}
            }
        }
    }
    return config
})

// Token refresh queue — previene refresh multipli paralleli
let isRefreshing = false
let refreshSubscribers: ((error?: Error | null) => void)[] = []

const onRefreshed = () => {
    refreshSubscribers.forEach(cb => cb(null))
    refreshSubscribers = []
}

const onRefreshFailed = (err: Error) => {
    refreshSubscribers.forEach(cb => cb(err))
    refreshSubscribers = []
}

const addRefreshSubscriber = (callback: (error?: Error | null) => void) => {
    refreshSubscribers.push(callback)
}

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config

        // Token expired - try refresh via cookie
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
            originalRequest._retry = true

            // Se un refresh e gia in corso, accoda questa richiesta
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    addRefreshSubscriber((refreshError) => {
                        if (refreshError) {
                            reject(refreshError)
                        } else {
                            resolve(api(originalRequest))
                        }
                    })
                })
            }

            isRefreshing = true

            try {
                // Il refresh token e nel cookie httpOnly — il server lo legge automaticamente
                await api.post('/auth/refresh-token')

                isRefreshing = false
                onRefreshed()

                // Ritenta la richiesta originale (il nuovo access_token e nel cookie)
                return api(originalRequest)
            } catch (refreshError) {
                isRefreshing = false
                onRefreshFailed(refreshError as Error)

                // Refresh failed - redirect to login
                router.push({ name: 'Login', query: { expired: 'true' } })
                return Promise.reject(refreshError)
            }
        }

        // Generic 401 - redirect to login
        if (error.response?.status === 401) {
            router.push({ name: 'Login' })
        }

        return Promise.reject(error)
    }
)

export default api
