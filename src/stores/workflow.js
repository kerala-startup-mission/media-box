import { defineStore } from "pinia";

import { DEFAULT_ASSIGNEES, DEFAULT_TEAMS, STORAGE_KEYS } from "@/lib/config.js";
import { callBackend } from "@/lib/backend.js";
import { formatMonthYear } from "@/lib/format.js";
import { readJsonStorage, writeJsonStorage } from "@/lib/storage.js";
import { useAuthStore } from "@/stores/auth.js";

export const CATEGORY_TABS = ["PR", "Social Media", "Daily Digest", "Achievements"];

export const useWorkflowStore = defineStore("workflow", {
  state: () => ({
    tasks: [],
    /* "backend" once the sheet has answered, "local" while offline. */
    source: "local",
    isLoading: false,
    error: "",
    savingTaskId: "",
    filters: { search: "", status: "", category: "", priority: "" },
    activeCategoryTab: ""
  }),

  getters: {
    teams: () => {
      const stored = readJsonStorage(STORAGE_KEYS.teams, []);
      return stored.length ? stored : DEFAULT_TEAMS;
    },

    activeTasks: (state) =>
      state.tasks
        .filter((task) => task.status !== "Completed")
        .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)),

    visibleTasks() {
      const term = this.filters.search.trim().toLowerCase();
      const categoryValue = this.filters.category || this.activeCategoryTab;

      return this.activeTasks.filter((task) => {
        const matchesSearch =
          !term
          || [task.id, task.title, task.requesterName, task.department, task.summary].some(
            (value) => String(value || "").toLowerCase().includes(term)
          );

        return (
          matchesSearch
          && (!this.filters.status || task.status === this.filters.status)
          && (!categoryValue || task.category === categoryValue)
          && (!this.filters.priority || task.priority === this.filters.priority)
        );
      });
    },

    categoryCounts() {
      return CATEGORY_TABS.map((category) => ({
        category,
        count: this.activeTasks.filter((task) => task.category === category).length
      }));
    },

    availableCategories: (state) =>
      Array.from(new Set(state.tasks.map((task) => task.category).filter(Boolean))).sort(),

    /** The latest two months of completed work, newest first. */
    archiveGroups: (state) => {
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const completed = state.tasks
        .filter((task) => task.status === "Completed" && task.completedAt)
        .filter((task) => {
          const date = new Date(task.completedAt);
          return !Number.isNaN(date.getTime()) && date >= cutoff;
        })
        .sort((left, right) => new Date(right.completedAt) - new Date(left.completedAt));

      const grouped = completed.reduce((groups, task) => {
        const key = formatMonthYear(task.completedAt);
        (groups[key] ||= []).push(task);
        return groups;
      }, {});

      return Object.entries(grouped).slice(0, 2);
    },

    assigneeOptions: () => (task) =>
      Array.from(new Set([...DEFAULT_ASSIGNEES, task.assignee].filter(Boolean)))
  },

  actions: {
    /**
     * Reads the sheet. The local mirror is only a fallback for when the call
     * fails, so an admin still sees something rather than an empty desk.
     */
    async load() {
      const auth = useAuthStore();
      this.isLoading = true;
      this.error = "";

      try {
        const result = await callBackend("listSubmissions", {}, auth.idToken);

        if (result?.mode === "preview-only") {
          this.tasks = readJsonStorage(STORAGE_KEYS.tasks, []);
          this.source = "local";
        } else {
          this.tasks = Array.isArray(result.tasks) ? result.tasks : [];
          this.source = "backend";
          writeJsonStorage(STORAGE_KEYS.tasks, this.tasks);
        }
      } catch (error) {
        this.tasks = readJsonStorage(STORAGE_KEYS.tasks, []);
        this.source = "local";
        this.error = `${error.message} Showing the last data cached in this browser.`;
      } finally {
        this.isLoading = false;
      }
    },

    async updateTask(taskId, updates) {
      const auth = useAuthStore();
      const target = this.tasks.find((task) => task.id === taskId);
      if (!target) return;

      const hasStatus = Object.prototype.hasOwnProperty.call(updates, "status");
      const completedAt = hasStatus
        ? updates.status === "Completed"
          ? target.completedAt || new Date().toISOString()
          : ""
        : target.completedAt || "";

      const previous = { ...target };
      const next = { ...target, ...updates, completedAt };

      /* Optimistic, then rolled back if the sheet refuses the write. */
      this.tasks = this.tasks.map((task) => (task.id === taskId ? next : task));
      this.savingTaskId = taskId;
      this.error = "";

      try {
        if (this.source === "backend") {
          await callBackend(
            "updateSubmission",
            {
              requestId: next.requestId || next.id,
              status: next.status,
              priority: next.priority,
              team: next.team,
              assignee: next.assignee
            },
            auth.idToken
          );
        }
        writeJsonStorage(STORAGE_KEYS.tasks, this.tasks);
      } catch (error) {
        this.tasks = this.tasks.map((task) => (task.id === taskId ? previous : task));
        this.error = `Could not save that change: ${error.message}`;
      } finally {
        this.savingTaskId = "";
      }
    },

    setCategoryTab(category) {
      this.activeCategoryTab = this.activeCategoryTab === category ? "" : category;
      this.filters.category = "";
    },

    resetFilters() {
      this.filters = { search: "", status: "", category: "", priority: "" };
      this.activeCategoryTab = "";
    }
  }
});
