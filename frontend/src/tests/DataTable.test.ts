/**
 * Unit Tests - DataTable.vue
 * Tests table header rendering, row rendering, empty state, and pagination
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import DataTable from "@/components/ui/DataTable.vue";

// Mock EmptyState child component
vi.mock("@/components/ui/EmptyState.vue", () => ({
  default: {
    template: '<div class="empty-state-mock">{{ title }}</div>',
    props: ["icon", "title", "description", "actionText", "actionTo"],
  },
}));

describe("DataTable", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const sampleColumns = [
    { key: "name", label: "Nome", sortable: true },
    { key: "email", label: "Email" },
    { key: "role", label: "Ruolo" },
  ];

  const sampleData = [
    { id: 1, name: "Marco Rossi", email: "marco@test.com", role: "Trainer" },
    { id: 2, name: "Sara Bianchi", email: "sara@test.com", role: "Client" },
    { id: 3, name: "Andrea Verdi", email: "andrea@test.com", role: "Staff" },
  ];

  const mountTable = (props = {}) => {
    return mount(DataTable, {
      props: {
        columns: sampleColumns,
        data: sampleData,
        ...props,
      },
      global: {
        stubs: {
          "router-link": {
            template: '<a :href="to"><slot /></a>',
            props: ["to"],
          },
        },
        plugins: [createPinia()],
      },
    });
  };

  it("renders table headers from columns prop", () => {
    const wrapper = mountTable();

    const headers = wrapper.findAll("th");
    const headerTexts = headers.map((h) => h.text());

    expect(headerTexts).toContain("Nome");
    expect(headerTexts).toContain("Email");
    expect(headerTexts).toContain("Ruolo");
  });

  it("renders rows from data prop", () => {
    const wrapper = mountTable();

    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(3);

    // Check that cell data is rendered
    expect(rows[0].text()).toContain("Marco Rossi");
    expect(rows[0].text()).toContain("marco@test.com");
    expect(rows[0].text()).toContain("Trainer");

    expect(rows[1].text()).toContain("Sara Bianchi");
    expect(rows[2].text()).toContain("Andrea Verdi");
  });

  it("shows empty state when data is empty", () => {
    const wrapper = mountTable({
      data: [],
      emptyTitle: "Nessun cliente trovato",
    });

    // The table should NOT be rendered
    expect(wrapper.find("table").exists()).toBe(false);

    // The EmptyState mock should be visible
    const emptyState = wrapper.find(".empty-state-mock");
    expect(emptyState.exists()).toBe(true);
    expect(emptyState.text()).toContain("Nessun cliente trovato");
  });

  it("shows pagination when paginated with enough data", () => {
    // Create data with more than pageSize items
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      role: "Client",
    }));

    const wrapper = mountTable({
      data: manyRows,
      paginated: true,
      pageSize: 10,
    });

    // Pagination should be visible (totalPages > 1)
    expect(wrapper.text()).toContain("Pagina");
    expect(wrapper.text()).toContain("risultati");

    // Should show Precedente and Successiva buttons
    const paginationButtons = wrapper.findAll("button");
    const prevBtn = paginationButtons.find((b) =>
      b.text().includes("Precedente"),
    );
    const nextBtn = paginationButtons.find((b) =>
      b.text().includes("Successiva"),
    );
    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();

    // Only 10 rows displayed on page 1
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(10);
  });
});
