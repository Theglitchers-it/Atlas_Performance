<template>
    <div class="rules-view">
        <header class="page-header">
            <h1>Regole della Community</h1>
            <p class="subtitle">Linee guida per mantenere l'ambiente costruttivo e rispettoso.</p>
        </header>

        <section v-if="canEdit" class="card add-form">
            <h2>Aggiungi regola</h2>
            <form @submit.prevent="onAdd" class="form-grid">
                <label class="full">
                    Titolo *
                    <input v-model="form.title" type="text" maxlength="150" required placeholder="Es. Rispetta gli altri" />
                </label>
                <label class="full">
                    Descrizione
                    <textarea v-model="form.description" rows="3" maxlength="2000" placeholder="Spiega cosa significa..."></textarea>
                </label>
                <label>
                    Ordine
                    <input v-model.number="form.sortOrder" type="number" min="0" />
                </label>
                <button type="submit" class="btn-primary" :disabled="saving || !form.title">{{ saving ? 'Salvataggio…' : 'Aggiungi' }}</button>
            </form>
        </section>

        <section class="card">
            <h2>Regole attive</h2>
            <div v-if="loading" class="loading">Caricamento…</div>
            <div v-else-if="rules.length === 0" class="empty">Nessuna regola configurata.</div>
            <ol v-else class="rules-list">
                <li v-for="r in rules" :key="r.id" class="rule-item">
                    <div class="rule-content">
                        <strong>{{ r.title }}</strong>
                        <p v-if="r.description" class="desc">{{ r.description }}</p>
                    </div>
                    <button v-if="canEdit" class="btn-delete" @click="onDelete(r.id)">×</button>
                </li>
            </ol>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listRules, createRule, deleteRule, type CommunityRule } from '@/services/community-moderation.service'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const canEdit = computed(() => auth.isGymAdmin || auth.user?.role === 'tenant_owner' || auth.user?.role === 'super_admin')

const rules = ref<CommunityRule[]>([])
const loading = ref(true)
const saving = ref(false)
const form = ref({ title: '', description: '', sortOrder: 0 })

const load = async () => {
    loading.value = true
    try {
        const res = await listRules()
        rules.value = res.data.data
    } finally {
        loading.value = false
    }
}

const onAdd = async () => {
    if (!form.value.title) return
    saving.value = true
    try {
        await createRule({
            title: form.value.title,
            description: form.value.description || undefined,
            sortOrder: form.value.sortOrder
        })
        form.value = { title: '', description: '', sortOrder: 0 }
        await load()
    } finally {
        saving.value = false
    }
}

const onDelete = async (id: number) => {
    if (!confirm('Eliminare questa regola?')) return
    await deleteRule(id)
    rules.value = rules.value.filter(r => r.id !== id)
}

onMounted(load)
</script>

<style scoped>
.rules-view { max-width: 800px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.card h2 { font-size: 18px; margin: 0 0 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #475569; }
.form-grid .full { grid-column: 1 / -1; }
.form-grid input, .form-grid textarea {
    padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-family: inherit;
}
.btn-primary {
    grid-column: 1 / -1; padding: 10px 18px; background: #6366f1; color: #fff;
    border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; justify-self: start;
}
.btn-primary:disabled { opacity: 0.5; }
.rules-list { padding-left: 24px; margin: 0; }
.rule-item {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    padding: 12px 0; border-bottom: 1px solid #f1f5f9;
}
.rule-item:last-child { border-bottom: 0; }
.rule-content { flex: 1; }
.desc { margin: 4px 0 0; color: #64748b; font-size: 13px; }
.btn-delete {
    background: transparent; color: #ef4444; border: 1px solid #fee2e2; width: 28px; height: 28px;
    border-radius: 6px; cursor: pointer; font-size: 18px; line-height: 1;
}
.loading, .empty { color: #94a3b8; padding: 24px; text-align: center; }
</style>
