<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/store/auth";
import { MapPinIcon, CheckIcon, XMarkIcon } from "@heroicons/vue/24/outline";

interface AvailableLocation {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
}

const auth = useAuthStore();
const toast = useToast();

const visible = ref(false);
const loading = ref(false);
const saving = ref(false);
const locations = ref<AvailableLocation[]>([]);
const selectedId = ref<number | null>(null);

const isClient = computed(() => auth.user?.role === "client");

// LocalStorage key per "ho rimandato la scelta": evita di riapparire ogni page-reload
const SKIP_KEY = "atlas:prefer_location_skipped_at";
const SKIP_TTL_HOURS = 24;

const checkShouldShow = async () => {
  if (!isClient.value) return;

  // Evita popup se l'utente ha cliccato "Più tardi" nelle ultime 24h
  const skipped = localStorage.getItem(SKIP_KEY);
  if (skipped) {
    const skippedAt = parseInt(skipped, 10);
    if (!isNaN(skippedAt) && (Date.now() - skippedAt) < SKIP_TTL_HOURS * 3600 * 1000) {
      return;
    }
  }

  loading.value = true;
  try {
    const [meRes, locsRes] = await Promise.all([
      api.get("/clients/me"),
      api.get("/locations"),
    ]);
    const pref = meRes.data?.data?.client?.preferred_location_id;
    if (pref) return; // già scelta una sede, niente popup

    const list = locsRes.data?.data?.locations || locsRes.data?.data || [];
    const activeLocs = Array.isArray(list)
      ? list.filter((l: any) => l.status === "active")
      : [];

    // Mostra il modale solo se ci sono almeno 2 sedi (con 1 sola la scelta è banale)
    if (activeLocs.length < 2) return;

    locations.value = activeLocs;
    visible.value = true;
  } catch {
    /* ignore */
  } finally {
    loading.value = false;
  }
};

const saveSelection = async () => {
  if (selectedId.value == null) return;
  saving.value = true;
  try {
    await api.put("/clients/me/preferred-location", { locationId: selectedId.value });
    toast.success("Sede preferita salvata");
    localStorage.removeItem(SKIP_KEY);
    visible.value = false;
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Errore salvataggio sede");
  } finally {
    saving.value = false;
  }
};

const skip = () => {
  localStorage.setItem(SKIP_KEY, String(Date.now()));
  visible.value = false;
};

onMounted(() => {
  // Aspetta che auth sia inizializzata
  setTimeout(checkShouldShow, 1000);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="skip"></div>

        <!-- Modal -->
        <div
          class="relative bg-habit-card border border-habit-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          <!-- Header -->
          <div class="p-5 sm:p-6 border-b border-habit-border">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-2xl bg-habit-orange/15 flex items-center justify-center flex-shrink-0">
                <MapPinIcon class="w-5 h-5 text-habit-orange" />
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-lg font-bold text-habit-text">Dove ti alleni?</h2>
                <p class="text-xs text-habit-text-subtle mt-1">
                  Scegli la tua sede principale per vedere classi e appuntamenti
                  direttamente filtrati. Potrai cambiarla in qualsiasi momento da Impostazioni.
                </p>
              </div>
              <button
                @click="skip"
                class="text-habit-text-subtle hover:text-habit-text transition-colors flex-shrink-0"
                :aria-label="'Chiudi'"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Lista sedi -->
          <div class="p-5 sm:p-6 max-h-[60vh] overflow-y-auto">
            <div v-if="loading" class="py-6 text-center text-sm text-habit-text-subtle">
              Caricamento sedi&hellip;
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="loc in locations"
                :key="loc.id"
                type="button"
                @click="selectedId = loc.id"
                class="w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left"
                :class="
                  selectedId === loc.id
                    ? 'border-habit-orange bg-habit-orange/5'
                    : 'border-habit-border hover:border-habit-text-subtle/40 hover:bg-habit-bg-light/40'
                "
              >
                <div class="min-w-0">
                  <div class="text-sm font-medium text-habit-text">{{ loc.name }}</div>
                  <div
                    v-if="loc.city || loc.address"
                    class="text-xs text-habit-text-subtle mt-0.5 truncate"
                  >
                    {{ [loc.address, loc.city].filter(Boolean).join(" • ") }}
                  </div>
                </div>
                <CheckIcon
                  v-if="selectedId === loc.id"
                  class="w-5 h-5 text-habit-orange flex-shrink-0"
                />
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-5 sm:p-6 border-t border-habit-border flex gap-3">
            <button
              type="button"
              @click="skip"
              class="flex-1 px-4 py-2.5 rounded-xl bg-habit-bg-light/60 hover:bg-habit-bg-light text-sm font-medium text-habit-text-subtle transition-colors"
            >
              Più tardi
            </button>
            <button
              type="button"
              @click="saveSelection"
              :disabled="selectedId == null || saving"
              class="flex-1 px-4 py-2.5 rounded-xl bg-habit-orange hover:bg-habit-orange-light text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ saving ? "Salvataggio&hellip;" : "Conferma" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
