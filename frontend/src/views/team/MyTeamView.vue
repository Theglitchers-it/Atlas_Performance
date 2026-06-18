<template>
    <div class="my-team">
        <header class="page-header">
            <div class="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1>Il mio Team</h1>
                    <p class="subtitle">Gestisci trainer e professionisti della tua organizzazione.</p>
                </div>
                <button
                    v-if="canManage"
                    @click="showAddModal = true"
                    class="px-4 py-2 bg-habit-orange text-white text-sm font-medium rounded-xl hover:bg-habit-orange-light transition-colors"
                >
                    + Aggiungi membro
                </button>
            </div>
        </header>

        <div v-if="loading" class="loading">Caricamento team…</div>
        <div v-else-if="error" class="error">{{ error }}</div>

        <div v-else-if="team.length === 0" class="empty">
            <p>Non hai ancora membri nel tuo team.</p>
            <p class="hint">Clicca "Aggiungi membro" per invitare un trainer o un altro professionista.</p>
        </div>

        <ul v-else class="team-tree">
            <li
                v-for="m in team"
                :key="m.id"
                class="team-node"
                :style="{ paddingLeft: m.depth * 24 + 'px' }"
            >
                <div class="node-content">
                    <span class="connector" v-if="m.depth > 0">└─</span>
                    <div class="member-info">
                        <strong>{{ m.first_name }} {{ m.last_name }}</strong>
                        <span class="email">{{ m.email }}</span>
                    </div>

                    <!-- Role dropdown (editabile inline per gym_admin) -->
                    <select
                        v-if="canManage && m.id !== currentUserId && m.role !== 'tenant_owner'"
                        :value="memberRole(m)"
                        @change="onRoleChange(m, ($event.target as HTMLSelectElement).value)"
                        :disabled="updatingId === m.id"
                        class="role-select"
                    >
                        <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                    </select>
                    <UserRoleBadge v-else :roles="[mapRole(m.role)]" />

                    <!-- Bottone rimuovi -->
                    <button
                        v-if="canManage && m.id !== currentUserId && m.role !== 'tenant_owner'"
                        @click="askRemove(m)"
                        :disabled="removingId === m.id"
                        class="remove-btn"
                        aria-label="Rimuovi dal team"
                        title="Rimuovi dal team"
                    >
                        ×
                    </button>
                </div>
            </li>
        </ul>

        <!-- Modal "Aggiungi membro" -->
        <Teleport to="body">
            <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
                <div class="modal-content">
                    <h3 class="text-lg font-bold text-habit-text mb-4">Aggiungi membro al team</h3>
                    <form @submit.prevent="onAddSubmit" class="space-y-3">
                        <label class="block">
                            <span class="text-sm text-habit-text-muted">Nome</span>
                            <input v-model="addForm.firstName" type="text" required class="form-input" />
                        </label>
                        <label class="block">
                            <span class="text-sm text-habit-text-muted">Cognome</span>
                            <input v-model="addForm.lastName" type="text" required class="form-input" />
                        </label>
                        <label class="block">
                            <span class="text-sm text-habit-text-muted">Email</span>
                            <input v-model="addForm.email" type="email" required class="form-input" />
                        </label>
                        <label class="block">
                            <span class="text-sm text-habit-text-muted">Ruolo</span>
                            <select v-model="addForm.role" class="form-input">
                                <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                            </select>
                        </label>
                        <div class="flex gap-2 justify-end mt-4">
                            <button type="button" @click="showAddModal = false" :disabled="addLoading" class="btn-cancel">Annulla</button>
                            <button type="submit" :disabled="addLoading" class="btn-primary">
                                {{ addLoading ? "Aggiungo…" : "Aggiungi" }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>

        <!-- Modal credenziali temporanee dopo creazione -->
        <Teleport to="body">
            <div v-if="lastCreated" class="modal-backdrop" @click.self="lastCreated = null">
                <div class="modal-content">
                    <h3 class="text-lg font-bold text-habit-text mb-2">Membro creato ✓</h3>
                    <p class="text-sm text-habit-text-muted mb-4">
                        Condividi queste credenziali iniziali con il nuovo membro. Dovrà cambiare la password al primo accesso.
                    </p>
                    <div class="creds-box">
                        <div><strong>Email:</strong> {{ lastCreated.email }}</div>
                        <div><strong>Password temp:</strong> <code>{{ lastCreated.tempPassword }}</code></div>
                    </div>
                    <button @click="copyCredentials" class="btn-primary mt-3">Copia credenziali</button>
                    <button @click="lastCreated = null" class="btn-cancel mt-2">Chiudi</button>
                </div>
            </div>
        </Teleport>

        <!-- Confirm remove -->
        <ConfirmDialog
            v-model="showRemoveConfirm"
            title="Rimuovere dal team?"
            :message="`Vuoi davvero rimuovere ${pendingRemove?.first_name} ${pendingRemove?.last_name} dal tuo team? Il suo account verrà disattivato.`"
            confirm-text="Rimuovi"
            cancel-text="Annulla"
            variant="danger"
            @confirm="confirmRemove"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMyTeam, type TeamMember } from '@/services/roles.service'
import api from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from 'vue-toastification'
import UserRoleBadge from '@/components/UserRoleBadge.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const auth = useAuthStore()
const toast = useToast()

const team = ref<TeamMember[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const currentUserId = computed(() => auth.user?.id || 0)
const canManage = computed(() =>
    auth.user?.role === 'tenant_owner' ||
    auth.user?.role === 'super_admin' ||
    (auth.user?.roles || []).includes('gym_admin' as any)
)

const ROLE_OPTIONS = [
    { value: 'trainer', label: 'Trainer' },
    { value: 'nutritionist', label: 'Nutrizionista' },
    { value: 'staff', label: 'Collaboratore' },
    { value: 'front_desk', label: 'Reception' },
    { value: 'accountant', label: 'Amministrazione' },
]

const mapRole = (legacy: string): string => {
    if (legacy === 'tenant_owner') return 'gym_admin'
    if (legacy === 'staff') return 'trainer'
    return legacy
}

const memberRole = (m: any): string => {
    // Se l'API ritorna m.roles[], prendi il primo; altrimenti mapRole sul legacy
    if (Array.isArray((m as any).roles) && (m as any).roles[0]) return (m as any).roles[0]
    return mapRole(m.role)
}

const loadTeam = async () => {
    loading.value = true
    error.value = null
    try {
        const res = await getMyTeam()
        team.value = res.data.data
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Impossibile caricare il team'
    } finally {
        loading.value = false
    }
}

// === Add member ===
const showAddModal = ref(false)
const addLoading = ref(false)
const addForm = ref({ email: '', firstName: '', lastName: '', role: 'trainer' })
const lastCreated = ref<{ email: string; tempPassword: string } | null>(null)

const onAddSubmit = async () => {
    addLoading.value = true
    try {
        const res = await api.post('/team/staff', addForm.value)
        const data = res.data?.data
        lastCreated.value = { email: data.email, tempPassword: data.tempPassword }
        showAddModal.value = false
        addForm.value = { email: '', firstName: '', lastName: '', role: 'trainer' }
        await loadTeam()
    } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Errore creazione membro')
    } finally {
        addLoading.value = false
    }
}

const copyCredentials = () => {
    if (!lastCreated.value) return
    const text = `Email: ${lastCreated.value.email}\nPassword temporanea: ${lastCreated.value.tempPassword}`
    navigator.clipboard.writeText(text).then(
        () => toast.success('Credenziali copiate'),
        () => toast.error('Impossibile copiare')
    )
}

// === Role change ===
const updatingId = ref<number | null>(null)
const onRoleChange = async (m: any, newRole: string) => {
    updatingId.value = m.id
    try {
        await api.patch(`/team/staff/${m.id}/role`, { role: newRole })
        toast.success('Ruolo aggiornato')
        await loadTeam()
    } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Errore aggiornamento ruolo')
    } finally {
        updatingId.value = null
    }
}

// === Remove ===
const showRemoveConfirm = ref(false)
const pendingRemove = ref<TeamMember | null>(null)
const removingId = ref<number | null>(null)

const askRemove = (m: TeamMember) => {
    pendingRemove.value = m
    showRemoveConfirm.value = true
}

const confirmRemove = async () => {
    if (!pendingRemove.value) return
    removingId.value = pendingRemove.value.id
    try {
        await api.delete(`/team/staff/${pendingRemove.value.id}`)
        toast.success('Membro rimosso dal team')
        await loadTeam()
    } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Errore rimozione membro')
    } finally {
        removingId.value = null
        pendingRemove.value = null
    }
}

onMounted(loadTeam)
</script>

<style scoped>
.my-team {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
}

.page-header {
    margin-bottom: 24px;
}

.page-header h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 4px;
}

.subtitle {
    color: #64748b;
    margin: 0;
}

.loading, .error, .empty {
    padding: 32px;
    text-align: center;
    background: #f8fafc;
    border-radius: 8px;
}

.error {
    background: #fee2e2;
    color: #991b1b;
}

.hint {
    color: #94a3b8;
    font-size: 14px;
    margin-top: 4px;
}

.team-tree {
    list-style: none;
    margin: 0;
    padding: 0;
}

.team-node {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 8px;
    transition: border-color 0.15s;
}

.team-node:hover {
    border-color: #ff4c00;
}

.node-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
}

.connector {
    color: #94a3b8;
    font-family: monospace;
    flex-shrink: 0;
}

.member-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.member-info strong {
    font-size: 14px;
    font-weight: 600;
}

.email {
    font-size: 12px;
    color: #64748b;
}

.role-select {
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
}

.remove-btn {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #fecaca;
    background: #fff;
    color: #dc2626;
    border-radius: 6px;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s;
}

.remove-btn:hover:not(:disabled) {
    background: #fee2e2;
}

.remove-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
}

.modal-content {
    background: var(--habit-card, #fff);
    border-radius: 16px;
    padding: 24px;
    max-width: 420px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}

.form-input {
    margin-top: 4px;
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    background: #fff;
}

.form-input:focus {
    outline: none;
    border-color: #ff4c00;
}

.btn-primary {
    padding: 8px 16px;
    background: #ff4c00;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
    background: #ff6b2b;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-cancel {
    padding: 8px 16px;
    background: transparent;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
}

.creds-box {
    background: #f1f5f9;
    border-radius: 8px;
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
}

.creds-box code {
    background: #fff;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    border: 1px solid #e2e8f0;
}
</style>
