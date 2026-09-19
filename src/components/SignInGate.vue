<script setup>
import { onMounted, ref, watch } from "vue";

import StatusMessage from "@/components/StatusMessage.vue";
import { APP_CONFIG } from "@/lib/config.js";
import { useAuthStore } from "@/stores/auth.js";

const props = defineProps({
  variant: { type: String, default: "public" },
  kicker: { type: String, default: "Sign in required" },
  heading: { type: String, default: "Sign in to continue." },
  body: { type: String, default: "" }
});

const auth = useAuthStore();
const buttonSlot = ref(null);

function draw() {
  auth.renderButton(buttonSlot.value, {
    theme: props.variant === "ops" ? "filled_black" : "outline"
  });
}

onMounted(draw);
watch(() => auth.gsiReady, draw);
</script>

<template>
  <div :class="variant === 'ops' ? 'ops-card ops-login-card' : 'glass-card form-shell'">
    <p :class="variant === 'ops' ? 'ops-kicker' : 'eyebrow'">{{ kicker }}</p>
    <h1 v-if="variant === 'ops'">{{ heading }}</h1>
    <h2 v-else class="text-3xl tracking-tightest">{{ heading }}</h2>

    <p v-if="body" class="mt-3 leading-prose" :class="variant === 'ops' ? '' : 'text-ink-muted'">
      {{ body }}
    </p>

    <p
      v-else
      class="mt-3 leading-prose"
      :class="variant === 'ops' ? '' : 'text-ink-muted'"
    >
      Use your
      <strong v-if="APP_CONFIG.allowedEmailDomain">@{{ APP_CONFIG.allowedEmailDomain }}</strong>
      <strong v-else>organisation</strong>
      Google account.
    </p>

    <div ref="buttonSlot" class="mt-6 min-h-11"></div>

    <StatusMessage class="mt-4" :message="auth.error" is-error />
  </div>
</template>
