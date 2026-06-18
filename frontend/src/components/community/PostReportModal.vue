<template>
    <div v-if="visible" class="modal-backdrop" @click.self="$emit('close')">
        <div class="modal">
            <h3>Segnala post</h3>
            <p class="hint">Aiutaci a mantenere la community sicura. La tua segnalazione è anonima per l'autore.</p>

            <label>
                Motivo *
                <select v-model="reason">
                    <option v-for="(label, key) in REPORT_REASON_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
            </label>

            <label>
                Dettagli (opzionale)
                <textarea v-model="details" rows="4" maxlength="2000" placeholder="Aggiungi contesto..."></textarea>
            </label>

            <div v-if="error" class="error">{{ error }}</div>

            <div class="actions">
                <button class="btn-cancel" @click="$emit('close')" :disabled="sending">Annulla</button>
                <button class="btn-submit" @click="onSubmit" :disabled="sending || !reason">
                    {{ sending ? 'Invio…' : 'Invia segnalazione' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { reportPost, REPORT_REASON_LABELS, type ReportReason } from '@/services/community-moderation.service'

const props = defineProps<{ visible: boolean; postId: number }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'reported'): void }>()

const reason = ref<ReportReason>('spam')
const details = ref('')
const sending = ref(false)
const error = ref<string | null>(null)

const onSubmit = async () => {
    if (!reason.value) return
    sending.value = true
    error.value = null
    try {
        await reportPost(props.postId, { reason: reason.value, details: details.value || undefined })
        emit('reported')
        emit('close')
        reason.value = 'spam'
        details.value = ''
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore invio segnalazione'
    } finally {
        sending.value = false
    }
}
</script>

<style scoped>
.modal-backdrop {
    position: fixed; inset: 0; background: rgba(15,23,42,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
    background: #fff; border-radius: 12px; padding: 24px;
    width: 90%; max-width: 480px;
}
.modal h3 { margin: 0 0 8px; font-size: 20px; }
.hint { color: #64748b; font-size: 13px; margin: 0 0 16px; }
.modal label {
    display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;
    font-size: 13px; color: #475569; font-weight: 500;
}
.modal select, .modal textarea {
    padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;
    font-family: inherit;
}
.error { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel, .btn-submit { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: 0; font-size: 14px; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-submit { background: #ef4444; color: #fff; }
.btn-submit:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
