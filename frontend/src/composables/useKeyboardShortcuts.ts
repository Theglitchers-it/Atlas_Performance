/**
 * useKeyboardShortcuts - Composable per keyboard shortcuts globali e per-view
 *
 * Uso globale (in App.vue):
 *   const { showHelp, toggleHelp } = useKeyboardShortcuts()
 *
 * Uso per-view (in qualsiasi view):
 *   import { useViewShortcuts } from '@/composables/useKeyboardShortcuts'
 *   useViewShortcuts({ n: () => router.push('/clients/new') })
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

// Stato condiviso per l'overlay help
const showHelp = ref<boolean>(false)

type ShortcutMap = Record<string, () => void>

interface KeyboardShortcutsReturn {
    showHelp: Ref<boolean>
    toggleHelp: () => void
}

/**
 * Controlla se il focus e' su un elemento di input
 */
function isInputFocused(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if ((el as HTMLElement).isContentEditable) return true
    return false
}

/**
 * Composable principale — shortcuts globali.
 * Chiamare UNA volta in App.vue.
 */
export function useKeyboardShortcuts(): KeyboardShortcutsReturn {
    const handleGlobalKeydown = (e: KeyboardEvent): void => {
        // Non intercettare se ci sono modificatori (Ctrl, Alt, Meta)
        if (e.ctrlKey || e.altKey || e.metaKey) return

        const key = e.key

        // Escape — chiude overlay help (sempre attivo)
        if (key === 'Escape') {
            if (showHelp.value) {
                showHelp.value = false
                e.preventDefault()
            }
            return
        }

        // Non intercettare se in un input (tranne Escape sopra)
        if (isInputFocused()) return

        // / — focus sulla barra ricerca
        if (key === '/') {
            e.preventDefault()
            const searchInput = document.querySelector<HTMLElement>('[data-search-input]')
            if (searchInput) {
                searchInput.focus()
            }
            return
        }

        // ? — mostra overlay shortcuts
        if (key === '?') {
            e.preventDefault()
            showHelp.value = !showHelp.value
            return
        }
    }

    onMounted(() => {
        document.addEventListener('keydown', handleGlobalKeydown)
    })

    onUnmounted(() => {
        document.removeEventListener('keydown', handleGlobalKeydown)
    })

    const toggleHelp = (): void => {
        showHelp.value = !showHelp.value
    }

    return {
        showHelp,
        toggleHelp
    }
}

/**
 * Composable per shortcuts specifici di una view.
 * Le view chiamano questo per registrare shortcuts attivi solo
 * finche' la view e' montata.
 *
 * @param shortcuts - Mappa { key: callback }
 *   Es: { n: () => router.push('/clients/new') }
 */
export function useViewShortcuts(shortcuts: ShortcutMap = {}): void {
    const handleKeydown = (e: KeyboardEvent): void => {
        if (e.ctrlKey || e.altKey || e.metaKey) return
        if (isInputFocused()) return
        if (showHelp.value) return

        const key = e.key.toLowerCase()
        if (shortcuts[key]) {
            e.preventDefault()
            shortcuts[key]()
        }
    }

    onMounted(() => {
        document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeydown)
    })
}

export default useKeyboardShortcuts
