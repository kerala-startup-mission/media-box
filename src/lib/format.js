import { APP_CONFIG } from "./config.js";

export function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: APP_CONFIG.timezone
  }).format(parsed);
}

export function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: APP_CONFIG.timezone
  }).format(parsed);
}

export function formatMonthYear(value) {
  if (!value) return "Undated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Undated";

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: APP_CONFIG.timezone
  }).format(parsed);
}

export function monthKey(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "undated";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

export function fileSizeKb(size) {
  return Math.max(1, Math.round((size || 0) / 1024));
}

/** Matches the original's summary link detection. */
export function isLikelyUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
