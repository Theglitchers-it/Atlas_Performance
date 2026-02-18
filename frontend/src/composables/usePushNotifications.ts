/**
 * usePushNotifications Composable
 * Gestisce registrazione e ricezione push notifications native (Capacitor)
 * Complementare al sistema Web Push gia esistente per il browser
 *
 * Nota: NON usa useRouter()/useNative() al top-level perche puo essere
 * chiamato da contesti dove non c'e setup Vue attivo.
 * Accede al router via import diretto.
 */

import { ref, type Ref } from 'vue'
import api from '@/services/api'
import router from '@/router'

const permissionGranted = ref<boolean>(false)
const fcmToken = ref<string | null>(null)

// Helper per rilevare piattaforma nativa senza useNative (evita onMounted)
const isNative = (): boolean => {
    try {
        return window.Capacitor?.isNativePlatform() || false
    } catch {
        return false
    }
}

const getPlatform = (): string => {
    try {
        return window.Capacitor?.getPlatform() || 'web'
    } catch {
        return 'web'
    }
}

interface UsePushNotificationsReturn {
    register: () => Promise<boolean>
    unregister: () => Promise<void>
    permissionGranted: Ref<boolean>
    fcmToken: Ref<string | null>
}

export function usePushNotifications(): UsePushNotificationsReturn {
    /**
     * Registra per push notifications native
     * Chiama PushNotifications API di Capacitor e invia il token FCM al backend
     */
    const register = async (): Promise<boolean> => {
        if (!isNative()) return false

        try {
            const { PushNotifications } = await import('@capacitor/push-notifications')

            // Richiedi permesso all'utente
            const permission = await PushNotifications.requestPermissions()
            if (permission.receive !== 'granted') {
                console.log('[PUSH] Permesso negato dall\'utente')
                return false
            }
            permissionGranted.value = true

            // Registra con il servizio push dell'OS (FCM su Android, APNs su iOS)
            await PushNotifications.register()

            // Ascolta il token di registrazione
            PushNotifications.addListener('registration', async (token: { value: string }) => {
                console.log('[PUSH] Token registrato:', token.value.substring(0, 20) + '...')
                fcmToken.value = token.value

                // Invia il token al backend per salvarlo nel database
                try {
                    await api.post('/notifications/device-token', {
                        token: token.value,
                        platform: getPlatform(), // 'android' o 'ios'
                        deviceInfo: JSON.stringify({
                            platform: getPlatform(),
                            timestamp: new Date().toISOString()
                        })
                    })
                    console.log('[PUSH] Token inviato al backend')
                } catch (err) {
                    console.error('[PUSH] Errore invio token al backend:', (err as Error).message)
                }
            })

            // Errore durante la registrazione
            PushNotifications.addListener('registrationError', (error: any) => {
                console.error('[PUSH] Errore registrazione:', error)
            })

            // Notifica ricevuta mentre l'app e in foreground
            PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
                console.log('[PUSH] Notifica ricevuta in foreground:', notification.title)
                // Dispatch evento per aggiornare il badge notifiche in-app
                window.dispatchEvent(new CustomEvent('push-notification-received', {
                    detail: notification
                }))
            })

            // Utente ha tappato su una notifica push
            PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
                console.log('[PUSH] Azione su notifica:', action)
                const url: string | undefined = action.notification.data?.url
                if (url && url !== '/' && typeof url === 'string' && url.startsWith('/') && !url.includes('//')) {
                    router.push(url)
                }
            })

            return true
        } catch (error) {
            console.error('[PUSH] Errore inizializzazione push:', error)
            return false
        }
    }

    /**
     * Rimuovi registrazione push e token dal backend
     */
    const unregister = async (): Promise<void> => {
        if (!isNative()) return

        try {
            // Rimuovi token dal backend
            if (fcmToken.value) {
                await api.delete('/notifications/device-token', {
                    data: { token: fcmToken.value }
                })
            }

            const { PushNotifications } = await import('@capacitor/push-notifications')
            PushNotifications.removeAllListeners()
            fcmToken.value = null
            permissionGranted.value = false
        } catch (error) {
            console.error('[PUSH] Errore unregister:', error)
        }
    }

    return {
        register,
        unregister,
        permissionGranted,
        fcmToken
    }
}
