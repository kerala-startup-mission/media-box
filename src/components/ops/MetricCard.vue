<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  caption: { type: String, default: "" }
});
</script>

<template>
  <article class="ops-card ops-metric-card">
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <p v-if="caption" class="mt-2 text-sm">{{ caption }}</p>
  </article>
</template>
