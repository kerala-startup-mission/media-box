<script setup>
defineProps({
  activeIndex: { type: Number, required: true }
});

const steps = [1, 2, 3, 4];
</script>

<template>
  <div class="progress-strip" aria-label="Form progress">
    <div
      v-for="(step, index) in steps"
      :key="step"
      class="progress-step"
      :class="{
        'is-active': index === activeIndex,
        'is-complete': index < activeIndex
      }"
    >
      {{ step }}
    </div>
  </div>
</template>
