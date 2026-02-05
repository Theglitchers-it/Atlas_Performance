<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const errorMessage = ref('')

const isLoading = computed(() => authStore.loading)

const handleSubmit = async () => {
    errorMessage.value = ''

    if (!email.value || !password.value) {
        errorMessage.value = 'Inserisci email e password'
        return
    }

    const result = await authStore.login(email.value, password.value)

    if (result.success) {
        const redirect = route.query.redirect || '/'
        router.push(redirect)
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
                <div class="mx-auto h-16 w-16 bg-habit-orange rounded-habit flex items-center justify-center shadow-lg mb-4">
                    <svg class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h2 class="text-3xl font-bold text-white">
                    PT Fitness
                </h2>
                <p class="mt-2 text-gray-400">
                    Accedi alla tua piattaforma
                </p>
            </div>

            <!-- Login Card -->
            <div class="bg-habit-bg border border-habit-border rounded-habit shadow-xl p-8">
                <!-- Session Expired Alert -->
                <div v-if="route.query.expired" class="mb-6 p-4 bg-habit-orange/10 border border-habit-orange/30 rounded-xl">
                    <p class="text-sm text-habit-orange">
                        La tua sessione e' scaduta. Effettua nuovamente l'accesso.
                    </p>
                </div>

                <!-- Error Alert -->
                <div v-if="errorMessage" class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p class="text-sm text-red-400">
                        {{ errorMessage }}
                    </p>
                </div>

                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            v-model="email"
                            type="email"
                            autocomplete="email"
                            required
                            class="w-full px-4 py-3 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white placeholder-gray-500 transition-colors"
                            placeholder="nome@esempio.com"
                        />
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <div class="relative">
                            <input
                                id="password"
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                autocomplete="current-password"
                                required
                                class="w-full px-4 py-3 border border-habit-border rounded-xl focus:ring-2 focus:ring-habit-cyan focus:border-transparent bg-habit-bg text-white placeholder-gray-500 transition-colors pr-12"
                                placeholder="La tua password"
                            />
                            <button
                                type="button"
                                @click="showPassword = !showPassword"
                                class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-habit-cyan"
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
                    </div>

                    <!-- Remember & Forgot -->
                    <div class="flex items-center justify-between">
                        <label class="flex items-center cursor-pointer">
                            <input
                                v-model="rememberMe"
                                type="checkbox"
                                class="h-4 w-4 text-habit-cyan focus:ring-habit-cyan border-habit-border rounded bg-habit-bg"
                            />
                            <span class="ml-2 text-sm text-gray-400">
                                Ricordami
                            </span>
                        </label>
                        <router-link
                            to="/forgot-password"
                            class="text-sm font-medium text-habit-cyan hover:text-habit-orange transition-colors"
                        >
                            Password dimenticata?
                        </router-link>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="isLoading"
                        class="w-full flex justify-center items-center py-3 px-4 rounded-habit text-sm font-medium text-white bg-habit-orange hover:bg-habit-cyan focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-habit-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ isLoading ? 'Accesso in corso...' : 'Accedi' }}
                    </button>
                </form>

                <!-- Register Link -->
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-400">
                        Non hai un account?
                        <router-link
                            to="/register"
                            class="font-medium text-habit-cyan hover:text-habit-orange transition-colors"
                        >
                            Registrati gratuitamente
                        </router-link>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <p class="mt-8 text-center text-sm text-gray-500">
                &copy; 2024 PT Fitness. Tutti i diritti riservati.
            </p>
        </div>
    </div>
</template>
