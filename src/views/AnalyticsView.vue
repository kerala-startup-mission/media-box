<script setup>
import { computed, onMounted } from "vue";

import AdminGate from "@/components/ops/AdminGate.vue";
import DonutStat from "@/components/ops/DonutStat.vue";
import MetricCard from "@/components/ops/MetricCard.vue";
import StatBar from "@/components/ops/StatBar.vue";
import StatusMessage from "@/components/StatusMessage.vue";
import { WORKFLOW_STATUSES } from "@/lib/config.js";
import { formatDate, formatMonthYear } from "@/lib/format.js";
import { useAuthStore } from "@/stores/auth.js";
import { useWorkflowStore } from "@/stores/workflow.js";

const auth = useAuthStore();
const workflow = useWorkflowStore();

onMounted(async () => {
  await auth.ensureVerified();
  if (auth.isAdmin) await workflow.load();
});

const tasks = computed(() => workflow.tasks);
const active = computed(() => workflow.activeTasks);

const metrics = computed(() => [
  { label: "Total Requests", value: tasks.value.length, caption: "All submissions captured" },
  { label: "Live Requests", value: active.value.length, caption: "Still active in workflow" },
  {
    label: "Completed",
    value: tasks.value.filter((task) => task.status === "Completed").length,
    caption: "Moved to the repository"
  },
  {
    label: "Unassigned",
    value: active.value.filter((task) => !task.assignee || task.assignee === "To be assigned").length,
    caption: "Needs owner allocation"
  },
  {
    label: "High Priority",
    value: active.value.filter(
      (task) => task.priority === "High Touch" || task.priority === "Fast Turnaround"
    ).length,
    caption: "Fast-moving or high touch"
  },
  {
    label: "Daily Digest Live",
    value: active.value.filter((task) => task.category === "Daily Digest").length,
    caption: "Currently active digest items"
  }
]);

function toBars(entries) {
  const max = entries.reduce((highest, [, count]) => Math.max(highest, count), 0);
  return entries.map(([label, count]) => ({ label, count, max }));
}

const categoryBars = computed(() => {
  const grouped = tasks.value.reduce((groups, task) => {
    const key = task.category || "Unclassified";
    groups[key] = (groups[key] || 0) + 1;
    return groups;
  }, {});
  return toBars(Object.entries(grouped).sort((left, right) => right[1] - left[1]));
});

const teamBars = computed(() => {
  const grouped = workflow.teams.reduce((groups, team) => ({ ...groups, [team]: 0 }), {});
  active.value.forEach((task) => {
    const team = task.team || "Unassigned";
    grouped[team] = (grouped[team] || 0) + 1;
  });
  return toBars(
    Object.entries(grouped)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
  );
});

const statusSlices = computed(() =>
  WORKFLOW_STATUSES.map((status) => ({
    status,
    count: tasks.value.filter((task) => task.status === status).length
  }))
);

const monthlyBars = computed(() => {
  const grouped = tasks.value
    .filter((task) => task.status === "Completed" && task.completedAt)
    .sort((left, right) => new Date(right.completedAt) - new Date(left.completedAt))
    .reduce((groups, task) => {
      const key = formatMonthYear(task.completedAt);
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  return toBars(Object.entries(grouped).slice(0, 2));
});
</script>

<template>
  <AdminGate>
    <StatusMessage class="mb-4" :message="workflow.error" is-error />

    <div class="ops-metrics-grid">
      <MetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :caption="metric.caption"
      />
    </div>

    <section class="ops-analytics-grid">
      <article class="ops-card ops-panel">
        <div class="section-heading">
          <p class="eyebrow">Category Mix</p>
          <h2>Request distribution</h2>
          <p>Where the incoming request load is coming from right now.</p>
        </div>

        <div class="ops-bar-list mt-5">
          <p v-if="!categoryBars.length">No requests captured yet.</p>
          <StatBar
            v-for="bar in categoryBars"
            :key="bar.label"
            :label="bar.label"
            :count="bar.count"
            :max="bar.max"
          />
        </div>
      </article>

      <article class="ops-card ops-panel">
        <div class="section-heading">
          <p class="eyebrow">Status Overview</p>
          <h2>Current flow</h2>
          <p>How requests are moving through the desk today.</p>
        </div>

        <div class="ops-donut-grid mt-5">
          <DonutStat
            v-for="slice in statusSlices"
            :key="slice.status"
            :status="slice.status"
            :count="slice.count"
            :total="tasks.length"
          />
        </div>
      </article>

      <article class="ops-card ops-panel">
        <div class="section-heading">
          <p class="eyebrow">Team Load</p>
          <h2>Assignment snapshot</h2>
          <p>Active work grouped by team for easier balancing.</p>
        </div>

        <div class="ops-bar-list mt-5">
          <p v-if="!teamBars.length">No active team allocation yet.</p>
          <StatBar
            v-for="bar in teamBars"
            :key="bar.label"
            :label="bar.label"
            :count="bar.count"
            :max="bar.max"
          />
        </div>
      </article>

      <article class="ops-card ops-panel">
        <div class="section-heading">
          <p class="eyebrow">Recent Closures</p>
          <h2>Monthly completion trend</h2>
          <p>Only the latest two months are shown in the live workspace view.</p>
        </div>

        <div class="ops-mini-timeline mt-5">
          <p v-if="!monthlyBars.length">No completed items yet.</p>
          <StatBar
            v-for="bar in monthlyBars"
            :key="bar.label"
            :label="bar.label"
            :count="bar.count"
            :max="bar.max"
            unit="completed item"
          />
        </div>
      </article>
    </section>

    <section class="ops-card ops-panel">
      <div class="section-heading">
        <p class="eyebrow">Live Activity</p>
        <h2>Active requests</h2>
        <p>A quick list of requests still moving inside the workflow monitor.</p>
      </div>

      <div class="ops-table-shell mt-5">
        <table class="ops-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Team</th>
              <th>Assignee</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!active.length">
              <td colspan="6"><div class="ops-empty-cell">No active requests.</div></td>
            </tr>
            <tr v-for="task in active" :key="task.id">
              <td><strong>{{ task.title }}</strong></td>
              <td>{{ task.category }}</td>
              <td>{{ task.status }}</td>
              <td>{{ task.team }}</td>
              <td>{{ task.assignee }}</td>
              <td>{{ formatDate(task.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </AdminGate>
</template>
