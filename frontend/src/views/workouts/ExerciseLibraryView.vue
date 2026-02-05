<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useExerciseStore } from '@/store/exercise'
import ExerciseCard from '@/components/workouts/ExerciseCard.vue'
import ExerciseModal from '@/components/workouts/ExerciseModal.vue'

const exerciseStore = useExerciseStore()

// Local state
const showModal = ref(false)
const searchDebounce = ref(null)

// Computed
const exercises = computed(() => exerciseStore.exercises)
const muscleGroups = computed(() => exerciseStore.muscleGroups)
const loading = computed(() => exerciseStore.loading)
const filters = computed(() => exerciseStore.filters)
const pagination = computed(() => exerciseStore.pagination)
const selectedExercise = computed(() => exerciseStore.selectedExercise)
const hasFilters = computed(() => exerciseStore.hasFilters)

// Initialize
onMounted(async () => {
    await exerciseStore.initialize()
})

// Handle card click
const handleExerciseClick = (exercise) => {
    exerciseStore.selectExercise(exercise)
    showModal.value = true
}

// Close modal
const handleCloseModal = () => {
    showModal.value = false
    exerciseStore.clearSelectedExercise()
}

// Handle exercise selection from modal
const handleSelectExercise = (exercise) => {
    // Could emit event or navigate to workout builder
    console.log('Exercise selected:', exercise)
    handleCloseModal()
}

// Filter handlers
const handleMuscleGroupChange = (e) => {
    const value = e.target.value
    exerciseStore.setFilter('muscleGroup', value ? parseInt(value) : null)
}

const handleDifficultyChange = (e) => {
    const value = e.target.value
    exerciseStore.setFilter('difficulty', value || null)
}

const handleCategoryChange = (e) => {
    const value = e.target.value
    exerciseStore.setFilter('category', value || null)
}

// Search with debounce
const handleSearch = (e) => {
    const value = e.target.value
    if (searchDebounce.value) {
        clearTimeout(searchDebounce.value)
    }
    searchDebounce.value = setTimeout(() => {
        exerciseStore.setFilter('search', value)
    }, 300)
}

// Reset filters
const handleResetFilters = () => {
    exerciseStore.resetFilters()
}

// Pagination
const handlePrevPage = () => {
    if (pagination.value.page > 1) {
        exerciseStore.setPage(pagination.value.page - 1)
    }
}

const handleNextPage = () => {
    if (pagination.value.page < pagination.value.totalPages) {
        exerciseStore.setPage(pagination.value.page + 1)
    }
}

// Group muscle groups by category
const muscleGroupsByCategory = computed(() => {
    const groups = {}
    muscleGroups.value.forEach(mg => {
        const cat = mg.category || 'other'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(mg)
    })
    return groups
})

const categoryLabels = {
    push: 'Push',
    pull: 'Pull',
    legs: 'Gambe',
    core: 'Core',
    other: 'Altro'
}
</script>

<template>
    <div class="min-h-screen bg-habit-bg p-6 space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-white">
                    Libreria Esercizi
                </h1>
                <p class="text-gray-400 mt-1">
                    {{ pagination.total }} esercizi disponibili
                </p>
            </div>
            <router-link
                to="/workouts/builder"
                class="inline-flex items-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300"
            >
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Crea Scheda
            </router-link>
        </div>

        <!-- Filters Bar -->
        <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
            <div class="flex flex-col lg:flex-row gap-4">
                <!-- Search -->
                <div class="flex-1">
                    <div class="relative">
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cerca esercizio..."
                            :value="filters.search"
                            @input="handleSearch"
                            class="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-habit-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-habit-cyan transition-colors"
                        />
                    </div>
                </div>

                <!-- Muscle Group Filter -->
                <div class="w-full lg:w-48">
                    <select
                        :value="filters.muscleGroup || ''"
                        @change="handleMuscleGroupChange"
                        class="w-full px-4 py-2.5 bg-gray-800 border border-habit-border rounded-xl text-white focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
                    >
                        <option value="">Tutti i muscoli</option>
                        <optgroup
                            v-for="(muscles, category) in muscleGroupsByCategory"
                            :key="category"
                            :label="categoryLabels[category] || category"
                        >
                            <option
                                v-for="mg in muscles"
                                :key="mg.id"
                                :value="mg.id"
                            >
                                {{ mg.name_it || mg.name }}
                            </option>
                        </optgroup>
                    </select>
                </div>

                <!-- Difficulty Filter -->
                <div class="w-full lg:w-40">
                    <select
                        :value="filters.difficulty || ''"
                        @change="handleDifficultyChange"
                        class="w-full px-4 py-2.5 bg-gray-800 border border-habit-border rounded-xl text-white focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
                    >
                        <option value="">Difficolta</option>
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzato</option>
                    </select>
                </div>

                <!-- Category Filter -->
                <div class="w-full lg:w-40">
                    <select
                        :value="filters.category || ''"
                        @change="handleCategoryChange"
                        class="w-full px-4 py-2.5 bg-gray-800 border border-habit-border rounded-xl text-white focus:outline-none focus:border-habit-cyan transition-colors appearance-none cursor-pointer"
                    >
                        <option value="">Categoria</option>
                        <option value="strength">Forza</option>
                        <option value="cardio">Cardio</option>
                        <option value="flexibility">Flessibilita</option>
                        <option value="plyometric">Pliometrico</option>
                        <option value="compound">Composto</option>
                        <option value="isolation">Isolamento</option>
                    </select>
                </div>

                <!-- Reset button -->
                <button
                    v-if="hasFilters"
                    @click="handleResetFilters"
                    class="px-4 py-2.5 text-habit-cyan hover:text-habit-orange transition-colors flex items-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reset
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
                v-for="i in 8"
                :key="i"
                class="bg-habit-bg border border-habit-border rounded-habit p-4 animate-pulse"
            >
                <div class="aspect-video rounded-xl bg-gray-700 mb-4"></div>
                <div class="space-y-3">
                    <div class="h-5 bg-gray-700 rounded w-3/4"></div>
                    <div class="flex gap-2">
                        <div class="h-6 bg-gray-700 rounded-full w-20"></div>
                        <div class="h-6 bg-gray-700 rounded-full w-16"></div>
                    </div>
                    <div class="flex justify-between">
                        <div class="h-4 bg-gray-700 rounded w-16"></div>
                        <div class="h-4 bg-gray-700 rounded w-20"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-else-if="exercises.length === 0"
            class="bg-habit-bg border border-habit-border rounded-habit p-12 text-center"
        >
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">Nessun esercizio trovato</h3>
            <p class="text-gray-400 mb-4">
                {{ hasFilters ? 'Prova a modificare i filtri di ricerca' : 'Non ci sono esercizi nella libreria' }}
            </p>
            <button
                v-if="hasFilters"
                @click="handleResetFilters"
                class="inline-flex items-center px-4 py-2 text-habit-cyan hover:text-habit-orange transition-colors"
            >
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset filtri
            </button>
        </div>

        <!-- Exercise Grid -->
        <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            <ExerciseCard
                v-for="exercise in exercises"
                :key="exercise.id"
                :exercise="exercise"
                @click="handleExerciseClick"
            />
        </div>

        <!-- Pagination -->
        <div
            v-if="!loading && pagination.totalPages > 1"
            class="flex items-center justify-between bg-habit-bg border border-habit-border rounded-habit p-4"
        >
            <p class="text-sm text-gray-400">
                Pagina {{ pagination.page }} di {{ pagination.totalPages }}
                <span class="hidden sm:inline">
                    ({{ exercises.length }} di {{ pagination.total }} esercizi)
                </span>
            </p>

            <div class="flex gap-2">
                <button
                    @click="handlePrevPage"
                    :disabled="pagination.page <= 1"
                    class="px-4 py-2 rounded-xl border border-habit-border text-gray-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    @click="handleNextPage"
                    :disabled="pagination.page >= pagination.totalPages"
                    class="px-4 py-2 rounded-xl border border-habit-border text-gray-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Exercise Modal -->
        <ExerciseModal
            :exercise="selectedExercise"
            :show="showModal"
            @close="handleCloseModal"
            @select="handleSelectExercise"
        />
    </div>
</template>
