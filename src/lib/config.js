/**
 * Build-time configuration. Every VITE_* value is baked into the bundle and is
 * public, so only public identifiers belong here.
 */
export const APP_CONFIG = {
  companyName: "Media Box",
  timezone: "Asia/Kolkata",
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  endpoint: import.meta.env.VITE_APPS_SCRIPT_ENDPOINT || "",
  allowedEmailDomain: import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || ""
};

export const STORAGE_KEYS = {
  requests: "mediaBoxRequests",
  tasks: "mediaBoxWorkflowTasks",
  teams: "mediaBoxTeams",
  session: "mediaBoxAuthSession"
};

export const WORKFLOW_STATUSES = ["Will Do", "Ongoing", "Completed"];
export const PRIORITIES = ["Standard", "High Touch", "Fast Turnaround"];
export const DEFAULT_TEAMS = [
  "Design Team",
  "Content Team",
  "PR Team",
  "Social Media Team",
  "Daily Digest Team"
];
export const DEFAULT_ASSIGNEES = ["To be assigned", "Abhishek", "Ashitha"];
