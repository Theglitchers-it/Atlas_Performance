<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const formData = ref({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    heightCm: '',
    initialWeightKg: '',
    fitnessLevel: 'beginner',
    primaryGoal: 'general_fitness',
    trainingLocation: 'hybrid',
    medicalNotes: '',
    notes: '',
    createAccount: false,
    password: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const errors = ref({})

const fitnessLevels = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzato' },
    { value: 'elite', label: 'Elite' }
]

const goals = [
    { value: 'weight_loss', label: 'Perdita peso' },
    { value: 'muscle_gain', label: 'Aumento massa muscolare' },
    { value: 'strength', label: 'Forza' },
    { value: 'endurance', label: 'Resistenza' },
    { value: 'flexibility', label: 'Flessibilita' },
    { value: 'general_fitness', label: 'Fitness generale' },
    { value: 'sport_specific', label: 'Sport specifico' }
]

const locations = [
    { value: 'online', label: 'Online' },
    { value: 'in_person', label: 'Di persona' },
    { value: 'hybrid', label: 'Ibrido' }
]

const validateForm = () => {
    errors.value = {}

    if (!formData.value.firstName.trim()) {
        errors.value.firstName = 'Nome obbligatorio'
    }
    if (!formData.value.lastName.trim()) {
        errors.value.lastName = 'Cognome obbligatorio'
    }
    if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
        errors.value.email = 'Email non valida'
    }
    if (formData.value.createAccount && !formData.value.password) {
        errors.value.password = 'Password obbligatoria per creare l\'account'
    }
    if (formData.value.createAccount && formData.value.password && formData.value.password.length < 8) {
        errors.value.password = 'La password deve avere almeno 8 caratteri'
    }

    return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
    if (!validateForm()) return

    isLoading.value = true
    errorMessage.value = ''

    try {
        const payload = {
            firstName: formData.value.firstName,
            lastName: formData.value.lastName,
            email: formData.value.email || null,
            phone: formData.value.phone || null,
            dateOfBirth: formData.value.dateOfBirth || null,
            gender: formData.value.gender || null,
            heightCm: formData.value.heightCm ? parseFloat(formData.value.heightCm) : null,
            initialWeightKg: formData.value.initialWeightKg ? parseFloat(formData.value.initialWeightKg) : null,
            fitnessLevel: formData.value.fitnessLevel,
            primaryGoal: formData.value.primaryGoal,
            trainingLocation: formData.value.trainingLocation,
            medicalNotes: formData.value.medicalNotes || null,
            notes: formData.value.notes || null,
            createAccount: formData.value.createAccount,
            password: formData.value.createAccount ? formData.value.password : undefined
        }

        const response = await api.post('/clients', payload)
        const clientId = response.data.data.client.id

        router.push(`/clients/${clientId}`)
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'Errore durante la creazione del cliente'
    } finally {
        isLoading.value = false
    }
}

const goBack = () => {
    router.back()
}
</script>

<template>
    <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
            <button
                @click="goBack"
                class="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Torna indietro
            </button>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Nuovo Cliente</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">Inserisci i dati del nuovo cliente</p>
        </div>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-sm text-red-800 dark:text-red-200">{{ errorMessage }}</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Personal Info -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informazioni Personali</h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                        <input
                            v-model="formData.firstName"
                            type="text"
                            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            :class="errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'"
                        />
                        <p v-if="errors.firstName" class="mt-1 text-xs text-red-500">{{ errors.firstName }}</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cognome *</label>
                        <input
                            v-model="formData.lastName"
                            type="text"
                            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            :class="errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'"
                        />
                        <p v-if="errors.lastName" class="mt-1 text-xs text-red-500">{{ errors.lastName }}</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            v-model="formData.email"
                            type="email"
                            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            :class="errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'"
                        />
                        <p v-if="errors.email" class="mt-1 text-xs text-red-500">{{ errors.email }}</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefono</label>
                        <input
                            v-model="formData.phone"
                            type="tel"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data di nascita</label>
                        <input
                            v-model="formData.dateOfBirth"
                            type="date"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genere</label>
                        <select
                            v-model="formData.gender"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">Seleziona...</option>
                            <option value="male">Maschio</option>
                            <option value="female">Femmina</option>
                            <option value="other">Altro</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Physical Info -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dati Fisici</h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Altezza (cm)</label>
                        <input
                            v-model="formData.heightCm"
                            type="number"
                            min="100"
                            max="250"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso iniziale (kg)</label>
                        <input
                            v-model="formData.initialWeightKg"
                            type="number"
                            min="30"
                            max="300"
                            step="0.1"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            <!-- Fitness Info -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profilo Fitness</h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Livello</label>
                        <select
                            v-model="formData.fitnessLevel"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option v-for="level in fitnessLevels" :key="level.value" :value="level.value">
                                {{ level.label }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Obiettivo principale</label>
                        <select
                            v-model="formData.primaryGoal"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option v-for="goal in goals" :key="goal.value" :value="goal.value">
                                {{ goal.label }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modalita allenamento</label>
                        <select
                            v-model="formData.trainingLocation"
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option v-for="loc in locations" :key="loc.value" :value="loc.value">
                                {{ loc.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note mediche</label>
                    <textarea
                        v-model="formData.medicalNotes"
                        rows="3"
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Infortuni, allergie, condizioni mediche..."
                    ></textarea>
                </div>

                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                    <textarea
                        v-model="formData.notes"
                        rows="3"
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Note aggiuntive..."
                    ></textarea>
                </div>
            </div>

            <!-- Account Creation -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Cliente</h2>

                <label class="flex items-center cursor-pointer mb-4">
                    <input
                        v-model="formData.createAccount"
                        type="checkbox"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span class="ml-2 text-gray-700 dark:text-gray-300">
                        Crea account per il cliente (potra accedere all'app)
                    </span>
                </label>

                <div v-if="formData.createAccount" class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                    <input
                        v-model="formData.password"
                        type="password"
                        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        :class="errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'"
                        placeholder="Minimo 8 caratteri"
                    />
                    <p v-if="errors.password" class="mt-1 text-xs text-red-500">{{ errors.password }}</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Il cliente usera l'email inserita sopra per accedere
                    </p>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-4">
                <button
                    type="button"
                    @click="goBack"
                    class="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    Annulla
                </button>
                <button
                    type="submit"
                    :disabled="isLoading"
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                    <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ isLoading ? 'Creazione...' : 'Crea Cliente' }}
                </button>
            </div>
        </form>
    </div>
</template>
