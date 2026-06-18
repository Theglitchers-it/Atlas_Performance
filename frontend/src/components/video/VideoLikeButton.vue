<template>
    <button
        class="like-btn"
        :class="{ liked: hasLiked }"
        @click="toggle"
        :disabled="loading"
        :title="hasLiked ? 'Rimuovi like' : 'Mi piace'"
    >
        <span class="heart">{{ hasLiked ? '❤️' : '🤍' }}</span>
        <span class="count">{{ count }}</span>
    </button>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { likeVideo, unlikeVideo } from '@/services/world-leaderboard.service'

const props = defineProps<{
    videoId: number
    initialLiked?: boolean
    initialCount?: number
}>()

const emit = defineEmits<{ (e: 'changed', liked: boolean, count: number): void }>()

const hasLiked = ref(!!props.initialLiked)
const count = ref(props.initialCount || 0)
const loading = ref(false)

watch(() => props.initialLiked, v => { hasLiked.value = !!v })
watch(() => props.initialCount, v => { count.value = v || 0 })

const toggle = async () => {
    loading.value = true
    const wasLiked = hasLiked.value
    // Optimistic update
    hasLiked.value = !wasLiked
    count.value += wasLiked ? -1 : 1
    try {
        if (wasLiked) await unlikeVideo(props.videoId)
        else await likeVideo(props.videoId)
        emit('changed', hasLiked.value, count.value)
    } catch (e) {
        // Rollback su errore
        hasLiked.value = wasLiked
        count.value += wasLiked ? 1 : -1
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.like-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; border: 1px solid #e2e8f0; border-radius: 20px;
    padding: 6px 14px; cursor: pointer; font-size: 14px; font-weight: 600;
    color: #475569; transition: all 0.15s;
}
.like-btn:hover { border-color: #ef4444; }
.like-btn.liked { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
.like-btn.liked .heart { animation: pop 0.3s; }
.like-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.heart { font-size: 16px; line-height: 1; }
.count { font-variant-numeric: tabular-nums; }
@keyframes pop {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.3); }
}
</style>
