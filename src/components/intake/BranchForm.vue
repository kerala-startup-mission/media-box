<script setup>
import { computed } from "vue";

import FormField from "@/components/intake/FormField.vue";
import UploadField from "@/components/intake/UploadField.vue";
import SpeakerRepeater from "@/components/intake/SpeakerRepeater.vue";
import { BRANCH_LAYOUT } from "@/lib/fields.js";
import { useIntakeStore } from "@/stores/intake.js";

const props = defineProps({
  branch: { type: String, required: true }
});

const intake = useIntakeStore();
const layout = computed(() => BRANCH_LAYOUT[props.branch] || null);
</script>

<template>
  <section v-if="layout" class="form-section">
    <div class="section-title">
      <span>{{ layout.step }}</span>
      <h3>{{ layout.heading }}</h3>
    </div>

    <div class="field-grid two-col">
      <template v-for="entry in layout.fields" :key="entry.name || entry.kind">
        <FormField
          v-if="entry.kind === 'field'"
          v-model="intake.form[entry.name]"
          :name="entry.name"
          :label="entry.label"
          :type="entry.type || 'text'"
          :rows="entry.rows || 3"
          :placeholder="entry.placeholder || ''"
          :full-width="Boolean(entry.fullWidth)"
        />

        <UploadField
          v-else-if="entry.kind === 'upload'"
          v-model="intake.files[entry.name]"
          :name="entry.name"
          :label="entry.label"
          :help="entry.help"
        />

        <SpeakerRepeater
          v-else-if="entry.kind === 'speakers'"
          v-model="intake.speakers"
        />
      </template>
    </div>
  </section>
</template>
