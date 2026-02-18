/**
 * Exercise Store - Pinia
 * Gestione libreria esercizi
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useOfflineWorkout } from '@/composables/useOfflineWorkout'
import type { Exercise, PaginationMeta } from '@/types'

interface ActionResult {
  success: boolean
  message?: string
  id?: number
  data?: any
}

interface FetchExercisesResult extends ActionResult {
  fromCache?: boolean
}

interface FetchExerciseByIdResult extends ActionResult {
  exercise?: Exercise | null
}

interface ExerciseFilters {
  muscleGroup: string | null
  category: string | null
  difficulty: string | null
  equipment: string | null
  search: string
}

interface EquipmentOption {
  value: string
  label: string
}

interface DifficultyOption {
  value: string
  label: string
  color: string
}

export const useExerciseStore = defineStore('exercise', () => {
  // State
  const exercises = ref<Exercise[]>([])
  const muscleGroups = ref<string[]>([])
  const categories = ref<string[]>([])
  const selectedExercise = ref<Exercise | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const pagination = ref<PaginationMeta>({
    page: 1,
    limit: 200,
    total: 0,
    totalPages: 0
  })

  // Filters
  const filters = ref<ExerciseFilters>({
    muscleGroup: null,
    category: null,
    difficulty: null,
    equipment: null,
    search: ''
  })

  // Getters
  const filteredExercises = computed<Exercise[]>(() => exercises.value)
  const hasFilters = computed<boolean>(() => {
    return !!(
      filters.value.muscleGroup ||
      filters.value.category ||
      filters.value.difficulty ||
      filters.value.equipment ||
      filters.value.search
    )
  })

  // Equipment options
  const equipmentOptions: EquipmentOption[] = [
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
  const difficultyOptions: DifficultyOption[] = [
    { value: 'beginner', label: 'Principiante', color: 'habit-success' },
    { value: 'intermediate', label: 'Intermedio', color: 'habit-cyan' },
    { value: 'advanced', label: 'Avanzato', color: 'habit-orange' }
  ]

  // Actions

  /**
   * Fetch esercizi con filtri
   */
  const fetchExercises = async (options: Record<string, any> = {}): Promise<FetchExercisesResult> => {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, any> = {
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

      // Cache esercizi per accesso offline (solo prima pagina senza filtri)
      if (!hasFilters.value && params.page === 1 && exercises.value.length > 0) {
        const { cacheExercises } = useOfflineWorkout()
        cacheExercises(exercises.value)
      }

      return { success: true }
    } catch (err: any) {
      // Se offline, prova a caricare dalla cache
      if (!navigator.onLine) {
        const { loadCachedExercises } = useOfflineWorkout()
        const cached = await loadCachedExercises()
        if (cached && cached.length > 0) {
          exercises.value = cached as Exercise[]
          return { success: true, fromCache: true }
        }
      }
      error.value = err.response?.data?.message || 'Errore nel caricamento esercizi'
      return { success: false, message: error.value ?? undefined }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch gruppi muscolari
   */
  const fetchMuscleGroups = async (): Promise<ActionResult> => {
    try {
      const response = await api.get('/exercises/muscle-groups')
      muscleGroups.value = response.data.data.muscleGroups || []
      return { success: true }
    } catch (err: any) {
      console.error('Errore caricamento gruppi muscolari:', err)
      return { success: false }
    }
  }

  /**
   * Fetch categorie
   */
  const fetchCategories = async (): Promise<ActionResult> => {
    try {
      const response = await api.get('/exercises/categories')
      categories.value = response.data.data.categories || []
      return { success: true }
    } catch (err: any) {
      console.error('Errore caricamento categorie:', err)
      return { success: false }
    }
  }

  /**
   * Fetch singolo esercizio
   */
  const fetchExerciseById = async (id: number): Promise<FetchExerciseByIdResult> => {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/exercises/${id}`)
      selectedExercise.value = response.data.data.exercise
      return { success: true, exercise: selectedExercise.value }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Errore nel caricamento esercizio'
      return { success: false, message: error.value ?? undefined }
    } finally {
      loading.value = false
    }
  }

  /**
   * Imposta filtro
   */
  const setFilter = (key: keyof ExerciseFilters, value: string | null): void => {
    filters.value[key] = value as any
    pagination.value.page = 1 // Reset to first page
    fetchExercises()
  }

  /**
   * Toggle filtro (se il valore e' lo stesso, rimuovi; se diverso, imposta)
   */
  const toggleFilter = (key: keyof ExerciseFilters, value: string | null): void => {
    if (filters.value[key] === value) {
      filters.value[key] = null as any
    } else {
      filters.value[key] = value as any
    }
    pagination.value.page = 1
    fetchExercises()
  }

  /**
   * Reset filtri
   */
  const resetFilters = (): void => {
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
  const setPage = (page: number): void => {
    pagination.value.page = page
    fetchExercises({ page })
  }

  /**
   * Seleziona esercizio per modal
   */
  const selectExercise = (exercise: Exercise): void => {
    selectedExercise.value = exercise
  }

  /**
   * Deseleziona esercizio
   */
  const clearSelectedExercise = (): void => {
    selectedExercise.value = null
  }

  /**
   * Inizializza store
   */
  const initialize = async (): Promise<void> => {
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
    toggleFilter,
    resetFilters,
    setPage,
    selectExercise,
    clearSelectedExercise,
    initialize
  }
})
