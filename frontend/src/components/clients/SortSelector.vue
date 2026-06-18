<template>
    <select :value="modelValue" @change="onChange" class="sort-select" title="Ordina i clienti">
        <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const options = [
    { value: 'created_desc', label: '🕒 Più recenti' },
    { value: 'created_asc', label: '🕒 Più vecchi' },
    { value: 'name_asc', label: '🔤 Nome A→Z' },
    { value: 'name_desc', label: '🔤 Nome Z→A' },
    { value: 'last_session_desc', label: '💪 Ultima sessione' },
    { value: 'subscription_end_asc', label: '📅 Scadenza prima' }
]

const onChange = (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value)
</script>

<style scoped>
.sort-select {
    padding: 8px 12px;
    border: 1px solid var(--habit-border, #cbd5e1);
    border-radius: 8px;
    background: var(--habit-card, #fff);
    color: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.15s;
}
.sort-select:hover { border-color: #6366f1; }
.sort-select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
</style>
