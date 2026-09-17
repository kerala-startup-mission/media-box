<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  count: { type: Number, required: true },
  max: { type: Number, required: true },
  unit: { type: String, default: "request" }
});

/* A zero-count row keeps a zero-width fill rather than a misleading stub. */
const width = computed(() => {
  if (!props.count) return 0;
  return Math.max((props.count / (props.max || 1)) * 100, 4);
});

const countLabel = computed(
  () => `${props.count} ${props.unit}${props.count === 1 ? "" : "s"}`
);
</script>

<template>
  <article class="ops-bar-item">
    <div class="ops-bar-copy">
      <strong>{{ label }}</strong>
      <span>{{ countLabel }}</span>
    </div>
    <div
      class="ops-bar-track"
      role="img"
      :aria-label="`${label}: ${countLabel}`"
    >
      <div class="ops-bar-fill" :style="{ width: `${width}%` }"></div>
    </div>
  </article>
</template>
