import { createRouter, createWebHistory } from "vue-router";

import IntakeView from "@/views/IntakeView.vue";

const routes = [
  {
    path: "/",
    name: "intake",
    component: IntakeView,
    meta: { requiresAuth: true, theme: "public" }
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/views/DashboardView.vue"),
    meta: { requiresAdmin: true, theme: "ops" }
  },
  {
    path: "/analytics",
    name: "analytics",
    component: () => import("@/views/AnalyticsView.vue"),
    meta: { requiresAdmin: true, theme: "ops" }
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
    meta: { theme: "public" }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

/*
 * The ops theme is a body-level background, so it has to follow the route.
 * Access control itself lives in the views and, decisively, on the server -
 * see the note in README.md.
 */
router.afterEach((to) => {
  if (to.meta.theme === "ops") {
    document.body.dataset.theme = "ops";
  } else {
    delete document.body.dataset.theme;
  }
});

export default router;
