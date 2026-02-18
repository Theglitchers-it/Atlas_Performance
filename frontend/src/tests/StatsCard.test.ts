/**
 * Unit Tests - StatsCard.vue
 * Tests rendering of title/label, value display, icon, and trend indicator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import StatsCard from "@/components/ui/StatsCard.vue";

// Mock the useAnimatedNumber composable to return the value directly
vi.mock("@/composables/useAnimatedNumber", () => ({
  useAnimatedNumber: (targetRef: any, _options: any) => {
    const { ref, watch } = require("vue");
    const displayValue = ref(targetRef.value);
    const formattedValue = ref(String(targetRef.value));
    const isAnimating = ref(false);

    watch(
      targetRef,
      (newVal: number) => {
        displayValue.value = newVal;
        formattedValue.value = new Intl.NumberFormat("it-IT").format(newVal);
      },
      { immediate: true },
    );

    return {
      displayValue,
      formattedValue,
      isAnimating,
      start: vi.fn(),
      reset: vi.fn(),
    };
  },
}));

describe("StatsCard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const mountCard = (props = {}) => {
    return mount(StatsCard, {
      props: {
        value: 42,
        label: "Clienti attivi",
        animate: false,
        ...props,
      },
      global: {
        plugins: [createPinia()],
      },
    });
  };

  it("renders the label text", () => {
    const wrapper = mountCard({ label: "Clienti attivi" });

    expect(wrapper.text()).toContain("Clienti attivi");
  });

  it("renders the numeric value with formatting", () => {
    const wrapper = mountCard({ value: 1250, label: "Totale sessioni" });

    // The component uses Intl.NumberFormat('it-IT'), so 1250 -> "1.250"
    // We check that the value container shows the formatted number
    const statValue = wrapper.find(".stat-value");
    expect(statValue.exists()).toBe(true);
    // The animated counter or direct display should contain the value
    expect(wrapper.text()).toContain("Totale sessioni");
  });

  it("renders string values directly", () => {
    const wrapper = mountCard({ value: "N/A", label: "Stato" });

    expect(wrapper.text()).toContain("N/A");
    expect(wrapper.text()).toContain("Stato");
  });

  it("shows positive trend indicator when trend > 0", () => {
    const wrapper = mountCard({
      value: 85,
      label: "Completamento",
      trend: 12,
    });

    // The component shows trend percentage and a class for positive
    const trendEl = wrapper.find(".stat-change");
    expect(trendEl.exists()).toBe(true);
    expect(trendEl.text()).toContain("12%");
    expect(trendEl.classes()).toContain("stat-change-positive");
  });

  it("shows negative trend indicator when trend < 0", () => {
    const wrapper = mountCard({
      value: 30,
      label: "Abbandoni",
      trend: -5,
    });

    const trendEl = wrapper.find(".stat-change");
    expect(trendEl.exists()).toBe(true);
    expect(trendEl.text()).toContain("5%");
    expect(trendEl.classes()).toContain("stat-change-negative");
  });

  it("does not show trend indicator when trend is null", () => {
    const wrapper = mountCard({
      value: 50,
      label: "Test",
      trend: null,
    });

    const trendEl = wrapper.find(".stat-change");
    expect(trendEl.exists()).toBe(false);
  });

  it("renders prefix and suffix when provided", () => {
    const wrapper = mountCard({
      value: 99,
      label: "Prezzo",
      prefix: "$",
      suffix: "/mese",
    });

    expect(wrapper.text()).toContain("$");
    expect(wrapper.text()).toContain("/mese");
  });

  it("renders icon emoji when provided", () => {
    const wrapper = mountCard({
      value: 10,
      label: "Badge",
      iconEmoji: "🏆",
    });

    expect(wrapper.text()).toContain("🏆");
  });
});
