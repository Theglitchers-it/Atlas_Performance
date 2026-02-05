<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/store/auth'
import api from '@/services/api'

const authStore = useAuthStore()

const stats = ref({
    totalClients: 0,
    activeClients: 0,
    todayWorkouts: 0,
    weekWorkouts: 0
})

const recentClients = ref([])
const todayAppointments = ref([])
const alerts = ref([])
const isLoading = ref(true)

const userName = computed(() => authStore.user?.firstName || 'Trainer')
const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buongiorno'
    if (hour < 18) return 'Buon pomeriggio'
    return 'Buonasera'
})

onMounted(async () => {
    await loadDashboardData()
})

const loadDashboardData = async () => {
    isLoading.value = true
    try {
        // Load clients
        const clientsRes = await api.get('/clients', { params: { limit: 5 } })
        recentClients.value = clientsRes.data.data.clients || []
        stats.value.totalClients = clientsRes.data.data.pagination?.total || 0
        stats.value.activeClients = recentClients.value.filter(c => c.status === 'active').length

        // Load appointments (if available)
        try {
            const appointmentsRes = await api.get('/booking/today')
            todayAppointments.value = appointmentsRes.data.data?.appointments || []
        } catch (e) {
            todayAppointments.value = []
        }

        // Load alerts (if available)
        try {
            const alertsRes = await api.get('/notifications', { params: { limit: 5 } })
            alerts.value = alertsRes.data.data?.notifications || []
        } catch (e) {
            alerts.value = []
        }
    } catch (error) {
        console.error('Error loading dashboard:', error)
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen bg-habit-bg p-6 space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-white">
                    {{ greeting }}, {{ userName }}!
                </h1>
                <p class="text-gray-400 mt-1">
                    Ecco un riepilogo della tua attivita
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

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-400">Clienti Totali</p>
                        <p class="text-3xl font-bold text-white mt-1">{{ stats.totalClients }}</p>
                    </div>
                    <div class="w-12 h-12 bg-habit-cyan/20 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-habit-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-400">Clienti Attivi</p>
                        <p class="text-3xl font-bold text-habit-success mt-1">{{ stats.activeClients }}</p>
                    </div>
                    <div class="w-12 h-12 bg-habit-success/20 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-habit-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-400">Appuntamenti Oggi</p>
                        <p class="text-3xl font-bold text-habit-cyan mt-1">{{ todayAppointments.length }}</p>
                    </div>
                    <div class="w-12 h-12 bg-habit-cyan/20 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-habit-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-400">Notifiche</p>
                        <p class="text-3xl font-bold text-habit-orange mt-1">{{ alerts.length }}</p>
                    </div>
                    <div class="w-12 h-12 bg-habit-orange/20 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6 text-habit-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid lg:grid-cols-3 gap-6">
            <!-- Recent Clients -->
            <div class="lg:col-span-2 bg-habit-bg border border-habit-border rounded-habit">
                <div class="p-6 border-b border-habit-border flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-white">Clienti Recenti</h2>
                    <router-link to="/clients" class="text-sm text-habit-cyan hover:text-habit-orange transition-colors">
                        Vedi tutti
                    </router-link>
                </div>
                <div v-if="isLoading" class="p-6">
                    <div class="animate-pulse space-y-4">
                        <div v-for="i in 3" :key="i" class="flex items-center space-x-4">
                            <div class="w-10 h-10 bg-gray-700 rounded-full"></div>
                            <div class="flex-1 space-y-2">
                                <div class="h-4 bg-gray-700 rounded w-1/3"></div>
                                <div class="h-3 bg-gray-700 rounded w-1/4"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else-if="recentClients.length === 0" class="p-6 text-center text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>Nessun cliente ancora</p>
                    <router-link to="/clients/new" class="mt-2 inline-block text-habit-cyan hover:text-habit-orange transition-colors">
                        Aggiungi il primo cliente
                    </router-link>
                </div>
                <ul v-else class="divide-y divide-habit-border">
                    <li v-for="client in recentClients" :key="client.id" class="p-4 hover:bg-white/5 transition-colors">
                        <router-link :to="`/clients/${client.id}`" class="flex items-center space-x-4">
                            <div class="flex-shrink-0 w-10 h-10 bg-habit-cyan/20 rounded-full flex items-center justify-center">
                                <span class="text-habit-cyan font-medium">
                                    {{ client.first_name?.charAt(0) }}{{ client.last_name?.charAt(0) }}
                                </span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-white truncate">
                                    {{ client.first_name }} {{ client.last_name }}
                                </p>
                                <p class="text-sm text-gray-400 truncate">
                                    {{ client.email || 'Nessuna email' }}
                                </p>
                            </div>
                            <div class="flex-shrink-0">
                                <span
                                    class="px-2 py-1 text-xs rounded-full"
                                    :class="{
                                        'bg-habit-success/20 text-habit-success': client.status === 'active',
                                        'bg-gray-700 text-gray-400': client.status !== 'active'
                                    }"
                                >
                                    {{ client.status === 'active' ? 'Attivo' : 'Inattivo' }}
                                </span>
                            </div>
                        </router-link>
                    </li>
                </ul>
            </div>

            <!-- Quick Actions -->
            <div class="bg-habit-bg border border-habit-border rounded-habit p-6">
                <h2 class="text-lg font-semibold text-white mb-4">Azioni Rapide</h2>
                <div class="space-y-3">
                    <router-link
                        to="/clients/new"
                        class="flex items-center p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-habit-border"
                    >
                        <div class="w-10 h-10 bg-habit-cyan/20 rounded-xl flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-habit-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <span class="text-gray-300">Aggiungi Cliente</span>
                    </router-link>

                    <router-link
                        to="/workouts/builder"
                        class="flex items-center p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-habit-border"
                    >
                        <div class="w-10 h-10 bg-habit-success/20 rounded-xl flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-habit-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <span class="text-gray-300">Crea Scheda</span>
                    </router-link>

                    <router-link
                        to="/calendar"
                        class="flex items-center p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-habit-border"
                    >
                        <div class="w-10 h-10 bg-habit-cyan/20 rounded-xl flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-habit-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span class="text-gray-300">Calendario</span>
                    </router-link>

                    <router-link
                        to="/chat"
                        class="flex items-center p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-habit-border"
                    >
                        <div class="w-10 h-10 bg-habit-orange/20 rounded-xl flex items-center justify-center mr-3">
                            <svg class="w-5 h-5 text-habit-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <span class="text-gray-300">Messaggi</span>
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>
