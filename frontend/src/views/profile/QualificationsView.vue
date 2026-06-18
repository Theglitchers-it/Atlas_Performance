<template>
    <div class="qualifications">
        <header class="page-header">
            <h1>Le mie Qualifiche</h1>
            <p class="subtitle">Certificazioni e qualifiche professionali. Le qualifiche verificate appaiono come badge sul tuo profilo pubblico.</p>
        </header>

        <section class="add-form">
            <h2>Aggiungi qualifica</h2>
            <form @submit.prevent="onAdd" class="form-grid">
                <label>
                    Titolo *
                    <input v-model="form.qualification" type="text" placeholder="Es. Personal Trainer FIPE Livello 3" required maxlength="150" />
                </label>
                <label>
                    Ente emittente
                    <input v-model="form.issuedBy" type="text" placeholder="Es. FIPE, CONI, Ordine Nutrizionisti" maxlength="200" />
                </label>
                <label>
                    Data rilascio
                    <input v-model="form.issuedAt" type="date" />
                </label>
                <label>
                    Data scadenza
                    <input v-model="form.expiresAt" type="date" />
                </label>
                <label class="full">
                    URL certificato (PDF/immagine)
                    <input v-model="form.certificateUrl" type="url" placeholder="https://..." />
                </label>
                <label class="full">
                    Note
                    <textarea v-model="form.notes" rows="2" placeholder="Note opzionali"></textarea>
                </label>
                <button type="submit" :disabled="saving || !form.qualification" class="btn-primary">
                    {{ saving ? 'Salvataggio…' : 'Aggiungi' }}
                </button>
            </form>
        </section>

        <section class="list-section">
            <h2>Qualifiche registrate</h2>
            <div v-if="loading" class="loading">Caricamento…</div>
            <div v-else-if="items.length === 0" class="empty">Nessuna qualifica registrata.</div>
            <ul v-else class="qual-list">
                <li v-for="q in items" :key="q.id" class="qual-item">
                    <div class="qual-main">
                        <div class="qual-title">
                            <strong>{{ q.qualification }}</strong>
                            <span v-if="q.verified" class="verified-badge" title="Verificata">✓ Verificata</span>
                            <span v-else class="pending-badge">In attesa</span>
                        </div>
                        <div class="qual-meta">
                            <span v-if="q.issued_by">{{ q.issued_by }}</span>
                            <span v-if="q.issued_at">· dal {{ formatDate(q.issued_at) }}</span>
                            <span v-if="q.expires_at">· scade il {{ formatDate(q.expires_at) }}</span>
                        </div>
                        <a v-if="q.certificate_url" :href="q.certificate_url" target="_blank" rel="noopener" class="cert-link">📄 Certificato</a>
                    </div>
                    <button class="btn-delete" @click="onDelete(q.id)" :disabled="deletingId === q.id">
                        {{ deletingId === q.id ? '…' : 'Elimina' }}
                    </button>
                </li>
            </ul>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
    getMyQualifications,
    addMyQualification,
    deleteMyQualification,
    type Qualification
} from '@/services/roles.service'

const items = ref<Qualification[]>([])
const loading = ref(true)
const saving = ref(false)
const deletingId = ref<number | null>(null)

const form = ref({
    qualification: '',
    issuedBy: '',
    issuedAt: '',
    expiresAt: '',
    certificateUrl: '',
    notes: ''
})

const formatDate = (s: string | null) => s ? new Date(s).toLocaleDateString('it-IT') : ''

const load = async () => {
    loading.value = true
    try {
        const res = await getMyQualifications()
        items.value = res.data.data
    } finally {
        loading.value = false
    }
}

const onAdd = async () => {
    if (!form.value.qualification) return
    saving.value = true
    try {
        await addMyQualification({
            qualification: form.value.qualification,
            issuedBy: form.value.issuedBy || undefined,
            issuedAt: form.value.issuedAt || undefined,
            expiresAt: form.value.expiresAt || undefined,
            certificateUrl: form.value.certificateUrl || undefined,
            notes: form.value.notes || undefined
        })
        form.value = { qualification: '', issuedBy: '', issuedAt: '', expiresAt: '', certificateUrl: '', notes: '' }
        await load()
    } finally {
        saving.value = false
    }
}

const onDelete = async (id: number) => {
    if (!confirm('Eliminare questa qualifica?')) return
    deletingId.value = id
    try {
        await deleteMyQualification(id)
        items.value = items.value.filter(q => q.id !== id)
    } finally {
        deletingId.value = null
    }
}

onMounted(load)
</script>

<style scoped>
.qualifications {
    max-width: 900px;
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

.add-form, .list-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
}

.add-form h2, .list-section h2 {
    font-size: 18px;
    margin: 0 0 16px;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.form-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: #475569;
}

.form-grid .full {
    grid-column: 1 / -1;
}

.form-grid input, .form-grid textarea {
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
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

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.qual-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.qual-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
}

.qual-item:last-child {
    border-bottom: 0;
}

.qual-main {
    flex: 1;
}

.qual-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.verified-badge {
    background: #10b981;
    color: #fff;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
}

.pending-badge {
    background: #f1f5f9;
    color: #64748b;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
}

.qual-meta {
    color: #64748b;
    font-size: 13px;
    margin-top: 4px;
}

.cert-link {
    display: inline-block;
    color: #6366f1;
    font-size: 13px;
    margin-top: 4px;
}

.btn-delete {
    background: transparent;
    color: #ef4444;
    border: 1px solid #fee2e2;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
}

.btn-delete:hover {
    background: #fee2e2;
}

.loading, .empty {
    color: #94a3b8;
    text-align: center;
    padding: 24px;
}
</style>
