<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { formatDateISO, PHOTO_TYPE_OPTIONS } from "@/composables/useFormatters";
import type { PhotoType } from "@/types";

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
const files = ref<File[]>([]);
const previews = ref<string[]>([]);

const photoType = ref<PhotoType>("front");
const takenAt = ref(formatDateISO(new Date()));
const notes = ref("");
const bodyWeight = ref<number | null>(null);
const bodyFatPct = ref<number | null>(null);

const photoTypes = PHOTO_TYPE_OPTIONS;

const canSubmit = computed(() => files.value.length > 0 && !saving.value);

const revokePreviews = () => {
  previews.value.forEach((url) => URL.revokeObjectURL(url));
};

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  revokePreviews();
  const selected = Array.from(input.files).slice(0, 5);
  files.value = selected;
  previews.value = selected.map((f) => URL.createObjectURL(f));
};

const removeFile = (idx: number) => {
  URL.revokeObjectURL(previews.value[idx]);
  files.value.splice(idx, 1);
  previews.value.splice(idx, 1);
};

onBeforeUnmount(revokePreviews);

const handleSubmit = async () => {
  if (!canSubmit.value) return;
  saving.value = true;

  const formData = new FormData();
  for (const f of files.value) formData.append("photos", f);
  formData.append("photoType", photoType.value);
  formData.append("takenAt", takenAt.value);
  if (notes.value) formData.append("notes", notes.value);
  if (bodyWeight.value !== null)
    formData.append("bodyWeight", String(bodyWeight.value));
  if (bodyFatPct.value !== null)
    formData.append("bodyFatPct", String(bodyFatPct.value));

  try {
    await api.post(`/progress/${props.clientId}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success(
      `${files.value.length} ${files.value.length === 1 ? "foto caricata" : "foto caricate"}`,
    );
    emit("uploaded");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore durante l'upload";
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
      <div
        class="p-5 border-b border-habit-border flex items-center justify-between"
      >
        <div>
          <h3 class="text-lg font-semibold text-habit-text">
            Carica foto progresso
          </h3>
          <p class="text-xs text-habit-text-subtle mt-0.5">{{ clientName }}</p>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 hover:bg-habit-card-hover rounded-lg transition-colors"
          aria-label="Chiudi"
        >
          <svg
            class="w-5 h-5 text-habit-text-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
        <!-- File input -->
        <div>
          <label
            class="block text-xs font-medium text-habit-text-subtle mb-1.5"
          >
            Foto (max 5)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            @change="onFileChange"
            class="w-full text-sm text-habit-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-habit-cyan/20 file:text-habit-cyan file:font-medium hover:file:bg-habit-cyan hover:file:text-white transition-colors"
          />
          <div v-if="previews.length" class="grid grid-cols-3 gap-2 mt-3">
            <div
              v-for="(p, idx) in previews"
              :key="idx"
              class="relative aspect-square bg-habit-bg rounded-lg overflow-hidden"
            >
              <img :src="p" class="w-full h-full object-cover" />
              <button
                type="button"
                @click="removeFile(idx)"
                class="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500"
                aria-label="Rimuovi"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- Categoria -->
        <div>
          <label
            class="block text-xs font-medium text-habit-text-subtle mb-1.5"
          >
            Categoria
          </label>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="t in photoTypes"
              :key="t.value"
              type="button"
              @click="photoType = t.value as typeof photoType"
              class="px-2 py-1.5 text-xs rounded-lg border transition-colors"
              :class="
                photoType === t.value
                  ? 'bg-habit-cyan/15 border-habit-cyan text-habit-cyan'
                  : 'bg-habit-bg border-habit-border text-habit-text-subtle hover:text-habit-text'
              "
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Data + metriche -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Data scatto</label
            >
            <input
              v-model="takenAt"
              type="date"
              required
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
          <div>
            <label
              class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Peso (kg, opz.)</label
            >
            <input
              v-model.number="bodyWeight"
              type="number"
              step="0.1"
              min="0"
              placeholder="—"
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Body fat % (opz.)</label
          >
          <input
            v-model.number="bodyFatPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="—"
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
          />
        </div>

        <div>
          <label
            class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Note (opz.)</label
          >
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Condizioni, luce, pose particolari..."
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan resize-none"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm text-habit-text-subtle hover:text-habit-text transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            :disabled="!canSubmit"
            class="px-4 py-2 bg-habit-cyan text-white text-sm font-medium rounded-lg hover:bg-habit-orange transition-colors disabled:opacity-50"
          >
            {{ saving ? "Caricamento..." : "Carica foto" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
