<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    password: '',
    confirmPassword: ''
})

const showPassword = ref(false)
const acceptTerms = ref(false)
const errorMessage = ref('')
const errors = ref({})

const isLoading = computed(() => authStore.loading)

const validateForm = () => {
    errors.value = {}

    if (!formData.value.firstName) {
        errors.value.firstName = 'Nome obbligatorio'
    }
    if (!formData.value.lastName) {
        errors.value.lastName = 'Cognome obbligatorio'
    }
    if (!formData.value.email) {
        errors.value.email = 'Email obbligatoria'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
        errors.value.email = 'Email non valida'
    }
    if (!formData.value.businessName) {
        errors.value.businessName = 'Nome attivita obbligatorio'
    }
    if (!formData.value.password) {
        errors.value.password = 'Password obbligatoria'
    } else if (formData.value.password.length < 8) {
        errors.value.password = 'La password deve avere almeno 8 caratteri'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.value.password)) {
        errors.value.password = 'La password deve contenere maiuscola, minuscola e numero'
    }
    if (formData.value.password !== formData.value.confirmPassword) {
        errors.value.confirmPassword = 'Le password non coincidono'
    }
    if (!acceptTerms.value) {
        errors.value.terms = 'Devi accettare i termini e condizioni'
    }

    return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
    errorMessage.value = ''

    if (!validateForm()) {
        return
    }

    const result = await authStore.register({
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        email: formData.value.email,
        phone: formData.value.phone,
        businessName: formData.value.businessName,
        password: formData.value.password
    })

    if (result.success) {
        router.push('/')
    } else {
        errorMessage.value = result.message
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-habit-bg py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full">
            <!-- Logo & Title -->
            <div class="text-center mb-8">
                <div class="mx-auto h-16 w-16 bg-habit-cyan rounded-habit flex items-center justify-center shadow-lg mb-4">
                    <svg class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h2 class="text-3xl font-bold text-white">
                    Crea il tuo account
                </h2>
                <p class="mt-2 text-gray-400">
                    Inizia la prova gratuita di 14 giorni
                </p>
            </div>

            <!-- Register Card -->
            <div class="bg-habit-bg border border-habit-border rounded-habit shadow-xl p-8">
                <!-- Error Alert -->
                <div v-if="errorMessage" class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p class="text-sm text-red-400">
                        {{ errorMessage }}
                    </p>
                </div>

                <form @submit.prevent="handleSubmit" class="space-y-5">
                    <!-- Name Row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="firstName" class="block text-sm font-medium text-gray-300 mb-1">
                                Nome *
                            </label>
                            <input
                                id="firstName"
                                v-model="formData.firstName"
                                type="text"
                                class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors"
                                :class="errors.firstName ? 'border-red-500' : 'border-habit-border'"
                                placeholder="Mario"
                            />
                            <p v-if="errors.firstName" class="mt-1 text-xs text-red-400">{{ errors.firstName }}</p>
                        </div>
                        <div>
                            <label for="lastName" class="block text-sm font-medium text-gray-300 mb-1">
                                Cognome *
                            </label>
                            <input
                                id="lastName"
                                v-model="formData.lastName"
                                type="text"
                                class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors"
                                :class="errors.lastName ? 'border-red-500' : 'border-habit-border'"
                                placeholder="Rossi"
                            />
                            <p v-if="errors.lastName" class="mt-1 text-xs text-red-400">{{ errors.lastName }}</p>
                        </div>
                    </div>

                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-300 mb-1">
                            Email *
                        </label>
                        <input
                            id="email"
                            v-model="formData.email"
                            type="email"
                            class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors"
                            :class="errors.email ? 'border-red-500' : 'border-habit-border'"
                            placeholder="nome@esempio.com"
                        />
                        <p v-if="errors.email" class="mt-1 text-xs text-red-400">{{ errors.email }}</p>
                    </div>

                    <!-- Phone -->
                    <div>
                        <label for="phone" class="block text-sm font-medium text-gray-300 mb-1">
                            Telefono
                        </label>
                        <input
                            id="phone"
                            v-model="formData.phone"
                            type="tel"
                            class="w-full px-4 py-2.5 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors"
                            placeholder="+39 333 1234567"
                        />
                    </div>

                    <!-- Business Name -->
                    <div>
                        <label for="businessName" class="block text-sm font-medium text-gray-300 mb-1">
                            Nome Attivita / Studio *
                        </label>
                        <input
                            id="businessName"
                            v-model="formData.businessName"
                            type="text"
                            class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors"
                            :class="errors.businessName ? 'border-red-500' : 'border-habit-border'"
                            placeholder="Fitness Studio Mario"
                        />
                        <p v-if="errors.businessName" class="mt-1 text-xs text-red-400">{{ errors.businessName }}</p>
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-300 mb-1">
                            Password *
                        </label>
                        <div class="relative">
                            <input
                                id="password"
                                v-model="formData.password"
                                :type="showPassword ? 'text' : 'password'"
                                class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors pr-12"
                                :class="errors.password ? 'border-red-500' : 'border-habit-border'"
                                placeholder="Min. 8 caratteri"
                            />
                            <button
                                type="button"
                                @click="showPassword = !showPassword"
                                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-habit-cyan"
                            >
                                <svg v-if="!showPassword" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            </button>
                        </div>
                        <p v-if="errors.password" class="mt-1 text-xs text-red-400">{{ errors.password }}</p>
                    </div>

                    <!-- Confirm Password -->
                    <div>
                        <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-1">
                            Conferma Password *
                        </label>
                        <input
                            id="confirmPassword"
                            v-model="formData.confirmPassword"
                            type="password"
                            class="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white transition-colors"
                            :class="errors.confirmPassword ? 'border-red-500' : 'border-habit-border'"
                            placeholder="Ripeti la password"
                        />
                        <p v-if="errors.confirmPassword" class="mt-1 text-xs text-red-400">{{ errors.confirmPassword }}</p>
                    </div>

                    <!-- Terms -->
                    <div>
                        <label class="flex items-start cursor-pointer">
                            <input
                                v-model="acceptTerms"
                                type="checkbox"
                                class="h-4 w-4 mt-1 text-habit-cyan focus:ring-habit-cyan border-habit-border rounded bg-habit-bg"
                            />
                            <span class="ml-2 text-sm text-gray-400">
                                Accetto i <a href="#" class="text-habit-cyan hover:text-habit-orange transition-colors">Termini di Servizio</a>
                                e la <a href="#" class="text-habit-cyan hover:text-habit-orange transition-colors">Privacy Policy</a>
                            </span>
                        </label>
                        <p v-if="errors.terms" class="mt-1 text-xs text-red-400">{{ errors.terms }}</p>
                    </div>

                    <!-- Submit -->
                    <button
                        type="submit"
                        :disabled="isLoading"
                        class="w-full flex justify-center items-center py-3 px-4 rounded-habit text-sm font-medium text-white bg-habit-cyan hover:bg-habit-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-habit-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ isLoading ? 'Registrazione...' : 'Inizia la prova gratuita' }}
                    </button>
                </form>

                <!-- Login Link -->
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-400">
                        Hai gia un account?
                        <router-link
                            to="/login"
                            class="font-medium text-habit-cyan hover:text-habit-orange transition-colors"
                        >
                            Accedi
                        </router-link>
                    </p>
                </div>
            </div>

            <!-- Features -->
            <div class="mt-8 grid grid-cols-3 gap-4 text-center">
                <div class="bg-habit-bg/50 border border-habit-border rounded-xl p-3">
                    <div class="text-2xl font-bold text-habit-orange">14</div>
                    <div class="text-xs text-gray-400">Giorni di prova</div>
                </div>
                <div class="bg-habit-bg/50 border border-habit-border rounded-xl p-3">
                    <div class="text-2xl font-bold text-habit-cyan">5</div>
                    <div class="text-xs text-gray-400">Clienti inclusi</div>
                </div>
                <div class="bg-habit-bg/50 border border-habit-border rounded-xl p-3">
                    <div class="text-2xl font-bold text-habit-success">0</div>
                    <div class="text-xs text-gray-400">Costi nascosti</div>
                </div>
            </div>
        </div>
    </div>
</template>
