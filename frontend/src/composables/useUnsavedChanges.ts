/**
 * useUnsavedChanges - Composable per avvertire l'utente
 * quando esce da un form con modifiche non salvate.
 *
 * Uso:
 *   const isDirty = ref(false)
 *   useUnsavedChanges(isDirty)
 *
 *   // Quando l'utente modifica il form:
 *   isDirty.value = true
 *
 *   // Dopo il salvataggio:
 *   isDirty.value = false
 */

import { onMounted, onUnmounted, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

interface UnsavedChangesReturn {
    markSaved: () => void
}

const UNSAVED_MESSAGE = 'Hai modifiche non salvate. Sei sicuro di voler uscire?'

export function useUnsavedChanges(isDirty: Ref<boolean>): UnsavedChangesReturn {
    // 1. Blocca chiusura tab/browser
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
        if (isDirty.value) {
            e.preventDefault()
            e.returnValue = UNSAVED_MESSAGE
            return UNSAVED_MESSAGE
        }
    }

    onMounted(() => {
        window.addEventListener('beforeunload', handleBeforeUnload)
    })

    onUnmounted(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
    })

    // 2. Blocca navigazione interna Vue Router
    onBeforeRouteLeave((_to, _from, next) => {
        if (isDirty.value) {
            const answer = window.confirm(UNSAVED_MESSAGE)
            if (!answer) {
                next(false)
                return
            }
        }
        next()
    })

    // 3. Helper per marcare come salvato
    const markSaved = (): void => {
        isDirty.value = false
    }

    return { markSaved }
}

export default useUnsavedChanges
