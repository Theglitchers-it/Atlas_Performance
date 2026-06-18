<template>
    <div class="activation-toggle">
        <button
            v-if="status === 'active'"
            class="btn-deactivate"
            @click="askDeactivate"
            :disabled="loading"
            title="Disattiva cliente: libera lo slot e interrompe l'accesso ai programmi"
        >
            {{ loading ? '…' : '⏸ Disattiva' }}
        </button>
        <button
            v-else
            class="btn-activate"
            @click="askActivate"
            :disabled="loading"
            :title="willBillThis ? `Attivazione: questo cliente verrà fatturato (slot ${billingCount + 1}/${freeSlots} oltre i free)` : 'Attivazione: rientra nei free slot'"
        >
            {{ loading ? '…' : (status === 'cancelled' ? '🔄 Riattiva' : '▶ Attiva') }}
            <span v-if="willBillThis" class="bill-warn">+{{ formatPrice }}</span>
        </button>

        <Teleport to="body">
            <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
                <div class="modal">
                    <h3>{{ modalTitle }}</h3>
                    <p class="modal-msg" v-html="modalMessage"></p>
                    <label class="reason-field">
                        Motivo (opzionale)
                        <textarea v-model="reason" rows="2" :placeholder="reasonPlaceholder" maxlength="255"></textarea>
                    </label>
                    <div class="actions">
                        <button class="btn-cancel" @click="showModal = false" :disabled="loading">Annulla</button>
                        <button
                            :class="action === 'activate' ? 'btn-confirm-activate' : 'btn-confirm-deactivate'"
                            @click="onConfirm"
                            :disabled="loading"
                        >
                            {{ loading ? 'Salvataggio…' : 'Conferma' }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    activateClient,
    deactivateClient,
    getBillingUsage,
    formatCurrency,
    type BillingUsage
} from '@/services/billing-active.service'

const props = defineProps<{ clientId: number; status: 'active' | 'inactive' | 'cancelled' | string }>()
const emit = defineEmits<{ (e: 'changed', newStatus: 'active' | 'inactive'): void }>()

const status = computed(() => props.status)
const usage = ref<BillingUsage | null>(null)
const loading = ref(false)
const showModal = ref(false)
const action = ref<'activate' | 'deactivate'>('activate')
const reason = ref('')

const freeSlots = computed(() => usage.value?.freeActiveSlots ?? 5)
const billingCount = computed(() => usage.value?.billableCount ?? 0)
const willBillThis = computed(() =>
    usage.value?.billingModel === 'pay_per_active' &&
    status.value !== 'active' &&
    (usage.value.activeCount + 1) > freeSlots.value
)
const formatPrice = computed(() => usage.value ? formatCurrency(usage.value.perSlotPriceCents, usage.value.currency) + '/mese' : '')

const modalTitle = computed(() => action.value === 'activate' ? 'Attiva cliente' : 'Disattiva cliente')
const modalMessage = computed(() => {
    if (action.value === 'activate') {
        return willBillThis.value
            ? `<strong>Attenzione:</strong> questo cliente supera i ${freeSlots.value} slot gratuiti.<br>Verrà fatturato <strong>${formatPrice.value}</strong> al prossimo ciclo.`
            : `Il cliente rientra nei ${freeSlots.value} free slot — nessun costo aggiuntivo.`
    }
    return `Il cliente non potrà più accedere ai propri programmi.<br>Lo slot verrà liberato e <strong>non sarà più fatturato</strong>.`
})
const reasonPlaceholder = computed(() => action.value === 'activate'
    ? 'Es. "Nuovo abbonamento 3 mesi"'
    : 'Es. "Interruzione per vacanza prolungata"')

const askActivate = () => { action.value = 'activate'; reason.value = ''; showModal.value = true }
const askDeactivate = () => { action.value = 'deactivate'; reason.value = ''; showModal.value = true }

const onConfirm = async () => {
    loading.value = true
    try {
        if (action.value === 'activate') {
            await activateClient(props.clientId, reason.value || undefined)
            emit('changed', 'active')
        } else {
            await deactivateClient(props.clientId, reason.value || undefined)
            emit('changed', 'inactive')
        }
        showModal.value = false
        await loadUsage()
    } finally {
        loading.value = false
    }
}

const loadUsage = async () => {
    try {
        const res = await getBillingUsage()
        usage.value = res.data.data
    } catch { /* tenant non in pay_per_active o non admin: silenzio */ }
}

onMounted(loadUsage)
</script>

<style scoped>
.activation-toggle { display: inline-flex; align-items: center; gap: 8px; }
.btn-activate, .btn-deactivate {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 6px; border: 0;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background 0.15s;
}
.btn-activate { background: #10b981; color: #fff; }
.btn-activate:hover { background: #059669; }
.btn-deactivate { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.btn-deactivate:hover { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.btn-activate:disabled, .btn-deactivate:disabled { opacity: 0.5; cursor: not-allowed; }
.bill-warn { background: rgba(255,255,255,0.25); padding: 1px 6px; border-radius: 8px; font-size: 11px; }

.modal-backdrop {
    position: fixed; inset: 0; background: rgba(15,23,42,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
    background: #fff; border-radius: 12px; padding: 24px;
    width: 90%; max-width: 480px;
}
.modal h3 { margin: 0 0 12px; font-size: 20px; }
.modal-msg { color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px; }
.reason-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #475569; font-weight: 500; margin-bottom: 16px; }
.reason-field textarea {
    padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
    font-size: 14px; font-family: inherit; resize: vertical;
}
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel, .btn-confirm-activate, .btn-confirm-deactivate {
    padding: 8px 16px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 14px;
}
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-confirm-activate { background: #10b981; color: #fff; }
.btn-confirm-deactivate { background: #ef4444; color: #fff; }
.btn-cancel:disabled, .btn-confirm-activate:disabled, .btn-confirm-deactivate:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
