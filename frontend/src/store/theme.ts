/**
 * Theme Store - Pinia
 * Gestione tema chiaro/scuro
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

type ThemeValue = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
    // State
    const theme = ref<ThemeValue>((localStorage.getItem('theme') as ThemeValue) || 'light')

    // Getters
    const isDark = computed(() => theme.value === 'dark')

    // Actions
    const setTheme = (newTheme: ThemeValue): void => {
        theme.value = newTheme
        localStorage.setItem('theme', newTheme)

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const toggleTheme = (): void => {
        setTheme(theme.value === 'dark' ? 'light' : 'dark')
    }

    const initTheme = (): void => {
        const savedTheme = localStorage.getItem('theme') as ThemeValue | null

        if (savedTheme) {
            setTheme(savedTheme)
        } else {
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
