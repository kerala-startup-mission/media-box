<script setup>
import { useWorkflowStore } from "@/stores/workflow.js";

const workflow = useWorkflowStore();
</script>

<template>
  <section class="ops-category-tabs">
    <button
      v-for="tab in workflow.categoryCounts"
      :key="tab.category"
      type="button"
      class="ops-category-tab"
      :class="{ 'is-active': workflow.activeCategoryTab === tab.category }"
      :aria-pressed="workflow.activeCategoryTab === tab.category"
      @click="workflow.setCategoryTab(tab.category)"
    >
      <span>{{ tab.category }}</span>
      <strong>{{ tab.count }}</strong>
      <small>Open works</small>
    </button>
  </section>
</template>
