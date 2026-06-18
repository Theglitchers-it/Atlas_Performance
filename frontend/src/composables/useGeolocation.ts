/**
 * useGeolocation — wrapper unificato per Geolocation
 * - Su Capacitor native usa @capacitor/geolocation (richiede plugin installato)
 * - Su web usa navigator.geolocation
 *
 * Restituisce { position, accuracy, error, loading, requestPosition, watchPosition, stopWatch }
 */

import { ref, onBeforeUnmount, getCurrentInstance } from 'vue'

export interface GeoPosition {
    latitude: number
    longitude: number
    accuracy: number
    timestamp: number
}

const isNative = (): boolean => {
    try {
        return (window as any).Capacitor?.isNativePlatform?.() === true
    } catch {
        return false
    }
}

// Singleton dinamico del modulo Capacitor — evita ri-import multipli.
// Il modulo @capacitor/geolocation è opzionale (solo build mobile native);
// l'import è nascosto dentro new Function() per evitare l'analisi statica di Vite,
// che altrimenti tenta di risolvere il package anche in dev web e fallisce.
let _geoModulePromise: Promise<any> | null = null
const loadCapacitorGeo = (): Promise<any> => {
    if (!_geoModulePromise) {
        try {
            const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>
            _geoModulePromise = dynImport('@capacitor/geolocation').catch(() => null)
        } catch {
            _geoModulePromise = Promise.resolve(null)
        }
    }
    return _geoModulePromise
}

export function useGeolocation() {
    const position = ref<GeoPosition | null>(null)
    const error = ref<string | null>(null)
    const loading = ref(false)
    let watchId: any = null

    const requestPosition = async (opts: { highAccuracy?: boolean; timeout?: number } = {}): Promise<GeoPosition | null> => {
        loading.value = true
        error.value = null
        try {
            const result = isNative()
                ? await getViaCapacitor(opts)
                : await getViaWeb(opts)
            position.value = result
            return result
        } catch (e: any) {
            error.value = e?.message || 'Impossibile ottenere la posizione GPS'
            return null
        } finally {
            loading.value = false
        }
    }

    const watchPosition = async (cb: (pos: GeoPosition) => void) => {
        if (isNative()) {
            const mod = await loadCapacitorGeo()
            const Geolocation = mod?.Geolocation
            if (!Geolocation) {
                error.value = 'Plugin Capacitor Geolocation non disponibile'
                return
            }
            watchId = await Geolocation.watchPosition(
                { enableHighAccuracy: true, timeout: 15000 },
                (p: any, err: any) => {
                    if (err) { error.value = err.message; return }
                    const pos: GeoPosition = {
                        latitude: p.coords.latitude,
                        longitude: p.coords.longitude,
                        accuracy: p.coords.accuracy,
                        timestamp: p.timestamp
                    }
                    position.value = pos
                    cb(pos)
                }
            )
        } else {
            if (!navigator.geolocation) {
                error.value = 'Geolocation non supportata dal browser'
                return
            }
            watchId = navigator.geolocation.watchPosition(
                p => {
                    const pos: GeoPosition = {
                        latitude: p.coords.latitude,
                        longitude: p.coords.longitude,
                        accuracy: p.coords.accuracy,
                        timestamp: p.timestamp
                    }
                    position.value = pos
                    cb(pos)
                },
                err => { error.value = err.message },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            )
        }
    }

    const stopWatch = async () => {
        if (watchId == null) return
        if (isNative()) {
            const mod = await loadCapacitorGeo()
            if (mod?.Geolocation) await mod.Geolocation.clearWatch({ id: watchId })
        } else {
            navigator.geolocation.clearWatch(watchId)
        }
        watchId = null
    }

    // Auto-cleanup quando il componente che ci ha invocato viene smontato:
    // evita leak di sensor GPS / drain batteria se il consumer dimentica stopWatch.
    if (getCurrentInstance()) {
        onBeforeUnmount(() => { if (watchId != null) stopWatch() })
    }

    return {
        position,
        error,
        loading,
        requestPosition,
        watchPosition,
        stopWatch
    }
}

// ---- Internal implementations ----

async function getViaCapacitor(opts: { highAccuracy?: boolean; timeout?: number }): Promise<GeoPosition> {
    const mod = await loadCapacitorGeo()
    const Geolocation = mod?.Geolocation
    if (!Geolocation) {
        throw new Error('Plugin @capacitor/geolocation non installato. Esegui: npm install @capacitor/geolocation && npx cap sync')
    }
    const perm = await Geolocation.checkPermissions()
    if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions()
        if (req.location !== 'granted') {
            throw new Error('Permesso di localizzazione negato')
        }
    }
    const p = await Geolocation.getCurrentPosition({
        enableHighAccuracy: opts.highAccuracy !== false,
        timeout: opts.timeout || 15000,
        maximumAge: 0
    })
    return {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
        timestamp: p.timestamp
    }
}

async function getViaWeb(opts: { highAccuracy?: boolean; timeout?: number }): Promise<GeoPosition> {
    if (!navigator.geolocation) {
        throw new Error('Geolocation non supportata da questo browser')
    }
    return new Promise<GeoPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            p => resolve({
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
                accuracy: p.coords.accuracy,
                timestamp: p.timestamp
            }),
            err => reject(new Error(err.message || 'Geolocation error')),
            {
                enableHighAccuracy: opts.highAccuracy !== false,
                timeout: opts.timeout || 15000,
                maximumAge: 0
            }
        )
    })
}
