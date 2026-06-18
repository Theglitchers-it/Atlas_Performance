/**
 * Roles Service (Fase 1 multi-livello)
 * Chiamate API per gestione ruoli, team gerarchico, client_trainers, qualifiche.
 */

import api from '@/services/api'
import type { AppRole } from '@/types'

export interface UserRole {
    id: number
    role: AppRole
    is_primary: number
    granted_by: number | null
    granted_at: string
    expires_at: string | null
}

export interface TeamMember {
    id: number
    parent_user_id: number | null
    first_name: string
    last_name: string
    email: string
    role: string
    depth: number
}

export type RelationRole = 'primary_trainer' | 'assistant_trainer' | 'nutritionist' | 'observer' | 'specialist'

export interface ClientTrainer {
    id: number
    user_id: number
    relation_role: RelationRole
    assigned_at: string
    ended_at: string | null
    notes: string | null
    first_name: string
    last_name: string
    email: string
}

export interface Qualification {
    id: number
    qualification: string
    issued_by: string | null
    issued_at: string | null
    expires_at: string | null
    certificate_url: string | null
    verified: number
    verified_by: number | null
    verified_at: string | null
    notes: string | null
    created_at: string
}

// ===== User Roles =====
export const getMyRoles = () => api.get<{ success: boolean; data: UserRole[] }>('/users/me/roles')
export const getUserRoles = (userId: number) => api.get<{ success: boolean; data: UserRole[] }>(`/users/${userId}/roles`)
export const assignRole = (userId: number, payload: { role: AppRole; expiresAt?: string; isPrimary?: boolean }) =>
    api.post(`/users/${userId}/roles`, payload)
export const removeRole = (userId: number, role: AppRole) =>
    api.delete(`/users/${userId}/roles/${role}`)

// ===== Team Hierarchy =====
export const getMyTeam = () => api.get<{ success: boolean; data: TeamMember[] }>('/team/me')
export const setUserParent = (userId: number, parentUserId: number | null) =>
    api.put(`/users/${userId}/parent`, { parentUserId })

// ===== Client Trainers =====
export const getClientTrainers = (clientId: number) =>
    api.get<{ success: boolean; data: ClientTrainer[] }>(`/clients/${clientId}/trainers`)
export const assignTrainerToClient = (clientId: number, payload: { userId: number; relationRole: string; notes?: string }) =>
    api.post(`/clients/${clientId}/trainers`, payload)
export const removeTrainerFromClient = (clientId: number, userId: number, relationRole?: string) =>
    api.delete(`/clients/${clientId}/trainers/${userId}`, { params: relationRole ? { relationRole } : {} })

// ===== Qualifications =====
export const getMyQualifications = () =>
    api.get<{ success: boolean; data: Qualification[] }>('/users/me/qualifications')
export const getUserQualifications = (userId: number) =>
    api.get<{ success: boolean; data: Qualification[] }>(`/users/${userId}/qualifications`)
export const addMyQualification = (payload: {
    qualification: string
    issuedBy?: string
    issuedAt?: string
    expiresAt?: string
    certificateUrl?: string
    notes?: string
}) => api.post('/users/me/qualifications', payload)
export const deleteMyQualification = (id: number) => api.delete(`/users/me/qualifications/${id}`)
export const verifyQualification = (id: number) => api.post(`/qualifications/${id}/verify`)

export const ROLE_LABELS: Record<AppRole, string> = {
    gym_admin: 'Admin Palestra',
    trainer: 'Trainer',
    nutritionist: 'Nutrizionista',
    client: 'Cliente',
    front_desk: 'Reception',
    accountant: 'Contabilità'
}

export const RELATION_LABELS: Record<RelationRole, string> = {
    primary_trainer: 'Trainer principale',
    assistant_trainer: 'Trainer assistente',
    nutritionist: 'Nutrizionista',
    observer: 'Osservatore',
    specialist: 'Specialista'
}
