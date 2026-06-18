<script setup lang="ts">
import { computed, ref } from "vue";
import { useAuthStore } from "@/store/auth";
import Avatar from "@/components/ui/Avatar.vue";
import {
  ChartBarIcon,
  VideoCameraIcon,
  PhotoIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";

interface Props {
  category: string;
  content: string;
  visibilityType: "global" | "my_clients" | "specific_clients";
  imagePreview?: string | null;
  submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  imagePreview: null,
  submitting: false,
});

const emit = defineEmits<{
  (e: "update:content", value: string): void;
  (e: "update:visibilityType", value: "global" | "my_clients" | "specific_clients"): void;
  (e: "select-image", file: File): void;
  (e: "remove-image"): void;
  (e: "submit"): void;
  (e: "back"): void;
}>();

const auth = useAuthStore();
const imageInput = ref<HTMLInputElement | null>(null);
const activeType = ref<"poll" | "video" | "gallery">("gallery");

const maxLength = 300;
const charCount = computed(() => props.content.length);
const remaining = computed(() => maxLength - charCount.value);
const canSubmit = computed(
  () =>
    props.content.trim().length > 0 &&
    props.content.length <= maxLength &&
    !props.submitting,
);

const isHidden = computed(() => props.visibilityType === "specific_clients");

const onImageChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emit("select-image", file);
};

const toggleHidden = () => {
  emit(
    "update:visibilityType",
    isHidden.value ? "global" : "specific_clients",
  );
};

const fullName = computed(() => {
  const u = auth.user as any;
  return u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Tu";
});
</script>

<template>
  <div class="space-y-5">
    <!-- Header con back -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        @click="emit('back')"
        class="p-2 -ml-2 rounded-lg text-habit-text-muted hover:text-habit-text hover:bg-habit-bg-light transition-colors"
        aria-label="Indietro"
      >
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <div>
        <h2 class="text-lg font-bold text-habit-text">Contenuto del post</h2>
        <p class="text-xs text-habit-text-subtle capitalize">{{ category }}</p>
      </div>
    </div>

    <!-- Card autore + textarea -->
    <div class="bg-habit-bg-light rounded-2xl p-4">
      <div class="flex items-center gap-3 mb-3">
        <Avatar
          :src="(auth.user as any)?.avatarUrl"
          :first-name="(auth.user as any)?.firstName"
          :last-name="(auth.user as any)?.lastName"
          :verified="['tenant_owner','staff','super_admin'].includes((auth.user as any)?.role || '')"
          size="sm"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-habit-text truncate">{{ fullName }}</p>
        </div>
      </div>
      <textarea
        :value="content"
        @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
        :maxlength="maxLength"
        rows="5"
        placeholder="Scrivi qualcosa..."
        class="w-full bg-transparent border-0 text-sm text-habit-text placeholder-habit-text-subtle resize-none focus:outline-none"
      ></textarea>
      <div class="flex items-center justify-between mt-2">
        <button
          type="button"
          @click="imageInput?.click()"
          class="text-habit-text-subtle hover:text-habit-orange transition-colors"
          aria-label="Allega immagine"
        >
          <PhotoIcon class="w-5 h-5" />
        </button>
        <span
          :class="[
            'text-xs',
            remaining < 30 ? 'text-habit-orange' : 'text-habit-text-subtle',
          ]"
        >
          {{ charCount }}/{{ maxLength }}
        </span>
      </div>
      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onImageChange"
      />

      <!-- Preview immagine -->
      <div v-if="imagePreview" class="mt-3 relative rounded-xl overflow-hidden">
        <img
          :src="imagePreview"
          alt="Anteprima immagine"
          class="w-full max-h-60 object-cover"
        />
        <button
          type="button"
          @click="emit('remove-image')"
          class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
          aria-label="Rimuovi immagine"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Tipo post (Poll/Video/Gallery) -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-habit-text">Tipo di post</h3>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          class="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-habit-bg-light text-habit-text-subtle opacity-50 cursor-not-allowed flex items-center gap-1.5"
          title="Sondaggi in arrivo"
        >
          <ChartBarIcon class="w-4 h-4" />
          Sondaggio
        </button>
        <button
          type="button"
          disabled
          class="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-habit-bg-light text-habit-text-subtle opacity-50 cursor-not-allowed flex items-center gap-1.5"
          title="Video in arrivo"
        >
          <VideoCameraIcon class="w-4 h-4" />
          Video
        </button>
        <button
          type="button"
          @click="activeType = 'gallery'"
          :class="[
            'px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors',
            activeType === 'gallery'
              ? 'bg-habit-text text-habit-card'
              : 'bg-habit-bg-light text-habit-text',
          ]"
        >
          <PhotoIcon class="w-4 h-4" />
          Galleria
        </button>
      </div>
    </div>

    <!-- Hide from Community toggle -->
    <div class="flex items-center justify-between gap-3 py-2">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-habit-text">Nascondi dalla community?</p>
        <p class="text-xs text-habit-text-subtle mt-0.5">
          Solo i clienti selezionati lo vedranno.
        </p>
      </div>
      <button
        type="button"
        @click="toggleHidden"
        :class="[
          'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
          isHidden ? 'bg-habit-orange' : 'bg-habit-bg-light',
        ]"
        :aria-pressed="isHidden"
        aria-label="Nascondi dalla community"
      >
        <span
          :class="[
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
            isHidden ? 'left-6' : 'left-0.5',
          ]"
        ></span>
      </button>
    </div>

    <!-- Submit -->
    <button
      type="button"
      @click="emit('submit')"
      :disabled="!canSubmit"
      :class="[
        'w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors',
        canSubmit
          ? 'bg-habit-orange text-white hover:opacity-90'
          : 'bg-habit-bg-light text-habit-text-subtle cursor-not-allowed',
      ]"
    >
      {{ submitting ? "Pubblicazione..." : "Pubblica" }}
    </button>
  </div>
</template>
