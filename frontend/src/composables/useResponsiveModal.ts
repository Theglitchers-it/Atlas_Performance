/**
 * useResponsiveModal Composable
 * Restituisce classi CSS responsive per modali:
 * - Desktop: centrata con max-w-md
 * - Mobile: full-screen slide-up con header navbar
 */

import { computed, type ComputedRef, type Ref } from 'vue'
import { useNative } from './useNative'

interface ResponsiveModalReturn {
    isMobile: Ref<boolean>
    overlayClasses: ComputedRef<string>
    backdropClasses: string
    panelClasses: ComputedRef<string>
    bodyClasses: ComputedRef<string>
    transitionName: ComputedRef<string>
}

export function useResponsiveModal(): ResponsiveModalReturn {
    const { isMobile } = useNative()

    /** Classi per il container overlay */
    const overlayClasses = computed<string>(() =>
        isMobile.value
            ? 'fixed inset-0 z-50'
            : 'fixed inset-0 z-50 flex items-center justify-center p-4'
    )

    /** Classi per il backdrop scuro */
    const backdropClasses = 'absolute inset-0 bg-black/50 backdrop-blur-sm'

    /** Classi per il pannello modale */
    const panelClasses = computed<string>(() =>
        isMobile.value
            ? 'fixed inset-0 z-50 bg-habit-card safe-top safe-bottom overflow-y-auto'
            : 'relative bg-habit-card border border-habit-border rounded-habit p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl'
    )

    /** Classi per il content body dentro la modale */
    const bodyClasses = computed<string>(() =>
        isMobile.value
            ? 'p-4 pb-8'
            : ''
    )

    /** Nome della transizione */
    const transitionName = computed<string>(() =>
        isMobile.value ? 'modal-slide-up' : 'modal-fade'
    )

    return {
        isMobile,
        overlayClasses,
        backdropClasses,
        panelClasses,
        bodyClasses,
        transitionName
    }
}
