/**
 * API Service - Axios Instance
 * Configurazione centralizzata chiamate HTTP
 */

import axios from 'axios'
import router from '@/router'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config

        // Token expired - try refresh
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const refreshToken = localStorage.getItem('refreshToken')
                if (!refreshToken) {
                    throw new Error('No refresh token')
                }

                const response = await axios.post('/api/auth/refresh-token', { refreshToken })
                const { accessToken: token } = response.data.data

                localStorage.setItem('token', token)
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`
                originalRequest.headers.Authorization = `Bearer ${token}`

                return api(originalRequest)
            } catch (refreshError) {
                // Refresh failed - logout
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                delete api.defaults.headers.common['Authorization']

                router.push({ name: 'Login', query: { expired: 'true' } })
                return Promise.reject(refreshError)
            }
        }

        // Generic 401 - redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            router.push({ name: 'Login' })
        }

        return Promise.reject(error)
    }
)

export default api
