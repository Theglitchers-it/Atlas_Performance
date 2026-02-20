/**
 * Booking Store - Pinia
 * Gestione appuntamenti e calendario
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/store/auth'
import type { Appointment, Client, User, BookingFilters } from '@/types'

type CalendarView = 'day' | 'week' | 'month'

interface ActionResult {
    success: boolean
    message?: string | null
    id?: number
}

export const useBookingStore = defineStore('booking', () => {
    // State
    const appointments = ref<Appointment[]>([])
    const clients = ref<Client[]>([])
    const trainers = ref<User[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const currentView = ref<CalendarView>('week')
    const currentDate = ref(new Date().toISOString().substring(0, 10))
    const filters = ref<BookingFilters>({ clientId: null, trainerId: null, status: null })

    // Computed
    const weekDates = computed((): string[] => {
        const d = new Date(currentDate.value)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d)
        monday.setDate(diff)
        const dates: string[] = []
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday)
            date.setDate(monday.getDate() + i)
            dates.push(date.toISOString().substring(0, 10))
        }
        return dates
    })

    const monthDates = computed((): string[] => {
        const d = new Date(currentDate.value)
        const year = d.getFullYear()
        const month = d.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        const start = new Date(firstDay)
        const startDow = start.getDay()
        start.setDate(start.getDate() - (startDow === 0 ? 6 : startDow - 1))

        const dates: string[] = []
        const current = new Date(start)
        while (current <= lastDay || dates.length % 7 !== 0) {
            dates.push(current.toISOString().substring(0, 10))
            current.setDate(current.getDate() + 1)
            if (dates.length > 42) break
        }
        return dates
    })

    const currentMonthLabel = computed((): string => {
        const d = new Date(currentDate.value)
        return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    })

    const currentWeekLabel = computed((): string => {
        const dates = weekDates.value
        if (dates.length === 0) return ''
        const start = new Date(dates[0])
        const end = new Date(dates[6])
        const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
        return `${start.toLocaleDateString('it-IT', opts)} - ${end.toLocaleDateString('it-IT', { ...opts, year: 'numeric' })}`
    })

    // Actions
    const fetchClients = async (): Promise<void> => {
        try {
            const response = await api.get('/clients', { params: { limit: 200 } })
            clients.value = response.data.data.clients || []
        } catch (err) {
            console.error('Errore caricamento clienti:', err)
        }
    }

    const fetchTrainers = async (): Promise<void> => {
        try {
            const response = await api.get('/users', { params: { limit: 50 } })
            trainers.value = (response.data.data.users || []).filter((u: User) => u.role !== 'client')
        } catch (err) {
            console.error('Errore caricamento trainer:', err)
        }
    }

    const fetchAppointments = async (): Promise<ActionResult> => {
        loading.value = true
        error.value = null
        try {
            const dates = currentView.value === 'month' ? monthDates.value : weekDates.value
            const startDate = dates[0]
            const endDate = dates[dates.length - 1] + ' 23:59:59'

            const params: Record<string, any> = { startDate, endDate, limit: 200 }
            if (filters.value.clientId) params.clientId = filters.value.clientId
            if (filters.value.trainerId) params.trainerId = filters.value.trainerId
            if (filters.value.status) params.status = filters.value.status

            const response = await api.get('/booking/appointments', { params })
            appointments.value = response.data.data.appointments || []
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nel caricamento appuntamenti'
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    const createAppointment = async (data: Record<string, any>): Promise<ActionResult> => {
        error.value = null
        try {
            const response = await api.post('/booking/appointments', data)
            await fetchAppointments()
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nella creazione appuntamento'
            return { success: false, message: error.value }
        }
    }

    const updateAppointment = async (id: number, data: Record<string, any>): Promise<ActionResult> => {
        error.value = null
        try {
            await api.put(`/booking/appointments/${id}`, data)
            await fetchAppointments()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento appuntamento'
            return { success: false, message: error.value }
        }
    }

    const updateStatus = async (id: number, status: string): Promise<ActionResult> => {
        error.value = null
        try {
            await api.put(`/booking/appointments/${id}/status`, { status })
            await fetchAppointments()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'aggiornamento stato'
            return { success: false, message: error.value }
        }
    }

    const deleteAppointment = async (id: number): Promise<ActionResult> => {
        error.value = null
        try {
            await api.delete(`/booking/appointments/${id}`)
            await fetchAppointments()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore nell\'eliminazione appuntamento'
            return { success: false, message: error.value }
        }
    }

    const navigatePrev = (): void => {
        const d = new Date(currentDate.value)
        if (currentView.value === 'month') {
            d.setMonth(d.getMonth() - 1)
        } else {
            d.setDate(d.getDate() - 7)
        }
        currentDate.value = d.toISOString().substring(0, 10)
        fetchAppointments()
    }

    const navigateNext = (): void => {
        const d = new Date(currentDate.value)
        if (currentView.value === 'month') {
            d.setMonth(d.getMonth() + 1)
        } else {
            d.setDate(d.getDate() + 7)
        }
        currentDate.value = d.toISOString().substring(0, 10)
        fetchAppointments()
    }

    const goToToday = (): void => {
        currentDate.value = new Date().toISOString().substring(0, 10)
        fetchAppointments()
    }

    const setView = (view: CalendarView): void => {
        currentView.value = view
        fetchAppointments()
    }

    const setFilter = (key: keyof BookingFilters, value: any): void => {
        filters.value[key] = value
        fetchAppointments()
    }

    const resetFilters = (): void => {
        filters.value = { clientId: null, trainerId: null, status: null }
        fetchAppointments()
    }

    const getAppointmentsForDate = (date: string): Appointment[] => {
        return appointments.value.filter(a => {
            const aDate = a.start_datetime ? a.start_datetime.substring(0, 10) : ''
            return aDate === date
        })
    }

    const initialize = async (): Promise<void> => {
        const auth = useAuthStore()
        const role = auth.user?.role
        // Only trainer/admin roles can access /clients and /users endpoints
        if (role !== 'client') {
            await Promise.all([fetchClients(), fetchTrainers()])
        }
        await fetchAppointments()
    }

    return {
        appointments, clients, trainers, loading, error,
        currentView, currentDate, filters,
        weekDates, monthDates, currentMonthLabel, currentWeekLabel,
        fetchClients, fetchTrainers, fetchAppointments,
        createAppointment, updateAppointment, updateStatus, deleteAppointment,
        navigatePrev, navigateNext, goToToday, setView,
        setFilter, resetFilters, getAppointmentsForDate, initialize
    }
})
