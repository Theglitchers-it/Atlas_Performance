<script setup lang="ts">
import { ref, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import {
  formatDate,
  fileUrl,
  PHOTO_TYPE_LABELS,
} from "@/composables/useFormatters";
import type { ProgressPhoto, PhotoType } from "@/types";

const props = defineProps<{
  photos: ProgressPhoto[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "deleted"): void;
}>();

const toast = useToast();

type FilterKey = "all" | PhotoType;
const activeFilter = ref<FilterKey>("all");

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tutte" },
  { key: "front", label: "Frontali" },
  { key: "side", label: "Laterali" },
  { key: "back", label: "Schiena" },
  { key: "full_body", label: "Figura" },
];

const filteredPhotos = computed(() =>
  activeFilter.value === "all"
    ? props.photos
    : props.photos.filter((p) => p.photo_type === activeFilter.value),
);

const lightboxPhoto = ref<ProgressPhoto | null>(null);
const openLightbox = (photo: ProgressPhoto) => (lightboxPhoto.value = photo);
const closeLightbox = () => (lightboxPhoto.value = null);

const deletePhoto = async (photoId: number) => {
  if (!confirm("Eliminare questa foto?")) return;
  try {
    await api.delete(`/progress/photos/${photoId}`);
    toast.success("Foto eliminata");
    emit("deleted");
    if (lightboxPhoto.value?.id === photoId) closeLightbox();
  } catch {
    toast.error("Errore durante l'eliminazione");
  }
};
</script>

<template>
  <div class="space-y-3">
    <!-- Filter chips -->
    <div class="flex gap-1.5 overflow-x-auto">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="activeFilter = f.key"
        class="px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-colors"
        :class="
          activeFilter === f.key
            ? 'bg-habit-cyan/15 border-habit-cyan text-habit-cyan'
            : 'bg-habit-bg border-habit-border text-habit-text-subtle hover:text-habit-text'
        "
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <div
        v-for="i in 4"
        :key="i"
        class="aspect-square bg-habit-skeleton rounded-lg animate-pulse"
      ></div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredPhotos.length === 0"
      class="py-8 text-center text-habit-text-subtle"
    >
      <svg
        class="w-10 h-10 mx-auto mb-2 text-habit-text-subtle/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p class="text-sm">
        {{
          activeFilter === "all"
            ? "Nessuna foto ancora caricata"
            : "Nessuna foto in questa categoria"
        }}
      </p>
    </div>

    <!-- Gallery grid -->
    <div
      v-else
      class="grid gap-2"
      style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));"
    >
      <div
        v-for="photo in filteredPhotos"
        :key="photo.id"
        class="group relative aspect-square bg-habit-bg border border-habit-border rounded-lg overflow-hidden cursor-pointer"
        @click="openLightbox(photo)"
      >
        <img
          :src="fileUrl(photo.photo_url)"
          :alt="`${PHOTO_TYPE_LABELS[photo.photo_type]} ${photo.taken_at}`"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div
          class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <p class="text-[10px] text-white/80 uppercase tracking-wider">
            {{ PHOTO_TYPE_LABELS[photo.photo_type] }}
          </p>
          <p class="text-xs text-white font-medium">
            {{ formatDate(photo.taken_at) }}
          </p>
        </div>
        <span
          class="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 bg-black/60 text-white rounded-full uppercase tracking-wider opacity-80"
        >
          {{ PHOTO_TYPE_LABELS[photo.photo_type] }}
        </span>
      </div>
    </div>

    <!-- Lightbox -->
    <div
      v-if="lightboxPhoto"
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      @click.self="closeLightbox"
    >
      <div class="relative max-w-4xl w-full max-h-full flex flex-col">
        <div class="flex items-center justify-between mb-3 text-white">
          <div>
            <p class="text-sm font-semibold">
              {{ PHOTO_TYPE_LABELS[lightboxPhoto.photo_type] }}
            </p>
            <p class="text-xs text-white/60">
              {{ formatDate(lightboxPhoto.taken_at) }}
              <span v-if="lightboxPhoto.body_weight"
                >· {{ lightboxPhoto.body_weight }} kg</span
              >
              <span v-if="lightboxPhoto.body_fat_pct"
                >· {{ lightboxPhoto.body_fat_pct }}% BF</span
              >
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="deletePhoto(lightboxPhoto.id)"
              class="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs rounded-lg transition-colors"
            >
              Elimina
            </button>
            <button
              @click="closeLightbox"
              class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
        <img
          :src="fileUrl(lightboxPhoto.photo_url)"
          class="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
        />
        <p
          v-if="lightboxPhoto.notes"
          class="text-xs text-white/70 mt-3 px-2 italic"
        >
          {{ lightboxPhoto.notes }}
        </p>
      </div>
    </div>
  </div>
</template>
