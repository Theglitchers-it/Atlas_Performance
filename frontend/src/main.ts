/**
 * Atlas - Frontend Entry Point (TypeScript)
 * Vue.js 3 + Pinia + Vue Router
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import tooltipDirective from './directives/tooltip'

// Styles
import './assets/main.css'

// Cleanup legacy: rimuovi token da localStorage (migrazione a httpOnly cookies)
localStorage.removeItem('token')
localStorage.removeItem('refreshToken')

// Create app
const app = createApp(App)

// Pinia store
const pinia = createPinia()
app.use(pinia)

// Router
app.use(router)

// Global directives
app.directive('tooltip', tooltipDirective)

// Toast notifications
app.use(Toast, {
    position: 'top-right',
    timeout: 3000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: 'button',
    icon: true,
    rtl: false,
    transition: 'Vue-Toastification__slide',
    maxToasts: 5,
    newestOnTop: true,
    accessibility: {
        toastRole: 'alert',
        closeButtonLabel: 'Chiudi notifica'
    }
})

// Global error handler — log + user notification
app.config.errorHandler = (err, instance, info) => {
    if (import.meta.env.DEV) {
        console.error('[Atlas] Unhandled error:', err)
        console.error('[Atlas] Component:', instance)
        console.error('[Atlas] Info:', info)
    }
    try {
        const toast = useToast()
        toast.error('Si e\' verificato un errore imprevisto. Riprova.', { timeout: 5000 })
    } catch {
        // Toast non ancora inizializzato — ignora silenziosamente
    }
}

// Mount
app.mount('#app')

// Service Worker Registration (PWA) — gestita da vite-plugin-pwa
// Il plugin genera sw.js e manifest.webmanifest solo in build mode.
// In dev mode, registerSW() è un no-op che non causa errori.
import { registerSW } from 'virtual:pwa-register'

registerSW({
    onRegisteredSW(swScriptUrl: string, _registration: ServiceWorkerRegistration | undefined) {
        if (import.meta.env.DEV) console.log('[SW] Registrato con successo, script:', swScriptUrl)
    },
    onOfflineReady() {
        if (import.meta.env.DEV) console.log('[SW] App pronta per uso offline')
    }
})

// PWA Install Prompt
let deferredPrompt: any = null
window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
    window.dispatchEvent(new CustomEvent('pwa-install-available'))
})

window.pwaInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    return outcome === 'accepted'
}

window.pwaCanInstall = (): boolean => !!deferredPrompt

// Offline detection
window.addEventListener('online', () => {
    window.dispatchEvent(new CustomEvent('app-online'))
})
window.addEventListener('offline', () => {
    window.dispatchEvent(new CustomEvent('app-offline'))
})
