<template>
    <div class="moderation">
        <header class="page-header">
            <h1>Moderazione Community</h1>
            <p class="subtitle">Segnalazioni in coda. Decidi se ignorare o rimuovere i post problematici.</p>
        </header>

        <div class="tabs">
            <button v-for="t in tabs" :key="t.value"
                    :class="['tab', { active: currentStatus === t.value }]"
                    @click="setStatus(t.value)">
                {{ t.label }}
            </button>
        </div>

        <div v-if="loading" class="loading">Caricamento…</div>
        <div v-else-if="reports.length === 0" class="empty">Nessuna segnalazione in stato "{{ currentStatus }}".</div>

        <ul v-else class="reports">
            <li v-for="r in reports" :key="r.id" class="report-card">
                <div class="report-head">
                    <span class="reason-tag" :class="`reason-${r.reason}`">{{ REPORT_REASON_LABELS[r.reason] }}</span>
                    <span class="time">{{ formatTime(r.created_at) }}</span>
                </div>
                <div class="report-body">
                    <p class="quoted">{{ r.post_content.slice(0, 200) }}{{ r.post_content.length > 200 ? '…' : '' }}</p>
                    <div class="meta">
                        <span>Segnalato da: <strong>{{ r.reporter_first_name }} {{ r.reporter_last_name }}</strong></span>
                        <span v-if="r.details" class="details">"{{ r.details }}"</span>
                    </div>
                </div>
                <div v-if="r.status === 'pending'" class="actions">
                    <button class="btn-dismiss" @click="onModerate(r.id, 'dismiss')" :disabled="actingOn === r.id">Ignora</button>
                    <button class="btn-remove" @click="onModerate(r.id, 'remove')" :disabled="actingOn === r.id">Rimuovi post</button>
                </div>
                <div v-else class="moderated-note">
                    Moderato da <strong>{{ r.moderator_first_name }} {{ r.moderator_last_name }}</strong>
                    <span v-if="r.moderated_at"> il {{ formatTime(r.moderated_at) }}</span>
                </div>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
    listReports,
    moderatePost,
    REPORT_REASON_LABELS,
    type PostReport,
    type ReportStatus
} from '@/services/community-moderation.service'

const reports = ref<PostReport[]>([])
const loading = ref(true)
const currentStatus = ref<ReportStatus>('pending')
const actingOn = ref<number | null>(null)

const tabs: { value: ReportStatus; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'dismissed', label: 'Ignorate' },
    { value: 'removed', label: 'Rimosse' }
]

const formatTime = (iso: string) => new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

const load = async () => {
    loading.value = true
    try {
        const res = await listReports(currentStatus.value)
        reports.value = res.data.data
    } finally {
        loading.value = false
    }
}

const setStatus = (status: ReportStatus) => {
    currentStatus.value = status
    load()
}

const onModerate = async (reportId: number, action: 'dismiss' | 'remove') => {
    if (action === 'remove' && !confirm('Sei sicuro? Il post verrà nascosto a tutti.')) return
    actingOn.value = reportId
    try {
        await moderatePost(reportId, action)
        reports.value = reports.value.filter(r => r.id !== reportId)
    } finally {
        actingOn.value = null
    }
}

onMounted(load)
</script>

<style scoped>
.moderation { max-width: 900px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; }
.tabs { display: flex; gap: 4px; margin: 24px 0 16px; border-bottom: 2px solid #e2e8f0; }
.tab {
    padding: 8px 16px; background: transparent; border: 0; cursor: pointer;
    font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -2px;
}
.tab.active { color: #6366f1; border-bottom-color: #6366f1; }
.loading, .empty { padding: 32px; text-align: center; color: #94a3b8; }
.reports { list-style: none; margin: 0; padding: 0; }
.report-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 16px; margin-bottom: 12px;
}
.report-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.reason-tag {
    padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;
    background: #fef3c7; color: #92400e;
}
.reason-spam { background: #fee2e2; color: #991b1b; }
.reason-harassment { background: #fecaca; color: #7f1d1d; }
.reason-inappropriate { background: #fecdd3; color: #831843; }
.time { color: #94a3b8; font-size: 12px; }
.quoted { background: #f8fafc; padding: 10px; border-left: 3px solid #cbd5e1; margin: 8px 0; font-style: italic; font-size: 14px; }
.meta { font-size: 13px; color: #475569; }
.details { display: block; color: #64748b; margin-top: 4px; font-style: italic; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.btn-dismiss, .btn-remove {
    padding: 8px 14px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 13px;
}
.btn-dismiss { background: #f1f5f9; color: #475569; }
.btn-remove { background: #ef4444; color: #fff; }
.moderated-note { margin-top: 8px; font-size: 12px; color: #94a3b8; font-style: italic; }
</style>
