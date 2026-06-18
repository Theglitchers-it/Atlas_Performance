<template>
    <div class="privacy-view">
        <header class="page-header">
            <h1>Privacy — World Leaderboard</h1>
            <p class="subtitle">Decidi se partecipare alla classifica mondiale Atlas e come essere visualizzato.</p>
        </header>

        <section class="card">
            <label class="toggle-row">
                <input type="checkbox" v-model="optIn" />
                <div>
                    <strong>Partecipa al World Leaderboard</strong>
                    <p class="hint">Quando attivo, i tuoi PR verificati su esercizi fondamentali (panca, squat, stacco...) appaiono nella classifica mondiale. Disattivabile in qualsiasi momento.</p>
                </div>
            </label>

            <label class="field">
                Nome visualizzato (opzionale)
                <input v-model="displayName" type="text" maxlength="100" placeholder="es. 'Marco L.' (lascia vuoto per Nome + iniziale cognome)" :disabled="!optIn" />
                <small>Se non specificato, mostriamo "Nome + iniziale cognome"</small>
            </label>

            <button class="btn-save" @click="onSave" :disabled="saving">
                {{ saving ? 'Salvataggio…' : 'Salva' }}
            </button>
            <p v-if="message" class="success">{{ message }}</p>
        </section>

        <section class="card info">
            <h3>Come funziona</h3>
            <ul>
                <li>Devi <strong>caricare un video</strong> del tuo PR (Proof-of-Lift) per entrare in classifica</li>
                <li>Il tuo trainer <strong>verifica il video</strong> prima della pubblicazione</li>
                <li>I dati personali (email, tenant) <strong>non sono mai esposti</strong></li>
                <li>Puoi disattivare l'opt-in in qualsiasi momento: le tue entry restano salvate ma non visibili nella classifica</li>
            </ul>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { setWorldOptIn } from '@/services/world-leaderboard.service'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const optIn = ref(false)
const displayName = ref('')
const saving = ref(false)
const message = ref<string | null>(null)

onMounted(() => {
    optIn.value = !!(auth.user as any)?.worldLeaderboardOptIn
    displayName.value = (auth.user as any)?.worldLeaderboardDisplayName || ''
})

const onSave = async () => {
    saving.value = true
    message.value = null
    try {
        await setWorldOptIn(optIn.value, displayName.value || undefined)
        message.value = '✓ Preferenze aggiornate'
        setTimeout(() => { message.value = null }, 3000)
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.privacy-view { max-width: 700px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 28px; margin: 0 0 4px; }
.subtitle { color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.toggle-row { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; margin-bottom: 20px; }
.toggle-row input { margin-top: 4px; width: 20px; height: 20px; cursor: pointer; }
.toggle-row strong { font-size: 16px; }
.hint { color: #64748b; font-size: 13px; margin: 4px 0 0; }
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.field input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
.field input:disabled { background: #f8fafc; color: #94a3b8; }
.field small { color: #94a3b8; }
.btn-save { padding: 10px 20px; background: #6366f1; color: #fff; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }
.success { color: #065f46; background: #d1fae5; padding: 8px 12px; border-radius: 6px; margin-top: 12px; font-size: 13px; }
.info h3 { font-size: 16px; margin: 0 0 12px; }
.info ul { padding-left: 20px; margin: 0; line-height: 1.7; color: #475569; }
</style>
