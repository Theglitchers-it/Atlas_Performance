/**
 * useLazyImage Composable
 * Lazy loading di immagini con IntersectionObserver
 * L'immagine viene caricata solo quando entra nel viewport
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

// Tiny 1x1 transparent GIF placeholder
const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface LazyImageOptions {
    rootMargin?: string
    threshold?: number
}

interface LazyImageReturn {
    imgRef: Ref<HTMLElement | null>
    currentSrc: Ref<string>
    loaded: Ref<boolean>
    PLACEHOLDER: string
}

export function useLazyImage(
    src: string | Ref<string> | null | undefined,
    options: LazyImageOptions = {}
): LazyImageReturn {
    const { rootMargin = '200px', threshold = 0 } = options

    const imgRef = ref<HTMLElement | null>(null)
    const loaded = ref<boolean>(false)
    const currentSrc = ref<string>(PLACEHOLDER)

    let observer: IntersectionObserver | null = null

    const loadImage = (): void => {
        if (!src) return
        const actualSrc: string | undefined =
            typeof src === 'object' && src !== null && 'value' in src
                ? (src as Ref<string>).value
                : (src as string)

        if (!actualSrc || actualSrc === PLACEHOLDER) return

        const img = new Image()
        img.onload = () => {
            currentSrc.value = actualSrc
            loaded.value = true
        }
        img.onerror = () => {
            // Mantieni placeholder su errore
            loaded.value = false
        }
        img.src = actualSrc
    }

    onMounted(() => {
        if (!imgRef.value) return

        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(
                (entries: IntersectionObserverEntry[]) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            loadImage()
                            observer?.disconnect()
                        }
                    })
                },
                { rootMargin, threshold }
            )
            observer.observe(imgRef.value)
        } else {
            // Fallback: carica subito se IntersectionObserver non è supportato
            loadImage()
        }
    })

    onBeforeUnmount(() => {
        observer?.disconnect()
    })

    return {
        imgRef,
        currentSrc,
        loaded,
        PLACEHOLDER
    }
}
