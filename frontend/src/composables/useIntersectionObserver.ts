/**
 * useIntersectionObserver
 * Composable per attivare animazioni/logica quando un elemento entra nel viewport
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface IntersectionObserverOptions {
    threshold?: number
    rootMargin?: string
    triggerOnce?: boolean
}

interface IntersectionObserverReturn {
    targetRef: Ref<HTMLElement | null>
    isVisible: Ref<boolean>
    hasBeenVisible: Ref<boolean>
}

export function useIntersectionObserver(
    options: IntersectionObserverOptions = {}
): IntersectionObserverReturn {
    const {
        threshold = 0.1,
        rootMargin = '0px',
        triggerOnce = true
    } = options

    const targetRef = ref<HTMLElement | null>(null)
    const isVisible = ref<boolean>(false)
    const hasBeenVisible = ref<boolean>(false)
    let observer: IntersectionObserver | null = null

    const startObserving = (): void => {
        if (!targetRef.value) return

        observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        isVisible.value = true
                        hasBeenVisible.value = true

                        if (triggerOnce && observer) {
                            observer.unobserve(entry.target)
                        }
                    } else {
                        if (!triggerOnce) {
                            isVisible.value = false
                        }
                    }
                })
            },
            { threshold, rootMargin }
        )

        observer.observe(targetRef.value)
    }

    onMounted(() => {
        startObserving()
    })

    onUnmounted(() => {
        if (observer) {
            observer.disconnect()
            observer = null
        }
    })

    return {
        targetRef,
        isVisible,
        hasBeenVisible
    }
}
