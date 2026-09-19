/**
 * The field contract with the Google Sheet. These key names are the `name`
 * attributes of the original form and the keys Code.gs `normalizePayload_`
 * reads, so they must not drift.
 */

export const CATEGORIES = [
  {
    value: "Social Media",
    title: "Social Media",
    description: "Creative, post-event, external or partner event"
  },
  { value: "PR", title: "PR", description: "Press release and communication note" },
  {
    value: "Achievements",
    title: "Achievements",
    description: "Startup or startup mission achievement highlights"
  },
  {
    value: "Daily Digest",
    title: "Daily Digest",
    description: "Daily roundup and live activity summary requests"
  }
];

/* The stored value and the displayed text differ for Post Event - keep both. */
export const SOCIAL_TYPES = [
  {
    value: "New Creative",
    title: "New Creative",
    description: "Fresh event creative or promotional post"
  },
  {
    value: "Post Event",
    title: "Post-Event",
    description: "Poster based on completed event coverage"
  },
  {
    value: "External or Partner Event",
    title: "External or Partner Event",
    description: "External event promotion or collaboration post"
  }
];

export const DEPARTMENTS = [
  "",
  "Rink",
  "IEDC",
  "Grants",
  "Investment",
  "Coworking",
  "Corporate Relations",
  "Women",
  "Incubation",
  "IT",
  "Infra",
  "HR",
  "Admin",
  "Accounts"
];

export const INTRO_FIELDS = ["employeeName", "department", "category"];

/** Text fields per branch, in the order the sheet expects them. */
export const BRANCH_FIELDS = {
  "New Creative": [
    "newCreativeEventName",
    "newCreativeEventDate",
    "newCreativeEventTime",
    "newCreativeLocation",
    "newCreativeRegistrationLink",
    "newCreativePhotoDriveLink",
    "newCreativeLinkedinProfile",
    "newCreativePartnerInstitutions",
    "newCreativeTaggingLinks",
    "newCreativeDescription"
  ],
  "Post Event": [
    "postEventTitle",
    "postEventDate",
    "postEventLocation",
    "postEventPhotoDriveLink",
    "postEventTaggingDetails"
  ],
  "External or Partner Event": [
    "externalEventName",
    "externalPartnerOrganisation",
    "externalRegistrationLink",
    "externalEventDate",
    "externalEventLocation",
    "externalCreativeToBePublished",
    "externalTaggingLinks"
  ],
  PR: [
    "prEventAnnouncement",
    "prWhoIsInvolved",
    "prWhen",
    "prWhere",
    "prWhySignificant",
    "prKeyHighlights",
    "prNotableSpeakers",
    "prBackgroundContext",
    "prQuotes",
    "prTestimonials",
    "prFollowUpEvents",
    "prMoreInformation",
    "prCaptions",
    "prContactPerson"
  ],
  Achievements: [
    "achievementStartupName",
    "achievementPhotos",
    "achievementLogos",
    "achievementTaggingLinks",
    "achievementContactDetails",
    "achievementDescription"
  ],
  "Daily Digest": [
    "dailyDigestTitle",
    "dailyDigestDescription",
    "dailyDigestLink"
  ]
};

/** File inputs per branch. New Creative and Post Event have none. */
export const BRANCH_UPLOADS = {
  "New Creative": [],
  "Post Event": [],
  "External or Partner Event": ["externalEventUploads"],
  PR: ["prUploads"],
  Achievements: ["achievementUploads"],
  "Daily Digest": ["dailyDigestCreative"]
};

export const ALL_TEXT_FIELDS = [
  "employeeName",
  "department",
  "category",
  "socialType",
  ...Object.values(BRANCH_FIELDS).flat()
];

export const ALL_UPLOAD_FIELDS = Object.values(BRANCH_UPLOADS).flat();

/** Which branch key a category+socialType pair resolves to, or "" for none. */
export function resolveBranch(category, socialType) {
  if (category === "Social Media") return socialType || "";
  if (category === "PR") return "PR";
  if (category === "Achievements") return "Achievements";
  if (category === "Daily Digest") return "Daily Digest";
  return "";
}

/** The step panel a category leads to from the intro step. */
export function stepForCategory(category) {
  if (category === "Social Media") return "social-type";
  if (category === "PR") return "pr";
  if (category === "Achievements") return "achievements";
  if (category === "Daily Digest") return "daily-digest";
  return "details-empty";
}
