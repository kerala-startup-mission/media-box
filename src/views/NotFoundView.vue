<script setup>
import AppTopbar from "@/components/AppTopbar.vue";
</script>

<template>
  <div class="ambient-layer" aria-hidden="true"></div>

  <main class="app-shell">
    <AppTopbar />

    <section class="glass-card form-shell">
      <div class="section-heading">
        <p class="eyebrow">Not Found</p>
        <h2>That page does not exist.</h2>
        <p>Head back to the request hub to start a new media request.</p>
      </div>

      <RouterLink class="btn-base primary-button mt-6 inline-flex" to="/">
        Back to the request hub
      </RouterLink>
    </section>
  </main>
</template>
