/**
 * Exercise Store - Pinia
 * Gestione libreria esercizi
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useExerciseStore = defineStore('exercise', () => {
    // State
    const exercises = ref([])
    const muscleGroups = ref([])
    const categories = ref([])
    const selectedExercise = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const pagination = ref({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })

    // Filters
    const filters = ref({
        muscleGroup: null,
        category: null,
        difficulty: null,
        equipment: null,
        search: ''
    })

    // Getters
    const filteredExercises = computed(() => exercises.value)
    const hasFilters = computed(() => {
        return filters.value.muscleGroup ||
               filters.value.category ||
               filters.value.difficulty ||
               filters.value.equipment ||
               filters.value.search
    })

    // Equipment options
    const equipmentOptions = [
        { value: 'barbell', label: 'Bilanciere' },
        { value: 'dumbbell', label: 'Manubri' },
        { value: 'kettlebell', label: 'Kettlebell' },
        { value: 'cable', label: 'Cavi' },
        { value: 'machine', label: 'Macchine' },
        { value: 'bodyweight', label: 'Corpo libero' },
        { value: 'resistance_band', label: 'Elastici' },
        { value: 'medicine_ball', label: 'Palla medica' },
        { value: 'trx', label: 'TRX' },
        { value: 'none', label: 'Nessuno' }
    ]

    // Difficulty options
    const difficultyOptions = [
        { value: 'beginner', label: 'Principiante', color: 'habit-success' },
        { value: 'intermediate', label: 'Intermedio', color: 'habit-cyan' },
        { value: 'advanced', label: 'Avanzato', color: 'habit-orange' }
    ]

    // Actions

    /**
     * Fetch esercizi con filtri
     */
    const fetchExercises = async (options = {}) => {
        loading.value = true
        error.value = null

        try {
            const params = {
                page: options.page || pagination.value.page,
                limit: options.limit || pagination.value.limit
            }

            if (filters.value.muscleGroup) params.muscleGroup = filters.value.muscleGroup
            if (filters.value.category) params.category = filters.value.category
            if (filters.value.difficulty) params.difficulty = filters.value.difficulty
            if (filters.value.search) params.search = filters.value.search

            const response = await api.get('/exercises', { params })

            exercises.value = response.data.data.exercises || []
            pagination.value = response.data.data.pagination || pagination.value

            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Errore nel caricamento esercizi'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    /**
     * Fetch gruppi muscolari
     */
    const fetchMuscleGroups = async () => {
        try {
            const response = await api.get('/exercises/muscle-groups')
            muscleGroups.value = response.data.data.muscleGroups || []
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento gruppi muscolari:', err)
            return { success: false }
        }
    }

    /**
     * Fetch categorie
     */
    const fetchCategories = async () => {
        try {
            const response = await api.get('/exercises/categories')
            categories.value = response.data.data.categories || []
            return { success: true }
        } catch (err) {
            console.error('Errore caricamento categorie:', err)
            return { success: false }
        }
    }

    /**
     * Fetch singolo esercizio
     */
    const fetchExerciseById = async (id) => {
        loading.value = true
        error.value = null

        try {
            const response = await api.get(`/exercises/${id}`)
            selectedExercise.value = response.data.data.exercise
            return { success: true, exercise: selectedExercise.value }
        } catch (err) {
            error.value = err.response?.data?.message || 'Errore nel caricamento esercizio'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    /**
     * Imposta filtro
     */
    const setFilter = (key, value) => {
        filters.value[key] = value
        pagination.value.page = 1 // Reset to first page
        fetchExercises()
    }

    /**
     * Reset filtri
     */
    const resetFilters = () => {
        filters.value = {
            muscleGroup: null,
            category: null,
            difficulty: null,
            equipment: null,
            search: ''
        }
        pagination.value.page = 1
        fetchExercises()
    }

    /**
     * Cambia pagina
     */
    const setPage = (page) => {
        pagination.value.page = page
        fetchExercises({ page })
    }

    /**
     * Seleziona esercizio per modal
     */
    const selectExercise = (exercise) => {
        selectedExercise.value = exercise
    }

    /**
     * Deseleziona esercizio
     */
    const clearSelectedExercise = () => {
        selectedExercise.value = null
    }

    /**
     * Inizializza store
     */
    const initialize = async () => {
        await Promise.all([
            fetchMuscleGroups(),
            fetchCategories(),
            fetchExercises()
        ])
    }

    return {
        // State
        exercises,
        muscleGroups,
        categories,
        selectedExercise,
        loading,
        error,
        pagination,
        filters,
        // Getters
        filteredExercises,
        hasFilters,
        equipmentOptions,
        difficultyOptions,
        // Actions
        fetchExercises,
        fetchMuscleGroups,
        fetchCategories,
        fetchExerciseById,
        setFilter,
        resetFilters,
        setPage,
        selectExercise,
        clearSelectedExercise,
        initialize
    }
})
