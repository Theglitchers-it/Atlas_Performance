/**
 * Client bulk operations + CSV import/export service (Fase 8)
 */

import api from '@/services/api'

export type BulkChannel = 'whatsapp' | 'email' | 'sms'

export interface BulkNotifyLink {
    clientId: number
    channel: BulkChannel
    url: string | null
    skipped?: boolean
    reason?: string
}

export interface BulkResult {
    success: number
    failed: number
    errors?: Array<{ clientId?: number; row?: number; error: string }>
}

export const bulkNotify = (payload: { clientIds: number[]; channel: BulkChannel; message: string }) =>
    api.post<{ success: boolean; data: { links: BulkNotifyLink[]; success: number; failed: number } }>('/clients/bulk/notify', payload)

export const bulkActivate = (clientIds: number[], reason?: string) =>
    api.post<{ success: boolean; data: BulkResult }>('/clients/bulk/activate', { clientIds, reason })

export const bulkDeactivate = (clientIds: number[], reason?: string) =>
    api.post<{ success: boolean; data: BulkResult }>('/clients/bulk/deactivate', { clientIds, reason })

export const bulkChangeStatus = (clientIds: number[], newStatus: string) =>
    api.post<{ success: boolean; data: BulkResult }>('/clients/bulk/change-status', { clientIds, newStatus })

export const bulkAssignProgram = (clientIds: number[], programId: number, startDate?: string) =>
    api.post<{ success: boolean; data: BulkResult }>('/clients/bulk/assign-program', { clientIds, programId, startDate })

export const exportCSV = (filters: { status?: string; search?: string } = {}): string => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.search) params.append('search', filters.search)
    const qs = params.toString()
    return `/api/clients/export.csv${qs ? '?' + qs : ''}`
}

export interface ImportPreview {
    headers: string[]
    preview: Record<string, string>[]
    totalRows: number
    suggestedMapping: Record<string, string>
    dbFields: string[]
}

export const previewImport = (file: File) => {
    const fd = new FormData()
    fd.append('csv', file)
    return api.post<{ success: boolean; data: ImportPreview }>('/clients/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export const importCSV = (file: File, columnMapping: Record<string, string>) => {
    const fd = new FormData()
    fd.append('csv', file)
    fd.append('columnMapping', JSON.stringify(columnMapping))
    return api.post<{ success: boolean; data: { imported: number; skipped: number; errors: Array<{ row: number; error: string }> } }>(
        '/clients/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }
    )
}

export const DB_FIELD_LABELS: Record<string, string> = {
    first_name: 'Nome *',
    last_name: 'Cognome',
    email: 'Email *',
    phone: 'Telefono',
    date_of_birth: 'Data di nascita',
    gender: 'Genere',
    fitness_level: 'Livello fitness',
    primary_goal: 'Obiettivo'
}
