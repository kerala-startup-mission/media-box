<script setup>
import { computed } from "vue";

import OpsNav from "@/components/ops/OpsNav.vue";
import SignInGate from "@/components/SignInGate.vue";
import { useAuthStore } from "@/stores/auth.js";

const auth = useAuthStore();

/* Signed in and the server confirmed an admin row. Until that verdict lands we
   show neither the app nor a rejection. */
const isAllowed = computed(() => auth.isSignedIn && auth.verified && auth.isAdmin);
const isRejected = computed(() => auth.isSignedIn && auth.verified && !auth.isAdmin);
</script>

<template>
  <main class="ops-shell">
    <OpsNav />

    <template v-if="isAllowed">
      <slot />
    </template>

    <section v-else-if="isRejected" class="ops-login-shell">
      <div class="ops-card ops-login-card">
        <p class="ops-kicker">Restricted</p>
        <h1>This account is not an admin.</h1>
        <p class="mt-3">
          You are signed in as <strong>{{ auth.email }}</strong>. Ask an admin to add
          your email to the <strong>Users</strong> tab of the Media Box spreadsheet
          with role <strong>admin</strong> and Active set to TRUE, then sign in again.
        </p>
        <button type="button" class="ops-btn-base ops-ghost-button mt-6" @click="auth.signOut()">
          Sign out
        </button>
      </div>
    </section>

    <section v-else-if="auth.isSignedIn && !auth.verified && !auth.error" class="ops-login-shell">
      <div class="ops-card ops-login-card">
        <p class="ops-kicker">Checking access</p>
        <h1>Confirming your permissions...</h1>
      </div>
    </section>

    <section v-else class="ops-login-shell">
      <SignInGate
        variant="ops"
        kicker="Protected Workspace"
        heading="Sign in to the workflow monitor."
        body="Only accounts listed as admins in the Media Box spreadsheet can open this workspace."
      />
    </section>
  </main>
</template>
