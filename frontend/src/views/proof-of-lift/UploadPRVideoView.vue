<template>
    <div class="upload-pr">
        <header class="page-header">
            <h1>📹 Carica Proof-of-Lift</h1>
            <p class="subtitle">Carica un video del tuo PR per ottenere la certificazione "verificato" e — se hai abilitato l'opt-in — entrare nella World Leaderboard.</p>
        </header>

        <section class="card">
            <h2>1. Seleziona PR</h2>
            <div v-if="loadingPRs" class="loading">Caricamento dei tuoi PR…</div>
            <div v-else-if="prs.length === 0" class="empty">
                <p>Nessun personal record ancora. Registra prima un PR dalla sezione Allenamenti.</p>
            </div>
            <ul v-else class="pr-list">
                <li
                    v-for="pr in prs"
                    :key="pr.id"
                    :class="['pr-item', { selected: selectedPrId === pr.id, 'has-video': pr.proof_video_id }]"
                    @click="!pr.proof_video_id && (selectedPrId = pr.id)"
                >
                    <div class="pr-info">
                        <strong>{{ pr.exercise_name }}</strong>
                        <span class="pr-value">{{ pr.value }} {{ pr.record_type === 'weight' ? 'kg' : pr.record_type }}</span>
                        <span class="pr-date">{{ formatDate(pr.recorded_at) }}</span>
                    </div>
                    <span v-if="pr.proof_video_id" class="badge-video">✓ Video presente</span>
                    <span v-else-if="selectedPrId === pr.id" class="badge-selected">Selezionato</span>
                </li>
            </ul>
        </section>

        <section class="card" v-if="selectedPrId">
            <h2>2. Carica il video</h2>
            <div v-if="!videoFile" class="upload-zone">
                <input ref="fileInput" type="file" accept="video/*" @change="onFileSelect" hidden />
                <button class="btn-upload" @click="($refs.fileInput as HTMLInputElement)?.click()">
                    📁 Seleziona file (max 500MB)
                </button>
                <p class="hint">Formati supportati: MP4, MOV, AVI</p>
            </div>
            <div v-else class="file-preview">
                <span>📹 {{ videoFile.name }} ({{ formatSize(videoFile.size) }})</span>
                <button class="btn-remove" @click="videoFile = null">✕</button>
            </div>

            <label class="bw-field" v-if="videoFile">
                Peso corporeo attuale (kg) <span class="optional">— opzionale, per categoria weight class</span>
                <input v-model.number="bodyweightKg" type="number" min="30" max="250" step="0.1" placeholder="es. 82.5" />
            </label>

            <p v-if="error" class="error">{{ error }}</p>

            <button
                v-if="videoFile"
                class="btn-submit"
                :disabled="uploading"
                @click="onUpload"
            >
                {{ uploading ? `Caricamento ${uploadProgress}%…` : '✓ Carica e collega al PR' }}
            </button>
        </section>

        <section v-if="result" class="card success-card">
            <h2>🎉 Caricato!</h2>
            <p>Il video è stato collegato al tuo PR.</p>
            <p v-if="result.worldEntryId">
                <strong>Entry World Leaderboard creata!</strong> In attesa di verifica dal tuo trainer.
            </p>
            <div class="actions">
                <router-link to="/proof-of-lift/me" class="btn-link">Vedi i miei PR</router-link>
                <router-link to="/leaderboard/world" class="btn-link">World Leaderboard</router-link>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { attachProofVideo } from '@/services/world-leaderboard.service'

interface PR {
    id: number
    exercise_id: number
    exercise_name: string
    value: number
    record_type: string
    recorded_at: string
    proof_video_id: number | null
}

const prs = ref<PR[]>([])
const loadingPRs = ref(true)
const selectedPrId = ref<number | null>(null)
const videoFile = ref<File | null>(null)
const bodyweightKg = ref<number | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref<string | null>(null)
const result = ref<{ prRecordId: number; videoId: number; worldEntryId?: number } | null>(null)

const formatDate = (s: string) => new Date(s).toLocaleDateString('it-IT')
const formatSize = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`

const onFileSelect = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 500 * 1024 * 1024) {
        error.value = 'File troppo grande (max 500MB)'
        return
    }
    videoFile.value = file
    error.value = null
}

const loadPRs = async () => {
    loadingPRs.value = true
    try {
        const res = await api.get('/progress/me/records').catch(() => ({ data: { data: [] } }))
        prs.value = res.data?.data || []
    } finally {
        loadingPRs.value = false
    }
}

const onUpload = async () => {
    if (!videoFile.value || !selectedPrId.value) return
    uploading.value = true
    error.value = null
    uploadProgress.value = 0
    try {
        // 1. Upload video
        const fd = new FormData()
        fd.append('video', videoFile.value)
        fd.append('title', `Proof-of-Lift PR #${selectedPrId.value}`)
        fd.append('video_type', 'proof_of_lift')
        const uploadRes = await api.post('/videos/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e: any) => {
                if (e.total) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
            }
        })
        const videoId = uploadRes.data?.data?.id || uploadRes.data?.id
        if (!videoId) throw new Error('Upload video fallito')

        // 2. Attach al PR
        const attachRes = await attachProofVideo({
            prRecordId: selectedPrId.value,
            videoId,
            bodyweightKg: bodyweightKg.value || undefined
        })
        result.value = attachRes.data?.data || attachRes.data
        videoFile.value = null
        selectedPrId.value = null
        bodyweightKg.value = null
        await loadPRs()
    } catch (e: any) {
        error.value = e?.response?.data?.message || e?.message || 'Errore upload'
    } finally {
        uploading.value = false
    }
}

onMounted(loadPRs)
</script>

<style scoped>
.upload-pr { max-width: 800px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.card h2 { margin: 0 0 12px; font-size: 16px; }
.loading, .empty { color: #94a3b8; padding: 16px; text-align: center; }
.pr-list { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow-y: auto; }
.pr-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px; border: 2px solid transparent; border-radius: 8px; cursor: pointer;
    transition: all 0.15s;
}
.pr-item:hover:not(.has-video) { background: #f8fafc; }
.pr-item.selected { border-color: #6366f1; background: #eef2ff; }
.pr-item.has-video { opacity: 0.5; cursor: not-allowed; }
.pr-info { display: flex; flex-direction: column; gap: 2px; }
.pr-value { color: #6366f1; font-weight: 700; font-size: 16px; }
.pr-date { font-size: 11px; color: #94a3b8; }
.badge-video { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.badge-selected { background: #ddd6fe; color: #5b21b6; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }

.upload-zone { text-align: center; padding: 32px; border: 2px dashed #cbd5e1; border-radius: 8px; }
.btn-upload { background: #6366f1; color: #fff; border: 0; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.hint { color: #94a3b8; font-size: 12px; margin-top: 8px; }

.file-preview {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px; background: #f1f5f9; border-radius: 8px; margin-bottom: 12px;
}
.btn-remove { background: transparent; color: #ef4444; border: 0; cursor: pointer; font-size: 20px; }

.bw-field { display: flex; flex-direction: column; gap: 4px; margin: 12px 0; font-size: 13px; color: #475569; }
.optional { color: #94a3b8; font-weight: 400; font-size: 12px; }
.bw-field input { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; max-width: 200px; }

.btn-submit {
    background: #10b981; color: #fff; border: 0; padding: 12px 24px;
    border-radius: 6px; font-weight: 700; cursor: pointer; width: 100%; font-size: 15px;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.error { color: #991b1b; background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin: 8px 0; }

.success-card { background: linear-gradient(135deg, #d1fae5, #fff); border-color: #10b981; }
.actions { display: flex; gap: 12px; margin-top: 16px; }
.btn-link { background: #fff; border: 1px solid #6366f1; color: #6366f1; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; }
.btn-link:hover { background: #6366f1; color: #fff; }
</style>
