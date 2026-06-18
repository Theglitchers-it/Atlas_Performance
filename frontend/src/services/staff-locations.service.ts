/**
 * Staff Locations Service (Fase 3 multi-sede)
 */

import api from '@/services/api'

export interface MyLocation {
    assignment_id: number
    location_id: number
    role_at_location: 'owner' | 'manager' | 'trainer' | 'nutritionist' | 'front_desk'
    schedule: any
    is_primary: number
    active_from: string
    active_to: string | null
    name: string
    address: string | null
    city: string | null
    location_type: 'main' | 'branch' | 'popup' | 'external'
    parent_location_id: number | null
    latitude: number | null
    longitude: number | null
    geofence_radius_meters: number
}

export interface LocationStaff {
    assignment_id: number
    user_id: number
    role_at_location: string
    schedule: any
    is_primary: number
    first_name: string
    last_name: string
    email: string
}

export interface LocationTreeNode {
    id: number
    parent_location_id: number | null
    name: string
    city: string | null
    location_type: string
    depth: number
}

export const getMyLocations = () =>
    api.get<{ success: boolean; data: MyLocation[] }>('/staff-locations/me')

export const getLocationStaff = (locationId: number) =>
    api.get<{ success: boolean; data: LocationStaff[] }>(`/locations/${locationId}/staff`)

export const getLocationTree = () =>
    api.get<{ success: boolean; data: LocationTreeNode[] }>('/locations/tree')

export const assignStaffToLocation = (locationId: number, payload: {
    userId: number
    roleAtLocation?: string
    isPrimary?: boolean
}) => api.post(`/locations/${locationId}/staff`, payload)

export const removeStaffFromLocation = (locationId: number, userId: number) =>
    api.delete(`/locations/${locationId}/staff/${userId}`)

export const setPrimaryMyLocation = (locationId: number) =>
    api.put(`/staff-locations/me/primary/${locationId}`)

export const LOCATION_TYPE_LABELS: Record<string, string> = {
    main: 'Sede principale',
    branch: 'Filiale',
    popup: 'Pop-up / Temporanea',
    external: 'Sede esterna'
}

export const LOCATION_ROLE_LABELS: Record<string, string> = {
    owner: 'Proprietario',
    manager: 'Manager',
    trainer: 'Trainer',
    nutritionist: 'Nutrizionista',
    front_desk: 'Reception'
}
