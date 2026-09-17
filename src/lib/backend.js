import { APP_CONFIG } from "./config.js";

/**
 * Single channel to the Apps Script web app.
 *
 * The `text/plain` content type is load-bearing: it keeps the request a CORS
 * "simple request". Any other content type, or any custom header (including
 * Authorization), triggers a preflight that an Apps Script /exec URL cannot
 * answer, and every call starts failing. The ID token therefore travels in the
 * JSON body, never in a header or a query string.
 */
export async function callBackend(action, payload = {}, idToken = "") {
  if (!APP_CONFIG.endpoint) {
    return { ok: true, mode: "preview-only" };
  }

  const response = await fetch(APP_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, idToken, payload })
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  const result = await response.json().catch(() => {
    throw new Error("The backend returned a response that could not be read.");
  });

  if (result && result.ok === false) {
    throw new Error(result.error || "The backend rejected the request.");
  }

  return result;
}
