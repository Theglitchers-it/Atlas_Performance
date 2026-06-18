<template>
    <div class="badge-wall">
        <h3 v-if="showHeader">🏆 Titoli sbloccati</h3>
        <div v-if="loading" class="loading">Caricamento titoli…</div>
        <div v-else-if="titles.length === 0" class="empty">
            Nessun titolo sbloccato ancora. Continua a registrare PR per sbloccarne!
        </div>
        <div v-else class="badges-grid">
            <div
                v-for="t in titles"
                :key="t.id"
                :class="['badge', `rarity-${t.rarity}`]"
                :title="t.title_description || t.title_name"
            >
                <div class="badge-icon">{{ rarityEmoji(t.rarity) }}</div>
                <div class="badge-name">{{ t.title_name }}</div>
                <div class="badge-rarity">{{ rarityLabel(t.rarity) }}</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Title {
    id: number
    title_name: string
    title_description: string | null
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
    unlocked_at?: string
}

defineProps<{ showHeader?: boolean }>()

const titles = ref<Title[]>([])
const loading = ref(true)

const rarityEmoji = (r: string) => ({
    common: '🥉', uncommon: '🥈', rare: '🥇', epic: '💎', legendary: '👑'
}[r] || '🏅')

const rarityLabel = (r: string) => ({
    common: 'Comune', uncommon: 'Non comune', rare: 'Raro', epic: 'Epico', legendary: 'Leggendario'
}[r] || r)

onMounted(async () => {
    try {
        const res = await api.get('/titles', { params: { unlocked_only: true } })
        titles.value = res.data?.data || []
    } finally { loading.value = false }
})
</script>

<style scoped>
.badge-wall { padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
.badge-wall h3 { margin: 0 0 16px; font-size: 18px; }
.loading, .empty { color: #94a3b8; text-align: center; padding: 24px; }
.badges-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;
}
.badge {
    text-align: center; padding: 16px 8px; border-radius: 12px; border: 2px solid;
    transition: transform 0.15s;
}
.badge:hover { transform: translateY(-4px); }
.badge.rarity-common { background: #f8fafc; border-color: #cbd5e1; }
.badge.rarity-uncommon { background: #ecfeff; border-color: #67e8f9; }
.badge.rarity-rare { background: #eff6ff; border-color: #93c5fd; }
.badge.rarity-epic { background: #fdf4ff; border-color: #d8b4fe; }
.badge.rarity-legendary {
    background: linear-gradient(135deg, #fef3c7, #fff7ed);
    border-color: #f59e0b;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
}
.badge.rarity-legendary .badge-name {
    background: linear-gradient(90deg, #d97706, #ea580c, #dc2626);
    -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800;
}
.badge-icon { font-size: 36px; line-height: 1; }
.badge-name { font-weight: 700; font-size: 13px; margin-top: 4px; line-height: 1.2; }
.badge-rarity { font-size: 10px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
</style>
