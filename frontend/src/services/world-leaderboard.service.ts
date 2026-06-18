/**
 * World Leaderboard + Proof-of-Lift + Video Likes service (Fase 6)
 */

import api from '@/services/api'

export interface WorldExercise {
    id: number
    exercise_canonical_name: string
    display_label: string
    record_type: 'weight' | 'reps' | 'time' | 'distance'
}

export interface WorldEntry {
    entry_id: number
    exercise_id: number
    exercise_canonical_name: string
    display_label: string
    value: number
    weight_class: string | null
    bodyweight_kg: number | null
    user_id: number
    display_name: string
    avatar_url: string | null
    proof_video_id: number
    submitted_at: string
    world_rank: number
}

export interface MyWorldEntry {
    id: number
    exercise_id: number
    display_label: string
    value: number
    weight_class: string | null
    status: 'pending_review' | 'approved' | 'rejected'
    submitted_at: string
    proof_video_id: number
}

export const getWorldExercises = () =>
    api.get<{ success: boolean; data: WorldExercise[] }>('/leaderboard/world/exercises')

export const getWorldLeaderboard = (params: { exerciseId?: number; weightClass?: string; limit?: number; offset?: number } = {}) =>
    api.get<{ success: boolean; data: WorldEntry[] }>('/leaderboard/world', { params })

export const getMyWorldEntries = () =>
    api.get<{ success: boolean; data: MyWorldEntry[] }>('/proof-of-lift/me')

export const attachProofVideo = (payload: { prRecordId: number; videoId: number; bodyweightKg?: number }) =>
    api.post('/proof-of-lift/attach', payload)

export const verifyPR = (prRecordId: number) => api.post(`/proof-of-lift/${prRecordId}/verify`)

export const rejectWorldEntry = (entryId: number) => api.post(`/proof-of-lift/world/${entryId}/reject`)

export const setWorldOptIn = (optIn: boolean, displayName?: string) =>
    api.put('/users/me/world-leaderboard-opt-in', { optIn, displayName })

// Video likes
export const likeVideo = (videoId: number) => api.post(`/videos/${videoId}/like`)
export const unlikeVideo = (videoId: number) => api.delete(`/videos/${videoId}/like`)
export const getVideoLikes = (videoId: number) => api.get(`/videos/${videoId}/likes`)

export const STATUS_LABELS: Record<MyWorldEntry['status'], string> = {
    pending_review: 'In attesa di verifica',
    approved: '✓ Approvato',
    rejected: '✗ Rifiutato'
}
