<template>
    <div class="trainers-panel">
        <div class="panel-header">
            <h3>Trainer & Nutrizionisti</h3>
            <button v-if="canEdit" class="btn-add-trainer" @click="showAddForm = true">+ Assegna</button>
        </div>

        <div v-if="loading" class="loading">Caricamento…</div>
        <div v-else-if="trainers.length === 0" class="empty">Nessun professionista assegnato.</div>

        <ul v-else class="trainers-list">
            <li v-for="t in trainers" :key="t.id" class="trainer-row">
                <div class="trainer-info">
                    <div class="avatar">{{ initialOf(t.first_name) }}{{ initialOf(t.last_name) }}</div>
                    <div class="info">
                        <strong>{{ t.first_name }} {{ t.last_name }}</strong>
                        <span class="relation">{{ RELATION_LABELS[t.relation_role] || t.relation_role }}</span>
                        <span class="email">{{ t.email }}</span>
                    </div>
                </div>
                <button v-if="canEdit" class="btn-remove" @click="onRemove(t.user_id, t.relation_role)" :disabled="removingId === t.id">
                    {{ removingId === t.id ? '…' : 'Rimuovi' }}
                </button>
            </li>
        </ul>

        <!-- Form add -->
        <Teleport to="body">
            <div v-if="showAddForm" class="modal-backdrop" @click.self="showAddForm = false">
                <div class="modal">
                    <h3>Assegna professionista</h3>

                    <label>
                        Trainer / Nutrizionista *
                        <select v-model.number="form.userId">
                            <option :value="0" disabled>Seleziona…</option>
                            <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                                {{ u.first_name }} {{ u.last_name }} ({{ u.role }})
                            </option>
                        </select>
                    </label>

                    <label>
                        Ruolo della relazione *
                        <select v-model="form.relationRole">
                            <option v-for="(label, key) in RELATION_LABELS" :key="key" :value="key">{{ label }}</option>
                        </select>
                    </label>

                    <label>
                        Note (opzionale)
                        <textarea v-model="form.notes" rows="2" maxlength="500" placeholder="Es. 'Specialista alimentazione vegana'"></textarea>
                    </label>

                    <div v-if="error" class="error">{{ error }}</div>

                    <div class="actions">
                        <button class="btn-cancel" @click="showAddForm = false" :disabled="saving">Annulla</button>
                        <button class="btn-submit" @click="onAdd" :disabled="saving || !form.userId">{{ saving ? 'Salvataggio…' : 'Assegna' }}</button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    getClientTrainers,
    assignTrainerToClient,
    removeTrainerFromClient,
    RELATION_LABELS,
    type ClientTrainer,
    type RelationRole
} from '@/services/roles.service'
import { useAuthStore } from '@/store/auth'
import api from '@/services/api'

const props = defineProps<{ clientId: number }>()
const auth = useAuthStore()

const trainers = ref<ClientTrainer[]>([])
const loading = ref(true)
const removingId = ref<number | null>(null)
const showAddForm = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const availableUsers = ref<any[]>([])
const form = ref<{ userId: number; relationRole: RelationRole; notes: string }>({
    userId: 0,
    relationRole: 'primary_trainer',
    notes: ''
})

// auth.isGymAdmin copre gym_admin + tenant_owner; staff/super_admin gestiti via role legacy.
const canEdit = computed(() =>
    auth.isGymAdmin ||
    auth.isAppTrainer ||
    auth.user?.role === 'staff' ||
    auth.user?.role === 'super_admin'
)

const initialOf = (s?: string) => (s?.[0] || '?').toUpperCase()

const load = async () => {
    loading.value = true
    try {
        const res = await getClientTrainers(props.clientId)
        trainers.value = res.data.data
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore caricamento trainer'
    } finally {
        loading.value = false
    }
}

const loadAvailableUsers = async () => {
    try {
        const res = await api.get('/users', { params: { role: 'staff', limit: 100 } })
        availableUsers.value = res.data?.data?.users || res.data?.data || []
    } catch { availableUsers.value = [] }
}

const onAdd = async () => {
    if (!form.value.userId) return
    saving.value = true
    error.value = null
    try {
        await assignTrainerToClient(props.clientId, {
            userId: form.value.userId,
            relationRole: form.value.relationRole,
            notes: form.value.notes || undefined
        })
        showAddForm.value = false
        form.value = { userId: 0, relationRole: 'primary_trainer', notes: '' }
        await load()
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Errore assegnazione'
    } finally {
        saving.value = false
    }
}

const onRemove = async (userId: number, relationRole: string) => {
    if (!confirm(`Rimuovere ${RELATION_LABELS[relationRole as RelationRole] || relationRole}?`)) return
    removingId.value = userId
    try {
        await removeTrainerFromClient(props.clientId, userId, relationRole)
        await load()
    } finally {
        removingId.value = null
    }
}

onMounted(() => {
    load()
    if (canEdit.value) loadAvailableUsers()
})
</script>

<style scoped>
.trainers-panel {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 16px; margin: 12px 0;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.panel-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.btn-add-trainer { background: #6366f1; color: #fff; border: 0; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.loading, .empty { color: #94a3b8; text-align: center; padding: 16px; font-size: 14px; }
.trainers-list { list-style: none; margin: 0; padding: 0; }
.trainer-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid #f1f5f9;
}
.trainer-row:last-child { border-bottom: 0; }
.trainer-info { display: flex; align-items: center; gap: 12px; }
.avatar {
    width: 36px; height: 36px; border-radius: 50%; background: #6366f1; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
}
.info { display: flex; flex-direction: column; }
.info strong { font-size: 14px; }
.relation { font-size: 12px; color: #6366f1; font-weight: 600; }
.email { font-size: 11px; color: #94a3b8; }
.btn-remove {
    background: transparent; color: #ef4444; border: 1px solid #fee2e2;
    padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;
}
.btn-remove:hover:not(:disabled) { background: #fee2e2; }
.btn-remove:disabled { opacity: 0.5; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 90%; max-width: 480px; }
.modal h3 { margin: 0 0 16px; font-size: 18px; }
.modal label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 13px; color: #475569; font-weight: 500; }
.modal select, .modal textarea, .modal input {
    padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-family: inherit;
}
.error { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel, .btn-submit { padding: 8px 16px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-submit { background: #6366f1; color: #fff; }
.btn-submit:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
