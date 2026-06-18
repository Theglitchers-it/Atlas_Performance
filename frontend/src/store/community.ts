/**
 * Community Store - Pinia
 * Gestione post, commenti e like della community
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { CommunityPost, PaginationMeta } from '@/types'

interface ActionResult {
    success: boolean
    message?: string
    id?: number
    postId?: number
}

// The API returns posts with runtime fields not present in the base type
interface CommunityPostRuntime extends CommunityPost {
    is_pinned?: boolean
    user_liked?: number
    postType?: string
}

interface CurrentPost extends CommunityPostRuntime {
    comments?: any[]
}

export const useCommunityStore = defineStore('community', () => {
    // State
    const posts = ref<CommunityPostRuntime[]>([])
    const currentPost = ref<CurrentPost | null>(null)
    const loading = ref<boolean>(false)
    const error = ref<string | null>(null)
    const pagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const filterType = ref<string>('')
    const filterFrom = ref<string>('')
    const filterAuthorId = ref<number | null>(null)
    const sortBy = ref<'recent' | 'trending'>('recent')

    // Getters
    const pinnedPosts = computed(() => posts.value.filter(p => p.is_pinned))

    // Actions
    const fetchPosts = async (page: number = 1): Promise<ActionResult> => {
        loading.value = true
        error.value = null
        try {
            const params: Record<string, any> = { page, limit: pagination.value.limit }
            if (filterType.value) params.postType = filterType.value
            if (filterFrom.value) params.from = filterFrom.value
            if (filterAuthorId.value) params.authorId = filterAuthorId.value
            if (sortBy.value && sortBy.value !== 'recent') params.sortBy = sortBy.value
            const response = await api.get('/community/posts', { params })
            posts.value = response.data.data.posts || []
            pagination.value = response.data.data.pagination || pagination.value
            return { success: true }
        } catch (err: any) {
            error.value = 'Errore nel caricamento dei post'
            console.error('Errore fetchPosts:', err)
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    const fetchPostById = async (postId: number): Promise<ActionResult> => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get(`/community/posts/${postId}`)
            currentPost.value = response.data.data.post
            return { success: true }
        } catch (err: any) {
            error.value = 'Errore nel caricamento del post'
            console.error('Errore fetchPostById:', err)
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    const createPost = async (data: Record<string, any>, imageFile: File | null = null): Promise<ActionResult> => {
        try {
            let response: any
            if (imageFile) {
                const formData = new FormData()
                formData.append('content', data.content)
                if (data.postType) formData.append('postType', data.postType)
                if (data.visibilityType) formData.append('visibilityType', data.visibilityType)
                if (Array.isArray(data.specificClientUserIds) && data.specificClientUserIds.length) {
                    formData.append('specificClientUserIds', JSON.stringify(data.specificClientUserIds))
                }
                formData.append('image', imageFile)
                response = await api.post('/community/posts', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            } else {
                response = await api.post('/community/posts', data)
            }
            await fetchPosts(1)
            return { success: true, postId: response.data.data.postId }
        } catch (err: any) {
            console.error('Errore createPost:', err)
            return { success: false, message: err.response?.data?.message || 'Errore nella creazione' }
        }
    }

    const updatePost = async (postId: number, data: Record<string, any>): Promise<ActionResult> => {
        try {
            await api.put(`/community/posts/${postId}`, data)
            await fetchPosts(pagination.value.page)
            return { success: true }
        } catch (err: any) {
            console.error('Errore updatePost:', err)
            return { success: false, message: err.response?.data?.message || 'Errore aggiornamento' }
        }
    }

    const deletePost = async (postId: number): Promise<ActionResult> => {
        try {
            await api.delete(`/community/posts/${postId}`, { headers: { 'Content-Type': 'application/json' } })
            await fetchPosts(pagination.value.page)
            return { success: true }
        } catch (err: any) {
            console.error('Errore deletePost:', err)
            return { success: false, message: err.response?.data?.message || 'Errore eliminazione' }
        }
    }

    const togglePin = async (postId: number): Promise<ActionResult> => {
        try {
            await api.put(`/community/posts/${postId}/pin`, {})
            await fetchPosts(pagination.value.page)
            return { success: true }
        } catch (err: any) {
            console.error('Errore togglePin:', err)
            return { success: false }
        }
    }

    const likePost = async (postId: number): Promise<ActionResult> => {
        try {
            await api.post(`/community/posts/${postId}/like`, {})
            // Aggiorna il post localmente
            const post = posts.value.find(p => p.id === postId)
            if (post) {
                post.likes_count = (post.likes_count || 0) + 1
                post.user_liked = 1
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.likes_count = (currentPost.value.likes_count || 0) + 1
                currentPost.value.user_liked = 1
            }
            return { success: true }
        } catch (err: any) {
            console.error('Errore likePost:', err)
            return { success: false }
        }
    }

    const unlikePost = async (postId: number): Promise<ActionResult> => {
        try {
            await api.delete(`/community/posts/${postId}/like`, { headers: { 'Content-Type': 'application/json' } })
            const post = posts.value.find(p => p.id === postId)
            if (post) {
                post.likes_count = Math.max((post.likes_count || 0) - 1, 0)
                post.user_liked = 0
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.likes_count = Math.max((currentPost.value.likes_count || 0) - 1, 0)
                currentPost.value.user_liked = 0
            }
            return { success: true }
        } catch (err: any) {
            console.error('Errore unlikePost:', err)
            return { success: false }
        }
    }

    const savePost = async (postId: number): Promise<ActionResult> => {
        try {
            await api.post(`/community/posts/${postId}/save`, {})
            const post = posts.value.find(p => p.id === postId)
            if (post) post.user_saved = 1
            return { success: true }
        } catch (err: any) {
            console.error('Errore savePost:', err)
            return { success: false }
        }
    }

    const unsavePost = async (postId: number): Promise<ActionResult> => {
        try {
            await api.delete(`/community/posts/${postId}/save`, { headers: { 'Content-Type': 'application/json' } })
            const post = posts.value.find(p => p.id === postId)
            if (post) post.user_saved = 0
            return { success: true }
        } catch (err: any) {
            console.error('Errore unsavePost:', err)
            return { success: false }
        }
    }

    const addComment = async (postId: number, data: Record<string, any>): Promise<ActionResult> => {
        try {
            await api.post(`/community/posts/${postId}/comments`, data)
            // Ricarica il post con commenti
            if (currentPost.value && currentPost.value.id === postId) {
                await fetchPostById(postId)
            }
            // Aggiorna count nella lista
            const post = posts.value.find(p => p.id === postId)
            if (post) {
                post.comments_count = (post.comments_count || 0) + 1
            }
            return { success: true }
        } catch (err: any) {
            console.error('Errore addComment:', err)
            return { success: false, message: err.response?.data?.message || 'Errore commento' }
        }
    }

    const deleteComment = async (commentId: number): Promise<ActionResult> => {
        try {
            await api.delete(`/community/comments/${commentId}`, { headers: { 'Content-Type': 'application/json' } })
            // Ricarica post corrente
            if (currentPost.value) {
                const postId = currentPost.value.id
                await fetchPostById(postId)
                const post = posts.value.find(p => p.id === postId)
                if (post) {
                    post.comments_count = Math.max((post.comments_count || 0) - 1, 0)
                }
            }
            return { success: true }
        } catch (err: any) {
            console.error('Errore deleteComment:', err)
            return { success: false }
        }
    }

    const setFilterType = (type: string): void => {
        filterType.value = type
        fetchPosts(1)
    }

    const setSortBy = (s: 'recent' | 'trending'): void => {
        sortBy.value = s
        fetchPosts(1)
    }

    const applyFilters = (payload: { postType?: string; from?: string; authorId?: number | null; sortBy?: 'recent' | 'trending' }): void => {
        if (payload.postType !== undefined) filterType.value = payload.postType
        if (payload.from !== undefined) filterFrom.value = payload.from
        if (payload.authorId !== undefined) filterAuthorId.value = payload.authorId
        if (payload.sortBy !== undefined) sortBy.value = payload.sortBy
        fetchPosts(1)
    }

    const resetFilters = (): void => {
        filterType.value = ''
        filterFrom.value = ''
        filterAuthorId.value = null
        sortBy.value = 'recent'
        fetchPosts(1)
    }

    const goToPage = (page: number): void => {
        fetchPosts(page)
    }

    const initialize = async (): Promise<void> => {
        await fetchPosts(1)
    }

    return {
        // State
        posts, currentPost, loading, error, pagination, filterType, filterFrom, filterAuthorId, sortBy,
        // Getters
        pinnedPosts,
        // Actions
        fetchPosts, fetchPostById, createPost, updatePost, deletePost,
        togglePin, likePost, unlikePost, savePost, unsavePost, addComment, deleteComment,
        setFilterType, setSortBy, applyFilters, resetFilters, goToPage, initialize
    }
})
