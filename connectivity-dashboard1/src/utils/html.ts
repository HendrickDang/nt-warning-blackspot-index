// Small HTML helpers for Leaflet popup content. Leaflet's `bindPopup` accepts
// an HTML string, so any value interpolated from data or the URL must be
// escaped to avoid injecting markup.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a value for safe interpolation into an HTML string. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Only allow http(s) URLs through, so a crafted `?name=`/data value cannot
 * introduce a `javascript:` link attribute.
 */
export function safeUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  return escapeHtml(raw);
}
