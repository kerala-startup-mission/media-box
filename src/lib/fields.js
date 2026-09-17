/**
 * Ordered render descriptors per branch. Order matters: Daily Digest leads with
 * its file input, and the PR gallery sits between prUploads and prCaptions.
 *
 * kind: "field" | "upload" | "speakers"
 */

const t = (name, label, extra = {}) => ({ kind: "field", name, label, ...extra });
const upload = (name, label, help) => ({ kind: "upload", name, label, help });

export const BRANCH_LAYOUT = {
  "New Creative": {
    step: "Q4",
    heading: "New Creative Details",
    fields: [
      t("newCreativeEventName", "Name of event"),
      t("newCreativeEventDate", "Date of event", { type: "date" }),
      t("newCreativeEventTime", "Time", { type: "time" }),
      t("newCreativeLocation", "Location", { placeholder: "Venue / city" }),
      t("newCreativeRegistrationLink", "Registration Link", { type: "url", placeholder: "https://" }),
      t("newCreativePhotoDriveLink", "Drive link to photographs", { type: "url", placeholder: "https://" }),
      t("newCreativeLinkedinProfile", "LinkedIn Profile", { type: "url", placeholder: "https://linkedin.com/in/..." }),
      t("newCreativePartnerInstitutions", "Partner institutions and logos", { placeholder: "Institutions / logo notes" }),
      t("newCreativeTaggingLinks", "Tagging links", { placeholder: "Instagram / LinkedIn / X handles" }),
      t("newCreativeDescription", "Brief description of the event", {
        type: "textarea",
        rows: 4,
        placeholder: "Share the message or event context",
        fullWidth: true
      }),
      { kind: "speakers" }
    ]
  },

  "Post Event": {
    step: "Q4",
    heading: "Post-Event Details",
    fields: [
      t("postEventTitle", "Title"),
      t("postEventDate", "Date", { type: "date" }),
      t("postEventLocation", "Location"),
      t("postEventPhotoDriveLink", "Drive link to photos or creatives", { type: "url", placeholder: "https://" }),
      t("postEventTaggingDetails", "Tagging details", {
        type: "textarea",
        placeholder: "Mention accounts or URLs to tag",
        fullWidth: true
      })
    ]
  },

  "External or Partner Event": {
    step: "Q4",
    heading: "External or Partner Event Details",
    fields: [
      t("externalEventName", "Name of event"),
      t("externalPartnerOrganisation", "Partner organisation"),
      t("externalRegistrationLink", "Registration Link", { type: "url", placeholder: "https://" }),
      t("externalEventDate", "Date", { type: "date" }),
      t("externalEventLocation", "Location"),
      t("externalCreativeToBePublished", "Creative to be published", { placeholder: "Poster, story, reel, carousel" }),
      t("externalTaggingLinks", "Tagging links", {
        type: "textarea",
        placeholder: "Mention accounts or URLs to tag",
        fullWidth: true
      }),
      upload(
        "externalEventUploads",
        "Upload posters or partner-event material",
        "Upload event posters, partner creatives, or images that should go with this submission."
      )
    ]
  },

  PR: {
    step: "Q3",
    heading: "Press Release Details",
    fields: [
      t("prEventAnnouncement", "What is the event or announcement?", { type: "textarea", fullWidth: true }),
      t("prWhoIsInvolved", "Who is involved?", { type: "textarea", fullWidth: true }),
      t("prWhen", "When will / did the event take place?", { type: "datetime-local" }),
      t("prWhere", "Where is the event being held?"),
      t("prWhySignificant", "Why is this event or announcement significant?", { type: "textarea", fullWidth: true }),
      t("prKeyHighlights", "What are the key highlights or major announcements?", { type: "textarea", fullWidth: true }),
      t("prNotableSpeakers", "Are there any notable speakers or guests?", { type: "textarea", fullWidth: true }),
      t("prBackgroundContext", "What is the background or context of the event?", { type: "textarea", fullWidth: true }),
      t("prQuotes", "Are there any quotes from key individuals?", { type: "textarea", fullWidth: true }),
      t("prTestimonials", "Do you have any testimonials or feedback from attendees?", { type: "textarea", fullWidth: true }),
      t("prFollowUpEvents", "Are there any follow-up events or next steps?", { type: "textarea", fullWidth: true }),
      t("prMoreInformation", "Where can readers find more information?", {
        type: "textarea",
        placeholder: "Websites, social media pages, or contact details",
        fullWidth: true
      }),
      upload("prUploads", "Upload PR creatives or related media", "Upload posters, press creatives, event visuals, or related PR material."),
      t("prCaptions", "Provide captions for the visual content", { type: "textarea", fullWidth: true }),
      t("prContactPerson", "Who will be the contact for review and POC?", { type: "textarea", fullWidth: true })
    ]
  },

  Achievements: {
    step: "Q3",
    heading: "Achievement Details",
    fields: [
      t("achievementStartupName", "Startups / Startup mission"),
      t("achievementPhotos", "Photos if any", { type: "url", placeholder: "Drive link / image URL" }),
      t("achievementLogos", "Logos to be included", { placeholder: "Startup / partner logos" }),
      t("achievementTaggingLinks", "Tagging links", { placeholder: "Social handles or profile links" }),
      t("achievementContactDetails", "Contact details of startup", { placeholder: "Can be filled later if needed" }),
      t("achievementDescription", "Brief description", {
        type: "textarea",
        rows: 4,
        placeholder: "Describe the achievement and why it matters",
        fullWidth: true
      }),
      upload(
        "achievementUploads",
        "Upload relevant images",
        "Upload achievement creatives, event images, certificates, or related visual material."
      )
    ]
  },

  "Daily Digest": {
    step: "Q3",
    heading: "Daily Digest Details",
    fields: [
      upload("dailyDigestCreative", "Upload your creative", "Upload the creative asset meant for the daily digest."),
      t("dailyDigestTitle", "Title", { placeholder: "Enter title" }),
      t("dailyDigestDescription", "Description", {
        type: "textarea",
        rows: 4,
        placeholder: "Write the short daily digest copy",
        fullWidth: true
      }),
      t("dailyDigestLink", "Application link or link if any", { type: "url", placeholder: "https://" })
    ]
  }
};
