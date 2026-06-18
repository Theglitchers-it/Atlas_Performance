<template>
    <div class="loc-tree">
        <header class="page-header">
            <h1>Sedi & Filiali</h1>
            <p class="subtitle">Gerarchia delle sedi della tua organizzazione. Seleziona una sede per vedere lo staff assegnato.</p>
        </header>

        <div class="layout">
            <!-- Left: tree -->
            <aside class="tree-sidebar">
                <div v-if="loadingTree" class="loading">Caricamento sedi…</div>
                <div v-else-if="tree.length === 0" class="empty">
                    <p>Nessuna sede configurata.</p>
                    <p class="hint">Aggiungi sedi dall'area gestione.</p>
                </div>
                <ul v-else class="tree">
                    <li
                        v-for="node in tree"
                        :key="node.id"
                        :class="['tree-node', { selected: selectedId === node.id, [`depth-${node.depth}`]: true }]"
                        :style="{ paddingLeft: (node.depth * 20 + 12) + 'px' }"
                        @click="selectedId = node.id"
                    >
                        <span class="node-icon">{{ nodeIcon(node) }}</span>
                        <span class="node-name">{{ node.name }}</span>
                        <span v-if="node.city" class="node-city">· {{ node.city }}</span>
                        <span class="node-type">{{ LOCATION_TYPE_LABELS[node.location_type] || node.location_type }}</span>
                    </li>
                </ul>
            </aside>

            <!-- Right: staff della location selezionata -->
            <section class="staff-section">
                <div v-if="!selectedId" class="empty">
                    <p>Seleziona una sede dall'albero per vedere lo staff assegnato.</p>
                </div>
                <template v-else>
                    <header class="staff-header">
                        <h2>{{ selectedName || 'Sede #' + selectedId }}</h2>
                        <button v-if="canEdit" class="btn-assign" @click="showAssign = true">+ Assegna staff</button>
                    </header>

                    <div v-if="loadingStaff" class="loading">Caricamento staff…</div>
                    <div v-else-if="staff.length === 0" class="empty">Nessuno staff assegnato a questa sede.</div>
                    <ul v-else class="staff-list">
                        <li v-for="s in staff" :key="s.assignment_id" class="staff-row">
                            <div class="staff-info">
                                <div class="avatar">{{ initialOf(s.first_name) }}{{ initialOf(s.last_name) }}</div>
                                <div>
                                    <strong>{{ s.first_name }} {{ s.last_name }}</strong>
                                    <span class="role">{{ LOCATION_ROLE_LABELS[s.role_at_location] || s.role_at_location }}</span>
                                    <span v-if="s.is_primary" class="primary-badge">Primaria</span>
                                </div>
                            </div>
                            <button v-if="canEdit" class="btn-remove" @click="onRemove(s.user_id)">Rimuovi</button>
                        </li>
                    </ul>
                </template>
            </section>
        </div>

        <!-- Modal assegnazione -->
        <Teleport to="body">
            <div v-if="showAssign" class="modal-backdrop" @click.self="showAssign = false">
                <div class="modal">
                    <h3>Assegna staff a "{{ selectedName }}"</h3>
                    <label>
                        Utente *
                        <select v-model.number="assignForm.userId">
                            <option :value="0" disabled>Seleziona…</option>
                            <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                                {{ u.first_name }} {{ u.last_name }}
                            </option>
                        </select>
                    </label>
                    <label>
                        Ruolo nella sede
                        <select v-model="assignForm.roleAtLocation">
                            <option v-for="(label, key) in LOCATION_ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
                        </select>
                    </label>
                    <label class="checkbox-row">
                        <input type="checkbox" v-model="assignForm.isPrimary" />
                        <span>Sede primaria per questo utente</span>
                    </label>
                    <p v-if="assignError" class="error">{{ assignError }}</p>
                    <div class="actions">
                        <button class="btn-cancel" @click="showAssign = false" :disabled="assigning">Annulla</button>
                        <button class="btn-submit" @click="onAssign" :disabled="assigning || !assignForm.userId">{{ assigning ? '…' : 'Assegna' }}</button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
    getLocationTree,
    getLocationStaff,
    assignStaffToLocation,
    removeStaffFromLocation,
    LOCATION_TYPE_LABELS,
    LOCATION_ROLE_LABELS,
    type LocationTreeNode,
    type LocationStaff
} from '@/services/staff-locations.service'
import { useAuthStore } from '@/store/auth'
import api from '@/services/api'

const auth = useAuthStore()
const tree = ref<LocationTreeNode[]>([])
const loadingTree = ref(true)
const selectedId = ref<number | null>(null)
const staff = ref<LocationStaff[]>([])
const loadingStaff = ref(false)
const showAssign = ref(false)
const assigning = ref(false)
const assignError = ref<string | null>(null)
const availableUsers = ref<any[]>([])
const assignForm = ref({ userId: 0, roleAtLocation: 'trainer', isPrimary: false })

const canEdit = computed(() => auth.isGymAdmin || auth.user?.role === 'tenant_owner' || auth.user?.role === 'super_admin')

const selectedName = computed(() => tree.value.find(n => n.id === selectedId.value)?.name || '')

const initialOf = (s?: string) => (s?.[0] || '?').toUpperCase()
const nodeIcon = (n: LocationTreeNode) => n.location_type === 'main' ? '🏢' : n.location_type === 'branch' ? '🏪' : n.location_type === 'popup' ? '⛺' : '📍'

const loadTree = async () => {
    loadingTree.value = true
    try {
        const res = await getLocationTree()
        tree.value = res.data.data
        if (tree.value.length > 0 && !selectedId.value) selectedId.value = tree.value[0].id
    } finally { loadingTree.value = false }
}

const loadStaff = async () => {
    if (!selectedId.value) return
    loadingStaff.value = true
    try {
        const res = await getLocationStaff(selectedId.value)
        staff.value = res.data.data
    } finally { loadingStaff.value = false }
}

const loadAvailableUsers = async () => {
    try {
        const res = await api.get('/users', { params: { role: 'staff', limit: 100 } })
        availableUsers.value = res.data?.data?.users || res.data?.data || []
    } catch { availableUsers.value = [] }
}

const onAssign = async () => {
    if (!selectedId.value || !assignForm.value.userId) return
    assigning.value = true
    assignError.value = null
    try {
        await assignStaffToLocation(selectedId.value, {
            userId: assignForm.value.userId,
            roleAtLocation: assignForm.value.roleAtLocation,
            isPrimary: assignForm.value.isPrimary
        })
        showAssign.value = false
        assignForm.value = { userId: 0, roleAtLocation: 'trainer', isPrimary: false }
        await loadStaff()
    } catch (e: any) {
        assignError.value = e?.response?.data?.message || 'Errore assegnazione'
    } finally { assigning.value = false }
}

const onRemove = async (userId: number) => {
    if (!selectedId.value || !confirm('Rimuovere lo staff da questa sede?')) return
    await removeStaffFromLocation(selectedId.value, userId)
    await loadStaff()
}

watch(selectedId, loadStaff)

onMounted(async () => {
    await loadTree()
    await loadStaff()
    if (canEdit.value) loadAvailableUsers()
})
</script>

<style scoped>
.loc-tree { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; margin-bottom: 24px; }

.layout { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }

.tree-sidebar, .staff-section {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
}

.tree { list-style: none; margin: 0; padding: 0; }
.tree-node {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 6px; cursor: pointer;
    font-size: 14px; transition: background 0.15s;
}
.tree-node:hover { background: #f1f5f9; }
.tree-node.selected { background: #eef2ff; color: #6366f1; font-weight: 600; }
.node-icon { font-size: 16px; }
.node-name { font-weight: 600; }
.node-city { color: #64748b; font-size: 12px; }
.node-type {
    margin-left: auto; font-size: 10px; color: #94a3b8;
    text-transform: uppercase; font-weight: 600;
}

.staff-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.staff-header h2 { margin: 0; font-size: 18px; }
.btn-assign { background: #6366f1; color: #fff; border: 0; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }

.staff-list { list-style: none; margin: 0; padding: 0; }
.staff-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 0; border-bottom: 1px solid #f1f5f9;
}
.staff-row:last-child { border-bottom: 0; }
.staff-info { display: flex; align-items: center; gap: 12px; }
.avatar {
    width: 36px; height: 36px; border-radius: 50%; background: #6366f1; color: #fff;
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
}
.role { display: block; font-size: 12px; color: #6366f1; font-weight: 600; }
.primary-badge {
    background: #10b981; color: #fff; padding: 2px 8px; border-radius: 10px;
    font-size: 10px; font-weight: 700; margin-left: 8px; text-transform: uppercase;
}
.btn-remove { background: transparent; color: #ef4444; border: 1px solid #fee2e2; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-remove:hover { background: #fee2e2; }

.loading, .empty { color: #94a3b8; text-align: center; padding: 24px; font-size: 14px; }
.hint { margin-top: 4px; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 90%; max-width: 480px; }
.modal h3 { margin: 0 0 16px; font-size: 18px; }
.modal label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 13px; color: #475569; font-weight: 500; }
.modal select, .modal input[type=text] {
    padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;
}
.checkbox-row { flex-direction: row !important; align-items: center; gap: 8px; }
.error { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel, .btn-submit { padding: 8px 16px; border-radius: 6px; border: 0; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-submit { background: #6366f1; color: #fff; }
.btn-submit:disabled { opacity: 0.5; }
</style>
