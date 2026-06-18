/**
 * Pay-per-Active Client Billing Service (Fase 2)
 */

import api from '@/services/api'

export interface BillingUsage {
    tenantId: string
    businessName: string
    billingModel: 'fixed_tier' | 'pay_per_active' | 'hybrid'
    freeActiveSlots: number
    perSlotPriceCents: number
    activeCount: number
    billableCount: number
    projectedCents: number
    projectedAmount: string
    currency: string
}

export interface ActivationEvent {
    id: number
    event_type: 'activated' | 'deactivated' | 'auto_deactivated' | 'reactivated'
    reason: string | null
    occurred_at: string
    actor_user_id: number | null
    first_name: string | null
    last_name: string | null
}

export const getBillingUsage = () => api.get<{ success: boolean; data: BillingUsage }>('/billing/usage')

export const updateBillingSettings = (payload: {
    billingModel?: 'fixed_tier' | 'pay_per_active' | 'hybrid'
    freeActiveSlots?: number
    perSlotPriceCents?: number
    currency?: string
}) => api.put('/billing/settings', payload)

export const activateClient = (clientId: number, reason?: string) =>
    api.post(`/clients/${clientId}/activate`, { reason })

export const deactivateClient = (clientId: number, reason?: string) =>
    api.post(`/clients/${clientId}/deactivate`, { reason })

export const getClientActivationHistory = (clientId: number) =>
    api.get<{ success: boolean; data: ActivationEvent[] }>(`/clients/${clientId}/activation-history`)

export const reportUsageNow = () => api.post('/billing/report-usage')

export const formatCurrency = (cents: number, currency = 'EUR'): string => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(cents / 100)
}

export const BILLING_MODEL_LABELS: Record<string, string> = {
    fixed_tier: 'Tier fisso',
    pay_per_active: 'Pay per cliente attivo',
    hybrid: 'Ibrido'
}
