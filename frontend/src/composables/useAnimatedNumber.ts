/**
 * useAnimatedNumber
 * Composable per contatore animato con easing (countUp effect)
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'

interface AnimatedNumberOptions {
    duration?: number
    formatNumber?: boolean
    locale?: string
    autoStart?: boolean
}

interface AnimatedNumberReturn {
    displayValue: Ref<number>
    formattedValue: Ref<string>
    isAnimating: Ref<boolean>
    start: () => void
    reset: () => void
}

export function useAnimatedNumber(
    targetValue: Ref<number>,
    options: AnimatedNumberOptions = {}
): AnimatedNumberReturn {
    const {
        duration = 800,
        formatNumber = true,
        locale = 'it-IT',
        autoStart = true
    } = options

    const displayValue = ref<number>(0)
    const isAnimating = ref<boolean>(false)
    let animationFrame: number | null = null
    let startTime: number | null = null
    let startValue = 0

    // Easing: easeOutExpo
    const easeOutExpo = (t: number): number => {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    }

    const animate = (timestamp: number): void => {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easeOutExpo(progress)

        const current = targetValue.value
        displayValue.value = Math.round(startValue + (current - startValue) * easedProgress)

        if (progress < 1) {
            animationFrame = requestAnimationFrame(animate)
        } else {
            displayValue.value = current
            isAnimating.value = false
            startTime = null
        }
    }

    const start = (): void => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame)
        }
        startValue = displayValue.value
        isAnimating.value = true
        startTime = null
        animationFrame = requestAnimationFrame(animate)
    }

    const reset = (): void => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame)
        }
        displayValue.value = 0
        isAnimating.value = false
        startTime = null
    }

    // Watch per rianimate quando cambia il target
    watch(targetValue, (newVal: number, oldVal: number) => {
        if (newVal !== oldVal && autoStart) {
            start()
        }
    })

    // Auto-start se richiesto e il valore iniziale > 0
    if (autoStart && targetValue.value > 0) {
        start()
    }

    // Formattazione
    const formattedValue = ref<string>('')
    const formatter = new Intl.NumberFormat(locale)

    watch(displayValue, (val: number) => {
        formattedValue.value = formatNumber ? formatter.format(val) : String(val)
    }, { immediate: true })

    onUnmounted(() => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame)
        }
    })

    return {
        displayValue,
        formattedValue,
        isAnimating,
        start,
        reset
    }
}
