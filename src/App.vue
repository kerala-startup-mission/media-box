<script setup>
import { onMounted } from "vue";
import { RouterView } from "vue-router";

import { useAuthStore } from "@/stores/auth.js";

const auth = useAuthStore();

onMounted(() => {
  auth.init();
});
</script>

<template>
  <RouterView />
</template>
