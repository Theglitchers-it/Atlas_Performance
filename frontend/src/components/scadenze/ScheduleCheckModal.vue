<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/store/auth";
import { formatDateISO } from "@/composables/useFormatters";
import type { ActionItem } from "@/types";

const props = defineProps<{
  item: ActionItem;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const toast = useToast();
const authStore = useAuthStore();

const saving = ref(false);

const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + 3);

const date = ref(formatDateISO(defaultDate));
const startTime = ref("10:00");
const endTime = ref("11:00");
const location = ref("");
const notes = ref(
  props.item.action_type === "new_no_check"
    ? "Primo check corporeo - valutazione iniziale"
    : "Check corporeo periodico",
);

const handleSubmit = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    const startDatetime = `${date.value}T${startTime.value}:00`;
    const endDatetime = `${date.value}T${endTime.value}:00`;

    await api.post("/booking/appointments", {
      clientId: props.item.client_id,
      trainerId: authStore.user?.id,
      startDatetime,
      endDatetime,
      appointmentType: "assessment",
      location: location.value || null,
      notes: notes.value || null,
    });
    toast.success("Check programmato in agenda");
    emit("saved");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore durante la programmazione";
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
          <h3 class="text-lg font-semibold text-habit-text">
            Programma check corporeo
          </h3>
          <p class="text-xs text-habit-text-subtle mt-0.5">
            {{ item.first_name }} {{ item.last_name }} —
            {{ item.message }}
          </p>
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
        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Data</label
          >
          <input
            v-model="date"
            type="date"
            required
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Ora inizio</label
            >
            <input
              v-model="startTime"
              type="time"
              required
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-habit-text-subtle mb-1"
              >Ora fine</label
            >
            <input
              v-model="endTime"
              type="time"
              required
              class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Luogo (opzionale)</label
          >
          <input
            v-model="location"
            type="text"
            placeholder="Es. Studio, Sala pesi, Online"
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Note</label
          >
          <textarea
            v-model="notes"
            rows="2"
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
            :disabled="saving"
            class="px-4 py-2 bg-habit-orange text-white text-sm font-medium rounded-lg hover:bg-habit-cyan transition-colors disabled:opacity-50"
          >
            {{ saving ? "Salvataggio..." : "Programma check" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
