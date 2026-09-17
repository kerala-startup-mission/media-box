<script setup>
import { onMounted } from "vue";

import AdminGate from "@/components/ops/AdminGate.vue";
import ArchiveGroups from "@/components/ops/ArchiveGroups.vue";
import CategoryTabs from "@/components/ops/CategoryTabs.vue";
import FilterRow from "@/components/ops/FilterRow.vue";
import TaskTable from "@/components/ops/TaskTable.vue";
import StatusMessage from "@/components/StatusMessage.vue";
import { exportTasksCsv } from "@/lib/csv.js";
import { useAuthStore } from "@/stores/auth.js";
import { useWorkflowStore } from "@/stores/workflow.js";

const auth = useAuthStore();
const workflow = useWorkflowStore();

onMounted(async () => {
  await auth.ensureVerified();
  if (auth.isAdmin) await workflow.load();
});

function onExport() {
  exportTasksCsv(workflow.visibleTasks);
}
</script>

<template>
  <AdminGate>
    <CategoryTabs />

    <section class="ops-card ops-panel">
      <FilterRow @export="onExport" />
      <StatusMessage class="mb-4" :message="workflow.error" is-error />
      <TaskTable />
    </section>

    <section class="ops-card ops-panel">
      <div class="section-heading">
        <p class="eyebrow">Recent Repository</p>
        <h2>Completed items</h2>
        <p>
          Minimal records are grouped month-wise for the latest two months only.
          Older completed items are removed from the live page view.
        </p>
      </div>

      <ArchiveGroups class="mt-5" />
    </section>
  </AdminGate>
</template>
