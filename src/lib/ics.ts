import type { SiteEvent } from "./types";

// RFC 5545 calendar feed for Google / Apple Calendar subscriptions.

function utcStamp(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets must be folded (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + len > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildCalendar(
  events: SiteEvent[],
  options: { siteUrl: string; generatedAt: string },
): string {
  const host = new URL(options.siteUrl).hostname;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BuilderSpace//Events//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:BuilderSpace",
    "X-WR-TIMEZONE:Australia/Sydney",
  ];

  for (const event of events) {
    const description = [event.summary, event.signupUrl]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.slug}@${host}`,
      `DTSTAMP:${utcStamp(options.generatedAt)}`,
      `DTSTART:${utcStamp(event.startsAt)}`,
      `DTEND:${utcStamp(event.endsAt)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.location)}`,
      `URL:${options.siteUrl}/events#${event.slug}`,
    );
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
