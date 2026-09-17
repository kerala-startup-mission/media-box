import { defineStore } from "pinia";

import { APP_CONFIG, STORAGE_KEYS, DEFAULT_TEAMS } from "@/lib/config.js";
import { callBackend } from "@/lib/backend.js";
import { readJsonStorage, writeJsonStorage } from "@/lib/storage.js";
import { serializeUploads } from "@/lib/uploads.js";
import {
  ALL_TEXT_FIELDS,
  ALL_UPLOAD_FIELDS,
  BRANCH_FIELDS,
  BRANCH_UPLOADS,
  INTRO_FIELDS,
  resolveBranch,
  stepForCategory
} from "@/lib/schema.js";
import { useAuthStore } from "@/stores/auth.js";

const PROGRESS_ORDER = ["intro", "social-type", "details", "summary"];
const DETAIL_PANELS = [
  "social-details",
  "pr",
  "achievements",
  "daily-digest",
  "details-empty"
];

function blankForm() {
  return Object.fromEntries(ALL_TEXT_FIELDS.map((name) => [name, ""]));
}

function blankFiles() {
  return Object.fromEntries(ALL_UPLOAD_FIELDS.map((name) => [name, []]));
}

function makeSpeaker() {
  return {
    id: `speaker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    title: "",
    files: []
  };
}

export const useIntakeStore = defineStore("intake", {
  state: () => ({
    form: blankForm(),
    files: blankFiles(),
    speakers: [makeSpeaker()],
    currentStep: "intro",
    status: { message: "", isError: false },
    isSubmitting: false,
    submitted: false,
    summaryPayload: null
  }),

  getters: {
    branch: (state) => resolveBranch(state.form.category, state.form.socialType),

    progressIndex: (state) => {
      const mapped = DETAIL_PANELS.includes(state.currentStep) ? "details" : state.currentStep;
      const index = PROGRESS_ORDER.indexOf(state.submitted ? "summary" : mapped);
      return index < 0 ? 0 : index;
    },

    /* Where Back from details-empty should land. The original always sent the
       user to intro, losing the social-type step they had just come through. */
    emptyBackStep: (state) =>
      state.form.category === "Social Media" ? "social-type" : "intro"
  },

  actions: {
    setStatus(message, isError = false) {
      this.status = { message, isError };
    },

    goToStep(step) {
      this.currentStep = step;
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    /** The only validation in the app, message strings included. */
    validateIntro() {
      if (!this.form.employeeName.trim()) {
        this.setStatus("Name is compulsory.", true);
        return false;
      }
      if (!this.form.department.trim()) {
        this.setStatus("Name of Department is compulsory.", true);
        return false;
      }
      this.setStatus("");
      return true;
    },

    goForwardFromIntro() {
      if (!this.validateIntro()) return;
      this.goToStep(stepForCategory(this.form.category));
    },

    goForwardFromSocialType() {
      this.goToStep(this.form.socialType ? "social-details" : "details-empty");
    },

    onCategoryChange() {
      if (this.form.category !== "Social Media") {
        this.form.socialType = "";
      }
      if (this.currentStep !== "intro") {
        this.goToStep("intro");
      }
    },

    addSpeaker() {
      this.speakers.push(makeSpeaker());
    },

    /**
     * Only the active branch's fields reach the sheet.
     *
     * The original posted every filled field regardless of category, so a user
     * who typed into the PR panel, went back and switched to Achievements still
     * wrote their PR answers into the PR columns. Pruning here fixes that.
     */
    async buildPayload() {
      const branch = this.branch;
      const keep = new Set(INTRO_FIELDS);

      if (this.form.category === "Social Media") keep.add("socialType");
      (BRANCH_FIELDS[branch] || []).forEach((name) => keep.add(name));

      const payload = {};
      keep.forEach((name) => {
        const value = this.form[name];
        if (value !== "" && value !== undefined) payload[name] = value;
      });

      for (const name of BRANCH_UPLOADS[branch] || []) {
        const files = this.files[name] || [];
        if (files.length) {
          payload[name] = await serializeUploads(files);
        }
      }

      if (branch === "New Creative") {
        const entries = this.speakers
          .map((speaker) => ({
            name: speaker.name.trim(),
            title: speaker.title.trim(),
            files: speaker.files
          }))
          .filter((speaker) => speaker.name || speaker.title || speaker.files.length);

        if (entries.length) {
          payload.newCreativeSpeakers = await Promise.all(
            entries.map(async (speaker) => ({
              name: speaker.name,
              title: speaker.title,
              uploads: await serializeUploads(speaker.files)
            }))
          );
        }
      }

      payload.submittedAt = new Date().toISOString();
      return payload;
    },

    /** Mirrors the submission into localStorage as an offline workflow card. */
    saveLocally(payload) {
      const requests = readJsonStorage(STORAGE_KEYS.requests, []);
      const tasks = readJsonStorage(STORAGE_KEYS.tasks, []);
      const requestId = `REQ-${Date.now()}`;
      const request = { ...payload, id: requestId };
      const task = buildWorkflowTask(payload, requestId, request);

      requests.unshift(request);
      tasks.unshift(task);

      writeJsonStorage(STORAGE_KEYS.requests, requests);
      writeJsonStorage(STORAGE_KEYS.tasks, tasks);

      return { requestId, task };
    },

    ensureDefaultTeams() {
      const teams = readJsonStorage(STORAGE_KEYS.teams, []);
      if (!teams.length) writeJsonStorage(STORAGE_KEYS.teams, DEFAULT_TEAMS);
    },

    async submit() {
      /* The original had no in-flight guard, so a double click posted twice. */
      if (this.isSubmitting) return;

      const auth = useAuthStore();
      if (!auth.isSignedIn) {
        this.setStatus("Your session has expired. Sign in again to submit.", true);
        return;
      }
      if (!auth.canSubmit) {
        this.setStatus(
          auth.error || "This account is not allowed to submit requests.",
          true
        );
        return;
      }

      this.isSubmitting = true;
      this.setStatus("");

      try {
        const payload = await this.buildPayload();
        const { requestId, task } = this.saveLocally(payload);

        this.summaryPayload = payload;
        this.submitted = true;

        const result = await callBackend(
          "submit",
          { submission: payload, task, requestId },
          auth.idToken
        );

        if (result?.mode === "preview-only") {
          this.setStatus("Summary generated and request saved locally to the workflow desk.");
        } else {
          this.setStatus("Submission sent successfully and mirrored in the workflow desk.");
        }
      } catch (error) {
        this.setStatus(
          `${error.message} The summary is still available below and the local workflow card has been created.`,
          true
        );
      } finally {
        this.isSubmitting = false;
      }
    }
  }
});

/** Title, summary and auto-routing, preserved from the original ordering. */
export function buildWorkflowTask(payload, requestId, request) {
  return {
    id: `TASK-${Date.now()}`,
    requestId,
    title: createTaskTitle(payload),
    category: payload.category || "Unclassified",
    socialType: payload.socialType || "",
    department: payload.department || "Unassigned",
    requesterName: payload.employeeName || "Unknown requester",
    status: "Will Do",
    team: teamForCategory(payload.category),
    assignee: "To be assigned",
    priority: payload.category === "PR" ? "High Touch" : "Standard",
    summary: createTaskSummary(payload),
    createdAt: payload.submittedAt,
    completedAt: "",
    dueText:
      payload.newCreativeEventDate
      || payload.postEventDate
      || payload.externalEventDate
      || payload.prWhen
      || "",
    notes: "",
    payload: request || payload
  };
}

function teamForCategory(category) {
  if (category === "PR") return "PR Team";
  if (category === "Daily Digest") return "Daily Digest Team";
  if (category === "Social Media") return "Social Media Team";
  return "Content Team";
}

function createTaskTitle(payload) {
  if (payload.category === "PR") {
    return payload.prEventAnnouncement || "New PR request";
  }
  if (payload.category === "Achievements") {
    return payload.achievementStartupName || "New achievement request";
  }
  if (payload.category === "Social Media") {
    return (
      payload.newCreativeEventName
      || payload.postEventTitle
      || payload.externalEventName
      || payload.socialType
      || "New social media request"
    );
  }
  if (payload.category === "Daily Digest") {
    return (
      payload.dailyDigestTitle
      || (payload.employeeName ? `Daily digest request from ${payload.employeeName}` : "New daily digest request")
    );
  }
  return payload.employeeName
    ? `Open request from ${payload.employeeName}`
    : "Unclassified media request";
}

function createTaskSummary(payload) {
  return (
    payload.newCreativeDescription
    || payload.achievementDescription
    || payload.prWhySignificant
    || payload.dailyDigestDescription
    || payload.prEventAnnouncement
    || payload.postEventTaggingDetails
    || (payload.category === "Daily Digest" ? "Daily digest item ready for workflow tracking." : "")
    || "Awaiting more details"
  );
}

export { APP_CONFIG };
