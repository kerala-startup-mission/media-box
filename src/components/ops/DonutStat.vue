<script setup>
import { computed } from "vue";

import { pillClass } from "@/lib/pills.js";

const props = defineProps({
  status: { type: String, required: true },
  count: { type: Number, required: true },
  total: { type: Number, required: true }
});

/* Status colours are reserved and always ship with the text label below, so
   the state is never conveyed by colour alone. */
const STATUS_COLORS = {
  "Will Do": "var(--color-info-text)",
  Ongoing: "var(--color-warn-text)",
  Completed: "var(--color-success-text)"
};

const percentage = computed(() =>
  Math.round((props.count / (props.total || 1)) * 100)
);
const color = computed(() => STATUS_COLORS[props.status] || "var(--color-chart-bar)");
const countLabel = computed(
  () => `${props.count} request${props.count === 1 ? "" : "s"}`
);
</script>

<template>
  <article class="ops-donut-card">
    <div
      class="ops-donut-ring"
      :style="{ '--donut-value': percentage, '--donut-color': color }"
      role="img"
      :aria-label="`${status}: ${percentage} percent, ${countLabel}`"
    >
      <span class="ops-donut-value">{{ percentage }}%</span>
    </div>
    <div class="grid justify-items-center gap-2">
      <span class="ops-pill" :class="pillClass('status', status)">{{ status }}</span>
      <strong>{{ countLabel }}</strong>
    </div>
  </article>
</template>
