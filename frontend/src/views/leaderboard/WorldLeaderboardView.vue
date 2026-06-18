<template>
    <div class="world-lb">
        <header class="page-header">
            <h1>🌍 World Leaderboard</h1>
            <p class="subtitle">Classifica mondiale verificata con video Proof-of-Lift. Solo atleti con opt-in privacy.</p>
        </header>

        <div class="filters">
            <label>
                Esercizio
                <select v-model.number="selectedExerciseId" @change="load">
                    <option v-for="e in exercises" :key="e.id" :value="e.id">{{ e.display_label }}</option>
                </select>
            </label>

            <label>
                Classe peso
                <select v-model="selectedWeightClass" @change="load">
                    <option value="">Tutte</option>
                    <option v-for="wc in weightClasses" :key="wc" :value="wc">{{ wc }}kg</option>
                </select>
            </label>
        </div>

        <div v-if="loading" class="loading">Caricamento classifica…</div>
        <div v-else-if="entries.length === 0" class="empty">
            <p>Nessun atleta nella classifica per questi filtri.</p>
            <p class="hint">Carica un video del tuo PR per partecipare!</p>
        </div>

        <ol v-else class="ranking">
            <li v-for="e in entries" :key="e.entry_id" class="rank-row" :class="rankClass(e.world_rank)">
                <span class="rank">#{{ e.world_rank }}</span>
                <div class="athlete">
                    <img v-if="e.avatar_url" :src="e.avatar_url" class="avatar" alt="" />
                    <div v-else class="avatar avatar-placeholder">{{ initialOf(e.display_name) }}</div>
                    <div class="info">
                        <strong>{{ e.display_name }}</strong>
                        <span v-if="e.weight_class" class="wc">{{ e.weight_class }}kg</span>
                    </div>
                </div>
                <div class="value">{{ e.value }} kg</div>
                <button class="btn-video" @click="showVideo(e.proof_video_id)">📹 Video</button>
            </li>
        </ol>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
    getWorldExercises,
    getWorldLeaderboard,
    type WorldExercise,
    type WorldEntry
} from '@/services/world-leaderboard.service'

const exercises = ref<WorldExercise[]>([])
const entries = ref<WorldEntry[]>([])
const selectedExerciseId = ref<number | null>(null)
const selectedWeightClass = ref<string>('')
const loading = ref(true)

const weightClasses = ['-59', '59-66', '66-74', '74-83', '83-93', '93-105', '105-120', '+120']

const initialOf = (name: string) => (name?.[0] || '?').toUpperCase()
const rankClass = (rank: number) => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''

const load = async () => {
    if (!selectedExerciseId.value) return
    loading.value = true
    try {
        const res = await getWorldLeaderboard({
            exerciseId: selectedExerciseId.value,
            weightClass: selectedWeightClass.value || undefined,
            limit: 100
        })
        entries.value = res.data.data
    } finally {
        loading.value = false
    }
}

const showVideo = (videoId: number) => {
    window.open(`/videos/${videoId}`, '_blank')
}

onMounted(async () => {
    const res = await getWorldExercises()
    exercises.value = res.data.data
    selectedExerciseId.value = exercises.value[0]?.id || null
    await load()
})
</script>

<style scoped>
.world-lb { max-width: 900px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 32px; margin: 0 0 4px; background: linear-gradient(90deg, #6366f1, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent; }
.subtitle { color: #64748b; }
.filters { display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
.filters label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #475569; }
.filters select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; min-width: 200px; font-size: 14px; }
.loading, .empty { padding: 32px; text-align: center; color: #94a3b8; background: #fff; border-radius: 12px; }
.hint { color: #6366f1; font-weight: 600; margin-top: 8px; }
.ranking { list-style: none; margin: 0; padding: 0; }
.rank-row {
    display: grid; grid-template-columns: 60px 1fr auto auto; align-items: center; gap: 16px;
    padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    margin-bottom: 8px; transition: transform 0.15s;
}
.rank-row:hover { transform: translateX(4px); }
.rank-row.gold { background: linear-gradient(90deg, #fef3c7, #fff); border-color: #f59e0b; }
.rank-row.silver { background: linear-gradient(90deg, #f1f5f9, #fff); border-color: #94a3b8; }
.rank-row.bronze { background: linear-gradient(90deg, #fef0e6, #fff); border-color: #d97706; }
.rank { font-size: 24px; font-weight: 800; color: #6366f1; text-align: center; }
.gold .rank { color: #f59e0b; }
.silver .rank { color: #64748b; }
.bronze .rank { color: #d97706; }
.athlete { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { background: #6366f1; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.info { display: flex; flex-direction: column; }
.info strong { font-size: 14px; }
.wc { font-size: 11px; color: #94a3b8; }
.value { font-size: 22px; font-weight: 800; color: #6366f1; }
.btn-video {
    background: #f1f5f9; color: #475569; border: 0; padding: 6px 12px; border-radius: 6px;
    font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-video:hover { background: #6366f1; color: #fff; }
</style>
