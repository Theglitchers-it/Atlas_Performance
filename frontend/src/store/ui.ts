import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  // ============================================================
  // Drawer state (single source of truth)
  // ============================================================
  const drawerOpen = ref<boolean>(false);

  function closeDrawer(): void {
    drawerOpen.value = false;
  }

  function openDrawer(): void {
    drawerOpen.value = true;
  }

  function toggleDrawer(): void {
    drawerOpen.value = !drawerOpen.value;
  }

  // ============================================================
  // Body scroll lock (reference-counted)
  // Multiple owner (drawer, modal, bottom sheet) — body resta locked
  // finche almeno un owner detiene il lock. Previene race conflicts.
  // ============================================================
  const scrollLockOwners = ref<Set<string>>(new Set());
  const isBodyLocked = computed<boolean>(() => scrollLockOwners.value.size > 0);

  function lockBodyScroll(ownerId: string): void {
    scrollLockOwners.value.add(ownerId);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  }

  function unlockBodyScroll(ownerId: string): void {
    scrollLockOwners.value.delete(ownerId);
    if (typeof document !== "undefined" && scrollLockOwners.value.size === 0) {
      document.body.style.overflow = "";
    }
  }

  return {
    drawerOpen,
    closeDrawer,
    openDrawer,
    toggleDrawer,
    isBodyLocked,
    lockBodyScroll,
    unlockBodyScroll,
  };
});
