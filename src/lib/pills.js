/** Maps a status or priority label to its pill modifier class. */
export function pillClass(prefix, value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  return slug ? `ops-${prefix}-${slug}` : "";
}
