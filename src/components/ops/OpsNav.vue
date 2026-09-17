<script setup>
import { RouterLink } from "vue-router";

import UserChip from "@/components/UserChip.vue";
</script>

<template>
  <header class="ops-topbar">
    <RouterLink class="ops-brand" to="/">
      <span class="ops-brand-mark" aria-hidden="true">MB</span>
      <span>
        <strong>Media Box Workflow Monitor</strong>
        <small>Operations dashboard</small>
      </span>
    </RouterLink>

    <div class="ops-userbar">
      <UserChip variant="ops" />
    </div>
  </header>

  <nav class="ops-nav">
    <RouterLink class="ops-nav-link" active-class="is-active" to="/dashboard">
      Workflow Monitor
    </RouterLink>
    <RouterLink class="ops-nav-link" active-class="is-active" to="/analytics">
      Analytics
    </RouterLink>
    <RouterLink class="ops-nav-link" to="/">Request hub</RouterLink>
  </nav>
</template>
