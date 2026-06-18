<script setup lang="ts">
import { ref, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import {
  formatBytes,
  FILE_CATEGORY_OPTIONS,
  type ClientFileCategory,
} from "@/composables/useFormatters";

const props = defineProps<{
  clientId: number;
  clientName: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "uploaded"): void;
}>();

const toast = useToast();
const saving = ref(false);
const file = ref<File | null>(null);
const category = ref<ClientFileCategory>("document");
const description = ref("");

const canSubmit = computed(() => !!file.value && !saving.value);

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] || null;
};

const handleSubmit = async () => {
  if (!canSubmit.value || !file.value) return;
  saving.value = true;

  const formData = new FormData();
  formData.append("file", file.value);
  formData.append("category", category.value);
  if (description.value) formData.append("description", description.value);

  try {
    await api.post(`/clients/${props.clientId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success("File caricato");
    emit("uploaded");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore upload";
    toast.error(msg);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-habit-card border border-habit-border rounded-habit max-w-lg w-full max-h-[90vh] overflow-y-auto"
    >
      <div class="p-5 border-b border-habit-border flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-habit-text">Carica file</h3>
          <p class="text-xs text-habit-text-subtle mt-0.5">{{ clientName }}</p>
        </div>
        <button @click="emit('close')" aria-label="Chiudi" class="p-1.5 hover:bg-habit-card-hover rounded-lg">
          <svg class="w-5 h-5 text-habit-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1.5">File</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
            @change="onFileChange"
            class="w-full text-sm text-habit-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-habit-cyan/20 file:text-habit-cyan file:font-medium hover:file:bg-habit-cyan hover:file:text-white transition-colors"
          />
          <p class="text-[10px] text-habit-text-subtle mt-1">
            PDF, DOC, DOCX, XLS, XLSX, CSV &middot; max 20 MB
          </p>
          <p v-if="file" class="text-xs text-habit-text mt-1">
            📎 {{ file.name }}
            <span class="text-habit-text-subtle"
              >&middot; {{ formatBytes(file.size) }}</span
            >
          </p>
        </div>

        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1">Categoria</label>
          <select
            v-model="category"
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
          >
            <option v-for="c in FILE_CATEGORY_OPTIONS" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1">Descrizione (opz.)</label>
          <textarea
            v-model="description"
            rows="2"
            placeholder="Note, contesto, contenuto..."
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan resize-none"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm text-habit-text-subtle hover:text-habit-text"
          >
            Annulla
          </button>
          <button
            type="submit"
            :disabled="!canSubmit"
            class="px-4 py-2 bg-habit-cyan text-white text-sm font-medium rounded-lg hover:bg-habit-orange transition-colors disabled:opacity-50"
          >
            {{ saving ? "Caricamento..." : "Carica" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
