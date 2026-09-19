<script setup>
import { formatDate } from "@/lib/format.js";
import { useWorkflowStore } from "@/stores/workflow.js";

const workflow = useWorkflowStore();
</script>

<template>
  <div class="ops-archive-groups">
    <section v-if="!workflow.archiveGroups.length" class="ops-archive-empty">
      <p class="ops-kicker">No archived items</p>
      <h3>Completed requests will appear here.</h3>
    </section>

    <section
      v-for="[month, tasks] in workflow.archiveGroups"
      :key="month"
      class="ops-archive-group"
    >
      <div class="ops-archive-header">
        <h3>{{ month }}</h3>
        <span>{{ tasks.length }} completed</span>
      </div>

      <div class="ops-archive-list">
        <article v-for="task in tasks" :key="task.id" class="ops-archive-card">
          <strong>{{ task.title }}</strong>
          <span>{{ task.category }} &middot; {{ task.team }} &middot; {{ formatDate(task.completedAt) }}</span>
        </article>
      </div>
    </section>
  </div>
</template>
