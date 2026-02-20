/**
 * useSocket Composable
 * Gestione connessione WebSocket con Socket.io
 * Il token JWT viene inviato tramite cookie httpOnly — nessun localStorage
 */

import { ref, onUnmounted, type Ref } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth'

let socketInstance: Socket | null = null
const isConnected = ref<boolean>(false)
const connectionError = ref<string | null>(null)

interface UseSocketReturn {
    // State
    isConnected: Ref<boolean>
    connectionError: Ref<string | null>
    // Connection
    connect: () => Socket | null
    disconnect: () => void
    getSocket: () => Socket | null
    // Generic
    emit: (event: string, data?: any) => void
    on: (event: string, callback: (...args: any[]) => void) => void
    off: (event: string, callback?: (...args: any[]) => void) => void
    // Chat
    joinConversation: (conversationId: string | number) => void
    leaveConversation: (conversationId: string | number) => void
    sendMessage: (conversationId: string | number, content: string, attachments?: any) => void
    sendTyping: (conversationId: string | number) => void
    sendStopTyping: (conversationId: string | number) => void
    markMessageRead: (messageId: string | number, conversationId: string | number) => void
    // Notifications
    subscribeNotifications: () => void
    // Push Notifications
    subscribePushNotifications: () => Promise<boolean>
    unsubscribePushNotifications: () => Promise<void>
}

/**
 * Composable per gestione Socket.io
 */
export function useSocket(): UseSocketReturn {
    const authStore = useAuthStore()

    /**
     * Connetti al server WebSocket
     */
    const connect = (): Socket | null => {
        if (socketInstance?.connected) return socketInstance

        // Non serve piu il token — il cookie viene inviato con withCredentials
        if (!authStore.isAuthenticated) return null

        const socketUrl: string = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'

        socketInstance = io(socketUrl, {
            withCredentials: true, // Invia cookies httpOnly
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        })

        socketInstance.on('connect', () => {
            isConnected.value = true
            connectionError.value = null
            if (import.meta.env.DEV) console.log('[Socket] Connesso')
        })

        socketInstance.on('disconnect', (reason: string) => {
            isConnected.value = false
            if (import.meta.env.DEV) console.log('[Socket] Disconnesso:', reason)
        })

        socketInstance.on('connect_error', (error: Error) => {
            isConnected.value = false
            connectionError.value = error.message
            if (import.meta.env.DEV) console.error('[Socket] Errore connessione:', error.message)
        })

        return socketInstance
    }

    /**
     * Disconnetti dal server
     */
    const disconnect = (): void => {
        if (socketInstance) {
            socketInstance.removeAllListeners()
            socketInstance.disconnect()
            socketInstance = null
            isConnected.value = false
        }
    }

    /**
     * Ottieni istanza socket corrente
     */
    const getSocket = (): Socket | null => {
        if (!socketInstance?.connected) {
            return connect()
        }
        return socketInstance
    }

    /**
     * Emetti evento
     */
    const emit = (event: string, data?: any): void => {
        const socket = getSocket()
        if (socket) {
            socket.emit(event, data)
        }
    }

    /**
     * Ascolta evento
     */
    const on = (event: string, callback: (...args: any[]) => void): void => {
        const socket = getSocket()
        if (socket) {
            socket.on(event, callback)
        }
    }

    /**
     * Rimuovi listener
     */
    const off = (event: string, callback?: (...args: any[]) => void): void => {
        if (socketInstance) {
            if (callback) {
                socketInstance.off(event, callback)
            } else {
                socketInstance.off(event)
            }
        }
    }

    // === Chat helpers ===

    const joinConversation = (conversationId: string | number): void => {
        emit('join_conversation', { conversationId })
    }

    const leaveConversation = (conversationId: string | number): void => {
        emit('leave_conversation', { conversationId })
    }

    const sendMessage = (conversationId: string | number, content: string, attachments: any = null): void => {
        emit('send_message', { conversationId, content, attachments })
    }

    const sendTyping = (conversationId: string | number): void => {
        emit('typing', { conversationId })
    }

    const sendStopTyping = (conversationId: string | number): void => {
        emit('stop_typing', { conversationId })
    }

    const markMessageRead = (messageId: string | number, conversationId: string | number): void => {
        emit('message_read', { messageId, conversationId })
    }

    // === Notification helpers ===

    const subscribeNotifications = (): void => {
        emit('subscribe_notifications', {})
    }

    // === Web Push Subscription ===

    /**
     * Richiede permesso push e registra subscription sul backend
     */
    const subscribePushNotifications = async (): Promise<boolean> => {
        if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
            if (import.meta.env.DEV) console.warn('[Push] Push notifications non supportate')
            return false
        }

        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                if (import.meta.env.DEV) console.log('[Push] Permesso negato')
                return false
            }

            const registration = await navigator.serviceWorker.ready

            // Ottieni VAPID public key dal backend
            const apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
            const response = await fetch(`${apiUrl}/notifications/vapid-key`, {
                credentials: 'include' // Invia cookies httpOnly
            })
            const { data } = await response.json()

            if (!data?.publicKey) {
                if (import.meta.env.DEV) console.warn('[Push] VAPID key non configurata sul server')
                return false
            }

            // Converti VAPID key in Uint8Array
            const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4)
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
                const rawData = window.atob(base64)
                const outputArray = new Uint8Array(rawData.length)
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i)
                }
                return outputArray
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(data.publicKey) as any
            })

            // Invia subscription al backend (cookies inviati automaticamente)
            await fetch(`${apiUrl}/notifications/device-token`, {
                method: 'POST',
                credentials: 'include', // Invia cookies httpOnly
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: JSON.stringify(subscription),
                    platform: 'web'
                })
            })

            if (import.meta.env.DEV) console.log('[Push] Subscription registrata')
            return true
        } catch (error) {
            if (import.meta.env.DEV) console.error('[Push] Errore subscription:', error)
            return false
        }
    }

    /**
     * Rimuove subscription push
     */
    const unsubscribePushNotifications = async (): Promise<void> => {
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            if (subscription) {
                await subscription.unsubscribe()

                const apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                await fetch(`${apiUrl}/notifications/device-token`, {
                    method: 'DELETE',
                    credentials: 'include', // Invia cookies httpOnly
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: JSON.stringify(subscription)
                    })
                })

                if (import.meta.env.DEV) console.log('[Push] Subscription rimossa')
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('[Push] Errore unsubscribe:', error)
        }
    }

    // Auto-cleanup on unmount — rimuovi listener e disconnetti se nessun altro usa il socket
    onUnmounted(() => {
        if (socketInstance) {
            socketInstance.removeAllListeners()
            socketInstance.disconnect()
            socketInstance = null
            isConnected.value = false
        }
    })

    return {
        // State
        isConnected,
        connectionError,
        // Connection
        connect,
        disconnect,
        getSocket,
        // Generic
        emit,
        on,
        off,
        // Chat
        joinConversation,
        leaveConversation,
        sendMessage,
        sendTyping,
        sendStopTyping,
        markMessageRead,
        // Notifications
        subscribeNotifications,
        // Push Notifications
        subscribePushNotifications,
        unsubscribePushNotifications
    }
}
