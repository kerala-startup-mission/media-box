<script setup>
defineProps({
  message: { type: String, default: "" },
  isError: { type: Boolean, default: false }
});
</script>

<template>
  <p
    v-if="message"
    class="status-message"
    :class="{ 'is-error': isError }"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </p>
</template>
