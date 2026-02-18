/**
 * Payment Store - Pinia
 * Gestione pagamenti e abbonamenti clienti
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { Client, PaginationMeta } from '@/types'

interface Subscription {
    id: number
    client_id: number
    plan_name: string
    status: string
    amount: number
    start_date?: string
    end_date?: string
    [key: string]: any
}

interface Payment {
    id: number
    client_id: number
    amount: number
    status: 'pending' | 'completed' | 'overdue' | 'cancelled'
    payment_method?: string
    description?: string
    due_date?: string
    paid_at?: string
    [key: string]: any
}

interface Invoice {
    id: number
    amount: number
    status: string
    created_at: string
    [key: string]: any
}

interface PaymentStats {
    totalRevenue: number
    [key: string]: any
}

interface PaymentFilters {
    clientId: number | null
    status: string | null
    dateFrom: string | null
    dateTo: string | null
}

interface ActionResult {
    success: boolean
    message?: string | null
    id?: number
}

interface StatusOption {
    value: string
    label: string
    color: string
}

interface MethodOption {
    value: string
    label: string
}

export const usePaymentStore = defineStore('payment', () => {
    // State
    const subscriptions = ref<Subscription[]>([])
    const payments = ref<Payment[]>([])
    const invoices = ref<Invoice[]>([])
    const stats = ref<PaymentStats | null>(null)
    const clients = ref<Client[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    const filters = ref<PaymentFilters>({
        clientId: null,
        status: null,
        dateFrom: null,
        dateTo: null
    })

    const pagination = ref<PaginationMeta>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    })

    // Getters
    const totalRevenue = computed(() => stats.value?.totalRevenue || 0)
    const pendingPayments = computed(() => payments.value.filter(p => p.status === 'pending'))
    const overduePayments = computed(() => payments.value.filter(p => p.status === 'overdue'))

    const paymentStatusOptions: StatusOption[] = [
        { value: 'pending', label: 'In Attesa', color: 'habit-orange' },
        { value: 'completed', label: 'Completato', color: 'emerald-400' },
        { value: 'overdue', label: 'Scaduto', color: 'red-400' },
        { value: 'cancelled', label: 'Cancellato', color: 'gray-400' }
    ]

    const paymentMethodOptions: MethodOption[] = [
        { value: 'cash', label: 'Contanti' },
        { value: 'bank_transfer', label: 'Bonifico' },
        { value: 'card', label: 'Carta' },
        { value: 'stripe', label: 'Stripe' },
        { value: 'other', label: 'Altro' }
    ]

    // Actions
    const fetchClients = async (): Promise<void> => {
        try {
            const response = await api.get('/clients', { params: { limit: 200 } })
            clients.value = response.data.data.clients || []
        } catch (err) {
            console.error('Errore caricamento clienti:', err)
        }
    }

    const fetchSubscriptions = async (options: Record<string, any> = {}): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const params: Record<string, any> = { ...options }
            if (filters.value.clientId) params.clientId = filters.value.clientId
            if (filters.value.status) params.status = filters.value.status

            const response = await api.get('/payments/subscriptions', { params })
            subscriptions.value = response.data.data.subscriptions || []
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore caricamento abbonamenti'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const fetchPayments = async (options: { page?: number } = {}): Promise<ActionResult> => {
        loading.value = true
        error.value = null

        try {
            const page = options.page || pagination.value.page
            const limit = pagination.value.limit
            const offset = (page - 1) * limit

            const params: Record<string, any> = { limit, offset }
            if (filters.value.clientId) params.clientId = filters.value.clientId
            if (filters.value.status) params.status = filters.value.status
            if (filters.value.dateFrom) params.dateFrom = filters.value.dateFrom
            if (filters.value.dateTo) params.dateTo = filters.value.dateTo

            const response = await api.get('/payments', { params })
            payments.value = response.data.data.payments || []

            if (response.data.data.pagination) {
                pagination.value = { ...pagination.value, ...response.data.data.pagination }
            }

            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore caricamento pagamenti'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    const fetchStats = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/payments/stats')
            stats.value = response.data.data.stats || response.data.data
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento statistiche:', err)
            return { success: false }
        }
    }

    const createSubscription = async (data: Partial<Subscription>): Promise<ActionResult> => {
        error.value = null
        try {
            const response = await api.post('/payments/subscriptions', data)
            await fetchSubscriptions()
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore creazione abbonamento'
            return { success: false, message: error.value }
        }
    }

    const updateSubscription = async (subscriptionId: number, data: Partial<Subscription>): Promise<ActionResult> => {
        error.value = null
        try {
            await api.put(`/payments/subscriptions/${subscriptionId}`, data)
            await fetchSubscriptions()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore aggiornamento abbonamento'
            return { success: false, message: error.value }
        }
    }

    const recordPayment = async (data: Partial<Payment>): Promise<ActionResult> => {
        error.value = null
        try {
            const response = await api.post('/payments', data)
            await fetchPayments()
            await fetchStats()
            return { success: true, id: response.data.data.id }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore registrazione pagamento'
            return { success: false, message: error.value }
        }
    }

    const updatePaymentStatus = async (paymentId: number, status: string): Promise<ActionResult> => {
        error.value = null
        try {
            await api.put(`/payments/${paymentId}`, { status })
            await fetchPayments()
            await fetchStats()
            return { success: true }
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Errore aggiornamento pagamento'
            return { success: false, message: error.value }
        }
    }

    const fetchInvoices = async (): Promise<ActionResult> => {
        try {
            const response = await api.get('/payments/invoices')
            invoices.value = response.data.data.invoices || []
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento fatture:', err)
            return { success: false }
        }
    }

    const setFilter = (key: keyof PaymentFilters, value: any): void => {
        filters.value[key] = value || null
        pagination.value.page = 1
        fetchPayments()
    }

    const resetFilters = (): void => {
        filters.value = { clientId: null, status: null, dateFrom: null, dateTo: null }
        pagination.value.page = 1
        fetchPayments()
    }

    const setPage = (page: number): void => {
        pagination.value.page = page
        fetchPayments({ page })
    }

    const initialize = async (): Promise<void> => {
        await Promise.all([fetchClients(), fetchPayments(), fetchStats()])
    }

    return {
        subscriptions, payments, invoices, stats, clients, loading, error, filters, pagination,
        totalRevenue, pendingPayments, overduePayments,
        paymentStatusOptions, paymentMethodOptions,
        fetchClients, fetchSubscriptions, fetchPayments, fetchStats,
        createSubscription, updateSubscription,
        recordPayment, updatePaymentStatus, fetchInvoices,
        setFilter, resetFilters, setPage, initialize
    }
})
