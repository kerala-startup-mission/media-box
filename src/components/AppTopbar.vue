<script setup>
import { RouterLink } from "vue-router";

import UserChip from "@/components/UserChip.vue";
import { useAuthStore } from "@/stores/auth.js";

const auth = useAuthStore();
</script>

<template>
  <header class="topbar">
    <RouterLink class="brand-mark" to="/">
      <span class="brand-mark-dot" aria-hidden="true"></span>
      <span>
        <strong class="block text-base">Media Box</strong>
        <small class="block text-ink-muted">Request hub</small>
      </span>
    </RouterLink>

    <div class="flex flex-wrap items-center gap-3">
      <UserChip />
      <RouterLink v-if="auth.isAdmin" class="login-tab" to="/dashboard">
        Workflow desk
      </RouterLink>
    </div>
  </header>
</template>
