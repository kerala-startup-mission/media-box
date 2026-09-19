<script setup>
defineProps({
  modelValue: { type: String, default: "" },
  name: { type: String, required: true },
  ariaLabel: { type: String, required: true },
  options: { type: Array, required: true }
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="choice-grid" role="radiogroup" :aria-label="ariaLabel">
    <label
      v-for="option in options"
      :key="option.value"
      class="choice-card"
      :class="{ 'is-selected': modelValue === option.value }"
    >
      <input
        class="sr-only"
        type="radio"
        :name="name"
        :value="option.value"
        :checked="modelValue === option.value"
        @change="$emit('update:modelValue', option.value)"
      >
      <strong>{{ option.title }}</strong>
      <small>{{ option.description }}</small>
    </label>
  </div>
</template>
