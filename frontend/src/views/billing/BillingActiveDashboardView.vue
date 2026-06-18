<template>
    <div class="billing-dashboard">
        <header class="page-header">
            <h1>Fatturazione</h1>
            <p class="subtitle">Modello "pay per active client": paghi solo per i clienti che stai realmente seguendo.</p>
        </header>

        <div v-if="loading" class="loading">Caricamento…</div>
        <div v-else-if="error" class="error">{{ error }}</div>

        <template v-else-if="usage">

            <!-- Card riepilogo -->
            <section class="usage-grid">
                <div class="card kpi" :class="kpiClass">
                    <span class="kpi-label">Clienti attivi</span>
                    <span class="kpi-value">{{ usage.activeCount }}</span>
                    <span class="kpi-sub">su {{ usage.freeActiveSlots }} free slot + fatturati</span>
                </div>

                <div class="card kpi billable">
                    <span class="kpi-label">Slot fatturati</span>
                    <span class="kpi-value">{{ usage.billableCount }}</span>
                    <span class="kpi-sub">oltre i free slot</span>
                </div>

                <div class="card kpi cost">
                    <span class="kpi-label">Costo proiettato</span>
                    <span class="kpi-value">{{ usage.projectedAmount }} {{ usage.currency }}</span>
                    <span class="kpi-sub">questo mese</span>
                </div>
            </section>

            <!-- Gauge visuale -->
            <section class="card gauge-section">
                <h2>Utilizzo slot</h2>
                <div class="gauge">
                    <div
                        v-for="s in visibleSlots"
                        :key="s.i"
                        class="slot"
                        :class="s.cls"
                        :title="s.title"
                    ></div>
                    <span v-if="hiddenCount > 0" class="slot-overflow">+{{ hiddenCount }} slot</span>
                </div>
                <p class="gauge-legend">
                    <span class="legend-item"><span class="dot active-dot"></span> Attivo (free)</span>
                    <span class="legend-item"><span class="dot billable-dot"></span> Attivo (fatturato)</span>
                    <span class="legend-item"><span class="dot empty-dot"></span> Slot libero (free)</span>
                </p>
            </section>

            <!-- Settings (solo admin) -->
            <section class="card settings-section" v-if="canEditSettings">
                <h2>Configurazione</h2>
                <form @submit.prevent="onSave" class="settings-form">
                    <label>
                        Modello fatturazione
                        <select v-model="form.billingModel">
                            <option value="fixed_tier">Tier fisso</option>
                            <option value="pay_per_active">Pay per active client</option>
                            <option value="hybrid">Ibrido</option>
                        </select>
                    </label>
                    <label>
                        Slot attivi gratuiti
                        <input type="number" v-model.number="form.freeActiveSlots" min="0" />
                    </label>
                    <label>
                        Prezzo per slot (cent EUR)
                        <input type="number" v-model.number="form.perSlotPriceCents" min="0" step="50" />
                        <small>{{ formatCurrency(form.perSlotPriceCents) }} per cliente attivo/mese</small>
                    </label>
                    <button type="submit" class="btn-primary" :disabled="saving">
                        {{ saving ? 'Salvataggio…' : 'Salva' }}
                    </button>
                </form>
            </section>

            <!-- Info strategia 5 free slots -->
            <section class="card info-section" v-if="usage.billingModel === 'pay_per_active'">
                <h2>💡 Come funziona</h2>
                <ul>
                    <li>I primi <strong>{{ usage.freeActiveSlots }} clienti attivi</strong> sono gratuiti</li>
                    <li>Ogni cliente attivo oltre il free tier costa <strong>{{ formatCurrency(usage.perSlotPriceCents) }}/mese</strong></li>
                    <li>Puoi disattivare un cliente quando interrompe il percorso (es. vacanza): liberi lo slot e non paghi più per lui</li>
                    <li>Il report a Stripe avviene automaticamente il 1° di ogni mese alle 02:00</li>
                </ul>
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    getBillingUsage,
    updateBillingSettings,
    formatCurrency,
    type BillingUsage
} from '@/services/billing-active.service'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const usage = ref<BillingUsage | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

const form = ref({
    billingModel: 'fixed_tier' as 'fixed_tier' | 'pay_per_active' | 'hybrid',
    freeActiveSlots: 5,
    perSlotPriceCents: 500
})

const canEditSettings = computed(() => auth.isGymAdmin || auth.user?.role === 'tenant_owner')

const SLOT_RENDER_CAP = 50

const totalSlots = computed(() => {
    if (!usage.value) return 0
    return Math.max(usage.value.freeActiveSlots, usage.value.activeCount)
})

const hiddenCount = computed(() => Math.max(0, totalSlots.value - SLOT_RENDER_CAP))

// Pre-calcola gli slot una sola volta per ogni cambio di `usage` (evita ricomputo per slot a ogni re-render)
const visibleSlots = computed(() => {
    if (!usage.value) return []
    const { freeActiveSlots, activeCount } = usage.value
    const render = Math.min(totalSlots.value, SLOT_RENDER_CAP)
    const out: { i: number; cls: string; title: string }[] = []
    for (let i = 1; i <= render; i++) {
        let cls: string
        if (i <= freeActiveSlots && i <= activeCount) cls = 'free-used'
        else if (i <= freeActiveSlots) cls = 'free-empty'
        else if (i <= activeCount) cls = 'billable-used'
        else cls = 'empty'
        const title = i <= freeActiveSlots ? `Slot free #${i}` : `Slot fatturato #${i - freeActiveSlots}`
        out.push({ i, cls, title })
    }
    return out
})

const kpiClass = computed(() => {
    if (!usage.value) return ''
    return usage.value.activeCount <= usage.value.freeActiveSlots ? 'kpi-ok' : 'kpi-warn'
})

const load = async () => {
    loading.value = true
    error.value = null
    try {
        const res = await getBillingUsage()
        usage.value = res.data.data
        form.value = {
            billingModel: usage.value.billingModel,
            freeActiveSlots: usage.value.freeActiveSlots,
            perSlotPriceCents: usage.value.perSlotPriceCents
        }
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Impossibile caricare i dati di fatturazione'
    } finally {
        loading.value = false
    }
}

const onSave = async () => {
    saving.value = true
    try {
        await updateBillingSettings(form.value)
        await load()
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore salvataggio'
    } finally {
        saving.value = false
    }
}

onMounted(load)
</script>

<style scoped>
.billing-dashboard {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px;
}

.page-header h1 {
    font-size: 28px;
    margin: 0 0 4px;
}

.subtitle {
    color: #64748b;
}

.usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 24px 0;
}

.card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
}

.kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.kpi-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    font-weight: 600;
}

.kpi-value {
    font-size: 36px;
    font-weight: 800;
    line-height: 1;
}

.kpi-sub {
    font-size: 12px;
    color: #94a3b8;
}

.kpi-ok .kpi-value { color: #10b981; }
.kpi-warn .kpi-value { color: #f59e0b; }
.billable .kpi-value { color: #f59e0b; }
.cost .kpi-value { color: #6366f1; font-size: 28px; }

.gauge-section h2, .settings-section h2, .info-section h2 {
    font-size: 18px;
    margin: 0 0 16px;
}

.gauge {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.slot {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 2px solid transparent;
}

.slot.free-used { background: #10b981; }
.slot.free-empty { background: #d1fae5; border-color: #6ee7b7; }
.slot.billable-used { background: #f59e0b; }
.slot.empty { background: #f1f5f9; }

.slot-overflow {
    align-self: center;
    font-size: 12px;
    color: #64748b;
    margin-left: 8px;
    font-weight: 600;
}

.gauge-legend {
    margin-top: 16px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #475569;
}

.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
}

.active-dot { background: #10b981; }
.billable-dot { background: #f59e0b; }
.empty-dot { background: #d1fae5; }

.settings-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.settings-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #475569;
}

.settings-form small {
    color: #94a3b8;
    margin-top: 2px;
}

.settings-form input, .settings-form select {
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
}

.btn-primary {
    grid-column: 1 / -1;
    padding: 10px 18px;
    background: #6366f1;
    color: #fff;
    border: 0;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    justify-self: start;
}

.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.info-section ul {
    margin: 0;
    padding-left: 20px;
    line-height: 1.8;
}

.loading, .error {
    padding: 32px;
    text-align: center;
    background: #f8fafc;
    border-radius: 8px;
}

.error { background: #fee2e2; color: #991b1b; }
</style>
