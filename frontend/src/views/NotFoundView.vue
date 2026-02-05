<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
    router.back()
}

const goHome = () => {
    router.push('/')
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div class="text-center">
            <h1 class="text-9xl font-bold text-blue-600 dark:text-blue-400">404</h1>
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                Pagina non trovata
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
                La pagina che stai cercando non esiste o e' stata spostata.
            </p>
            <div class="mt-8 flex justify-center gap-4">
                <button
                    @click="goBack"
                    class="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    Torna indietro
                </button>
                <button
                    @click="goHome"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Vai alla home
                </button>
            </div>
        </div>
    </div>
</template>
