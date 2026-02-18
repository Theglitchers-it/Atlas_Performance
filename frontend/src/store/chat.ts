/**
 * Chat Store - Pinia
 * Gestione conversazioni, messaggi e Socket.io real-time
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import api from '@/services/api'
import type { PaginationMeta } from '@/types'

interface ActionResult {
  success: boolean
  message?: string
  id?: number
  data?: any
}

interface CreateConversationResult extends ActionResult {
  conversation?: any
}

interface SendMessageResult extends ActionResult {
  message?: any
  pending?: boolean
}

export const useChatStore = defineStore('chat', () => {
  // State
  const conversations = ref<any[]>([])
  const currentConversation = ref<any | null>(null)
  const messages = ref<any[]>([])
  const messagesPagination = ref<PaginationMeta>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const availableUsers = ref<any[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const typingUsers = ref<Record<string, number[]>>({}) // { conversationId: [userId, ...] }
  const onlineUsers = ref<Set<number>>(new Set()) // Set di userId online
  const socket = ref<Socket | null>(null)

  // Getters
  const totalUnread = computed<number>(() =>
    conversations.value.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0)
  )

  // === SOCKET.IO ===

  const connectSocket = (): void => {
    if (socket.value?.connected) return

    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin
    socket.value = io(baseUrl, {
      withCredentials: true, // Invia cookies httpOnly
      transports: ['websocket', 'polling']
    })

    socket.value.on('connect', () => {
      // Rejoin alle conversazioni aperte
      if (currentConversation.value) {
        socket.value!.emit('join_conversation', currentConversation.value.id)
      }
    })

    socket.value.on('new_message', (message: any) => {
      // Validate message schema before processing
      if (!message || !message.id || !message.conversation_id || typeof message.content !== 'string') return
      // Se siamo nella conversazione giusta, aggiungi
      if (currentConversation.value && message.conversation_id === currentConversation.value.id) {
        const exists = messages.value.find((m: any) => m.id === message.id)
        if (!exists) messages.value.push(message)
      }
      // Aggiorna la lista conversazioni
      updateConversationPreview(message)
    })

    socket.value.on('user_typing', ({ userId, conversationId }: { userId: number; conversationId: string }) => {
      if (!typingUsers.value[conversationId]) typingUsers.value[conversationId] = []
      if (!typingUsers.value[conversationId].includes(userId)) {
        typingUsers.value[conversationId].push(userId)
      }
    })

    socket.value.on('user_stopped_typing', ({ userId, conversationId }: { userId: number; conversationId: string }) => {
      if (typingUsers.value[conversationId]) {
        typingUsers.value[conversationId] = typingUsers.value[conversationId].filter((id: number) => id !== userId)
      }
    })

    socket.value.on('messages_read', (_data: { conversationId: string; userId: number }) => {
      // Aggiorna stato letto se necessario
    })

    // Online/offline tracking
    socket.value.on('user_online', ({ userId }: { userId: number }) => {
      onlineUsers.value = new Set([...onlineUsers.value, userId])
    })

    socket.value.on('user_offline', ({ userId }: { userId: number }) => {
      const updated = new Set(onlineUsers.value)
      updated.delete(userId)
      onlineUsers.value = updated
    })

    socket.value.on('disconnect', () => {
      console.log('Socket disconnesso')
    })
  }

  const disconnectSocket = (): void => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
  }

  const updateConversationPreview = (message: any): void => {
    const idx = conversations.value.findIndex((c: any) => c.id === message.conversation_id)
    if (idx !== -1) {
      conversations.value[idx].last_message = message.content
      conversations.value[idx].last_message_at = message.created_at
      conversations.value[idx].last_message_sender_id = message.sender_id
      // Se non siamo nella conversazione, incrementa unread
      if (!currentConversation.value || currentConversation.value.id !== message.conversation_id) {
        conversations.value[idx].unread_count = (conversations.value[idx].unread_count || 0) + 1
      }
      // Riordina: metti in cima
      const conv = conversations.value.splice(idx, 1)[0]
      conversations.value.unshift(conv)
    } else {
      // Nuova conversazione, ricarica lista
      fetchConversations()
    }
  }

  // === API ACTIONS ===

  const fetchConversations = async (): Promise<void> => {
    try {
      const response = await api.get('/chat/conversations')
      conversations.value = response.data.data.conversations || []
    } catch (err: any) {
      console.error('Errore fetchConversations:', err)
    }
  }

  const fetchConversationById = async (id: number): Promise<void> => {
    try {
      const response = await api.get(`/chat/conversations/${id}`)
      currentConversation.value = response.data.data.conversation
    } catch (err: any) {
      console.error('Errore fetchConversationById:', err)
    }
  }

  const openConversation = async (conversationId: number): Promise<void> => {
    // Lascia precedente
    if (socket.value && currentConversation.value) {
      socket.value.emit('leave_conversation', currentConversation.value.id)
    }

    await fetchConversationById(conversationId)
    await fetchMessages(conversationId)

    // Join socket room
    if (socket.value) {
      socket.value.emit('join_conversation', conversationId)
    }

    // Reset unread
    const idx = conversations.value.findIndex((c: any) => c.id === conversationId)
    if (idx !== -1) conversations.value[idx].unread_count = 0
    await markAsRead(conversationId)
  }

  const closeConversation = (): void => {
    if (socket.value && currentConversation.value) {
      socket.value.emit('leave_conversation', currentConversation.value.id)
    }
    currentConversation.value = null
    messages.value = []
  }

  const createConversation = async (data: Record<string, any>): Promise<CreateConversationResult> => {
    try {
      const response = await api.post('/chat/conversations', data)
      const conv = response.data.data.conversation
      await fetchConversations()
      return { success: true, conversation: conv }
    } catch (err: any) {
      console.error('Errore createConversation:', err)
      return { success: false, message: err.response?.data?.message || 'Errore creazione' }
    }
  }

  const fetchMessages = async (conversationId: number, page: number = 1): Promise<void> => {
    loading.value = true
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
        params: { page, limit: messagesPagination.value.limit }
      })
      if (page === 1) {
        messages.value = response.data.data.messages || []
      } else {
        // Prepend messaggi più vecchi
        messages.value = [...(response.data.data.messages || []), ...messages.value]
      }
      messagesPagination.value = response.data.data.pagination || messagesPagination.value
    } catch (err: any) {
      console.error('Errore fetchMessages:', err)
    } finally {
      loading.value = false
    }
  }

  const sendMessage = async (conversationId: number, content: string): Promise<SendMessageResult> => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
        content, messageType: 'text'
      })
      const message = response.data.data.message
      // Aggiungi localmente se non gia aggiunto via socket
      const exists = messages.value.find((m: any) => m.id === message.id)
      if (!exists) messages.value.push(message)
      // Aggiorna preview
      updateConversationPreview(message)
      return { success: true, message }
    } catch (err: any) {
      // Se offline, salva il messaggio localmente e mettilo in coda per sync
      if (!navigator.onLine) {
        const pendingMessage = {
          id: `pending_${Date.now()}`,
          conversation_id: conversationId,
          content,
          message_type: 'text',
          created_at: new Date().toISOString(),
          _pending: true // Flag per indicare messaggio non ancora inviato
        }
        messages.value.push(pendingMessage)

        // Queue per sync offline
        try {
          const { useOfflineSync } = await import('@/composables/useOfflineSync')
          const { queueAction } = useOfflineSync()
          await queueAction({
            type: 'chat-message',
            endpoint: `/chat/conversations/${conversationId}/messages`,
            method: 'POST',
            data: { content, messageType: 'text' },
            description: `Messaggio in ${conversationId}`
          })
        } catch (queueErr: any) {
          console.error('Errore queue messaggio offline:', queueErr)
        }

        return { success: true, message: pendingMessage, pending: true }
      }
      console.error('Errore sendMessage:', err)
      return { success: false }
    }
  }

  const markAsRead = async (conversationId: number): Promise<void> => {
    try {
      await api.post(`/chat/conversations/${conversationId}/read`)
    } catch (err: any) {
      console.error('Errore markAsRead:', err)
    }
  }

  const toggleMute = async (conversationId: number): Promise<void> => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/mute`)
      const idx = conversations.value.findIndex((c: any) => c.id === conversationId)
      if (idx !== -1) conversations.value[idx].is_muted = response.data.data.is_muted
    } catch (err: any) {
      console.error('Errore toggleMute:', err)
    }
  }

  const fetchAvailableUsers = async (): Promise<void> => {
    try {
      const response = await api.get('/chat/users')
      availableUsers.value = response.data.data.users || []
    } catch (err: any) {
      console.error('Errore fetchAvailableUsers:', err)
    }
  }

  const fetchOnlineUsers = async (): Promise<void> => {
    try {
      const response = await api.get('/chat/online-users')
      const ids: number[] = response.data.data.onlineUserIds || []
      onlineUsers.value = new Set(ids)
    } catch (err: any) {
      console.error('Errore fetchOnlineUsers:', err)
    }
  }

  const isOnline = (userId: number): boolean => {
    return onlineUsers.value.has(userId)
  }

  // Typing indicators
  const emitTyping = (conversationId: number): void => {
    if (socket.value) socket.value.emit('typing_start', conversationId)
  }

  const emitStopTyping = (conversationId: number): void => {
    if (socket.value) socket.value.emit('typing_stop', conversationId)
  }

  return {
    // State
    conversations, currentConversation, messages, messagesPagination,
    availableUsers, loading, error, typingUsers, onlineUsers, socket,
    // Getters
    totalUnread,
    // Actions
    connectSocket, disconnectSocket, updateConversationPreview,
    fetchConversations, fetchConversationById, openConversation, closeConversation,
    createConversation, fetchMessages, sendMessage,
    markAsRead, toggleMute, fetchAvailableUsers,
    fetchOnlineUsers, isOnline,
    emitTyping, emitStopTyping
  }
})
