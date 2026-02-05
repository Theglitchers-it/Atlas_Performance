<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const clients = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')
const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
})

const totalPages = computed(() => pagination.value.totalPages)

onMounted(() => {
    loadClients()
})

watch([searchQuery, statusFilter], () => {
    pagination.value.page = 1
    loadClients()
})

const loadClients = async () => {
    isLoading.value = true
    try {
        const params = {
            page: pagination.value.page,
            limit: pagination.value.limit
        }

        if (searchQuery.value) {
            params.search = searchQuery.value
        }
        if (statusFilter.value) {
            params.status = statusFilter.value
        }

        const response = await api.get('/clients', { params })
        clients.value = response.data.data.clients || []
        pagination.value = {
            ...pagination.value,
            ...response.data.data.pagination
        }
    } catch (error) {
        console.error('Error loading clients:', error)
    } finally {
        isLoading.value = false
    }
}

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        pagination.value.page = page
        loadClients()
    }
}

const viewClient = (id) => {
    router.push(`/clients/${id}`)
}

const getStatusBadgeClass = (status) => {
    const classes = {
        active: 'bg-habit-success/20 text-habit-success',
        inactive: 'bg-gray-700 text-gray-400',
        paused: 'bg-habit-orange/20 text-habit-orange',
        cancelled: 'bg-red-500/20 text-red-400'
    }
    return classes[status] || classes.inactive
}

const getStatusLabel = (status) => {
    const labels = {
        active: 'Attivo',
        inactive: 'Inattivo',
        paused: 'In pausa',
        cancelled: 'Cancellato'
    }
    return labels[status] || status
}

const getFitnessLevelLabel = (level) => {
    const labels = {
        beginner: 'Principiante',
        intermediate: 'Intermedio',
        advanced: 'Avanzato',
        elite: 'Elite'
    }
    return labels[level] || level
}
</script>

<template>
    <div class="min-h-screen bg-habit-bg p-6 space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-white">Clienti</h1>
                <p class="text-gray-400 mt-1">
                    Gestisci i tuoi clienti
                </p>
            </div>
            <router-link
                to="/clients/new"
                class="inline-flex items-center px-4 py-2 bg-habit-orange text-white rounded-habit hover:bg-habit-cyan transition-all duration-300"
            >
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuovo Cliente
            </router-link>
        </div>

        <!-- Filters -->
        <div class="bg-habit-bg border border-habit-border rounded-habit p-4">
            <div class="flex flex-col sm:flex-row gap-4">
                <!-- Search -->
                <div class="flex-1">
                    <div class="relative">
                        <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Cerca per nome, email..."
                            class="w-full pl-10 pr-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white placeholder-gray-500"
                        />
                    </div>
                </div>

                <!-- Status Filter -->
                <div class="sm:w-48">
                    <select
                        v-model="statusFilter"
                        class="w-full px-4 py-2 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white"
                    >
                        <option value="">Tutti gli stati</option>
                        <option value="active">Attivi</option>
                        <option value="inactive">Inattivi</option>
                        <option value="paused">In pausa</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Clients Table -->
        <div class="bg-habit-bg border border-habit-border rounded-habit overflow-hidden">
            <!-- Loading -->
            <div v-if="isLoading" class="p-8">
                <div class="animate-pulse space-y-4">
                    <div v-for="i in 5" :key="i" class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-gray-700 rounded-full"></div>
                        <div class="flex-1 space-y-2">
                            <div class="h-4 bg-gray-700 rounded w-1/4"></div>
                            <div class="h-3 bg-gray-700 rounded w-1/3"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="clients.length === 0" class="p-8 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 class="text-lg font-medium text-white mb-2">
                    {{ searchQuery || statusFilter ? 'Nessun risultato' : 'Nessun cliente' }}
                </h3>
                <p class="text-gray-400 mb-4">
                    {{ searchQuery || statusFilter ? 'Prova a modificare i filtri di ricerca' : 'Inizia aggiungendo il tuo primo cliente' }}
                </p>
                <router-link
                    v-if="!searchQuery && !statusFilter"
                    to="/clients/new"
                    class="inline-flex items-center px-4 py-2 bg-habit-cyan text-white rounded-habit hover:bg-habit-orange transition-all duration-300"
                >
                    <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Aggiungi Cliente
                </router-link>
            </div>

            <!-- Table -->
            <div v-else class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-white/5">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Cliente
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                                Livello
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                                Obiettivo
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Stato
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                Streak
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Azioni
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-habit-border">
                        <tr
                            v-for="client in clients"
                            :key="client.id"
                            class="hover:bg-white/5 cursor-pointer transition-colors"
                            @click="viewClient(client.id)"
                        >
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 w-10 h-10 bg-habit-cyan/20 rounded-full flex items-center justify-center">
                                        <span class="text-habit-cyan font-medium">
                                            {{ client.first_name?.charAt(0) }}{{ client.last_name?.charAt(0) }}
                                        </span>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-white">
                                            {{ client.first_name }} {{ client.last_name }}
                                        </div>
                                        <div class="text-sm text-gray-400">
                                            {{ client.email || 'Nessuna email' }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                <span class="text-sm text-gray-300">
                                    {{ getFitnessLevelLabel(client.fitness_level) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                <span class="text-sm text-gray-300 capitalize">
                                    {{ client.primary_goal?.replace('_', ' ') || '-' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span
                                    class="px-2 py-1 text-xs rounded-full"
                                    :class="getStatusBadgeClass(client.status)"
                                >
                                    {{ getStatusLabel(client.status) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                <div class="flex items-center">
                                    <svg class="w-4 h-4 text-habit-orange mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
                                    </svg>
                                    <span class="text-sm text-white">{{ client.streak_days || 0 }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                    @click.stop="viewClient(client.id)"
                                    class="text-habit-cyan hover:text-habit-orange transition-colors"
                                >
                                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div v-if="clients.length > 0 && totalPages > 1" class="px-6 py-4 border-t border-habit-border">
                <div class="flex items-center justify-between">
                    <p class="text-sm text-gray-400">
                        Pagina {{ pagination.page }} di {{ totalPages }} ({{ pagination.total }} risultati)
                    </p>
                    <div class="flex gap-2">
                        <button
                            @click="goToPage(pagination.page - 1)"
                            :disabled="pagination.page <= 1"
                            class="px-3 py-1 border border-habit-border rounded-xl text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 hover:border-habit-cyan transition-colors"
                        >
                            Precedente
                        </button>
                        <button
                            @click="goToPage(pagination.page + 1)"
                            :disabled="pagination.page >= totalPages"
                            class="px-3 py-1 border border-habit-border rounded-xl text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 hover:border-habit-cyan transition-colors"
                        >
                            Successiva
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
