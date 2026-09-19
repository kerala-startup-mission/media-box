<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  rows: { type: Number, default: 3 },
  help: { type: String, default: "" },
  fullWidth: { type: Boolean, default: false },
  options: { type: Array, default: () => [] }
});

defineEmits(["update:modelValue"]);

const isTextarea = computed(() => props.type === "textarea");
const isSelect = computed(() => props.type === "select");
</script>

<template>
  <label class="field" :class="{ 'full-width': fullWidth }">
    <span>
      {{ label }}
      <strong v-if="required" class="required-mark" aria-hidden="true">*</strong>
    </span>

    <textarea
      v-if="isTextarea"
      class="control"
      :name="name"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>

    <select
      v-else-if="isSelect"
      class="control"
      :name="name"
      :required="required"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <input
      v-else
      class="control"
      :type="type"
      :name="name"
      :placeholder="placeholder"
      :required="required"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    >

    <p v-if="help" class="field-help">{{ help }}</p>
  </label>
</template>
