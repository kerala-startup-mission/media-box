<script setup>
import { computed } from "vue";

import { APP_CONFIG } from "@/lib/config.js";
import { formatDateTime, isLikelyUrl } from "@/lib/format.js";
import { getSummarySections } from "@/lib/summary.js";

const props = defineProps({
  payload: { type: Object, required: true }
});

const sections = computed(() => getSummarySections(props.payload));
const submittedAt = computed(() => formatDateTime(props.payload.submittedAt));
</script>

<template>
  <section class="glass-card summary-shell" id="summary">
    <div class="section-heading">
      <p class="eyebrow">Questionnaire Response</p>
      <h2>Request summary</h2>
      <p>The summary below is ready to print, save, or review.</p>
    </div>

    <article class="glass-card summary-card">
      <div class="summary-header">
        <div>
          <p class="eyebrow">Questionnaire Response</p>
          <h3>{{ APP_CONFIG.companyName }} Submission</h3>
        </div>
        <div class="summary-meta grid gap-1 text-ink-muted">
          <span><strong>Submitted:</strong> {{ submittedAt }}</span>
          <span v-if="payload.department"><strong>Department:</strong> {{ payload.department }}</span>
        </div>
      </div>

      <div class="summary-grid">
        <section v-for="section in sections" :key="section.title" class="summary-block">
          <h4>{{ section.title }}</h4>

          <p v-if="!section.rows.length" class="summary-note">
            No extra information added yet.
          </p>

          <!-- Vue escapes interpolation, so the old sanitizeText() is gone. -->
          <div v-for="[label, value] in section.rows" :key="label" class="summary-row">
            <strong>{{ label }}</strong>
            <a
              v-if="isLikelyUrl(value)"
              :href="value"
              target="_blank"
              rel="noopener noreferrer"
            >{{ value }}</a>
            <span v-else>{{ value }}</span>
          </div>
        </section>
      </div>
    </article>
  </section>
</template>
