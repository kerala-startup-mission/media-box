# KSUM Media Box

Communications intake desk for social media, PR, achievements and daily digest
requests, with an admin workflow monitor and analytics view.

Vite + Vue 3 (Composition API, JavaScript) on the front, a Google Apps Script
web app and a Google Sheet on the back. Users sign in with Google; admins are
defined in a `Users` tab of the same spreadsheet.

```
src/
  views/       IntakeView, DashboardView, AnalyticsView, NotFoundView
  components/  shared + intake/ + ops/
  stores/      auth (session + role), intake (the wizard), workflow (the desk)
  lib/         backend, googleIdentity, schema, fields, summary, uploads, csv, format
  assets/      main.css - Tailwind v4 @theme tokens + component layer
apps-script/   Code.gs (deployed separately) + test/ (runs in Node)
dev/           mock backend and browser tests for local work
```

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in the two values below
npm run dev                    # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm test` | Apps Script auth + round-trip tests, in Node |
| `npm run mock` | Local stand-in for the Apps Script endpoint (port 8787) |
| `npm run e2e` | Browser tests against the dev server + mock |

## Configuration

Every `VITE_*` value is **baked into the bundle at build time and is public**.
The Google client ID and the `/exec` URL are public identifiers, so that is
fine. Never put a secret in one.

```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
VITE_APPS_SCRIPT_ENDPOINT=https://script.google.com/macros/s/.../exec
VITE_ALLOWED_EMAIL_DOMAIN=startupmission.in
```

### 1. Create the OAuth client

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client
   ID → Web application**.
2. **Authorized JavaScript origins:** your production origin, plus
   `http://localhost:5173` for development. Google Sign-In does not work from
   `file://`.
3. **OAuth consent screen:** *Internal* if `startupmission.in` is a Google
   Workspace domain (simplest, no verification); otherwise *External*.
4. Put the client ID in `.env.local` **and** in `CONFIG.googleClientId` in
   `apps-script/Code.gs`. If the two differ, every request fails the audience
   check and nothing works.

### 2. Deploy the backend

See [`apps-script/README.md`](./apps-script/README.md).

### 3. Deploy the frontend

`npm run build`, then serve `dist/`. The router uses history mode, so the
server must fall back to `index.html` for unknown paths or a refresh on
`/dashboard` returns 404:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Apache: `FallbackResource /index.html`. Caddy: `try_files {path} /index.html`.

## Who can do what

| | Submit a request | Open `/dashboard` and `/analytics` |
|---|---|---|
| Not signed in | no | no |
| Signed in, `@startupmission.in` | **yes** | only if listed as an admin |
| Signed in, listed and Active in `Users` | **yes** | only with `Role = admin` |
| Signed in, anything else | no | no |
| Listed with `Active = FALSE` | no | no |

Two rules make this workable in practice:

- **`Active = FALSE` beats the domain.** That is how you revoke a colleague
  without removing their Google account.
- **A listed, Active row grants submit access even off-domain.** That is how you
  add an external partner.

Admin never comes from the domain — only from a `Role = admin` row.

## What this protects, and what it does not

- **Protected: the data and every write.** The backend refuses
  `listSubmissions` and `updateSubmission` without an ID token that Google
  vouches for *and* a matching Active admin row. Editing `sessionStorage` in
  devtools does not change that; there is a test for exactly this case.
- **Protected: the submission endpoint.** It previously accepted anonymous
  POSTs that appended sheet rows and created Drive files. It no longer does.
- **Not protected: the admin UI shell.** Anyone can reach `/dashboard` with a
  patched bundle. They will see an empty table, because the rows come from a
  call the server denies. This is inherent to a static SPA, and it is why the
  server-side check is the one that matters.
- The `/exec` deployment stays at access = **Anyone**. That is required for a
  browser to reach it without Google's own sign-in interstitial; authorisation
  happens in code instead.

## Testing

`npm test` runs `apps-script/Code.gs` inside Node against stubbed Apps Script
services (`apps-script/test/harness.mjs`), so the authorisation rules and the
sheet column contract are checked without deploying. It covers token
verification (audience, issuer, expiry, verified email), every row of the
permission table above, and the submission round trip — including that the ID
token never reaches the spreadsheet.

`npm run e2e` drives a real browser against the dev server and `npm run mock`,
covering the sign-in gate, the wizard, admin gating, the devtools-tamper case
and write-back. It needs Playwright's browsers (`npx playwright install
chromium`), or set `CHROMIUM_PATH` to an existing Chromium binary. Run all
three in separate terminals:

```bash
npm run mock    # terminal 1
npm run dev     # terminal 2
npm run e2e     # terminal 3
```

## Notes for future work

- **`Content-Type: text/plain;charset=utf-8` in `src/lib/backend.js` is
  load-bearing.** It keeps the request a CORS "simple request". Switching to
  `application/json`, adding an `Authorization` header, or using an HTTP
  library that sets its own headers triggers a preflight that Apps Script
  `/exec` cannot answer, and every submission breaks. The ID token travels in
  the JSON body for the same reason.
- **The 53 form field names in `src/lib/schema.js` are a contract** with the
  spreadsheet's 67 columns and with `normalizePayload_` in `Code.gs`. Renaming
  one silently drops a column.
- Vue escapes interpolation, so there is no `sanitizeText` helper any more.
  Treat any `v-html` as a defect.
