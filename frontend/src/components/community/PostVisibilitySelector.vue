<template>
    <div class="visibility-selector">
        <label class="vs-label">Chi vede questo post?</label>
        <div class="vs-options">
            <label v-for="opt in options" :key="opt.value" class="vs-option" :class="{ active: modelValue === opt.value }">
                <input type="radio" :value="opt.value" :checked="modelValue === opt.value" @change="$emit('update:modelValue', opt.value)" />
                <div class="vs-text">
                    <strong>{{ opt.label }}</strong>
                    <span class="vs-desc">{{ opt.description }}</span>
                </div>
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { VISIBILITY_LABELS, type VisibilityType } from '@/services/community-moderation.service'

defineProps<{ modelValue: VisibilityType }>()
defineEmits<{ (e: 'update:modelValue', value: VisibilityType): void }>()

const options: { value: VisibilityType; label: string; description: string }[] = [
    { value: 'global', label: VISIBILITY_LABELS.global, description: 'Visibile a tutti gli utenti del tenant' },
    { value: 'my_clients', label: VISIBILITY_LABELS.my_clients, description: 'Visibile solo agli atleti che seguo' },
    { value: 'specific_clients', label: VISIBILITY_LABELS.specific_clients, description: 'Selezione manuale degli atleti' }
]
</script>

<style scoped>
.visibility-selector { margin: 12px 0; }
.vs-label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
.vs-options { display: flex; flex-direction: column; gap: 8px; }
.vs-option {
    display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
    border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
}
.vs-option:hover { border-color: #c7d2fe; }
.vs-option.active { border-color: #6366f1; background: #eef2ff; }
.vs-option input { margin-top: 3px; }
.vs-text { display: flex; flex-direction: column; }
.vs-text strong { font-size: 14px; }
.vs-desc { font-size: 12px; color: #64748b; }
</style>
