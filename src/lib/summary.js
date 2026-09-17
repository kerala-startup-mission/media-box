import { APP_CONFIG } from "./config.js";

function formatDateValue(value) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    ...(String(value).includes("T") ? { timeStyle: "short", timeZone: APP_CONFIG.timezone } : {})
  }).format(date);
}

function uploadNames(value) {
  return Array.isArray(value) ? value.map((file) => file.name).join(", ") : "";
}

function speakerSummary(speakers) {
  if (!Array.isArray(speakers)) return "";

  return speakers
    .map((speaker, index) => {
      const namePart = [speaker.name, speaker.title].filter(Boolean).join(" - ");
      const count = speaker.uploads?.length || 0;
      const uploads = count ? ` (${count} upload${count === 1 ? "" : "s"})` : "";
      return `${namePart || `Speaker ${index + 1}`}${uploads}`;
    })
    .join(", ");
}

/** Returns [{ title, rows: [label, value][] }]; row labels are the originals. */
export function getSummarySections(payload) {
  const sections = [
    {
      title: "Requester Information",
      rows: [
        ["Name", payload.employeeName || "Not provided"],
        ["Department", payload.department || "Not provided"],
        ["Category", payload.category || "To be classified"],
        ["Social Media Type", payload.socialType || "Not provided"]
      ]
    }
  ];

  if (payload.category === "Social Media") {
    let rows = [["Social Media Type", payload.socialType || "Not provided"]];

    if (payload.socialType === "New Creative") {
      rows = rows.concat([
        ["Name of event", payload.newCreativeEventName],
        ["Date of event", formatDateValue(payload.newCreativeEventDate)],
        ["Time", payload.newCreativeEventTime || "Not provided"],
        ["Location", payload.newCreativeLocation],
        ["Registration Link", payload.newCreativeRegistrationLink],
        ["Brief description of the event", payload.newCreativeDescription],
        ["Speaker details", speakerSummary(payload.newCreativeSpeakers)],
        ["Drive link to photographs", payload.newCreativePhotoDriveLink],
        ["LinkedIn Profile", payload.newCreativeLinkedinProfile],
        ["Partner institutions and logos", payload.newCreativePartnerInstitutions],
        ["Tagging links", payload.newCreativeTaggingLinks]
      ]);
    }

    if (payload.socialType === "Post Event") {
      /* The original also listed "Uploaded materials" here, but Post Event has
         no file input and the sheet has no column for it. */
      rows = rows.concat([
        ["Title", payload.postEventTitle],
        ["Date", formatDateValue(payload.postEventDate)],
        ["Location", payload.postEventLocation],
        ["Drive link to photos", payload.postEventPhotoDriveLink],
        ["Tagging details", payload.postEventTaggingDetails]
      ]);
    }

    if (payload.socialType === "External or Partner Event") {
      rows = rows.concat([
        ["Name of event", payload.externalEventName],
        ["Partner organisation", payload.externalPartnerOrganisation],
        ["Registration Link", payload.externalRegistrationLink],
        ["Date", formatDateValue(payload.externalEventDate)],
        ["Location", payload.externalEventLocation],
        ["Creative to be published", payload.externalCreativeToBePublished],
        ["Tagging links", payload.externalTaggingLinks],
        ["Uploaded materials", uploadNames(payload.externalEventUploads)]
      ]);
    }

    sections.push({ title: payload.socialType || "Social Media Request", rows });
  }

  if (payload.category === "Achievements") {
    sections.push({
      title: "Achievement Details",
      rows: [
        ["Startups / Startup mission", payload.achievementStartupName],
        ["Brief description", payload.achievementDescription],
        ["Photos if any", payload.achievementPhotos],
        ["Uploaded materials", uploadNames(payload.achievementUploads)],
        ["Logos to be included", payload.achievementLogos],
        ["Tagging links", payload.achievementTaggingLinks],
        ["Contact details of startup", payload.achievementContactDetails]
      ]
    });
  }

  if (payload.category === "PR") {
    sections.push({
      title: "Press Release Details",
      rows: [
        ["What is the event or announcement?", payload.prEventAnnouncement],
        ["Who is involved?", payload.prWhoIsInvolved],
        ["When will / did the event take place?", formatDateValue(payload.prWhen)],
        ["Where is the event being held?", payload.prWhere],
        ["Why is this event or announcement significant?", payload.prWhySignificant],
        ["Key highlights or major announcements", payload.prKeyHighlights],
        ["Notable speakers or guests", payload.prNotableSpeakers],
        ["Background or context", payload.prBackgroundContext],
        ["Quotes from key individuals", payload.prQuotes],
        ["Testimonials or feedback from attendees", payload.prTestimonials],
        ["Follow-up events or next steps", payload.prFollowUpEvents],
        ["Where can readers find more information?", payload.prMoreInformation],
        ["Uploaded materials", uploadNames(payload.prUploads)],
        ["Captions for the visual content", payload.prCaptions],
        ["Contact for review and POC", payload.prContactPerson]
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
        ["Creative uploads", uploadNames(payload.dailyDigestCreative)]
      ]
    });
  }

  if (!payload.category) {
    sections.push({
      title: "Open Request Notes",
      rows: [
        ["Status", "Submitted without category"],
        ["Next step", "Team can classify this in the workflow desk"]
      ]
    });
  }

  /* Drops blanks and the "Not provided" sentinel, but keeps "To be classified". */
  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter(([, value]) => value && value !== "Not provided")
  }));
}
