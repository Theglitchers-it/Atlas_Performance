<template>
    <div class="max-w-2xl mx-auto px-3 sm:px-6 py-6">
        <header class="mb-6">
            <h1 class="text-2xl sm:text-3xl font-bold text-habit-text">Check-in palestra</h1>
            <p class="text-habit-text-subtle text-sm mt-1">Registra la tua presenza tramite GPS.</p>
        </header>

        <section v-if="!showLocationStep"
            class="relative overflow-hidden bg-habit-card border border-habit-border rounded-habit p-6 mb-4 text-center">
            <div class="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-habit-orange/15 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-habit-cyan/10 blur-3xl"></div>

            <p class="relative text-habit-text-muted text-sm sm:text-base mb-4">
                Per fare check-in dobbiamo conoscere la tua posizione.
            </p>
            <button
                class="relative w-full px-7 py-3.5 rounded-xl bg-gradient-to-r from-habit-orange to-habit-orange-light text-white font-bold text-base shadow-habit-glow hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                @click="onGetPosition" :disabled="loading">
                {{ loading ? 'Cerco posizione…' : '📍 Rileva posizione' }}
            </button>
            <p v-if="geoError"
                class="mt-3 text-sm text-habit-red bg-habit-red/10 border border-habit-red/20 rounded-lg px-3 py-2">
                {{ geoError }}
            </p>

            <!-- Divider OR -->
            <div class="relative my-4 flex items-center gap-3">
                <div class="flex-1 h-px bg-habit-border"></div>
                <span class="text-[10px] uppercase tracking-wider text-habit-text-subtle font-semibold">oppure</span>
                <div class="flex-1 h-px bg-habit-border"></div>
            </div>

            <button
                class="relative w-full px-7 py-3 rounded-xl bg-habit-card border border-habit-border text-habit-text-muted hover:text-habit-text hover:border-habit-cyan/40 font-semibold text-sm transition-all"
                @click="onManualMode">
                ✏️ Procedi senza posizione
            </button>
            <p class="relative mt-2 text-[11px] text-habit-text-subtle">
                Registreremo il check-in come manuale.
            </p>
        </section>

        <section v-else
            class="relative overflow-hidden bg-habit-card border border-habit-border rounded-habit p-6 mb-4">
            <h2 class="text-habit-text text-lg font-bold mb-3">
                {{ position ? 'Posizione rilevata' : 'Check-in manuale' }}
            </h2>
            <div v-if="position" class="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs text-habit-text-subtle">
                <span>Lat: <strong class="text-habit-text">{{ position.latitude.toFixed(6) }}</strong></span>
                <span>Lng: <strong class="text-habit-text">{{ position.longitude.toFixed(6) }}</strong></span>
                <span>Accuracy: <strong class="text-habit-text">{{ Math.round(position.accuracy) }}m</strong></span>
            </div>
            <div v-else class="mb-4 px-3 py-2 rounded-lg bg-habit-cyan/10 border border-habit-cyan/20 text-xs text-habit-cyan">
                Modalità senza GPS — il check-in sarà registrato come manuale.
            </div>

            <div v-if="loadingLocations" class="text-habit-text-subtle text-sm">Caricamento sedi…</div>
            <div v-else-if="myLocations.length === 0"
                class="text-habit-text-subtle text-sm text-center py-6">
                Non sei assegnato a nessuna sede. Chiedi all'admin di assegnarti.
            </div>
            <div v-else>
                <label class="block my-3 text-sm text-habit-text-muted">
                    Sede in cui stai facendo check-in
                    <select v-model.number="selectedLocationId"
                        class="block w-full mt-1.5 px-3 py-2.5 rounded-lg bg-habit-bg-light border border-habit-border text-habit-text text-sm focus:outline-none focus:ring-2 focus:ring-habit-orange/40">
                        <option v-for="l in myLocations" :key="l.location_id" :value="l.location_id">
                            {{ l.name }} ({{ l.city || 'N/D' }})
                        </option>
                    </select>
                </label>

                <!-- Feedback live geofence (PRIMA del check-in) -->
                <div v-if="liveGeofenceInfo" class="mt-3 px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2"
                    :class="liveGeofenceInfo.inRange
                        ? 'bg-habit-success/15 text-habit-success-light border border-habit-success/30'
                        : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'">
                    <span>{{ liveGeofenceInfo.inRange ? '✅' : '⚠️' }}</span>
                    <span class="flex-1">
                        <template v-if="liveGeofenceInfo.inRange">
                            Sei dentro la sede (distanza {{ liveGeofenceInfo.distance }}m / raggio {{ liveGeofenceInfo.radius }}m)
                        </template>
                        <template v-else>
                            Sei a {{ liveGeofenceInfo.distance }}m dalla sede (raggio consentito: {{ liveGeofenceInfo.radius }}m)
                        </template>
                    </span>
                </div>

                <button
                    class="w-full mt-3 px-7 py-3.5 rounded-xl bg-gradient-to-r from-habit-orange to-habit-orange-light text-white font-bold text-base shadow-habit-glow hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    @click="onCheckin" :disabled="checking || !selectedLocationId">
                    {{ checking ? 'Check-in in corso…' : '✅ Conferma Check-in' }}
                </button>
            </div>

            <p v-if="checkinError"
                class="mt-3 text-sm text-habit-red bg-habit-red/10 border border-habit-red/20 rounded-lg px-3 py-2">
                {{ checkinError }}
            </p>

            <div v-if="lastResult" class="mt-4 px-3 py-2.5 rounded-lg font-semibold text-sm" :class="resultClass">
                <strong>{{ resultLabel }}</strong>
                <span v-if="lastResult.distance != null"> · distanza: {{ lastResult.distance }}m</span>
                <span v-if="lastResult.idempotent"> (già registrato)</span>
            </div>
        </section>

        <section v-if="recentCheckins.length > 0"
            class="bg-habit-card border border-habit-border rounded-habit p-6 mb-4">
            <h2 class="text-habit-text text-lg font-bold mb-3">Recenti</h2>
            <ul class="space-y-0">
                <li v-for="c in recentCheckins" :key="c.id"
                    class="flex items-center justify-between gap-3 py-2.5 border-b border-habit-border last:border-b-0 text-sm">
                    <span class="flex-1 font-medium text-habit-text truncate">{{ c.location_name }}</span>
                    <span class="text-habit-text-subtle text-xs">{{ formatTime(c.check_in_at) }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        :class="statusBadgeClass(c.status)">{{ statusLabel(c.status) }}</span>
                </li>
            </ul>
        </section>

        <!-- Storico per sede (aggregati ultimi 365 gg) -->
        <section v-if="checkinStats.length > 0"
            class="bg-habit-card border border-habit-border rounded-habit p-6">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-habit-text text-lg font-bold">I tuoi check-in per sede</h2>
                <span class="text-xs text-habit-text-subtle">
                    {{ totalCheckins }} totali (ultimi 12 mesi)
                </span>
            </div>
            <ul class="space-y-3">
                <li v-for="s in checkinStats" :key="s.location_id">
                    <div class="flex items-center justify-between text-sm mb-1.5">
                        <span class="font-medium text-habit-text truncate">
                            📍 {{ s.location_name }}<span v-if="s.city" class="text-habit-text-subtle"> · {{ s.city }}</span>
                        </span>
                        <span class="text-habit-text-subtle text-xs flex-shrink-0">
                            {{ s.count }} ({{ statPercent(s.count) }}%)
                        </span>
                    </div>
                    <div class="h-2 bg-habit-bg-light rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-habit-orange to-habit-orange-light rounded-full transition-all"
                            :style="{ width: statPercent(s.count) + '%' }"></div>
                    </div>
                    <div class="text-[10px] text-habit-text-subtle mt-1">
                        Ultimo: {{ formatTime(s.last_checkin_at) }}
                    </div>
                </li>
            </ul>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGeolocation } from '@/composables/useGeolocation'
import api from '@/services/api'
import { createCheckin, getMyCheckins, type CheckinCreateResult, type CheckinRecord } from '@/services/checkin.service'

const { position, error: geoError, loading, requestPosition } = useGeolocation()

const myLocations = ref<any[]>([])
const loadingLocations = ref(false)
const selectedLocationId = ref<number | null>(null)
const checking = ref(false)
const checkinError = ref<string | null>(null)
const lastResult = ref<CheckinCreateResult | null>(null)
const recentCheckins = ref<CheckinRecord[]>([])

// Modalità manuale: l'utente sceglie di fare check-in senza GPS
// (utile su localhost senza HTTPS o se nega il permesso geolocation)
const manualMode = ref(false)
const showLocationStep = computed(() => !!position.value || manualMode.value)

const resultLabel = computed(() => {
    if (!lastResult.value) return ''
    return statusLabel(lastResult.value.status)
})

const resultClass = computed(() => {
    if (!lastResult.value) return ''
    return statusBadgeClass(lastResult.value.status)
})

const statusLabel = (s: string) => {
    return {
        valid: '✅ Check-in valido',
        out_of_range: '⚠️ Fuori dal raggio',
        suspected_spoof: '⚠️ Posizione sospetta',
        manual_override: '✏️ Manuale'
    }[s] || s
}

const statusBadgeClass = (s: string): string => {
    const map: Record<string, string> = {
        valid: 'bg-habit-success/15 text-habit-success-light border border-habit-success/30',
        out_of_range: 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30',
        suspected_spoof: 'bg-habit-red/15 text-habit-red border border-habit-red/30',
        manual_override: 'bg-habit-cyan/15 text-habit-cyan border border-habit-cyan/30'
    }
    return map[s] || 'bg-habit-bg-light text-habit-text-subtle border border-habit-border'
}

const formatTime = (iso: string) => new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

// Haversine distance in metri (per feedback live geofence prima del check-in)
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const R = 6371000 // raggio terra in metri
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

const selectedLocation = computed(() =>
    myLocations.value.find((l: any) => l.location_id === selectedLocationId.value) || null
)

const liveGeofenceInfo = computed(() => {
    if (!position.value || !selectedLocation.value) return null
    const lat = selectedLocation.value.latitude
    const lng = selectedLocation.value.longitude
    if (lat == null || lng == null) return null
    const distance = haversineMeters(
        position.value.latitude,
        position.value.longitude,
        Number(lat),
        Number(lng),
    )
    const radius = selectedLocation.value.geofence_radius_meters || 100
    const inRange = distance <= radius
    return { distance, radius, inRange }
})

const onGetPosition = async () => {
    manualMode.value = false
    await requestPosition({ highAccuracy: true, timeout: 15000 })
    if (position.value) await loadMyLocations()
}

const onManualMode = async () => {
    manualMode.value = true
    await loadMyLocations()
}

const loadMyLocations = async () => {
    loadingLocations.value = true
    try {
        const res = await api.get('/staff-locations/me')
        myLocations.value = res.data.data || []
        const primary = myLocations.value.find((l: any) => l.is_primary)
        selectedLocationId.value = primary?.location_id || myLocations.value[0]?.location_id || null
    } catch (e) {
        myLocations.value = []
    } finally {
        loadingLocations.value = false
    }
}

const onCheckin = async () => {
    if (!selectedLocationId.value) return
    // Manual mode richiede solo locationId; GPS mode richiede anche position
    if (!manualMode.value && !position.value) return

    checkinError.value = null
    checking.value = true
    try {
        const payload = manualMode.value && !position.value
            ? {
                locationId: selectedLocationId.value,
                source: 'manual_qr' as const
            }
            : {
                locationId: selectedLocationId.value,
                lat: position.value!.latitude,
                lng: position.value!.longitude,
                accuracy: position.value!.accuracy,
                source: 'mobile_web' as const
            }
        const res = await createCheckin(payload)
        lastResult.value = res.data.data
        if (!res.data.data.idempotent) {
            await loadRecent()
        }
    } catch (e: any) {
        checkinError.value = e?.response?.data?.message || 'Errore check-in'
    } finally {
        checking.value = false
    }
}

const loadRecent = async () => {
    try {
        const res = await getMyCheckins(5, 0)
        recentCheckins.value = res.data.data
    } catch { /* ignore */ }
}

// === Storico per sede (aggregati) ===
interface CheckinStat {
    location_id: number
    location_name: string
    city: string | null
    count: number
    last_checkin_at: string
}
const checkinStats = ref<CheckinStat[]>([])
const loadingStats = ref(false)

const loadStatsByLocation = async () => {
    loadingStats.value = true
    try {
        const res = await api.get('/checkins/me/stats')
        checkinStats.value = res.data?.data || []
    } catch {
        checkinStats.value = []
    } finally {
        loadingStats.value = false
    }
}

const totalCheckins = computed(() =>
    checkinStats.value.reduce((sum, s) => sum + Number(s.count || 0), 0)
)

const statPercent = (count: number): number => {
    if (totalCheckins.value === 0) return 0
    return Math.round((count / totalCheckins.value) * 100)
}

watch(selectedLocationId, () => {
    lastResult.value = null
    checkinError.value = null
})

onMounted(() => {
    loadRecent()
    loadStatsByLocation()
})
</script>
