<script setup>
import { onBeforeUnmount, ref, watch } from "vue";

import { fileSizeKb } from "@/lib/format.js";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, required: true },
  name: { type: String, required: true },
  help: { type: String, default: "" },
  accept: { type: String, default: "image/*,.pdf" },
  emptyText: { type: String, default: "Uploaded posters or images will appear here before submission." }
});

defineEmits(["update:modelValue"]);

const previews = ref([]);

/*
 * The original called URL.createObjectURL on every re-render and never revoked,
 * leaking one URL per file per navigation. Here the URLs are built once per
 * file list and released when they are replaced or the field unmounts.
 */
function releasePreviews() {
  previews.value.forEach((preview) => {
    if (preview.url) URL.revokeObjectURL(preview.url);
  });
  previews.value = [];
}

watch(
  () => props.modelValue,
  (files) => {
    releasePreviews();
    previews.value = Array.from(files || []).map((file) => {
      const isImage = (file.type || "").startsWith("image/");
      return {
        key: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        sizeKb: fileSizeKb(file.size),
        isImage,
        url: isImage ? URL.createObjectURL(file) : ""
      };
    });
  },
  { immediate: true, deep: false }
);

onBeforeUnmount(releasePreviews);
</script>

<template>
  <label class="field full-width">
    <span>{{ label }}</span>
    <input
      class="control"
      type="file"
      :name="name"
      :accept="accept"
      multiple
      @change="$emit('update:modelValue', Array.from($event.target.files || []))"
    >
    <p v-if="help" class="field-help">{{ help }}</p>
  </label>

  <div class="full-width">
    <div v-if="!previews.length" class="upload-empty-state">
      {{ emptyText }}
    </div>

    <div v-else class="upload-gallery">
      <article
        v-for="preview in previews"
        :key="preview.key"
        class="upload-card"
        :class="{ 'is-document': !preview.isImage }"
      >
        <img
          v-if="preview.isImage"
          class="upload-card-image"
          :src="preview.url"
          :alt="preview.name"
        >
        <div v-else class="upload-card-document" aria-hidden="true">PDF</div>

        <div class="upload-card-meta">
          <strong>{{ preview.name }}</strong>
          <span>{{ preview.sizeKb }} KB</span>
        </div>
      </article>
    </div>
  </div>
</template>
