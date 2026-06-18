<template>
    <div class="my-prs">
        <header class="page-header">
            <h1>I miei Proof-of-Lift</h1>
            <p class="subtitle">Storico dei tuoi PR con video di certificazione e stato World Leaderboard.</p>
            <router-link to="/proof-of-lift/upload" class="btn-add">+ Carica nuovo PR</router-link>
        </header>

        <div v-if="loading" class="loading">Caricamento…</div>
        <div v-else-if="entries.length === 0" class="empty">
            <p>Nessun PR con video ancora.</p>
            <p class="hint">Vai a "Carica nuovo PR" per iniziare la tua scalata nella classifica mondiale.</p>
        </div>

        <ul v-else class="entries">
            <li v-for="e in entries" :key="e.id" :class="['entry-card', `status-${e.status}`]">
                <div class="entry-head">
                    <div>
                        <strong>{{ e.display_label }}</strong>
                        <span class="value">{{ e.value }} kg</span>
                        <span v-if="e.weight_class" class="wc">· {{ e.weight_class }}kg</span>
                    </div>
                    <span class="status-badge">{{ STATUS_LABELS[e.status] }}</span>
                </div>
                <div class="entry-meta">
                    Caricato il {{ formatDate(e.submitted_at) }}
                </div>
                <div class="entry-actions">
                    <a v-if="e.proof_video_id" :href="`/videos/${e.proof_video_id}`" target="_blank" class="btn-watch">📹 Guarda video</a>
                </div>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyWorldEntries, STATUS_LABELS, type MyWorldEntry } from '@/services/world-leaderboard.service'

const entries = ref<MyWorldEntry[]>([])
const loading = ref(true)

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

onMounted(async () => {
    try {
        const res = await getMyWorldEntries()
        entries.value = res.data.data
    } finally { loading.value = false }
})
</script>

<style scoped>
.my-prs { max-width: 800px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; margin-bottom: 16px; }
.btn-add { display: inline-block; background: #6366f1; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; }
.loading, .empty { padding: 32px; text-align: center; background: #fff; border-radius: 12px; color: #94a3b8; }
.hint { margin-top: 8px; }
.entries { list-style: none; margin: 16px 0 0; padding: 0; }
.entry-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 16px; margin-bottom: 12px;
}
.entry-card.status-approved { border-left: 4px solid #10b981; }
.entry-card.status-pending_review { border-left: 4px solid #f59e0b; }
.entry-card.status-rejected { border-left: 4px solid #ef4444; }
.entry-head { display: flex; justify-content: space-between; align-items: center; }
.value { color: #6366f1; font-size: 18px; font-weight: 800; margin-left: 12px; }
.wc { color: #94a3b8; font-size: 13px; margin-left: 4px; }
.status-badge {
    padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;
}
.status-approved .status-badge { background: #d1fae5; color: #065f46; }
.status-pending_review .status-badge { background: #fef3c7; color: #92400e; }
.status-rejected .status-badge { background: #fee2e2; color: #991b1b; }
.entry-meta { font-size: 12px; color: #94a3b8; margin-top: 8px; }
.entry-actions { margin-top: 8px; }
.btn-watch { color: #6366f1; text-decoration: none; font-size: 13px; font-weight: 600; }
</style>
