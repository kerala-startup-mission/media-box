# Media Box backend (Google Apps Script)

One `doPost` web app, backed by a Google Sheet. It authenticates every request
with a Google ID token, writes submissions into the **Media Requests** tab, and
serves the admin dashboard its data.

## Actions

The frontend posts a single envelope, `{ action, idToken, payload }`:

| `action` | Who | What it does |
|---|---|---|
| `session` | any verified account | returns `{ email, name, role, isAdmin, canSubmit, reason }` |
| `submit` | `canSubmit` | appends a row, uploads images to Drive, makes a PDF, emails it |
| `listSubmissions` | admin only | returns every submission as a workflow task, newest first |
| `updateSubmission` | admin only | rewrites Status / Priority / Assigned Team / Assignee for one request |

There is no anonymous path. A request without a valid token is refused before
anything else happens.

## How a token is verified

Apps Script cannot verify an RSA signature, so local JWKS validation is not
practical. `verifyIdToken_` calls Google's `tokeninfo` endpoint and then checks
**all** of:

- `aud` equals `CONFIG.googleClientId` — without this, a Google-issued token
  from *any* application would be accepted. This is the line that makes
  everything else meaningful.
- `iss` is `accounts.google.com` or `https://accounts.google.com`
- `exp` is in the future
- `email_verified` is true

The verdict is cached in `CacheService` against a hash of the token, for at most
300 seconds and never past the token's own expiry, so a burst of calls costs one
round trip.

## Setup

### 1. Fill in `CONFIG` at the top of `Code.gs`

| Key | Notes |
|---|---|
| `spreadsheetId` | from the sheet URL |
| `pdfFolderId` | Drive folder for the per-submission PDFs |
| `notifyEmail` | where the PDF is mailed |
| `googleClientId` | **must match `VITE_GOOGLE_CLIENT_ID` in the frontend build** |
| `allowedEmailDomains` | domains allowed to submit, e.g. `["startupmission.in"]` |

### 2. Deploy

1. Open the Apps Script project and paste in `Code.gs`.
2. **Deploy → Manage deployments → edit (pencil) → Version: New version.**
   This keeps the existing `/exec` URL. "New deployment" mints a *new* URL and
   you would have to update `VITE_APPS_SCRIPT_ENDPOINT` and rebuild.
3. Access must stay **Anyone** — a browser cannot reach the endpoint otherwise,
   and authorisation is enforced in code, not by the deployment setting.
4. Run any function once from the editor to grant the new scope. The token
   check uses `UrlFetchApp`, which the old version did not, so Google will
   prompt for authorisation again.

### 3. The `Users` tab

Created automatically on the first request, with the deploying account seeded
as an admin so nobody is locked out. Add colleagues as rows:

| Email | Name | Role | Active |
|---|---|---|---|
| admin@startupmission.in | Admin | admin | TRUE |
| ops@startupmission.in | Ops Lead | admin | TRUE |
| partner@example.com | Partner | viewer | TRUE |
| intern@startupmission.in | Intern | viewer | FALSE |

- `Role` must be `admin` for dashboard access. Anything else is submit-only.
- `Active` accepts `TRUE`, `true`, `yes`, `y` or `1`.
- `Active = FALSE` denies access even on an allowed domain — that is the way to
  revoke someone.
- A listed, Active row grants submit access even off-domain — that is the way to
  add an external partner.

## The sheet

The **Media Requests** tab has 67 columns: the original 59, plus 8 appended:

`Submitted By Email`, `Submitted By Name`, `Request ID`, `Status`, `Priority`,
`Assigned Team`, `Assignee`, `Workflow Task JSON`

`Submitted By Email` is the *verified* identity from the token; `Employee Name`
remains whatever the requester typed. The four editable columns are what the
dashboard writes back, and `Workflow Task JSON` carries the rest of the task.

**New columns are appended, never inserted.** Inserting one would silently shift
the meaning of every existing row.

## Tests

From the repository root:

```bash
npm test
```

This runs `Code.gs` inside Node against stubbed Apps Script services, so the
authorisation rules and the column contract are verified without deploying.
`apps-script/test/harness.mjs` holds the stubs; it is not part of the deployed
project.

## Known limits

- Uploads travel as base64 data URLs inside the JSON body, and only `image/*`
  files carry bytes. A PDF is recorded by filename but never lands in Drive.
- A submission with several photos can produce a multi-megabyte POST, which
  Apps Script may reject.
