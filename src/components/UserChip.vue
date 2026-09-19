<script setup>
import { useAuthStore } from "@/stores/auth.js";

defineProps({
  variant: { type: String, default: "public" }
});

const auth = useAuthStore();
</script>

<template>
  <div v-if="auth.isSignedIn" class="flex flex-wrap items-center gap-3">
    <span
      v-if="variant === 'ops'"
      class="ops-user-chip"
      :title="auth.email"
      aria-hidden="true"
    >{{ auth.initials }}</span>

    <span
      :class="variant === 'ops' ? 'ops-user-label' : 'text-sm font-bold text-ink'"
    >
      {{ auth.name || auth.email }}
    </span>

    <button
      type="button"
      :class="variant === 'ops' ? 'ops-btn-base ops-ghost-button' : 'btn-base ghost-button'"
      @click="auth.signOut()"
    >
      Sign out
    </button>
  </div>
</template>
