<template>
  <div class="heatmap-container">
    <!-- Optional label -->
    <p v-if="label" class="text-sm text-habit-text-muted mb-3 font-medium">
      {{ label }}
    </p>

    <div class="overflow-x-auto">
      <div class="inline-flex gap-0" :style="{ minWidth: 'max-content' }">
        <!-- Day labels column -->
        <div
          class="flex flex-col mr-2"
          :style="{ gap: `${cellGap}px`, paddingTop: monthLabelHeight + 'px' }"
        >
          <div
            v-for="(dayLabel, i) in dayLabels"
            :key="'label-' + i"
            class="flex items-center justify-end text-[10px] text-habit-text-subtle select-none"
            :style="{ height: cellSize + 'px', lineHeight: cellSize + 'px' }"
          >
            {{ i % 2 === 0 ? dayLabel : "" }}
          </div>
        </div>

        <!-- Grid area -->
        <div>
          <!-- Month labels row -->
          <div
            class="flex"
            :style="{ height: monthLabelHeight + 'px', gap: `${cellGap}px` }"
          >
            <div
              v-for="(_col, colIdx) in grid"
              :key="'month-' + colIdx"
              class="text-[10px] text-habit-text-subtle select-none"
              :style="{ width: cellSize + 'px' }"
            >
              {{ monthLabels[colIdx] || "" }}
            </div>
          </div>

          <!-- Cells grid -->
          <div class="flex" :style="{ gap: `${cellGap}px` }">
            <div
              v-for="(col, colIdx) in grid"
              :key="'col-' + colIdx"
              class="flex flex-col"
              :style="{ gap: `${cellGap}px` }"
            >
              <div
                v-for="(cell, rowIdx) in col"
                :key="'cell-' + colIdx + '-' + rowIdx"
                class="heatmap-cell relative cursor-default"
                :style="{
                  width: cellSize + 'px',
                  height: cellSize + 'px',
                  borderRadius: '3px',
                  backgroundColor: cell.color,
                }"
                @mouseenter="showTooltip(cell, $event)"
                @mouseleave="hideTooltip"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="heatmap-tooltip fixed z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium pointer-events-none shadow-lg"
      :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
    >
      <span class="text-habit-text">{{ tooltip.value }}</span>
      <span class="text-habit-text-subtle ml-1.5">{{ tooltip.date }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

interface HeatmapDataPoint {
  date: string;
  value: number;
}

interface Props {
  data?: HeatmapDataPoint[];
  colorScale?: string[];
  weeks?: number;
  cellSize?: number;
  cellGap?: number;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  colorScale: () => [
    "#1e1e1e20",
    "#22c55e40",
    "#22c55e70",
    "#22c55ea0",
    "#22c55e",
  ],
  weeks: 12,
  cellSize: 14,
  cellGap: 3,
  label: "",
});

const dayLabels = ["L", "M", "M", "G", "V", "S", "D"];
const monthLabelHeight = 18;

const monthNames = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  date: "",
  value: "" as string | number,
});

// Build a lookup map from date string to value
const dataMap = computed(() => {
  const map = new Map();
  if (!Array.isArray(props.data)) return map;
  for (const entry of props.data) {
    if (entry && entry.date != null) {
      map.set(entry.date, entry.value);
    }
  }
  return map;
});

// Compute max value for quartile calculation
const maxValue = computed(() => {
  if (props.data.length === 0) return 1;
  const m = Math.max(...props.data.map((d) => d.value));
  return m > 0 ? m : 1;
});

// Map a value to one of 5 color levels
function getColor(value: number | null | undefined): string {
  if (value === undefined || value === null || value === 0) {
    return props.colorScale[0];
  }
  const ratio = value / maxValue.value;
  if (ratio <= 0.25) return props.colorScale[1];
  if (ratio <= 0.5) return props.colorScale[2];
  if (ratio <= 0.75) return props.colorScale[3];
  return props.colorScale[4];
}

// Generate the grid: array of columns (weeks), each column has 7 cells (Mon-Sun)
// Filled from right (most recent) to left
const grid = computed(() => {
  const today = new Date();

  // Find the most recent Sunday (end of last complete row) or today
  // We align so the last column ends with today's weekday
  // JS getDay(): 0=Sun, we want 0=Mon
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun

  const columns: {
    date: string;
    value: number | null;
    color: string;
    isFuture: boolean;
  }[][] = [];

  for (let w = props.weeks - 1; w >= 0; w--) {
    const col: {
      date: string;
      value: number | null;
      color: string;
      isFuture: boolean;
    }[] = [];
    for (let d = 0; d < 7; d++) {
      // Actually, let's compute from today backwards
      // Last column should end at today. Each cell going up is the previous day.
      // Column index from right: (props.weeks - 1 - colIdx)
      // Within column: row 0=Mon, row 6=Sun
      // Current day of week (0=Mon..6=Sun) = todayDow
      // The bottom-right cell should be today
      // Days from today = (props.weeks - 1 - w) * 7 + (todayDow - d) ... let me recalculate

      // Column w=0 is the leftmost (oldest), w=props.weeks-1 is the rightmost (most recent)
      // In the rightmost column, row todayDow = today, rows after todayDow are future
      // In each column, row 0 = Monday, row 6 = Sunday

      const colOffset = props.weeks - 1 - w; // how many weeks before the current week
      const dayOffset = todayDow - d; // offset within the week relative to today

      const daysFromToday = colOffset * 7 + dayOffset;
      const cellDate = new Date(today);
      cellDate.setDate(today.getDate() - daysFromToday);

      // Don't show future dates
      const isFuture = daysFromToday < 0;

      const dateStr = formatDate(cellDate);
      const value = isFuture ? null : (dataMap.value.get(dateStr) ?? 0);

      col.push({
        date: dateStr,
        value: isFuture ? null : value,
        color: isFuture ? "transparent" : getColor(value),
        isFuture,
      });
    }
    columns.push(col);
  }

  return columns;
});

// Compute month labels: show the month name at the first column where that month starts
const monthLabels = computed(() => {
  const labels: Record<number, string> = {};
  let lastMonth: number | null = null;

  for (let colIdx = 0; colIdx < grid.value.length; colIdx++) {
    const col = grid.value[colIdx];
    // Use the Monday (row 0) of this column to determine the month
    const firstCell = col[0];
    if (firstCell && !firstCell.isFuture) {
      const cellDate = new Date(firstCell.date);
      const month = cellDate.getMonth();
      if (month !== lastMonth) {
        labels[colIdx] = monthNames[month];
        lastMonth = month;
      }
    }
  }

  return labels;
});

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  return `${parseInt(parts[2])} ${monthNames[parseInt(parts[1]) - 1] || ""} ${parts[0]}`;
}

function showTooltip(
  cell: { isFuture: boolean; date: string; value: number | null },
  event: MouseEvent,
): void {
  if (cell.isFuture) return;
  tooltip.date = formatDisplayDate(cell.date);
  tooltip.value = cell.value != null ? String(cell.value) : "0";
  tooltip.x = event.clientX + 10;
  tooltip.y = event.clientY - 36;
  tooltip.visible = true;
}

function hideTooltip() {
  tooltip.visible = false;
}
</script>

<style scoped>
.heatmap-cell {
  transition:
    outline 0.1s ease,
    transform 0.1s ease;
}

.heatmap-cell:hover {
  outline: 2px solid var(--color-habit-text-muted, rgba(255, 255, 255, 0.3));
  outline-offset: -1px;
  transform: scale(1.15);
}

.heatmap-tooltip {
  background: rgb(var(--color-habit-card));
  border: 1px solid var(--color-habit-border);
  backdrop-filter: blur(8px);
}

/* Dark mode adjustment for empty cells */
:root.dark .heatmap-cell,
.dark .heatmap-cell {
  /* Empty cell color is handled via props/colorScale, but we can provide a subtle fallback */
}
</style>
