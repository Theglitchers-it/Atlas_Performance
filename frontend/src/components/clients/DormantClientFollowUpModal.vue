<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";

const props = defineProps<{
  clientId: number;
  clientFirstName: string;
  clientLastName: string;
  lifetimeMonths?: number | null;
  daysSinceLastSubEnd?: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "sent"): void;
}>();

const toast = useToast();

interface TemplateOption {
  key: string;
  label: string;
  body: string;
}

const name = props.clientFirstName;

const templates: TemplateOption[] = [
  {
    key: "discount",
    label: "Sconto 20%",
    body: `Ciao ${name}, ci manchi! Torna con uno sconto del 20% sul tuo prossimo mesociclo.`,
  },
  {
    key: "check",
    label: "Check gratuito",
    body: `Ciao ${name}, ti offro un check gratuito per ripartire insieme. Mi confermi una data?`,
  },
  {
    key: "program",
    label: "Nuovo programma",
    body: `Ho preparato una nuova programmazione pensata per te, ${name}. Vuoi vederla?`,
  },
  {
    key: "custom",
    label: "Scrivi tu",
    body: "",
  },
];

const message = ref("");
const sending = ref(false);
const aiLoading = ref(false);
const aiVariants = ref<{ tone: string; message: string }[] | null>(null);

const applyTemplate = (t: TemplateOption) => {
  message.value = t.body;
  aiVariants.value = null;
};

const generateWithAI = async () => {
  aiLoading.value = true;
  aiVariants.value = null;
  try {
    const res = await api.post("/ai/generate-followup-message", {
      clientId: props.clientId,
      context: "dormant",
    });
    aiVariants.value = res.data.data?.variants || null;
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore generazione AI";
    toast.error(msg);
  } finally {
    aiLoading.value = false;
  }
};

const pickVariant = (v: { tone: string; message: string }) => {
  message.value = v.message;
  aiVariants.value = null;
};

const handleSend = async () => {
  if (!message.value.trim() || sending.value) return;
  sending.value = true;
  try {
    await api.post("/chat/send-to-client", {
      clientId: props.clientId,
      content: message.value.trim(),
    });
    toast.success("Messaggio inviato");
    emit("sent");
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Errore invio messaggio";
    toast.error(msg);
  } finally {
    sending.value = false;
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
            Recupera {{ clientFirstName }} {{ clientLastName }}
          </h3>
          <p class="text-xs text-habit-text-subtle mt-0.5">
            <span v-if="daysSinceLastSubEnd && daysSinceLastSubEnd > 0"
              >Sub scaduta {{ daysSinceLastSubEnd }}gg fa</span
            >
            <span v-if="lifetimeMonths"
              > &middot; {{ lifetimeMonths }} mesi di storia</span
            >
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 hover:bg-habit-card-hover rounded-lg"
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

      <div class="p-5 space-y-4">
        <!-- Template -->
        <div>
          <label
            class="block text-xs font-medium text-habit-text-subtle mb-2"
            >Template rapidi</label
          >
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in templates"
              :key="t.key"
              @click="applyTemplate(t)"
              class="px-3 py-2 text-xs text-left bg-habit-bg border border-habit-border rounded-lg hover:border-habit-cyan transition-colors"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- AI generazione -->
        <div class="pt-2 border-t border-habit-border">
          <button
            @click="generateWithAI"
            :disabled="aiLoading"
            class="w-full px-3 py-2 bg-habit-orange/15 text-habit-orange text-sm font-medium rounded-lg hover:bg-habit-orange hover:text-white transition-colors disabled:opacity-50"
          >
            {{ aiLoading ? "Generando..." : "✨ Genera con AI (3 varianti)" }}
          </button>
          <div
            v-if="aiVariants"
            class="grid gap-2 mt-3"
          >
            <button
              v-for="v in aiVariants"
              :key="v.tone"
              @click="pickVariant(v)"
              class="text-left p-3 bg-habit-bg border border-habit-border rounded-lg hover:border-habit-cyan transition-colors"
            >
              <p class="text-[10px] uppercase tracking-wider text-habit-cyan font-semibold mb-1">
                {{ v.tone }}
              </p>
              <p class="text-xs text-habit-text leading-relaxed">
                {{ v.message }}
              </p>
            </button>
          </div>
        </div>

        <!-- Messaggio editabile -->
        <div>
          <label
            class="block text-xs font-medium text-habit-text-subtle mb-1"
            >Messaggio</label
          >
          <textarea
            v-model="message"
            rows="5"
            placeholder="Scegli un template o genera con AI, oppure scrivi tu..."
            class="w-full bg-habit-bg border border-habit-border rounded-lg px-3 py-2 text-sm text-habit-text focus:outline-none focus:border-habit-cyan resize-none"
          ></textarea>
          <p class="text-[10px] text-habit-text-subtle mt-1">
            {{ message.length }} caratteri
          </p>
        </div>

        <!-- Azioni -->
        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm text-habit-text-subtle hover:text-habit-text transition-colors"
          >
            Annulla
          </button>
          <button
            @click="handleSend"
            :disabled="!message.trim() || sending"
            class="px-4 py-2 bg-habit-cyan text-white text-sm font-medium rounded-lg hover:bg-habit-orange transition-colors disabled:opacity-50"
          >
            {{ sending ? "Invio..." : "Invia messaggio" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
