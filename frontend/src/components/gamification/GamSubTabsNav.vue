<script setup lang="ts">
interface SubTab {
  key: string
  label: string
  icon?: string  // emoji o testo (no SVG component qui per snellezza)
  badge?: number | null
}

defineProps<{
  tabs: readonly SubTab[]
  active: string
}>()

defineEmits<{
  (e: 'change', key: string): void
}>()
</script>

<template>
  <div class="overflow-x-auto -mx-2 px-2 mb-5 scrollbar-thin">
    <div class="inline-flex gap-2 min-w-full">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="gam-tab-pill"
        :class="{ active: active === tab.key }"
        @click="$emit('change', tab.key)"
      >
        <span v-if="tab.icon" class="text-sm leading-none">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge != null && tab.badge > 0"
          class="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold bg-habit-bg/60 text-habit-text"
        >{{ tab.badge }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { height: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
