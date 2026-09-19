<script setup>
import { fileSizeKb } from "@/lib/format.js";

const props = defineProps({
  modelValue: { type: Array, required: true }
});

const emit = defineEmits(["update:modelValue"]);

let nextId = 1;

function makeSpeaker() {
  nextId += 1;
  return { id: `speaker-${Date.now()}-${nextId}`, name: "", title: "", files: [] };
}

function update(index, patch) {
  const next = props.modelValue.map((speaker, position) =>
    position === index ? { ...speaker, ...patch } : speaker
  );
  emit("update:modelValue", next);
}

function addSpeaker() {
  emit("update:modelValue", [...props.modelValue, makeSpeaker()]);
}

function removeSpeaker(index) {
  emit("update:modelValue", props.modelValue.filter((_, position) => position !== index));
}
</script>

<template>
  <div class="speaker-repeater full-width" data-speaker-repeater>
    <div class="speaker-repeater-header">
      <div>
        <p class="speaker-kicker">Speaker Details</p>
        <p class="field-help">Add one card per speaker.</p>
      </div>
      <button type="button" class="btn-base ghost-button speaker-add-button" @click="addSpeaker">
        Add Another Speaker
      </button>
    </div>

    <article
      v-for="(speaker, index) in modelValue"
      :key="speaker.id"
      class="speaker-card"
    >
      <div class="mb-4 flex items-center justify-between gap-3">
        <strong>Speaker {{ index + 1 }}</strong>
        <!-- Gated reactively, so re-indexing after a removal stays correct. -->
        <button
          v-if="index > 0"
          type="button"
          class="speaker-remove-button"
          @click="removeSpeaker(index)"
        >
          Remove
        </button>
      </div>

      <div class="speaker-card-grid">
        <label class="field">
          <span>Speaker name</span>
          <input
            class="control"
            type="text"
            placeholder="Enter speaker name"
            :value="speaker.name"
            @input="update(index, { name: $event.target.value })"
          >
        </label>

        <label class="field">
          <span>Speaker title / designation</span>
          <input
            class="control"
            type="text"
            placeholder="Enter title or role"
            :value="speaker.title"
            @input="update(index, { title: $event.target.value })"
          >
        </label>
      </div>

      <label class="field mt-4">
        <span>Upload speaker photos</span>
        <input
          class="control"
          type="file"
          accept="image/*,.pdf"
          multiple
          @change="update(index, { files: Array.from($event.target.files || []) })"
        >
        <p class="field-help">Upload one or more photos for this speaker.</p>
      </label>

      <div class="mt-3 grid gap-2">
        <p v-if="!speaker.files.length" class="field-help">
          Speaker photo uploads will appear here.
        </p>
        <div
          v-for="file in speaker.files"
          :key="`${file.name}-${file.size}`"
          class="speaker-file-chip"
        >
          <strong>{{ file.name }}</strong>
          <span>{{ fileSizeKb(file.size) }} KB</span>
        </div>
      </div>
    </article>
  </div>
</template>
