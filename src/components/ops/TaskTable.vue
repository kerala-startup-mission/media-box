<script setup>
import { WORKFLOW_STATUSES, PRIORITIES } from "@/lib/config.js";
import { formatDate } from "@/lib/format.js";
import { pillClass } from "@/lib/pills.js";
import { useWorkflowStore } from "@/stores/workflow.js";

const workflow = useWorkflowStore();
</script>

<template>
  <div class="ops-table-shell">
    <table class="ops-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Category</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Date</th>
          <th>Assigned</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!workflow.visibleTasks.length">
          <td colspan="7">
            <div class="ops-empty-cell">
              {{ workflow.isLoading ? "Loading requests..." : "No requests match these filters." }}
            </div>
          </td>
        </tr>

        <tr
          v-for="task in workflow.visibleTasks"
          :key="task.id"
          :class="{ 'opacity-60': workflow.savingTaskId === task.id }"
        >
          <td>{{ task.id }}</td>

          <td>
            <strong>{{ task.title }}</strong>
            <small>{{ task.summary }}</small>
          </td>

          <td>
            {{ task.category }}
            <small v-if="task.socialType">{{ task.socialType }}</small>
          </td>

          <td>
            <select
              class="ops-table-select"
              :class="pillClass('priority', task.priority)"
              :value="task.priority"
              :aria-label="`Priority for ${task.title}`"
              @change="workflow.updateTask(task.id, { priority: $event.target.value })"
            >
              <option v-for="priority in PRIORITIES" :key="priority">{{ priority }}</option>
            </select>
          </td>

          <td>
            <select
              class="ops-table-select"
              :class="pillClass('status', task.status)"
              :value="task.status"
              :aria-label="`Status for ${task.title}`"
              @change="workflow.updateTask(task.id, { status: $event.target.value })"
            >
              <option v-for="status in WORKFLOW_STATUSES" :key="status">{{ status }}</option>
            </select>
          </td>

          <td>
            {{ formatDate(task.createdAt) }}
            <small v-if="task.dueText">Due: {{ task.dueText }}</small>
          </td>

          <td>
            <select
              class="ops-table-select"
              :value="task.assignee"
              :aria-label="`Assignee for ${task.title}`"
              @change="workflow.updateTask(task.id, { assignee: $event.target.value })"
            >
              <option v-for="name in workflow.assigneeOptions(task)" :key="name">{{ name }}</option>
            </select>
            <small>{{ task.team }}</small>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
