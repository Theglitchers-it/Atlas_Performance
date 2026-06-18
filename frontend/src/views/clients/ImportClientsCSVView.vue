<template>
    <div class="import-view">
        <header class="page-header">
            <h1>Importa clienti da CSV</h1>
            <p class="subtitle">Wizard in 3 passi: carica il file, conferma la mappatura delle colonne, esegui l'import.</p>
        </header>

        <!-- Step indicator -->
        <ol class="steps">
            <li :class="{ active: step >= 1, done: step > 1 }">1. Upload CSV</li>
            <li :class="{ active: step >= 2, done: step > 2 }">2. Mappatura colonne</li>
            <li :class="{ active: step >= 3 }">3. Conferma + import</li>
        </ol>

        <!-- Step 1: upload -->
        <section v-if="step === 1" class="card">
            <h2>1. Carica file CSV</h2>
            <p class="info">
                Formato atteso: prima riga con header, separatore <code>,</code>. Le colonne minime sono <strong>nome</strong> e <strong>email</strong>.
                Esempio: <code>nome,cognome,email,telefono,data_nascita</code>
            </p>
            <input ref="fileInput" type="file" accept=".csv,text/csv" @change="onFileSelect" hidden />
            <button class="btn-pick" @click="($refs.fileInput as HTMLInputElement)?.click()" :disabled="loading">
                📁 Seleziona file CSV
            </button>
            <p v-if="file" class="file-preview">📄 {{ file.name }} ({{ formatSize(file.size) }})</p>
            <p v-if="error" class="error">{{ error }}</p>
            <button v-if="file" class="btn-primary" @click="onUploadAndPreview" :disabled="loading">
                {{ loading ? 'Analisi…' : 'Continua →' }}
            </button>
        </section>

        <!-- Step 2: mappatura -->
        <section v-if="step === 2 && preview" class="card">
            <h2>2. Mappa le colonne</h2>
            <p class="info">Trovate <strong>{{ preview.totalRows }}</strong> righe. Associa ogni campo del database alla colonna del tuo CSV (auto-mappatura già fatta dove possibile).</p>

            <div class="mapping">
                <div v-for="field in preview.dbFields" :key="field" class="mapping-row">
                    <label>{{ DB_FIELD_LABELS[field] || field }}</label>
                    <select v-model="mapping[field]">
                        <option value="">— Non importare —</option>
                        <option v-for="h in preview.headers" :key="h" :value="h">{{ h }}</option>
                    </select>
                </div>
            </div>

            <h3 class="preview-title">Anteprima (prime 5 righe)</h3>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr><th v-for="h in preview.headers" :key="h">{{ h }}</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="(row, i) in preview.preview" :key="i">
                            <td v-for="h in preview.headers" :key="h">{{ row[h] }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="actions">
                <button class="btn-cancel" @click="step = 1">← Indietro</button>
                <button class="btn-primary" @click="step = 3" :disabled="!mapping.first_name || !mapping.email">
                    Continua →
                </button>
            </div>
            <p v-if="!mapping.first_name || !mapping.email" class="warn">Mappa almeno Nome e Email per continuare.</p>
        </section>

        <!-- Step 3: conferma -->
        <section v-if="step === 3" class="card">
            <h2>3. Conferma import</h2>
            <p>Stai per importare <strong>{{ preview?.totalRows }}</strong> clienti. L'operazione verrà annullata se più del 5% delle righe ha errori.</p>

            <div class="actions">
                <button class="btn-cancel" @click="step = 2" :disabled="importing">← Indietro</button>
                <button class="btn-import" @click="onImport" :disabled="importing">
                    {{ importing ? 'Importazione…' : `Importa ${preview?.totalRows} clienti` }}
                </button>
            </div>

            <div v-if="result" class="result">
                <h3>Risultato</h3>
                <p>✅ <strong>{{ result.imported }}</strong> clienti importati</p>
                <p v-if="result.skipped > 0">⚠️ <strong>{{ result.skipped }}</strong> righe saltate</p>
                <details v-if="result.errors.length > 0">
                    <summary>Vedi errori ({{ result.errors.length }})</summary>
                    <ul>
                        <li v-for="e in result.errors" :key="e.row">Riga {{ e.row }}: {{ e.error }}</li>
                    </ul>
                </details>
                <router-link to="/clients" class="btn-primary" style="margin-top: 12px; display: inline-block;">
                    Torna alla lista clienti
                </router-link>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { previewImport, importCSV, DB_FIELD_LABELS, type ImportPreview } from '@/services/client-bulk-csv.service'

const step = ref(1)
const file = ref<File | null>(null)
const preview = ref<ImportPreview | null>(null)
const mapping = ref<Record<string, string>>({})
const loading = ref(false)
const importing = ref(false)
const error = ref<string | null>(null)
const result = ref<{ imported: number; skipped: number; errors: Array<{ row: number; error: string }> } | null>(null)

const formatSize = (b: number) => `${(b / 1024).toFixed(1)} KB`

const onFileSelect = (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { error.value = 'File troppo grande (max 5MB)'; return }
    file.value = f
    error.value = null
}

const onUploadAndPreview = async () => {
    if (!file.value) return
    loading.value = true
    error.value = null
    try {
        const res = await previewImport(file.value)
        preview.value = res.data.data
        mapping.value = { ...preview.value.suggestedMapping }
        step.value = 2
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore preview'
    } finally { loading.value = false }
}

const onImport = async () => {
    if (!file.value) return
    importing.value = true
    error.value = null
    try {
        const filtered = Object.fromEntries(Object.entries(mapping.value).filter(([_, v]) => v))
        const res = await importCSV(file.value, filtered)
        result.value = res.data.data
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore import'
    } finally { importing.value = false }
}
</script>

<style scoped>
.import-view { max-width: 900px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; margin-bottom: 24px; }
.steps { list-style: none; padding: 0; margin: 0 0 24px; display: flex; gap: 8px; }
.steps li { flex: 1; padding: 10px 16px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #94a3b8; font-weight: 600; }
.steps li.active { background: #eef2ff; color: #6366f1; }
.steps li.done { background: #d1fae5; color: #065f46; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.card h2 { margin: 0 0 12px; font-size: 18px; }
.card h3 { margin: 16px 0 8px; font-size: 15px; }
.info { color: #64748b; font-size: 14px; margin-bottom: 16px; }
.info code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
.btn-pick, .btn-primary, .btn-cancel, .btn-import {
    padding: 10px 18px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 14px;
}
.btn-pick { background: #fff; color: #6366f1; border: 1px solid #6366f1; }
.btn-primary { background: #6366f1; color: #fff; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-import { background: #10b981; color: #fff; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.file-preview { color: #065f46; background: #d1fae5; padding: 8px 12px; border-radius: 6px; margin: 12px 0; font-size: 13px; }
.error { color: #991b1b; background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-size: 13px; }
.warn { color: #92400e; font-size: 13px; margin-top: 8px; }
.mapping { display: grid; grid-template-columns: 1fr 2fr; gap: 8px 16px; margin-bottom: 16px; }
.mapping-row { display: contents; }
.mapping-row label { padding: 8px 0; font-weight: 500; }
.mapping-row select { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
.preview-title { margin-top: 24px; }
.table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 8px; text-align: left; border-bottom: 1px solid #f1f5f9; }
th { background: #f8fafc; font-weight: 600; }
.actions { display: flex; gap: 8px; justify-content: space-between; margin-top: 16px; }
.result { margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; }
.result h3 { margin: 0 0 8px; }
.result ul { margin: 8px 0 0; padding-left: 20px; font-size: 12px; }
</style>
