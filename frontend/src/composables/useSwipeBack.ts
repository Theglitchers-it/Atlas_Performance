/**
 * useSwipeBack Composable
 * Swipe dal bordo sinistro per navigare indietro (stile iOS)
 * Attivo solo su mobile e quando route depth > 1
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNative } from './useNative'

interface UseSwipeBackReturn {
    isActive: Ref<boolean>
    progress: Ref<number>
}

export function useSwipeBack(): UseSwipeBackReturn {
    const router = useRouter()
    const route = useRoute()
    const { isMobile, hapticFeedback } = useNative()

    const isActive = ref<boolean>(false)
    const progress = ref<number>(0) // 0-1

    const EDGE_THRESHOLD = 25 // px dal bordo sinistro per iniziare
    const COMPLETE_THRESHOLD = 0.35 // % della larghezza per completare
    const VELOCITY_THRESHOLD = 0.4 // velocita per completare anche se sotto soglia

    let startX = 0
    let startY = 0
    let startTime = 0
    let tracking = false
    let isHorizontal: boolean | null = null

    const onTouchStart = (e: TouchEvent): void => {
        if (!isMobile.value) return
        // Solo dal bordo sinistro
        const touch = e.touches[0]
        if (touch.clientX > EDGE_THRESHOLD) return

        // Solo se siamo in una sotto-pagina
        const depth = route.path.split('/').filter(Boolean).length
        if (depth <= 1) return

        startX = touch.clientX
        startY = touch.clientY
        startTime = Date.now()
        tracking = true
        isHorizontal = null
    }

    const onTouchMove = (e: TouchEvent): void => {
        if (!tracking) return

        const touch = e.touches[0]
        const diffX = touch.clientX - startX
        const diffY = touch.clientY - startY

        // Determina direzione al primo movimento
        if (isHorizontal === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
            isHorizontal = Math.abs(diffX) > Math.abs(diffY) * 1.5
            if (!isHorizontal) {
                tracking = false
                return
            }
        }

        if (!isHorizontal) return

        // Solo swipe verso destra
        if (diffX > 0) {
            isActive.value = true
            progress.value = Math.min(diffX / window.innerWidth, 1)
        }
    }

    const onTouchEnd = (): void => {
        if (!tracking || !isActive.value) {
            tracking = false
            isActive.value = false
            progress.value = 0
            return
        }

        const endTime = Date.now()
        const duration = endTime - startTime
        const velocity = progress.value / (duration / 1000)

        const shouldNavigate = progress.value > COMPLETE_THRESHOLD || velocity > VELOCITY_THRESHOLD

        if (shouldNavigate) {
            hapticFeedback('light')
            router.back()
        }

        tracking = false
        isActive.value = false
        progress.value = 0
    }

    onMounted(() => {
        document.addEventListener('touchstart', onTouchStart, { passive: true })
        document.addEventListener('touchmove', onTouchMove, { passive: true })
        document.addEventListener('touchend', onTouchEnd)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('touchstart', onTouchStart)
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchEnd)
    })

    return {
        isActive,
        progress
    }
}
