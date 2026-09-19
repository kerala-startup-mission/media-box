const CONFIG = {
  spreadsheetId: "1_RQduaZenU_B8Y15Q3nrOCoI2wxUmUP26ZMcj8jrcy4",
  sheetName: "Media Requests",
  usersSheetName: "Users",
  pdfFolderId: "19FH8KMbKq4AMqEwzhkMFSRqo0YAA-jWV",
  notifyEmail: "abhishek@startupmission.in",
  companyName: "KSUM Media Box",

  // Must match VITE_GOOGLE_CLIENT_ID in the frontend build, or every request
  // fails the audience check below.
  googleClientId: "PASTE_YOUR_OAUTH_CLIENT_ID_HERE.apps.googleusercontent.com",

  // Anyone on these domains may submit. Admin rights still come only from the
  // Users tab.
  allowedEmailDomains: ["startupmission.in"]
};

const USERS_HEADERS = ["Email", "Name", "Role", "Active"];

// Columns appended after the original 59. Appending (never inserting) keeps
// every existing row's columns meaning what they meant before.
const WORKFLOW_HEADERS = [
  "Submitted By Email",
  "Submitted By Name",
  "Request ID",
  "Status",
  "Priority",
  "Assigned Team",
  "Assignee",
  "Workflow Task JSON"
];

// Only these may be rewritten through updateSubmission.
const EDITABLE_TASK_FIELDS = ["status", "priority", "team", "assignee"];

const HEADERS = [
  "Submitted At",
  "Employee Name",
  "Department",
  "Category",
  "Social Type",
  "New Creative - Event Name",
  "New Creative - Event Date",
  "New Creative - Event Time",
  "New Creative - Location",
  "New Creative - Registration Link",
  "New Creative - Description",
  "New Creative - Speakers",
  "New Creative - Speaker Upload Links",
  "New Creative - Photo Drive Link",
  "New Creative - LinkedIn Profile",
  "New Creative - Partner Institutions and Logos",
  "New Creative - Tagging Links",
  "Post Event - Title",
  "Post Event - Date",
  "Post Event - Location",
  "Post Event - Photo/Creative Drive Link",
  "Post Event - Tagging Details",
  "External Event - Name",
  "External Event - Partner Organisation",
  "External Event - Registration Link",
  "External Event - Date",
  "External Event - Location",
  "External Event - Creative To Be Published",
  "External Event - Tagging Links",
  "External Event - Uploads",
  "Achievement - Startup Name",
  "Achievement - Description",
  "Achievement - Photos",
  "Achievement - Uploads",
  "Achievement - Logos",
  "Achievement - Tagging Links",
  "Achievement - Contact Details",
  "PR - Event or Announcement",
  "PR - Who Is Involved",
  "PR - When",
  "PR - Where",
  "PR - Why Significant",
  "PR - Key Highlights",
  "PR - Notable Speakers",
  "PR - Background Context",
  "PR - Quotes",
  "PR - Testimonials",
  "PR - Follow-up Events",
  "PR - More Information",
  "PR - Uploads",
  "PR - Captions",
  "PR - Contact Person",
  "Daily Digest - Title",
  "Daily Digest - Description",
  "Daily Digest - Link",
  "Daily Digest - Creative Uploads",
  "Google Sheet URL",
  "PDF URL",
  "Raw Payload JSON"
].concat(WORKFLOW_HEADERS);

function doPost(event) {
  try {
    const body = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const action = String(body.action || "submit");

    // Every action is authenticated. There is no anonymous path any more.
    const access = resolveAccess_(verifyIdToken_(body.idToken));

    if (action === "session") {
      return jsonOutput_({
        ok: true,
        email: access.email,
        name: access.name,
        role: access.role,
        isAdmin: access.isAdmin,
        canSubmit: access.canSubmit,
        reason: access.reason
      });
    }

    if (action === "listSubmissions") {
      requireAdmin_(access);
      return jsonOutput_({ ok: true, tasks: readWorkflowTasks_() });
    }

    if (action === "updateSubmission") {
      requireAdmin_(access);
      return jsonOutput_(updateWorkflowTask_(body.payload || {}));
    }

    if (action === "submit") {
      if (!access.canSubmit) {
        return jsonOutput_({
          ok: false,
          error: submitDenialMessage_(access)
        });
      }
      const submission = body.payload || {};
      return handleSubmission_(
        submission.submission || {},
        submission.task || null,
        submission.requestId || "",
        access
      );
    }

    return jsonOutput_({ ok: false, error: "Unknown action: " + action });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

/**
 * Verifies a Google ID token.
 *
 * Apps Script has no RSA verification, so local JWKS validation is not
 * practical; Google's tokeninfo endpoint does the signature check for us. The
 * result is cached against a hash of the token so a burst of calls costs one
 * round trip, and the cache entry never outlives the token.
 */
function verifyIdToken_(idToken) {
  if (!idToken) {
    throw new Error("Sign in required.");
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "idt_" + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)
  );

  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const response = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error("Your sign-in has expired. Please sign in again.");
  }

  const info = JSON.parse(response.getContentText());

  // Without the audience check any Google-issued token from any application
  // would be accepted. This is the line that makes the rest of it mean anything.
  if (info.aud !== CONFIG.googleClientId) {
    throw new Error("This sign-in was issued for a different application.");
  }

  if (info.iss !== "accounts.google.com" && info.iss !== "https://accounts.google.com") {
    throw new Error("Unrecognised token issuer.");
  }

  const expiresAt = Number(info.exp) * 1000;
  if (!expiresAt || expiresAt <= Date.now()) {
    throw new Error("Your sign-in has expired. Please sign in again.");
  }

  if (String(info.email_verified) !== "true") {
    throw new Error("This Google account does not have a verified email address.");
  }

  const identity = {
    email: String(info.email || "").trim().toLowerCase(),
    name: String(info.name || "").trim(),
    hd: String(info.hd || "").trim().toLowerCase()
  };

  const ttl = Math.min(300, Math.floor((expiresAt - Date.now()) / 1000));
  if (ttl > 0) {
    cache.put(cacheKey, JSON.stringify(identity), ttl);
  }

  return identity;
}

/**
 * Decides what a verified identity may do.
 *
 * - An explicit Active = FALSE row denies access even on an allowed domain;
 *   that is how someone is revoked.
 * - A listed, active row grants submit access even off-domain; that is how an
 *   external partner is added.
 * - Admin comes only from the Users tab. A matching domain never grants it.
 */
function resolveAccess_(identity) {
  const user = lookupUser_(identity.email);
  const domain = identity.email.split("@")[1] || "";
  const domainAllowed = CONFIG.allowedEmailDomains
    .map(function (entry) { return String(entry).trim().toLowerCase(); })
    .indexOf(domain) !== -1;

  if (user && !user.active) {
    return {
      email: identity.email,
      name: user.name || identity.name,
      role: "",
      isAdmin: false,
      canSubmit: false,
      reason: "deactivated"
    };
  }

  const listed = Boolean(user);

  return {
    email: identity.email,
    name: (user && user.name) || identity.name,
    role: (user && user.role) || "",
    isAdmin: listed && user.role === "admin",
    canSubmit: domainAllowed || listed,
    reason: domainAllowed ? "domain" : listed ? "listed" : "not-allowed"
  };
}

function requireAdmin_(access) {
  if (!access.isAdmin) {
    throw new Error(
      "This account is not an admin. Ask an admin to add "
      + access.email
      + " to the " + CONFIG.usersSheetName + " tab with role \"admin\" and Active set to TRUE."
    );
  }
}

function submitDenialMessage_(access) {
  if (access.reason === "deactivated") {
    return "This account has been deactivated in the " + CONFIG.usersSheetName + " tab.";
  }
  return "Only " + CONFIG.allowedEmailDomains
    .map(function (domain) { return "@" + domain; })
    .join(" or ")
    + " accounts can submit requests. You are signed in as " + access.email + ".";
}

function getUsersSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.usersSheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.usersSheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(USERS_HEADERS);
    sheet.getRange(1, 1, 1, USERS_HEADERS.length).setFontWeight("bold");

    // Seed the deploying account so nobody is locked out of a fresh sheet.
    const owner = Session.getEffectiveUser().getEmail();
    if (owner) {
      sheet.appendRow([owner, "Owner", "admin", true]);
    }
  }

  return sheet;
}

function lookupUser_(email) {
  const sheet = getUsersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, USERS_HEADERS.length).getValues();
  const target = String(email).trim().toLowerCase();

  for (let index = 0; index < rows.length; index += 1) {
    if (String(rows[index][0]).trim().toLowerCase() === target) {
      return {
        email: target,
        name: String(rows[index][1] || "").trim(),
        role: String(rows[index][2] || "").trim().toLowerCase(),
        active: isTruthyCell_(rows[index][3])
      };
    }
  }

  return null;
}

/** Tolerates a hand-typed cell: TRUE, true, yes, y or 1. */
function isTruthyCell_(value) {
  if (value === true) return true;
  if (value === false || value === "" || value === null || value === undefined) return false;

  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "yes" || text === "y" || text === "1";
}

/** The original doPost body, now behind the authorisation check. */
function handleSubmission_(payload, task, requestId, access) {
  const normalized = attachDriveLinks_(normalizePayload_(payload));
  const sheet = getSheet_();
  ensureHeaders_(sheet);

  const pdfFile = createPdfFromPayload_(normalized);
  const pdfUrl = pdfFile ? pdfFile.getUrl() : "";
  const sheetUrl = SpreadsheetApp.openById(CONFIG.spreadsheetId).getUrl();
  const safeRequestId = String(requestId || ("REQ-" + Date.now()));

  sheet.appendRow(
    buildSheetRow_(normalized, sheetUrl, pdfUrl)
      .concat(buildWorkflowColumns_(access, safeRequestId, task))
  );

  if (CONFIG.notifyEmail && CONFIG.notifyEmail.indexOf("ADD_EMAIL_LATER") === -1) {
    MailApp.sendEmail({
      to: CONFIG.notifyEmail,
      subject: CONFIG.companyName + " Media Request - " + (normalized.category || "New Submission"),
      htmlBody: createEmailHtml_(normalized, sheetUrl, pdfUrl),
      attachments: pdfFile ? [pdfFile.getBlob()] : []
    });
  }

  return jsonOutput_({
    ok: true,
    mode: "connected",
    pdfUrl: pdfUrl,
    requestId: safeRequestId
  });
}

/**
 * The 8 appended columns. The workflow task is stored as one JSON cell so the
 * title/summary/routing logic stays on the client instead of being duplicated
 * here, while the four mutable fields also get their own readable columns.
 */
function buildWorkflowColumns_(access, requestId, task) {
  const safeTask = task && typeof task === "object" ? task : {};

  return [
    access.email,
    access.name,
    requestId,
    safeTask.status || "Will Do",
    safeTask.priority || "Standard",
    safeTask.team || "Content Team",
    safeTask.assignee || "To be assigned",
    JSON.stringify(safeTask)
  ];
}

function workflowColumnIndex_(name) {
  // 1-based sheet column for one of the appended workflow headers.
  return HEADERS.length - WORKFLOW_HEADERS.length + WORKFLOW_HEADERS.indexOf(name) + 1;
}

/** Every submission as a workflow task, newest first. */
function readWorkflowTasks_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const base = HEADERS.length - WORKFLOW_HEADERS.length;
  const tasks = [];

  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    const requestId = String(row[base + 2] || "").trim();
    if (!requestId) continue;

    let task = {};
    try {
      task = JSON.parse(row[base + 7] || "{}") || {};
    } catch (error) {
      // A hand-edited cell should not take the whole dashboard down.
      task = {};
    }

    // The four editable columns are the source of truth; the JSON is the rest.
    task.id = task.id || requestId;
    task.requestId = requestId;
    task.status = String(row[base + 3] || task.status || "Will Do");
    task.priority = String(row[base + 4] || task.priority || "Standard");
    task.team = String(row[base + 5] || task.team || "Content Team");
    task.assignee = String(row[base + 6] || task.assignee || "To be assigned");
    task.submittedByEmail = String(row[base] || "");
    task.submittedByName = String(row[base + 1] || "");
    task.createdAt = task.createdAt || toIsoString_(row[0]);

    tasks.push(task);
  }

  return tasks.reverse();
}

function updateWorkflowTask_(patch) {
  const requestId = String(patch.requestId || "").trim();
  if (!requestId) {
    return { ok: false, error: "A request id is required." };
  }

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: false, error: "There are no submissions to update." };
  }

  const idColumn = workflowColumnIndex_("Request ID");
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();

  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]).trim() !== requestId) continue;

    const rowNumber = index + 2;
    const statusColumn = workflowColumnIndex_("Status");
    const current = sheet.getRange(rowNumber, statusColumn, 1, 4).getValues()[0];

    // Only the four editable fields; a submission's own answers are never
    // rewritable through this path.
    const next = [
      pickEditable_(patch, "status", current[0]),
      pickEditable_(patch, "priority", current[1]),
      pickEditable_(patch, "team", current[2]),
      pickEditable_(patch, "assignee", current[3])
    ];

    sheet.getRange(rowNumber, statusColumn, 1, 4).setValues([next]);

    return { ok: true, requestId: requestId, status: next[0] };
  }

  return { ok: false, error: "No submission found for " + requestId + "." };
}

function pickEditable_(patch, field, fallback) {
  if (EDITABLE_TASK_FIELDS.indexOf(field) === -1) return fallback;
  const value = patch[field];
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function toIsoString_(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const existingSheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  return existingSheet || spreadsheet.insertSheet(CONFIG.sheetName);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
}

function normalizePayload_(payload) {
  const safePayload = payload || {};
  return {
    submittedAt: safePayload.submittedAt || "",
    employeeName: safePayload.employeeName || "",
    department: safePayload.department || "",
    category: safePayload.category || "",
    socialType: safePayload.socialType || "",
    newCreativeEventName: safePayload.newCreativeEventName || "",
    newCreativeEventDate: safePayload.newCreativeEventDate || "",
    newCreativeEventTime: safePayload.newCreativeEventTime || "",
    newCreativeLocation: safePayload.newCreativeLocation || "",
    newCreativeRegistrationLink: safePayload.newCreativeRegistrationLink || "",
    newCreativeDescription: safePayload.newCreativeDescription || "",
    newCreativeSpeakers: normalizeSpeakerArray_(safePayload.newCreativeSpeakers),
    newCreativePhotoDriveLink: safePayload.newCreativePhotoDriveLink || "",
    newCreativeLinkedinProfile: safePayload.newCreativeLinkedinProfile || "",
    newCreativePartnerInstitutions: safePayload.newCreativePartnerInstitutions || "",
    newCreativeTaggingLinks: safePayload.newCreativeTaggingLinks || "",
    postEventTitle: safePayload.postEventTitle || "",
    postEventDate: safePayload.postEventDate || "",
    postEventLocation: safePayload.postEventLocation || "",
    postEventPhotoDriveLink: safePayload.postEventPhotoDriveLink || "",
    postEventTaggingDetails: safePayload.postEventTaggingDetails || "",
    externalEventName: safePayload.externalEventName || "",
    externalPartnerOrganisation: safePayload.externalPartnerOrganisation || "",
    externalRegistrationLink: safePayload.externalRegistrationLink || "",
    externalEventDate: safePayload.externalEventDate || "",
    externalEventLocation: safePayload.externalEventLocation || "",
    externalCreativeToBePublished: safePayload.externalCreativeToBePublished || "",
    externalTaggingLinks: safePayload.externalTaggingLinks || "",
    externalEventUploads: normalizeUploadArray_(safePayload.externalEventUploads),
    achievementStartupName: safePayload.achievementStartupName || "",
    achievementDescription: safePayload.achievementDescription || "",
    achievementPhotos: safePayload.achievementPhotos || "",
    achievementUploads: normalizeUploadArray_(safePayload.achievementUploads),
    achievementLogos: safePayload.achievementLogos || "",
    achievementTaggingLinks: safePayload.achievementTaggingLinks || "",
    achievementContactDetails: safePayload.achievementContactDetails || "",
    prEventAnnouncement: safePayload.prEventAnnouncement || "",
    prWhoIsInvolved: safePayload.prWhoIsInvolved || "",
    prWhen: safePayload.prWhen || "",
    prWhere: safePayload.prWhere || "",
    prWhySignificant: safePayload.prWhySignificant || "",
    prKeyHighlights: safePayload.prKeyHighlights || "",
    prNotableSpeakers: safePayload.prNotableSpeakers || "",
    prBackgroundContext: safePayload.prBackgroundContext || "",
    prQuotes: safePayload.prQuotes || "",
    prTestimonials: safePayload.prTestimonials || "",
    prFollowUpEvents: safePayload.prFollowUpEvents || "",
    prMoreInformation: safePayload.prMoreInformation || "",
    prUploads: normalizeUploadArray_(safePayload.prUploads),
    prCaptions: safePayload.prCaptions || "",
    prContactPerson: safePayload.prContactPerson || "",
    dailyDigestTitle: safePayload.dailyDigestTitle || "",
    dailyDigestDescription: safePayload.dailyDigestDescription || "",
    dailyDigestLink: safePayload.dailyDigestLink || "",
    dailyDigestCreative: normalizeUploadArray_(safePayload.dailyDigestCreative),
    rawPayload: safePayload
  };
}

function normalizeUploadArray_(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(function(file) {
    return {
      name: file && file.name ? String(file.name) : "",
      type: file && file.type ? String(file.type) : "",
      size: file && file.size ? Number(file.size) : 0,
      dataUrl: file && file.dataUrl ? String(file.dataUrl) : ""
    };
  }).filter(function(file) {
    return file.name;
  });
}

function normalizeSpeakerArray_(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(function(speaker) {
    return {
      name: speaker && speaker.name ? String(speaker.name) : "",
      title: speaker && speaker.title ? String(speaker.title) : "",
      uploads: normalizeUploadArray_(speaker && speaker.uploads)
    };
  }).filter(function(speaker) {
    return speaker.name || speaker.title || speaker.uploads.length;
  });
}

function summarizeUploads_(uploads) {
  return uploads.map(function(file) {
    return file.name;
  }).join(", ");
}

function summarizeUploadLinks_(uploads) {
  return uploads.map(function(file) {
    return file.driveUrl || "";
  }).filter(Boolean).join(", ");
}

function summarizeSpeakers_(speakers) {
  return speakers.map(function(speaker, index) {
    const parts = [speaker.name, speaker.title].filter(Boolean);
    const uploadPart = speaker.uploads.length
      ? ` (${speaker.uploads.length} upload${speaker.uploads.length === 1 ? "" : "s"})`
      : "";
    return `${parts.join(" - ") || `Speaker ${index + 1}`}${uploadPart}`;
  }).join(", ");
}

function summarizeSpeakerUploadLinks_(speakers) {
  return speakers.map(function(speaker, index) {
    const label = [speaker.name, speaker.title].filter(Boolean).join(" - ") || `Speaker ${index + 1}`;
    const links = speaker.uploads.map(function(file) {
      return file.driveUrl || "";
    }).filter(Boolean);
    return links.length ? `${label}: ${links.join(" | ")}` : "";
  }).filter(Boolean).join(" || ");
}

function attachDriveLinks_(payload) {
  const assetFolder = DriveApp.getFolderById(CONFIG.pdfFolderId);

  payload.externalEventUploads = createDriveFilesFromUploads_(payload.externalEventUploads, payload, "external-event", assetFolder);
  payload.achievementUploads = createDriveFilesFromUploads_(payload.achievementUploads, payload, "achievement", assetFolder);
  payload.prUploads = createDriveFilesFromUploads_(payload.prUploads, payload, "pr", assetFolder);
  payload.dailyDigestCreative = createDriveFilesFromUploads_(payload.dailyDigestCreative, payload, "daily-digest", assetFolder);
  payload.newCreativeSpeakers = payload.newCreativeSpeakers.map(function(speaker, index) {
    return {
      name: speaker.name,
      title: speaker.title,
      uploads: createDriveFilesFromUploads_(speaker.uploads, payload, `speaker-${index + 1}`, assetFolder)
    };
  });

  return payload;
}

function createDriveFilesFromUploads_(uploads, payload, prefix, folder) {
  return uploads.map(function(file, index) {
    if (!file.dataUrl) {
      return file;
    }

    const blob = blobFromDataUrl_(file);
    const safeName = buildUploadFileName_(payload, prefix, index, file.name);
    const driveFile = folder.createFile(blob.setName(safeName));

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      driveUrl: driveFile.getUrl()
    };
  });
}

function blobFromDataUrl_(file) {
  const match = String(file.dataUrl || "").match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error(`Invalid upload data for file: ${file.name}`);
  }

  const contentType = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  return Utilities.newBlob(bytes, contentType, file.name || "upload");
}

function buildUploadFileName_(payload, prefix, index, originalName) {
  const base = `${payload.employeeName || "request"}-${payload.category || "submission"}-${prefix}-${index + 1}`;
  const extensionMatch = String(originalName || "").match(/(\.[A-Za-z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  return `${base.replace(/[^\w-]+/g, "-")}${extension}`;
}

function buildSheetRow_(payload, sheetUrl, pdfUrl) {
  return [
    payload.submittedAt,
    payload.employeeName,
    payload.department,
    payload.category,
    payload.socialType,
    payload.newCreativeEventName,
    payload.newCreativeEventDate,
    payload.newCreativeEventTime,
    payload.newCreativeLocation,
    payload.newCreativeRegistrationLink,
    payload.newCreativeDescription,
    summarizeSpeakers_(payload.newCreativeSpeakers),
    summarizeSpeakerUploadLinks_(payload.newCreativeSpeakers),
    payload.newCreativePhotoDriveLink,
    payload.newCreativeLinkedinProfile,
    payload.newCreativePartnerInstitutions,
    payload.newCreativeTaggingLinks,
    payload.postEventTitle,
    payload.postEventDate,
    payload.postEventLocation,
    payload.postEventPhotoDriveLink,
    payload.postEventTaggingDetails,
    payload.externalEventName,
    payload.externalPartnerOrganisation,
    payload.externalRegistrationLink,
    payload.externalEventDate,
    payload.externalEventLocation,
    payload.externalCreativeToBePublished,
    payload.externalTaggingLinks,
    summarizeUploads_(payload.externalEventUploads),
    payload.achievementStartupName,
    payload.achievementDescription,
    payload.achievementPhotos,
    summarizeUploads_(payload.achievementUploads),
    payload.achievementLogos,
    payload.achievementTaggingLinks,
    payload.achievementContactDetails,
    payload.prEventAnnouncement,
    payload.prWhoIsInvolved,
    payload.prWhen,
    payload.prWhere,
    payload.prWhySignificant,
    payload.prKeyHighlights,
    payload.prNotableSpeakers,
    payload.prBackgroundContext,
    payload.prQuotes,
    payload.prTestimonials,
    payload.prFollowUpEvents,
    payload.prMoreInformation,
    summarizeUploads_(payload.prUploads),
    payload.prCaptions,
    payload.prContactPerson,
    payload.dailyDigestTitle,
    payload.dailyDigestDescription,
    payload.dailyDigestLink,
    summarizeUploadLinks_(payload.dailyDigestCreative),
    sheetUrl,
    pdfUrl,
    JSON.stringify(payload.rawPayload)
  ];
}

function createPdfFromPayload_(payload) {
  if (!CONFIG.pdfFolderId || CONFIG.pdfFolderId.indexOf("PASTE_") === 0) {
    return null;
  }

  const html = HtmlService.createHtmlOutput(createPdfHtml_(payload));
  const pdfBlob = html
    .getBlob()
    .getAs(MimeType.PDF)
    .setName(createPdfFileName_(payload));

  return DriveApp.getFolderById(CONFIG.pdfFolderId).createFile(pdfBlob);
}

function createPdfFileName_(payload) {
  const safeName = (payload.employeeName || "request").replace(/[^\w-]+/g, "-");
  const safeCategory = (payload.category || "submission").replace(/[^\w-]+/g, "-");
  return `${safeName}-${safeCategory}.pdf`;
}

function createPdfHtml_(payload) {
  const sections = [
    {
      title: "Requester Information",
      rows: [
        ["Name", payload.employeeName],
        ["Department", payload.department],
        ["Category", payload.category],
        ["Social Type", payload.socialType]
      ]
    }
  ];

  if (payload.category === "Social Media" && payload.socialType === "New Creative") {
    sections.push({
      title: "New Creative Details",
      rows: [
        ["Name of event", payload.newCreativeEventName],
        ["Date of event", payload.newCreativeEventDate],
        ["Time", payload.newCreativeEventTime],
        ["Location", payload.newCreativeLocation],
        ["Registration Link", payload.newCreativeRegistrationLink],
        ["Brief description", payload.newCreativeDescription],
        ["Speaker details", summarizeSpeakers_(payload.newCreativeSpeakers)],
        ["Speaker upload links", summarizeSpeakerUploadLinks_(payload.newCreativeSpeakers)],
        ["Drive link to photographs", payload.newCreativePhotoDriveLink],
        ["LinkedIn Profile", payload.newCreativeLinkedinProfile],
        ["Partner institutions and logos", payload.newCreativePartnerInstitutions],
        ["Tagging links", payload.newCreativeTaggingLinks]
      ]
    });
  }

  if (payload.category === "Social Media" && payload.socialType === "Post Event") {
    sections.push({
      title: "Post-Event Details",
      rows: [
        ["Title", payload.postEventTitle],
        ["Date", payload.postEventDate],
        ["Location", payload.postEventLocation],
        ["Drive link to photos or creatives", payload.postEventPhotoDriveLink],
        ["Tagging details", payload.postEventTaggingDetails]
      ]
    });
  }

  if (payload.category === "Social Media" && payload.socialType === "External or Partner Event") {
    sections.push({
      title: "External or Partner Event Details",
      rows: [
        ["Name of event", payload.externalEventName],
        ["Partner organisation", payload.externalPartnerOrganisation],
        ["Registration Link", payload.externalRegistrationLink],
        ["Date", payload.externalEventDate],
        ["Location", payload.externalEventLocation],
        ["Creative to be published", payload.externalCreativeToBePublished],
        ["Tagging links", payload.externalTaggingLinks],
        ["Uploaded materials", summarizeUploadLinks_(payload.externalEventUploads)]
      ]
    });
  }

  if (payload.category === "Achievements") {
    sections.push({
      title: "Achievement Details",
      rows: [
        ["Startups / Startup mission", payload.achievementStartupName],
        ["Brief description", payload.achievementDescription],
        ["Photos if any", payload.achievementPhotos],
        ["Uploaded materials", summarizeUploadLinks_(payload.achievementUploads)],
        ["Logos to be included", payload.achievementLogos],
        ["Tagging links", payload.achievementTaggingLinks],
        ["Contact details", payload.achievementContactDetails]
      ]
    });
  }

  if (payload.category === "PR") {
    sections.push({
      title: "Press Release Details",
      rows: [
        ["Event or announcement", payload.prEventAnnouncement],
        ["Who is involved", payload.prWhoIsInvolved],
        ["When", payload.prWhen],
        ["Where", payload.prWhere],
        ["Why significant", payload.prWhySignificant],
        ["Key highlights", payload.prKeyHighlights],
        ["Notable speakers", payload.prNotableSpeakers],
        ["Background", payload.prBackgroundContext],
        ["Quotes", payload.prQuotes],
        ["Testimonials", payload.prTestimonials],
        ["Follow-up events", payload.prFollowUpEvents],
        ["More information", payload.prMoreInformation],
        ["Uploaded materials", summarizeUploadLinks_(payload.prUploads)],
        ["Captions", payload.prCaptions],
        ["Contact person", payload.prContactPerson]
      ]
    });
  }

  if (payload.category === "Daily Digest") {
    sections.push({
      title: "Daily Digest Details",
      rows: [
        ["Title", payload.dailyDigestTitle],
        ["Description", payload.dailyDigestDescription],
        ["Application link or related link", payload.dailyDigestLink],
        ["Creative uploads", summarizeUploadLinks_(payload.dailyDigestCreative)]
      ]
    });
  }

  const sectionHtml = sections.map(function(section) {
    const rows = section.rows.filter(function(row) {
      return row[1];
    }).map(function(row) {
      return `
        <div class="row">
          <div class="label">${escapeHtml_(row[0])}</div>
          <div class="value">${escapeHtml_(String(row[1])).replace(/\n/g, "<br>")}</div>
        </div>
      `;
    }).join("");

    return `
      <section class="block">
        <h2>${escapeHtml_(section.title)}</h2>
        ${rows}
      </section>
    `;
  }).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #1a1f24; padding: 32px; line-height: 1.5; }
          h1 { margin: 0 0 8px; color: #0a5d61; }
          .meta { color: #56616b; margin-bottom: 28px; }
          .block { margin-top: 24px; padding: 18px; border: 1px solid #d8dee4; border-radius: 12px; }
          .block h2 { margin: 0 0 14px; color: #b45a38; font-size: 18px; }
          .row { margin-top: 12px; }
          .label { font-weight: bold; color: #0a5d61; margin-bottom: 4px; }
          .value { white-space: normal; word-break: break-word; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml_(CONFIG.companyName)} Submission</h1>
        <div class="meta">Submitted at: ${escapeHtml_(payload.submittedAt || "")}</div>
        ${sectionHtml}
      </body>
    </html>
  `;
}

function createEmailHtml_(payload, sheetUrl, pdfUrl) {
  return `
    <p>A new media request has been submitted.</p>
    <p><strong>Name:</strong> ${escapeHtml_(payload.employeeName || "")}</p>
    <p><strong>Department:</strong> ${escapeHtml_(payload.department || "")}</p>
    <p><strong>Category:</strong> ${escapeHtml_(payload.category || "")}</p>
    ${payload.socialType ? `<p><strong>Social Type:</strong> ${escapeHtml_(payload.socialType)}</p>` : ""}
    <p><a href="${sheetUrl}">Open Google Sheet</a></p>
    ${pdfUrl ? `<p><a href="${pdfUrl}">Open PDF copy</a></p>` : ""}
  `;
}

function escapeHtml_(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
