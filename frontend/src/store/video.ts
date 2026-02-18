/**
 * Video Store - Pinia
 * Gestione video, corsi e progresso
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { PaginationMeta } from '@/types'

interface VideoItem {
    id: number
    title: string
    description?: string
    url: string
    thumbnail_url?: string
    video_type?: string
    duration_seconds?: number
    is_public?: boolean
    views_count?: number
    [key: string]: any
}

interface Course {
    id: number
    name: string
    description?: string
    difficulty?: string
    category?: string
    is_published?: boolean
    modules?: CourseModule[]
    [key: string]: any
}

interface CourseModule {
    id: number
    title: string
    completed?: boolean
    [key: string]: any
}

interface VideoStats {
    total_videos: number
    total_views: number
    total_courses: number
    [key: string]: any
}

interface ActionResult {
    success: boolean
    message?: string
    data?: any
}

export const useVideoStore = defineStore('video', () => {
    // State
    const videos = ref<VideoItem[]>([])
    const videosPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const courses = ref<Course[]>([])
    const coursesPagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const currentVideo = ref<VideoItem | null>(null)
    const currentCourse = ref<Course | null>(null)
    const courseProgress = ref<CourseModule[]>([])
    const stats = ref<VideoStats | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Video Actions
    const fetchVideos = async (options: { page?: number; videoType?: string; search?: string; isPublic?: boolean } = {}): Promise<void> => {
        loading.value = true
        try {
            const params: Record<string, any> = {
                page: options.page || 1,
                limit: videosPagination.value.limit,
                ...(options.videoType && { videoType: options.videoType }),
                ...(options.search && { search: options.search }),
                ...(options.isPublic !== undefined && { isPublic: options.isPublic })
            }
            const response = await api.get('/videos', { params })
            videos.value = response.data.data.videos || []
            videosPagination.value = response.data.data.pagination || videosPagination.value
        } catch (err) {
            console.error('Errore fetchVideos:', err)
            error.value = 'Errore caricamento video'
        } finally {
            loading.value = false
        }
    }

    const fetchVideoById = async (id: number): Promise<void> => {
        try {
            const response = await api.get(`/videos/${id}`)
            currentVideo.value = response.data.data.video
        } catch (err) {
            console.error('Errore fetchVideoById:', err)
        }
    }

    const createVideo = async (data: Partial<VideoItem>): Promise<ActionResult> => {
        try {
            const response = await api.post('/videos', data)
            return { success: true, data: response.data.data.video }
        } catch (err: any) {
            console.error('Errore createVideo:', err)
            return { success: false, message: err.response?.data?.message || 'Errore creazione video' }
        }
    }

    const updateVideo = async (id: number, data: Partial<VideoItem>): Promise<ActionResult> => {
        try {
            const response = await api.put(`/videos/${id}`, data)
            return { success: true, data: response.data.data.video }
        } catch (err: any) {
            console.error('Errore updateVideo:', err)
            return { success: false, message: err.response?.data?.message || 'Errore aggiornamento video' }
        }
    }

    const deleteVideo = async (id: number): Promise<ActionResult> => {
        try {
            await api.delete(`/videos/${id}`)
            return { success: true }
        } catch (err) {
            console.error('Errore deleteVideo:', err)
            return { success: false }
        }
    }

    const incrementViews = async (id: number): Promise<void> => {
        try {
            await api.post(`/videos/${id}/view`)
        } catch (err) {
            console.error('Errore incrementViews:', err)
        }
    }

    // Course Actions
    const fetchCourses = async (options: { page?: number; difficulty?: string; category?: string; search?: string; isPublished?: boolean } = {}): Promise<void> => {
        loading.value = true
        try {
            const params: Record<string, any> = {
                page: options.page || 1,
                limit: coursesPagination.value.limit,
                ...(options.difficulty && { difficulty: options.difficulty }),
                ...(options.category && { category: options.category }),
                ...(options.search && { search: options.search }),
                ...(options.isPublished !== undefined && { isPublished: options.isPublished })
            }
            const response = await api.get('/videos/courses', { params })
            courses.value = response.data.data.courses || []
            coursesPagination.value = response.data.data.pagination || coursesPagination.value
        } catch (err) {
            console.error('Errore fetchCourses:', err)
            error.value = 'Errore caricamento corsi'
        } finally {
            loading.value = false
        }
    }

    const fetchCourseById = async (id: number): Promise<void> => {
        try {
            const response = await api.get(`/videos/courses/${id}`)
            currentCourse.value = response.data.data.course
        } catch (err) {
            console.error('Errore fetchCourseById:', err)
        }
    }

    const createCourse = async (data: Partial<Course>): Promise<ActionResult> => {
        try {
            const response = await api.post('/videos/courses', data)
            return { success: true, data: response.data.data.course }
        } catch (err: any) {
            console.error('Errore createCourse:', err)
            return { success: false, message: err.response?.data?.message || 'Errore creazione corso' }
        }
    }

    const updateCourse = async (id: number, data: Partial<Course>): Promise<ActionResult> => {
        try {
            const response = await api.put(`/videos/courses/${id}`, data)
            return { success: true, data: response.data.data.course }
        } catch (err: any) {
            console.error('Errore updateCourse:', err)
            return { success: false, message: err.response?.data?.message || 'Errore aggiornamento corso' }
        }
    }

    const deleteCourse = async (id: number): Promise<ActionResult> => {
        try {
            await api.delete(`/videos/courses/${id}`)
            return { success: true }
        } catch (err) {
            console.error('Errore deleteCourse:', err)
            return { success: false }
        }
    }

    // Progress Actions
    const fetchCourseProgress = async (courseId: number): Promise<void> => {
        try {
            const response = await api.get(`/videos/courses/${courseId}/progress`)
            courseProgress.value = response.data.data.progress || []
        } catch (err) {
            console.error('Errore fetchCourseProgress:', err)
        }
    }

    const updateModuleProgress = async (courseId: number, moduleId: number, data: Record<string, any>): Promise<ActionResult> => {
        try {
            await api.put(`/videos/courses/${courseId}/modules/${moduleId}/progress`, data)
            return { success: true }
        } catch (err) {
            console.error('Errore updateModuleProgress:', err)
            return { success: false }
        }
    }

    // Stats
    const fetchStats = async (): Promise<void> => {
        try {
            const response = await api.get('/videos/stats')
            stats.value = response.data.data.stats
        } catch (err) {
            console.error('Errore fetchStats:', err)
        }
    }

    return {
        videos, videosPagination,
        courses, coursesPagination,
        currentVideo, currentCourse, courseProgress,
        stats, loading, error,
        fetchVideos, fetchVideoById, createVideo, updateVideo, deleteVideo, incrementViews,
        fetchCourses, fetchCourseById, createCourse, updateCourse, deleteCourse,
        fetchCourseProgress, updateModuleProgress,
        fetchStats
    }
})
