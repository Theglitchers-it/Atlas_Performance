<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import {
  formatDate,
  formatBytes,
  FILE_CATEGORY_LABELS,
  FILE_CATEGORY_ICONS,
  type ClientFileCategory,
} from "@/composables/useFormatters";

interface ClientFile {
  id: number;
  tenant_id: string;
  client_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  category: ClientFileCategory;
  description: string | null;
  uploaded_by: number;
  created_at: string;
  uploader_first_name?: string;
  uploader_last_name?: string;
}

const props = defineProps<{
  clientId: number;
}>();

const toast = useToast();
const files = ref<ClientFile[]>([]);
const loading = ref(true);
const expanded = ref<Record<ClientFileCategory, boolean>>({
  document: true,
  medical: false,
  contract: false,
  nutrition: false,
  certificate: false,
  other: false,
});

const CATEGORY_KEYS = Object.keys(FILE_CATEGORY_LABELS) as ClientFileCategory[];

const loadFiles = async () => {
  loading.value = true;
  const res = await api
    .get(`/clients/${props.clientId}/files`, { params: { limit: 200 } })
    .catch(() => null);
  files.value = res?.data?.data?.files || [];
  loading.value = false;
};

defineExpose({ loadFiles });

onMounted(loadFiles);

const grouped = computed(() => {
  const map: Record<ClientFileCategory, ClientFile[]> = {
    document: [],
    medical: [],
    contract: [],
    nutrition: [],
    certificate: [],
    other: [],
  };
  for (const f of files.value) {
    (map[f.category] || map.other).push(f);
  }
  return map;
});

const toggleCat = (cat: ClientFileCategory) => {
  expanded.value[cat] = !expanded.value[cat];
};

const downloadFile = async (file: ClientFile) => {
  try {
    const res = await api.get(
      `/clients/${props.clientId}/files/${file.id}/download`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.original_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore download";
    toast.error(msg);
  }
};

const deleteFile = async (file: ClientFile) => {
  if (!confirm(`Eliminare ${file.original_name}?`)) return;
  try {
    await api.delete(`/clients/${props.clientId}/files/${file.id}`);
    toast.success("File eliminato");
    await loadFiles();
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore eliminazione";
    toast.error(msg);
  }
};
</script>

<template>
  <div>
    <div v-if="loading" class="animate-pulse space-y-2">
      <div
        v-for="i in 3"
        :key="i"
        class="h-12 bg-habit-skeleton rounded-lg"
      ></div>
    </div>

    <div
      v-else-if="files.length === 0"
      class="py-6 text-center text-habit-text-subtle text-sm"
    >
      <p>Nessun file caricato</p>
      <p class="text-xs mt-1">
        Usa il bottone &quot;+ Carica file&quot; per aggiungere documenti
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="cat in CATEGORY_KEYS"
        :key="cat"
        class="border border-habit-border rounded-lg overflow-hidden"
      >
        <button
          @click="toggleCat(cat)"
          class="w-full px-3 py-2 flex items-center justify-between bg-habit-bg hover:bg-habit-card-hover transition-colors"
          :disabled="grouped[cat].length === 0"
          :class="grouped[cat].length === 0 ? 'opacity-50 cursor-default' : ''"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm">{{ FILE_CATEGORY_ICONS[cat] }}</span>
            <span class="text-sm font-medium text-habit-text">{{
              FILE_CATEGORY_LABELS[cat]
            }}</span>
            <span
              v-if="grouped[cat].length > 0"
              class="text-[10px] px-1.5 py-0.5 bg-habit-cyan/15 text-habit-cyan rounded-full"
            >
              {{ grouped[cat].length }}
            </span>
          </div>
          <svg
            v-if="grouped[cat].length > 0"
            class="w-4 h-4 text-habit-text-subtle transition-transform"
            :class="expanded[cat] ? 'rotate-180' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <ul
          v-if="expanded[cat] && grouped[cat].length > 0"
          class="divide-y divide-habit-border"
        >
          <li
            v-for="f in grouped[cat]"
            :key="f.id"
            class="px-3 py-2 flex items-center gap-3 hover:bg-habit-card-hover transition-colors"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-habit-text truncate">
                {{ f.original_name }}
              </p>
              <p class="text-[11px] text-habit-text-subtle truncate">
                {{ formatDate(f.created_at) }}
                <span v-if="f.file_size_bytes"
                  >&middot; {{ formatBytes(f.file_size_bytes) }}</span
                >
                <span v-if="f.description"
                  >&middot; {{ f.description }}</span
                >
              </p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button
                @click="downloadFile(f)"
                class="px-2 py-1 text-xs bg-habit-cyan/15 text-habit-cyan rounded hover:bg-habit-cyan hover:text-white transition-colors"
              >
                Scarica
              </button>
              <button
                @click="deleteFile(f)"
                class="px-2 py-1 text-xs bg-habit-bg border border-habit-border text-red-400 rounded hover:border-red-400"
              >
                Elimina
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
