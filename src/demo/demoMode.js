/**
 * PREVIEW ONLY. Never part of a production build.
 *
 * Simulates Google Sign-In and the Apps Script backend entirely in the
 * browser so the UI can be clicked through without an OAuth client or a
 * deployed backend. It is loaded from main.js behind
 * `import.meta.env.VITE_DEMO === "1"`, which Vite folds to false in a normal
 * build, so the whole module is tree-shaken out of `npm run build`.
 *
 * It collects nothing, sends nothing, and talks to no Google service.
 */

const PEOPLE = [
  {
    email: "admin@startupmission.in",
    name: "Admin User",
    label: "Admin",
    blurb: "Listed in the Users tab with Role = admin"
  },
  {
    email: "staff@startupmission.in",
    name: "Staff User",
    label: "Staff",
    blurb: "On the allowed domain, not an admin"
  },
  {
    email: "partner@example.com",
    name: "External Partner",
    label: "Partner",
    blurb: "Off-domain, listed and Active in the Users tab"
  },
  {
    email: "outsider@gmail.com",
    name: "Outsider",
    label: "Outsider",
    blurb: "Off-domain and not listed — blocked"
  },
  {
    email: "revoked@startupmission.in",
    name: "Revoked User",
    label: "Revoked",
    blurb: "On the domain but Active = FALSE — blocked"
  }
];

/* Mirrors the Users tab the real backend reads. */
const USERS = new Map([
  ["admin@startupmission.in", { name: "Admin User", role: "admin", active: true }],
  ["partner@example.com", { name: "External Partner", role: "viewer", active: true }],
  ["revoked@startupmission.in", { name: "Revoked User", role: "admin", active: false }]
]);

const ALLOWED_DOMAIN = "startupmission.in";
const STORE_KEY = "mediaBoxDemoTasks";

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
  } catch {
    /* ignore */
  }
}

/** The same rule as resolveAccess_ in Code.gs. */
function resolveAccess(email) {
  const user = USERS.get(email);
  const domain = email.split("@")[1] || "";
  const domainAllowed = domain === ALLOWED_DOMAIN;

  if (user && !user.active) {
    return { email, name: user.name, role: "", isAdmin: false, canSubmit: false, reason: "deactivated" };
  }

  return {
    email,
    name: user?.name || email,
    role: user?.role || "",
    isAdmin: Boolean(user && user.role === "admin"),
    canSubmit: domainAllowed || Boolean(user),
    reason: domainAllowed ? "domain" : user ? "listed" : "not-allowed"
  };
}

function base64Url(value) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** A JWT-shaped string so decodeIdToken can read it. Unsigned, never sent anywhere. */
function fakeCredential(person) {
  const claims = {
    email: person.email,
    name: person.name,
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  return `${base64Url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${base64Url(JSON.stringify(claims))}.preview`;
}

function installFetchMock(endpoint) {
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (!url.startsWith(endpoint)) return realFetch(input, init);

    const body = JSON.parse(init?.body || "{}");
    const email = (() => {
      try {
        const claims = JSON.parse(decodeURIComponent(escape(atob(
          body.idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
        ))));
        return String(claims.email || "").toLowerCase();
      } catch {
        return "";
      }
    })();

    const reply = (data) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    if (!email) return reply({ ok: false, error: "Sign in required." });

    const who = resolveAccess(email);
    await new Promise((r) => setTimeout(r, 180));

    if (body.action === "session") return reply({ ok: true, ...who });

    if (body.action === "listSubmissions") {
      if (!who.isAdmin) {
        return reply({
          ok: false,
          error: `This account is not an admin. Ask an admin to add ${who.email} to the Users tab with role "admin" and Active set to TRUE.`
        });
      }
      return reply({ ok: true, tasks: [...loadTasks()].reverse() });
    }

    if (body.action === "updateSubmission") {
      if (!who.isAdmin) return reply({ ok: false, error: "This account is not an admin." });
      const tasks = loadTasks();
      const target = tasks.find((t) => t.requestId === body.payload.requestId);
      if (!target) return reply({ ok: false, error: "No submission found." });
      for (const field of ["status", "priority", "team", "assignee"]) {
        if (body.payload[field]) target[field] = body.payload[field];
      }
      saveTasks(tasks);
      return reply({ ok: true });
    }

    if (body.action === "submit") {
      if (!who.canSubmit) {
        return reply({
          ok: false,
          error: `Only @${ALLOWED_DOMAIN} accounts can submit requests. You are signed in as ${who.email}.`
        });
      }
      const { task = {}, requestId = "" } = body.payload || {};
      const tasks = loadTasks();
      tasks.push({ ...task, requestId, submittedByEmail: who.email, submittedByName: who.name });
      saveTasks(tasks);
      return reply({ ok: true, mode: "connected", requestId });
    }

    return reply({ ok: false, error: `Unknown action: ${body.action}` });
  };
}

function installGoogleStub() {
  let callback = null;

  window.google = {
    accounts: {
      id: {
        initialize: (options) => { callback = options.callback; },
        prompt: () => {},
        disableAutoSelect: () => {},
        renderButton: (element) => {
          element.innerHTML = "";

          const wrap = document.createElement("div");
          wrap.style.cssText = "display:grid;gap:8px;max-width:420px";

          const hint = document.createElement("p");
          hint.textContent = "Preview sign-in — choose an account to simulate:";
          hint.style.cssText = "margin:0 0 4px;font-size:.85rem;opacity:.75";
          wrap.appendChild(hint);

          PEOPLE.forEach((person) => {
            const button = document.createElement("button");
            button.type = "button";
            button.style.cssText =
              "display:grid;gap:2px;text-align:left;padding:10px 14px;border-radius:12px;"
              + "border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;font:inherit";
            button.innerHTML =
              `<strong style="font-size:.95rem">${person.label} · ${person.email}</strong>`
              + `<span style="font-size:.8rem;opacity:.7">${person.blurb}</span>`;
            button.addEventListener("click", () => {
              if (callback) callback({ credential: fakeCredential(person) });
            });
            wrap.appendChild(button);
          });

          element.appendChild(wrap);
        }
      }
    }
  };
}

function installBanner() {
  const banner = document.createElement("div");
  banner.setAttribute("role", "note");
  banner.style.cssText =
    "position:fixed;inset:auto 0 0 0;z-index:9999;padding:10px 16px;"
    + "background:#1f2937;color:#f8fafc;font:600 13px/1.5 system-ui,sans-serif;"
    + "text-align:center;box-shadow:0 -2px 12px rgba(0,0,0,.3)";
  banner.innerHTML =
    "PREVIEW BUILD — sign-in and the Google Sheet backend are simulated in your browser. "
    + "No real Google account is used and nothing is sent anywhere. "
    + '<button type="button" id="demoReset" style="margin-left:10px;padding:3px 10px;border-radius:999px;'
    + 'border:1px solid #64748b;background:transparent;color:inherit;font:inherit;cursor:pointer">Reset data</button>';
  document.body.appendChild(banner);
  document.body.style.paddingBottom = "52px";

  banner.querySelector("#demoReset").addEventListener("click", () => {
    localStorage.clear();
    sessionStorage.clear();
    location.href = location.pathname;
  });
}

export function installDemoMode(endpoint) {
  installGoogleStub();
  installFetchMock(endpoint);
  if (document.body) installBanner();
  else window.addEventListener("DOMContentLoaded", installBanner, { once: true });
}
