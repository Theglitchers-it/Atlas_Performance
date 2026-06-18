<template>
    <div v-if="roleList.length > 0" class="role-badges">
        <span
            v-for="r in roleList"
            :key="r"
            class="role-badge"
            :class="`role-${r}`"
        >{{ labelOf(r) }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ROLE_LABELS } from '@/services/roles.service'
import type { AppRole } from '@/types'

const props = withDefaults(defineProps<{
    roles: AppRole[] | string[] | undefined
    /** Mostra solo il primo ruolo */
    onlyPrimary?: boolean
}>(), {
    onlyPrimary: false
})

const roleList = computed<string[]>(() => {
    const list = props.roles || []
    return props.onlyPrimary ? list.slice(0, 1) : list
})

const labelOf = (r: string): string => {
    return (ROLE_LABELS as any)[r] || r
}
</script>

<style scoped>
.role-badges {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
}

.role-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    line-height: 1.4;
}

.role-gym_admin { background: #6366f1; color: #fff; }
.role-trainer { background: #10b981; color: #fff; }
.role-nutritionist { background: #f59e0b; color: #fff; }
.role-client { background: #94a3b8; color: #fff; }
.role-front_desk { background: #8b5cf6; color: #fff; }
.role-accountant { background: #ec4899; color: #fff; }
</style>
