/**
 * GPS Check-in Service (Fase 4)
 */

import api from '@/services/api'

export type CheckinStatus = 'valid' | 'out_of_range' | 'suspected_spoof' | 'manual_override'
export type CheckinSource = 'mobile_native' | 'mobile_web' | 'manual_qr' | 'staff_override'

export interface CheckinCreateResult {
    id: number
    status: CheckinStatus
    distance: number
    geofenceRadius?: number
    locationName?: string
    idempotent?: boolean
}

export interface CheckinRecord {
    id: number
    check_in_at: string
    check_out_at: string | null
    status: CheckinStatus
    distance_m: number | null
    location_id: number
    location_name: string
    city: string | null
}

export interface LivePresence {
    id: number
    check_in_at: string
    check_out_at: string | null
    status: CheckinStatus
    user_id: number
    first_name: string
    last_name: string
    email: string
}

export const createCheckin = (payload: {
    locationId: number
    lat?: number | null
    lng?: number | null
    accuracy?: number | null
    appointmentId?: number
    notes?: string
    source?: CheckinSource
}) => api.post<{ success: boolean; data: CheckinCreateResult }>('/checkins', payload)

export const checkout = (id: number) => api.patch(`/checkins/${id}/checkout`)

export const getMyCheckins = (limit = 20, offset = 0) =>
    api.get<{ success: boolean; data: CheckinRecord[] }>('/checkins/me', { params: { limit, offset } })

export const getLocationLivePresence = (locationId: number) =>
    api.get<{ success: boolean; data: LivePresence[]; count: number }>(`/locations/${locationId}/live-presence`)
