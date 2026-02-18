/**
 * Classes Store - Pinia
 * Gestione classi, sessioni e iscrizioni
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Client, User, PaginationMeta } from '@/types'

interface ActionResult {
  success: boolean
  message?: string
  id?: number
  data?: any
}

export const useClassesStore = defineStore('classes', () => {
  // State
  const classes = ref<any[]>([])
  const classesPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const sessions = ref<any[]>([])
  const sessionsPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const currentSession = ref<any | null>(null)
  const currentClass = ref<any | null>(null)
  const myClasses = ref<any[]>([])
  const myClassesPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const clients = ref<Client[]>([])
  const selectedClientId = ref<number | null>(null)
  const staff = ref<User[]>([])

  // === ACTIONS ===

  const fetchClients = async (): Promise<void> => {
    try {
      const response = await api.get('/clients', { params: { limit: 500 } })
      clients.value = response.data.data.clients || []
    } catch (err: any) {
      console.error('Errore fetchClients:', err)
    }
  }

  const fetchStaff = async (): Promise<void> => {
    try {
      const response = await api.get('/users', { params: { limit: 500, role: 'staff' } })
      staff.value = response.data.data?.users || []
    } catch (err: any) {
      console.error('Errore fetchStaff:', err)
      staff.value = []
    }
  }

  const fetchClasses = async (options: Record<string, any> = {}): Promise<void> => {
    loading.value = true
    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        limit: classesPagination.value.limit,
        activeOnly: options.activeOnly || false
      }
      const response = await api.get('/classes', { params })
      classes.value = response.data.data.classes || []
      classesPagination.value = response.data.data.pagination || classesPagination.value
    } catch (err: any) {
      console.error('Errore fetchClasses:', err)
      error.value = 'Errore caricamento classi'
    } finally {
      loading.value = false
    }
  }

  const fetchClassById = async (id: number): Promise<void> => {
    try {
      const response = await api.get(`/classes/${id}`)
      currentClass.value = response.data.data.class
    } catch (err: any) {
      console.error('Errore fetchClassById:', err)
    }
  }

  const createClass = async (data: Record<string, any>): Promise<ActionResult> => {
    try {
      const response = await api.post('/classes', data)
      return { success: true, data: response.data.data.class }
    } catch (err: any) {
      console.error('Errore createClass:', err)
      return { success: false, message: err.response?.data?.message || 'Errore creazione classe' }
    }
  }

  const updateClass = async (id: number, data: Record<string, any>): Promise<ActionResult> => {
    try {
      const response = await api.put(`/classes/${id}`, data)
      return { success: true, data: response.data.data.class }
    } catch (err: any) {
      console.error('Errore updateClass:', err)
      return { success: false, message: err.response?.data?.message || 'Errore aggiornamento' }
    }
  }

  const deleteClass = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`/classes/${id}`)
      return { success: true }
    } catch (err: any) {
      console.error('Errore deleteClass:', err)
      return { success: false }
    }
  }

  // Sessioni
  const fetchSessions = async (options: Record<string, any> = {}): Promise<void> => {
    loading.value = true
    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        limit: sessionsPagination.value.limit,
        ...(options.classId && { classId: options.classId }),
        ...(options.status && { status: options.status }),
        ...(options.from && { from: options.from }),
        ...(options.to && { to: options.to })
      }
      const response = await api.get('/classes/sessions/list', { params })
      sessions.value = response.data.data.sessions || []
      sessionsPagination.value = response.data.data.pagination || sessionsPagination.value
    } catch (err: any) {
      console.error('Errore fetchSessions:', err)
      error.value = 'Errore caricamento sessioni'
    } finally {
      loading.value = false
    }
  }

  const fetchSessionById = async (id: number): Promise<void> => {
    try {
      const response = await api.get(`/classes/sessions/${id}`)
      currentSession.value = response.data.data.session
    } catch (err: any) {
      console.error('Errore fetchSessionById:', err)
    }
  }

  const createSession = async (data: Record<string, any>): Promise<ActionResult> => {
    try {
      const response = await api.post('/classes/sessions', data)
      return { success: true, data: response.data.data.session }
    } catch (err: any) {
      console.error('Errore createSession:', err)
      return { success: false, message: err.response?.data?.message || 'Errore creazione sessione' }
    }
  }

  const updateSessionStatus = async (id: number, status: string): Promise<ActionResult> => {
    try {
      await api.put(`/classes/sessions/${id}/status`, { status })
      return { success: true }
    } catch (err: any) {
      console.error('Errore updateSessionStatus:', err)
      return { success: false }
    }
  }

  const deleteSession = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`/classes/sessions/${id}`)
      return { success: true }
    } catch (err: any) {
      console.error('Errore deleteSession:', err)
      return { success: false }
    }
  }

  // Iscrizioni
  const enrollToSession = async (sessionId: number): Promise<ActionResult> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.post(`/classes/sessions/${sessionId}/enroll`, {}, { params })
      return { success: true, data: response.data.data }
    } catch (err: any) {
      console.error('Errore enrollToSession:', err)
      return { success: false, message: err.response?.data?.message || 'Errore iscrizione' }
    }
  }

  const cancelEnrollment = async (sessionId: number): Promise<ActionResult> => {
    try {
      const params: Record<string, any> = {}
      if (selectedClientId.value) params.clientId = selectedClientId.value
      await api.post(`/classes/sessions/${sessionId}/cancel`, {}, { params })
      return { success: true }
    } catch (err: any) {
      console.error('Errore cancelEnrollment:', err)
      return { success: false, message: err.response?.data?.message || 'Errore cancellazione' }
    }
  }

  const checkInClient = async (sessionId: number, clientId: number): Promise<ActionResult> => {
    try {
      await api.post(`/classes/sessions/${sessionId}/checkin`, { clientId })
      return { success: true }
    } catch (err: any) {
      console.error('Errore checkInClient:', err)
      return { success: false }
    }
  }

  const markNoShow = async (sessionId: number, clientId: number): Promise<ActionResult> => {
    try {
      await api.post(`/classes/sessions/${sessionId}/noshow`, { clientId })
      return { success: true }
    } catch (err: any) {
      console.error('Errore markNoShow:', err)
      return { success: false }
    }
  }

  // Le mie classi (client)
  const fetchMyClasses = async (options: Record<string, any> = {}): Promise<void> => {
    try {
      const params: Record<string, any> = {
        page: options.page || 1,
        limit: myClassesPagination.value.limit,
        ...(options.status && { status: options.status })
      }
      if (selectedClientId.value) params.clientId = selectedClientId.value
      const response = await api.get('/classes/my', { params })
      myClasses.value = response.data.data.sessions || []
      myClassesPagination.value = response.data.data.pagination || myClassesPagination.value
    } catch (err: any) {
      console.error('Errore fetchMyClasses:', err)
    }
  }

  return {
    // State
    classes, classesPagination, sessions, sessionsPagination,
    currentSession, currentClass, myClasses, myClassesPagination,
    loading, error, clients, selectedClientId, staff,
    // Actions
    fetchClients, fetchStaff, fetchClasses, fetchClassById,
    createClass, updateClass, deleteClass,
    fetchSessions, fetchSessionById, createSession, updateSessionStatus, deleteSession,
    enrollToSession, cancelEnrollment, checkInClient, markNoShow,
    fetchMyClasses
  }
})
