/**
 * Community Moderation Service — reports, regole, post visibility.
 */

import api from '@/services/api'

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'off_topic' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'removed'
export type VisibilityType = 'global' | 'my_clients' | 'specific_clients'

export interface PostReport {
    id: number
    tenant_id: string
    post_id: number
    reporter_id: number
    reason: ReportReason
    details: string | null
    status: ReportStatus
    moderated_by: number | null
    moderated_at: string | null
    created_at: string
    post_content: string
    post_author_id: number
    reporter_first_name: string
    reporter_last_name: string
    moderator_first_name: string | null
    moderator_last_name: string | null
}

export interface CommunityRule {
    id: number
    title: string
    description: string | null
    sort_order: number
    active: number
    created_at: string
}

// ===== Reports =====
export const reportPost = (postId: number, payload: { reason: ReportReason; details?: string }) =>
    api.post(`/community/posts/${postId}/report`, payload)

export const listReports = (status: ReportStatus = 'pending') =>
    api.get<{ success: boolean; data: PostReport[] }>('/community/moderation/reports', { params: { status } })

export const moderatePost = (reportId: number, action: 'dismiss' | 'remove') =>
    api.patch(`/community/moderation/reports/${reportId}`, { action })

// ===== Rules =====
export const listRules = (includeInactive = false) =>
    api.get<{ success: boolean; data: CommunityRule[] }>('/community/rules', { params: includeInactive ? { includeInactive: 'true' } : {} })

export const createRule = (payload: { title: string; description?: string; sortOrder?: number }) =>
    api.post('/community/rules', payload)

export const updateRule = (id: number, payload: Partial<CommunityRule>) =>
    api.put(`/community/rules/${id}`, payload)

export const deleteRule = (id: number) => api.delete(`/community/rules/${id}`)

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    spam: 'Spam',
    harassment: 'Molestie',
    inappropriate: 'Contenuto inappropriato',
    off_topic: 'Fuori tema',
    other: 'Altro'
}

export const VISIBILITY_LABELS: Record<VisibilityType, string> = {
    global: 'Tutta la community',
    my_clients: 'Solo i miei clienti',
    specific_clients: 'Clienti specifici'
}
