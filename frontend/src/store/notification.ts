/**
 * Notification Store - Pinia
 * Gestione notifiche utente
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { Notification } from '@/types'

interface NotificationPagination {
    page: number
    limit: number
    hasMore: boolean
}

interface NotificationPreferences {
    email_enabled?: boolean
    push_enabled?: boolean
    [key: string]: any
}

interface ActionResult {
    success: boolean
    message?: string | null
}

export const useNotificationStore = defineStore('notification', () => {
    // State
    const notifications = ref<Notification[]>([])
    const unreadCount = ref(0)
    const preferences = ref<NotificationPreferences | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Pagination
    const pagination = ref<NotificationPagination>({
        page: 1,
        limit: 20,
        hasMore: true
    })

    // Getters
    const hasUnread = computed(() => unreadCount.value > 0)
    const recentNotifications = computed(() => notifications.value.slice(0, 5))

    // Actions

    const fetchNotifications = async (options: { page?: number; unreadOnly?: boolean } = {}): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const page = options.page || pagination.value.page
            const limit = pagination.value.limit
            const offset = (page - 1) * limit

            const params: Record<string, any> = { limit, offset }
            if (options.unreadOnly) params.unreadOnly = true

            const response = await api.get('/notifications', { params })
            const data = response.data.data

            if (page === 1) {
                notifications.value = data.notifications || []
            } else {
                notifications.value = [...notifications.value, ...(data.notifications || [])]
            }

            pagination.value.hasMore = (data.notifications || []).length >= limit
            pagination.value.page = page

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore caricamento notifiche'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const fetchUnreadCount = async (): Promise<void> => {
        try {
            const response = await api.get('/notifications/unread-count')
            unreadCount.value = response.data.data.count || 0
        } catch (err) {
            console.error('Errore fetch unread count:', err)
        }
    }

    const markAsRead = async (notificationId: number): Promise<ActionResult> => {
        try {
            await api.put(`/notifications/${notificationId}/read`)
            const notification = notifications.value.find(n => n.id === notificationId)
            if (notification && !notification.is_read) {
                notification.is_read = true
                unreadCount.value = Math.max(0, unreadCount.value - 1)
            }
            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore' }
        }
    }

    const markAllAsRead = async (): Promise<ActionResult> => {
        try {
            await api.put('/notifications/read-all')
            notifications.value.forEach(n => {
                n.is_read = true
            })
            unreadCount.value = 0
            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore' }
        }
    }

    const fetchPreferences = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/notifications/preferences')
            preferences.value = response.data.data.preferences || response.data.data
            return { success: true }
        } catch (err) {
            console.error('Errore fetch preferenze:', err)
            return { success: false }
        }
    }

    const updatePreferences = async (data: Partial<NotificationPreferences>): Promise<ActionResult> => {
        try {
            await api.put('/notifications/preferences', data)
            preferences.value = { ...preferences.value, ...data }
            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.response?.data?.message || 'Errore aggiornamento preferenze' }
        }
    }

    const addRealTimeNotification = (notification: Notification): void => {
        notifications.value.unshift(notification)
        unreadCount.value++
    }

    const loadMore = async (): Promise<void> => {
        if (!pagination.value.hasMore || loading.value) return
        await fetchNotifications({ page: pagination.value.page + 1 })
    }

    const initialize = async (): Promise<void> => {
        await fetchUnreadCount()
    }

    const initializeFull = async (): Promise<void> => {
        await Promise.all([fetchNotifications(), fetchUnreadCount()])
    }

    return {
        notifications, unreadCount, preferences, loading, error, pagination,
        hasUnread, recentNotifications,
        fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead,
        fetchPreferences, updatePreferences, addRealTimeNotification,
        loadMore, initialize, initializeFull
    }
})
