/**
 * Theme Store - Pinia
 * Gestione tema chiaro/scuro
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
    // State
    const theme = ref(localStorage.getItem('theme') || 'light')

    // Getters
    const isDark = computed(() => theme.value === 'dark')

    // Actions
    const setTheme = (newTheme) => {
        theme.value = newTheme
        localStorage.setItem('theme', newTheme)

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const toggleTheme = () => {
        setTheme(theme.value === 'dark' ? 'light' : 'dark')
    }

    const initTheme = () => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme')

        if (savedTheme) {
            setTheme(savedTheme)
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            setTheme(prefersDark ? 'dark' : 'light')
        }
    }

    return {
        theme,
        isDark,
        setTheme,
        toggleTheme,
        initTheme
    }
})
