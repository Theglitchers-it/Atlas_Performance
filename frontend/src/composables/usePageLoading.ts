/**
 * usePageLoading Composable
 * Global loading state for route transitions
 * Shows a top progress bar during lazy-loaded route navigation
 */

import { ref, type Ref } from 'vue'

interface PageLoadingReturn {
    isLoading: Ref<boolean>
    startLoading: () => void
    stopLoading: () => void
}

const isLoading = ref<boolean>(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function usePageLoading(): PageLoadingReturn {
    const startLoading = (): void => {
        // Small delay to avoid flash on fast navigations
        timer = setTimeout(() => {
            isLoading.value = true
        }, 150)
    }

    const stopLoading = (): void => {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        isLoading.value = false
    }

    return {
        isLoading,
        startLoading,
        stopLoading
    }
}
