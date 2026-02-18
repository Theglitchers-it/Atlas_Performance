/**
 * Unit Tests - ConfirmDialog.vue
 * Tests rendering with props, open/close behavior, and event emissions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
void nextTick;
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";

// Mock @headlessui/vue to render real DOM elements for testing
vi.mock("@headlessui/vue", () => ({
  Dialog: {
    template: '<div role="dialog" v-if="$attrs.open !== false"><slot /></div>',
    props: ["as"],
  },
  DialogPanel: {
    template: '<div class="dialog-panel"><slot /></div>',
  },
  DialogTitle: {
    template: '<h2 class="dialog-title"><slot /></h2>',
  },
  TransitionRoot: {
    template: '<div v-if="show"><slot /></div>',
    props: ["show", "appear", "as"],
  },
  TransitionChild: {
    template: "<div><slot /></div>",
    props: [
      "as",
      "enter",
      "enterFrom",
      "enterTo",
      "leave",
      "leaveFrom",
      "leaveTo",
    ],
  },
}));

// Mock heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  ExclamationTriangleIcon: { template: '<svg data-icon="exclamation" />' },
  TrashIcon: { template: '<svg data-icon="trash" />' },
  InformationCircleIcon: { template: '<svg data-icon="info" />' },
}));

describe("ConfirmDialog", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const mountDialog = (props = {}) => {
    return mount(ConfirmDialog, {
      props: {
        open: true,
        ...props,
      },
    });
  };

  it("renders with default props when open", () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain("Conferma azione");
    expect(wrapper.text()).toContain("Sei sicuro di voler procedere?");
    expect(wrapper.text()).toContain("Conferma");
    expect(wrapper.text()).toContain("Annulla");
  });

  it("does not render content when open is false", () => {
    const wrapper = mountDialog({ open: false });

    // TransitionRoot mock checks `show` prop; when false it renders nothing
    expect(wrapper.text()).not.toContain("Conferma azione");
  });

  it("shows custom title and message from props", () => {
    const wrapper = mountDialog({
      title: "Elimina cliente",
      message: "Questa azione non puo essere annullata.",
    });

    expect(wrapper.text()).toContain("Elimina cliente");
    expect(wrapper.text()).toContain("Questa azione non puo essere annullata.");
  });

  it('emits "confirm" when confirm button is clicked', async () => {
    const wrapper = mountDialog();

    // Find the confirm button (second button, contains confirmText)
    const buttons = wrapper.findAll("button");
    const confirmBtn = buttons.find((b) => b.text().includes("Conferma"));
    expect(confirmBtn).toBeDefined();

    await confirmBtn!.trigger("click");

    expect(wrapper.emitted("confirm")).toBeTruthy();
    expect(wrapper.emitted("confirm")!.length).toBe(1);
  });

  it('emits "cancel" when cancel button is clicked', async () => {
    const wrapper = mountDialog();

    const buttons = wrapper.findAll("button");
    const cancelBtn = buttons.find((b) => b.text().includes("Annulla"));
    expect(cancelBtn).toBeDefined();

    await cancelBtn!.trigger("click");

    expect(wrapper.emitted("cancel")).toBeTruthy();
    expect(wrapper.emitted("cancel")!.length).toBe(1);
  });

  it("does not emit events when loading is true", async () => {
    const wrapper = mountDialog({ loading: true });

    const buttons = wrapper.findAll("button");
    const confirmBtn = buttons.find((b) => b.text().includes("Attendere"));
    const cancelBtn = buttons.find((b) => b.text().includes("Annulla"));

    // Both buttons should be disabled
    expect(confirmBtn!.attributes("disabled")).toBeDefined();
    expect(cancelBtn!.attributes("disabled")).toBeDefined();

    // Click should not emit because handleConfirm/handleCancel check loading
    await confirmBtn!.trigger("click");
    await cancelBtn!.trigger("click");

    expect(wrapper.emitted("confirm")).toBeFalsy();
    expect(wrapper.emitted("cancel")).toBeFalsy();
  });

  it("shows custom button text from props", () => {
    const wrapper = mountDialog({
      confirmText: "Si, elimina",
      cancelText: "No, torna indietro",
    });

    expect(wrapper.text()).toContain("Si, elimina");
    expect(wrapper.text()).toContain("No, torna indietro");
  });
});
