<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { getTagClass, getTagLabel } from "@/composables/useFormatters";

interface TagRecord {
  tag: string;
  auto_assigned: number | boolean;
}

const props = defineProps<{
  clientId: number;
}>();

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const toast = useToast();

const tags = ref<TagRecord[]>([]);
const loading = ref(true);
const addingTag = ref(false);
const newTag = ref("");
const saving = ref(false);

const loadTags = async () => {
  loading.value = true;
  const res = await api
    .get(`/clients/${props.clientId}/tags`)
    .catch(() => null);
  tags.value = res?.data?.data?.tags || [];
  loading.value = false;
};

onMounted(loadTags);

const startAdding = () => {
  addingTag.value = true;
  newTag.value = "";
};

const cancelAdd = () => {
  addingTag.value = false;
  newTag.value = "";
};

const saveTag = async () => {
  const clean = newTag.value.trim().toLowerCase();
  if (!clean || saving.value) return;
  if (tags.value.some((t) => t.tag === clean)) {
    toast.warning("Tag gia presente");
    return;
  }
  saving.value = true;
  try {
    await api.post(`/clients/${props.clientId}/tags`, { tag: clean });
    toast.success("Tag aggiunto");
    await loadTags();
    addingTag.value = false;
    newTag.value = "";
    emit("changed");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};

const removeTag = async (tag: string) => {
  try {
    await api.delete(
      `/clients/${props.clientId}/tags/${encodeURIComponent(tag)}`,
    );
    toast.success("Tag rimosso");
    await loadTags();
    emit("changed");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore";
    toast.error(msg);
  }
};

const isAuto = (t: TagRecord) => !!t.auto_assigned;
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-semibold text-habit-text">Tag & Segmenti</h4>
      <button
        v-if="!addingTag"
        @click="startAdding"
        class="text-xs text-habit-cyan hover:text-habit-orange transition-colors"
      >
        + Aggiungi tag custom
      </button>
    </div>

    <p class="text-[11px] text-habit-text-subtle mb-2">
      I tag automatici (Entry/Medio/Top/Vecchio/Dormiente) sono calcolati dal
      sistema. Puoi aggiungere tag custom (es. "VIP", "Agonista",
      "Riabilitazione").
    </p>

    <div v-if="loading" class="flex gap-2 flex-wrap">
      <div
        v-for="i in 3"
        :key="i"
        class="w-16 h-6 bg-habit-skeleton rounded-full animate-pulse"
      ></div>
    </div>

    <div v-else class="flex flex-wrap gap-1.5 items-center">
      <span
        v-for="t in tags"
        :key="t.tag"
        class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full border uppercase tracking-wider"
        :class="getTagClass(t.tag)"
        :title="isAuto(t) ? 'Tag automatico (non rimovibile)' : 'Tag manuale'"
      >
        {{ getTagLabel(t.tag) }}
        <button
          v-if="!isAuto(t)"
          @click="removeTag(t.tag)"
          class="hover:text-red-400 -mr-0.5"
          aria-label="Rimuovi tag"
        >
          <svg
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <span
        v-if="!addingTag && tags.length === 0"
        class="text-xs text-habit-text-subtle"
      >
        Nessun tag
      </span>

      <div v-if="addingTag" class="inline-flex items-center gap-1">
        <input
          v-model="newTag"
          type="text"
          maxlength="50"
          placeholder="es. VIP"
          @keyup.enter="saveTag"
          @keyup.esc="cancelAdd"
          class="px-2 py-1 text-xs bg-habit-bg border border-habit-cyan rounded-full text-habit-text focus:outline-none w-28"
          autofocus
        />
        <button
          @click="saveTag"
          :disabled="!newTag.trim() || saving"
          class="text-xs text-habit-cyan font-medium disabled:opacity-50 hover:text-habit-orange"
        >
          Salva
        </button>
        <button
          @click="cancelAdd"
          class="text-xs text-habit-text-subtle hover:text-habit-text"
        >
          Annulla
        </button>
      </div>
    </div>
  </div>
</template>
