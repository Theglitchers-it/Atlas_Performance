/**
 * useSlowRequest
 * Mostra feedback testuale quando una chiamata API impiega piu di N secondi.
 * Si aggancia a un Ref<boolean> di loading esistente senza modificarne la logica.
 *
 * Uso:
 *   const { isSlowRequest } = useSlowRequest(loadingRef)
 *   // poi in template: <p v-if="isSlowRequest">...</p>
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'

interface SlowRequestReturn {
    isSlowRequest: Ref<boolean>
}

export function useSlowRequest(
    loading: Ref<boolean>,
    delay: number = 5000
): SlowRequestReturn {
    const isSlowRequest = ref(false)
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = (): void => {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
    }

    watch(loading, (isLoading: boolean) => {
        if (isLoading) {
            clearTimer()
            isSlowRequest.value = false
            timer = setTimeout(() => {
                isSlowRequest.value = true
            }, delay)
        } else {
            clearTimer()
            isSlowRequest.value = false
        }
    }, { immediate: true })

    onUnmounted(() => {
        clearTimer()
    })

    return {
        isSlowRequest
    }
}
