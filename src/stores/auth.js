import { defineStore } from "pinia";

import { APP_CONFIG, STORAGE_KEYS } from "@/lib/config.js";
import { callBackend } from "@/lib/backend.js";
import { loadGoogleIdentity, decodeIdToken } from "@/lib/googleIdentity.js";

/* Refuse a token this close to expiry rather than let one die mid-request. */
const EXPIRY_GRACE_SECONDS = 120;

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  try {
    if (session) {
      sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.session);
    }
  } catch {
    /* Private mode; the session simply will not survive a reload. */
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    idToken: "",
    exp: 0,
    email: "",
    name: "",
    picture: "",
    role: "",
    isAdmin: false,
    canSubmit: false,
    reason: "",
    /* idle | loading | ready | error */
    status: "idle",
    error: "",
    verified: false,
    gsiReady: false
  }),

  getters: {
    isConfigured: () => Boolean(APP_CONFIG.googleClientId && APP_CONFIG.endpoint),

    isExpired: (state) => {
      if (!state.exp) return true;
      return state.exp - Math.floor(Date.now() / 1000) < EXPIRY_GRACE_SECONDS;
    },

    isSignedIn() {
      return Boolean(this.idToken) && !this.isExpired;
    },

    /* True until the server has answered. Nothing privileged renders before. */
    isChecking() {
      return Boolean(this.idToken) && !this.verified && !this.error;
    },

    initials: (state) => {
      const source = state.name || state.email || "";
      const parts = source.split(/[\s@._-]+/).filter(Boolean);
      if (!parts.length) return "MB";
      return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
    }
  },

  actions: {
    async init() {
      if (this.status === "loading") return;

      const stored = readStoredSession();
      if (stored) {
        this.$patch(stored);
        if (this.isExpired) this.clearSession();
      }

      if (!this.isConfigured) {
        this.status = "error";
        this.error =
          "Sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_APPS_SCRIPT_ENDPOINT, then rebuild.";
        return;
      }

      this.status = "loading";

      /*
       * A restored token needs the server's verdict, and that does not depend
       * on the Google script. Start it now rather than behind the script load,
       * so a slow or blocked accounts.google.com cannot stall the whole page.
       * verifyWithBackend records its own error and grants nothing on failure.
       */
      const verifying = this.isSignedIn && !this.verified
        ? this.verifyWithBackend().catch(() => {})
        : Promise.resolve();

      try {
        const gsi = await loadGoogleIdentity();

        gsi.initialize({
          client_id: APP_CONFIG.googleClientId,
          callback: (response) => this.handleCredential(response),
          auto_select: true,
          cancel_on_tap_outside: false,
          /* Filters the account chooser only. The server check is the control. */
          hd: APP_CONFIG.allowedEmailDomain || undefined
        });

        this.gsiReady = true;
        this.status = "ready";
      } catch (error) {
        this.status = "error";
        /* Do not clobber a more specific error from the verification call. */
        if (!this.error) this.error = error.message;
      }

      await verifying;
    },

    renderButton(element, options = {}) {
      if (!element || !this.gsiReady) return;
      element.innerHTML = "";
      window.google.accounts.id.renderButton(element, {
        theme: options.theme || "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        logo_alignment: "left",
        width: options.width || 280
      });
    },

    prompt() {
      if (this.gsiReady) window.google.accounts.id.prompt();
    },

    async handleCredential(response) {
      const credential = response?.credential;
      if (!credential) return;

      const claims = decodeIdToken(credential);
      this.idToken = credential;
      this.exp = Number(claims?.exp || 0);
      /* Display only. Authorisation comes from the backend, below. */
      this.email = String(claims?.email || "").toLowerCase();
      this.name = claims?.name || "";
      this.picture = claims?.picture || "";
      this.error = "";

      await this.verifyWithBackend();
    },

    /** The server decides the role. The client never assigns itself one. */
    async verifyWithBackend() {
      if (!this.idToken) return null;

      try {
        const result = await callBackend("session", {}, this.idToken);

        this.email = result.email || this.email;
        this.name = result.name || this.name;
        this.role = result.role || "";
        this.isAdmin = Boolean(result.isAdmin);
        this.canSubmit = Boolean(result.canSubmit);
        this.reason = result.reason || "";
        this.verified = true;
        this.error = "";
        this.persist();

        return result;
      } catch (error) {
        this.role = "";
        this.isAdmin = false;
        this.canSubmit = false;
        this.verified = false;
        this.error = error.message;
        this.persist();
        throw error;
      }
    },

    /** Re-checks with the server when the cached verdict may be stale. */
    async ensureVerified() {
      if (!this.isSignedIn) return null;
      if (this.verified) return this;
      return this.verifyWithBackend();
    },

    persist() {
      writeStoredSession({
        idToken: this.idToken,
        exp: this.exp,
        email: this.email,
        name: this.name,
        picture: this.picture,
        role: this.role,
        isAdmin: this.isAdmin,
        canSubmit: this.canSubmit,
        verified: this.verified
      });
    },

    clearSession() {
      this.idToken = "";
      this.exp = 0;
      this.email = "";
      this.name = "";
      this.picture = "";
      this.role = "";
      this.isAdmin = false;
      this.canSubmit = false;
      this.reason = "";
      this.verified = false;
      writeStoredSession(null);
    },

    signOut() {
      this.clearSession();
      if (this.gsiReady) {
        window.google.accounts.id.disableAutoSelect();
      }
    }
  }
});
