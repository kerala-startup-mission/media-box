<script setup>
import { PRIORITIES } from "@/lib/config.js";
import { useWorkflowStore } from "@/stores/workflow.js";

defineEmits(["export"]);

const workflow = useWorkflowStore();
</script>

<template>
  <div class="ops-filter-row">
    <label class="ops-filter">
      <span>Search</span>
      <input
        v-model="workflow.filters.search"
        class="ops-control"
        type="search"
        placeholder="Search title, requester, ID"
      >
    </label>

    <label class="ops-filter">
      <span>Status</span>
      <select v-model="workflow.filters.status" class="ops-control">
        <option value="">All active statuses</option>
        <option>Will Do</option>
        <option>Ongoing</option>
      </select>
    </label>

    <label class="ops-filter">
      <span>Category</span>
      <select v-model="workflow.filters.category" class="ops-control">
        <option value="">All categories</option>
        <option v-for="category in workflow.availableCategories" :key="category">
          {{ category }}
        </option>
      </select>
    </label>

    <label class="ops-filter">
      <span>Priority</span>
      <select v-model="workflow.filters.priority" class="ops-control">
        <option value="">All priorities</option>
        <option v-for="priority in PRIORITIES" :key="priority">{{ priority }}</option>
      </select>
    </label>

    <button type="button" class="ops-btn-base ops-primary-button" @click="$emit('export')">
      Export CSV
    </button>
  </div>
</template>
