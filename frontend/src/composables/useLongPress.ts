/**
 * useLongPress Composable
 * Rileva un tocco prolungato (500ms+) su un elemento
 * Ritorna un set di event handlers da applicare all'elemento
 */

import { ref, type Ref } from 'vue'
import { useNative } from './useNative'

interface LongPressOptions {
    duration?: number
}

type TouchOrMouseEvent = TouchEvent | MouseEvent

interface LongPressHandlers {
    onTouchstart: (e: TouchEvent) => void
    onTouchmove: (e: TouchEvent) => void
    onTouchend: () => void
    onTouchcancel: () => void
}

interface LongPressReturn {
    isLongPressing: Ref<boolean>
    handlers: LongPressHandlers
}

export function useLongPress(
    callback: ((e: TouchOrMouseEvent) => void) | null | undefined,
    options: LongPressOptions = {}
): LongPressReturn {
    const { duration = 500 } = options
    const { hapticFeedback, isMobile } = useNative()

    const isLongPressing = ref<boolean>(false)
    let timer: ReturnType<typeof setTimeout> | null = null
    let startX = 0
    let startY = 0
    let moved = false

    const start = (e: TouchEvent): void => {
        if (!isMobile.value) return

        const touch = e.touches?.[0] ?? (e as unknown as MouseEvent)
        startX = touch.clientX
        startY = touch.clientY
        moved = false

        timer = setTimeout(() => {
            if (!moved) {
                isLongPressing.value = true
                hapticFeedback('medium')
                if (callback) callback(e)
            }
        }, duration)
    }

    const move = (e: TouchEvent): void => {
        if (!timer) return
        const touch = e.touches?.[0] ?? (e as unknown as MouseEvent)
        const diffX = Math.abs(touch.clientX - startX)
        const diffY = Math.abs(touch.clientY - startY)

        // Se l'utente si muove troppo, annulla il long press
        if (diffX > 10 || diffY > 10) {
            moved = true
            cancel()
        }
    }

    const cancel = (): void => {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        isLongPressing.value = false
    }

    // Event handlers da spread sull'elemento
    const handlers: LongPressHandlers = {
        onTouchstart: start,
        onTouchmove: move,
        onTouchend: cancel,
        onTouchcancel: cancel
    }

    return {
        isLongPressing,
        handlers
    }
}
