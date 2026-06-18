<template>
    <div v-if="visible" class="modal-backdrop" @click.self="$emit('close')">
        <div class="modal">
            <h3>Foto cliente</h3>

            <div v-if="!previewUrl && !currentPhoto" class="placeholder">
                <span class="ph-icon">📷</span>
                <p>Carica una foto del cliente per riconoscerlo a colpo d'occhio.</p>
            </div>
            <img v-else :src="previewUrl || currentPhoto || ''" class="preview" alt="Foto cliente" />

            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" @change="onFileSelect" hidden />

            <p v-if="error" class="error">{{ error }}</p>

            <div class="actions">
                <button v-if="currentPhoto && !file" class="btn-delete" @click="onDelete" :disabled="uploading">Elimina</button>
                <button class="btn-cancel" @click="$emit('close')" :disabled="uploading">Annulla</button>
                <button class="btn-pick" @click="($refs.fileInput as HTMLInputElement)?.click()" :disabled="uploading">{{ file ? 'Cambia' : 'Seleziona' }}</button>
                <button v-if="file" class="btn-upload" @click="onUpload" :disabled="uploading">{{ uploading ? '…' : 'Carica' }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '@/services/api'

const props = defineProps<{ visible: boolean; clientId: number; currentPhoto?: string | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated', photoUrl: string | null): void }>()

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
const error = ref<string | null>(null)

watch(() => props.visible, v => {
    if (!v) { file.value = null; previewUrl.value = null; error.value = null }
})

const onFileSelect = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
        error.value = 'Foto troppo grande (max 5MB)'
        return
    }
    error.value = null
    // Compressione client-side a 400x400
    try {
        file.value = await compressToSquare(f, 400)
        previewUrl.value = URL.createObjectURL(file.value)
    } catch {
        file.value = f
        previewUrl.value = URL.createObjectURL(f)
    }
}

const onUpload = async () => {
    if (!file.value) return
    uploading.value = true
    error.value = null
    try {
        const fd = new FormData()
        fd.append('photo', file.value)
        const res = await api.post(`/clients/${props.clientId}/photo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        emit('updated', res.data?.data?.photo_url || null)
        emit('close')
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore upload'
    } finally {
        uploading.value = false
    }
}

const onDelete = async () => {
    if (!confirm('Eliminare la foto?')) return
    uploading.value = true
    try {
        await api.delete(`/clients/${props.clientId}/photo`)
        emit('updated', null)
        emit('close')
    } finally { uploading.value = false }
}

async function compressToSquare(srcFile: File, size: number): Promise<File> {
    const img = await loadImage(URL.createObjectURL(srcFile))
    const minDim = Math.min(img.width, img.height)
    const offsetX = (img.width - minDim) / 2
    const offsetY = (img.height - minDim) / 2

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, offsetX, offsetY, minDim, minDim, 0, 0, size, size)

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Compression failed'))
            resolve(new File([blob], srcFile.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.85)
    })
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 400px; }
.modal h3 { margin: 0 0 16px; font-size: 18px; }
.placeholder { text-align: center; padding: 32px 16px; background: #f8fafc; border-radius: 12px; }
.ph-icon { font-size: 48px; display: block; margin-bottom: 12px; }
.placeholder p { margin: 0; color: #64748b; font-size: 14px; }
.preview { width: 200px; height: 200px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 16px; border: 4px solid #f1f5f9; }
.error { color: #991b1b; background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 13px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
.btn-delete, .btn-cancel, .btn-pick, .btn-upload { padding: 8px 14px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 13px; }
.btn-delete { background: transparent; color: #ef4444; border: 1px solid #fee2e2; margin-right: auto; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-pick { background: #fff; color: #6366f1; border: 1px solid #6366f1; }
.btn-upload { background: #10b981; color: #fff; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
