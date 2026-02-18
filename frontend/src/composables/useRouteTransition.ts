/**
 * useRouteTransition Composable
 * Gestisce la direzione delle transizioni di pagina (stile iOS)
 * Forward = slide da destra, Back = slide da sinistra
 * Su desktop mantiene il fade classico
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useRouter, type RouteLocationNormalized } from 'vue-router'
import { useNative } from './useNative'

type TransitionDirection = 'forward' | 'back'

interface RouteTransitionReturn {
    transitionName: ComputedRef<string>
    transitionDirection: Ref<TransitionDirection>
}

const transitionDirection = ref<TransitionDirection>('forward')
const previousDepth = ref<number>(0)

export function useRouteTransition(): RouteTransitionReturn {
    const router = useRouter()
    const { isMobile } = useNative()

    // Calcola la profondità di un percorso (numero di segmenti)
    const getRouteDepth = (path: string): number => {
        return path.split('/').filter(Boolean).length
    }

    // Intercetta navigazione per determinare la direzione
    router.afterEach((to: RouteLocationNormalized, from: RouteLocationNormalized) => {
        const toDepth = getRouteDepth(to.path)
        const fromDepth = getRouteDepth(from.path)

        if (toDepth > fromDepth) {
            transitionDirection.value = 'forward'
        } else if (toDepth < fromDepth) {
            transitionDirection.value = 'back'
        } else {
            // Stessa profondità — usa ordine nell'URL per decidere
            transitionDirection.value = to.path > from.path ? 'forward' : 'back'
        }

        previousDepth.value = fromDepth
    })

    // Nome della transizione basata su piattaforma e direzione
    const transitionName = computed<string>(() => {
        if (!isMobile.value) return 'page-fade'
        return transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-back'
    })

    return {
        transitionName,
        transitionDirection
    }
}
