const GSI_SRC = "https://accounts.google.com/gsi/client";

let loaderPromise = null;

/** Resolves once window.google.accounts.id is usable. */
export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const settle = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        loaderPromise = null;
        reject(new Error("Google Sign-In could not be loaded."));
      }
    };

    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener("error", settle, { once: true });
      // The tag may already have finished before this ran.
      if (window.google?.accounts?.id) settle();
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", settle, { once: true });
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/** Reads the claims out of an ID token for display only - never for authorisation. */
export function decodeIdToken(idToken) {
  try {
    const payload = idToken.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
