<template>
    <div v-if="visible" class="modal-backdrop" @click.self="$emit('close')">
        <div class="modal">
            <h3>Messaggio di gruppo</h3>
            <p class="hint">Invia un messaggio a {{ count }} clienti selezionati.</p>

            <div class="channel-row">
                <label v-for="opt in channels" :key="opt.value" :class="{ active: channel === opt.value }">
                    <input type="radio" v-model="channel" :value="opt.value" />
                    <span>{{ opt.icon }} {{ opt.label }}</span>
                </label>
            </div>

            <label class="msg-field">
                Testo messaggio
                <textarea v-model="message" rows="5" :placeholder="placeholderText" maxlength="1000"></textarea>
                <small>Variabili disponibili: <code>{{ varNome }}</code>, <code>{{ varCognome }}</code></small>
            </label>

            <p v-if="error" class="error">{{ error }}</p>

            <div class="actions">
                <button class="btn-cancel" @click="$emit('close')" :disabled="sending">Annulla</button>
                <button class="btn-send" @click="onSend" :disabled="sending || !message.trim()">
                    {{ sending ? 'Invio…' : 'Genera link' }}
                </button>
            </div>

            <div v-if="result" class="result">
                <p><strong>{{ result.success }}</strong> link generati ({{ result.failed }} saltati per mancanza di {{ channel === 'whatsapp' ? 'telefono' : 'email' }})</p>
                <div class="links-list">
                    <a v-for="l in result.links.filter((x: any) => x.url)" :key="l.clientId" :href="l.url ?? undefined" target="_blank" rel="noopener" class="link-row">
                        Cliente #{{ l.clientId }} → Apri
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { bulkNotify, type BulkChannel, type BulkNotifyLink } from '@/services/client-bulk-csv.service'

const props = defineProps<{ visible: boolean; clientIds: number[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'sent', count: number): void }>()

const channel = ref<BulkChannel>('whatsapp')
const message = ref('Ciao {{nome}}, volevo dirti che...')
const sending = ref(false)
const error = ref<string | null>(null)
const result = ref<{ success: number; failed: number; links: BulkNotifyLink[] } | null>(null)

// Reattivo: se il parent aggiorna selectedIds mentre la modal è aperta, il count si aggiorna
const count = computed(() => props.clientIds.length)

// Placeholder e nomi variabili: literal {{...}} via stringhe (binding evita Vue template parse)
const placeholderText = 'Ciao {{nome}}, ...'
const varNome = '{{nome}}'
const varCognome = '{{cognome}}'

const channels = [
    { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { value: 'email', label: 'Email', icon: '✉️' }
] as const

watch(() => props.visible, v => {
    if (!v) { result.value = null; error.value = null }
})

const onSend = async () => {
    sending.value = true
    error.value = null
    try {
        const res = await bulkNotify({ clientIds: props.clientIds, channel: channel.value, message: message.value })
        result.value = res.data.data
        emit('sent', res.data.data.success)
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore'
    } finally {
        sending.value = false
    }
}
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
.modal h3 { margin: 0 0 4px; font-size: 18px; }
.hint { color: #64748b; font-size: 13px; margin: 0 0 16px; }
.channel-row { display: flex; gap: 8px; margin-bottom: 16px; }
.channel-row label {
    flex: 1; display: flex; align-items: center; gap: 8px;
    padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px;
    cursor: pointer; transition: all 0.15s;
}
.channel-row label.active { border-color: #6366f1; background: #eef2ff; }
.channel-row input { margin: 0; }
.msg-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 13px; color: #475569; font-weight: 500; }
.msg-field textarea {
    padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;
    font-size: 14px; font-family: inherit; resize: vertical;
}
.msg-field small { color: #94a3b8; }
.msg-field code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
.error { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel, .btn-send { padding: 8px 16px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-send { background: #6366f1; color: #fff; }
.btn-send:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.result { margin-top: 16px; padding: 12px; background: #d1fae5; border-radius: 8px; color: #065f46; }
.links-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; max-height: 200px; overflow-y: auto; }
.link-row { color: #6366f1; text-decoration: none; padding: 6px 10px; background: #fff; border-radius: 4px; font-size: 13px; }
.link-row:hover { background: #eef2ff; }
</style>
