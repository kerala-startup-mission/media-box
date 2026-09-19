import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { APP_CONFIG } from "./lib/config.js";
import "./assets/main.css";

async function boot() {
  /*
   * Preview builds only. Vite folds this constant at build time, so a normal
   * `npm run build` drops the branch and never bundles the demo module.
   */
  if (import.meta.env.VITE_DEMO === "1") {
    const { installDemoMode } = await import("./demo/demoMode.js");
    installDemoMode(APP_CONFIG.endpoint);
  }

  createApp(App).use(createPinia()).use(router).mount("#app");
}

boot();
