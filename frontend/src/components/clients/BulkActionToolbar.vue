<template>
    <Transition name="slide-up">
        <div v-if="selectedCount > 0" class="bulk-toolbar">
            <div class="bulk-content">
                <span class="bulk-count">{{ selectedCount }} selezionat{{ selectedCount === 1 ? 'o' : 'i' }}</span>
                <button class="btn-action notify" @click="$emit('notify')">💬 Messaggio</button>
                <button class="btn-action activate" @click="$emit('activate')">▶ Attiva</button>
                <button class="btn-action deactivate" @click="$emit('deactivate')">⏸ Disattiva</button>
                <button class="btn-action change-status" @click="$emit('change-status')">🔄 Status</button>
                <button class="btn-action export" @click="$emit('export')">📥 Esporta</button>
                <button class="btn-clear" @click="$emit('clear')" title="Deseleziona">✕</button>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
defineProps<{ selectedCount: number }>()
defineEmits<{
    (e: 'notify'): void
    (e: 'activate'): void
    (e: 'deactivate'): void
    (e: 'change-status'): void
    (e: 'export'): void
    (e: 'clear'): void
}>()
</script>

<style scoped>
.bulk-toolbar {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    background: rgba(15,23,42,0.95);
    color: #fff;
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
    backdrop-filter: blur(12px);
    max-width: calc(100vw - 32px);
    overflow-x: auto;
}
.bulk-content { display: flex; align-items: center; gap: 4px; }
.bulk-count {
    padding: 0 14px;
    font-weight: 600;
    font-size: 14px;
    border-right: 1px solid rgba(255,255,255,0.15);
    margin-right: 4px;
    white-space: nowrap;
}
.btn-action, .btn-clear {
    background: rgba(255,255,255,0.08);
    color: #fff;
    border: 0;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
}
.btn-action:hover { background: rgba(99,102,241,0.4); }
.btn-action.activate:hover { background: rgba(16,185,129,0.4); }
.btn-action.deactivate:hover { background: rgba(239,68,68,0.4); }
.btn-clear { background: transparent; width: 32px; padding: 8px; opacity: 0.6; }
.btn-clear:hover { opacity: 1; background: rgba(239,68,68,0.2); }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateX(-50%) translateY(20px); opacity: 0; }
</style>
