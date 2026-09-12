/**
 * The seminar as a calendar file, attached to the confirmation email.
 *
 * Google will not let anyone push an event into an outside person's calendar —
 * adding a guest sends an invitation, and whether that invitation lands in
 * their calendar is decided by *their* setting ("add invitations from everyone"
 * vs "only senders I know"). That is deliberate anti-spam behaviour on
 * Google's side and no API parameter overrides it, which is why a first-time
 * registrant sees "this event isn't in your calendar yet".
 *
 * An attachment is the way across that gap: it is one click, it needs no
 * relationship with the sender, and it works in Apple Calendar and Outlook,
 * which the Google invitation does not reach at all.
 *
 * Two details make it behave:
 *   - UID matches Google's own iCalUID for the event (`<eventId>@google.com`),
 *     so someone who adds this *and* accepts the invitation ends up with one
 *     entry rather than two.
 *   - METHOD:PUBLISH, not REQUEST. REQUEST would render a second set of RSVP
 *     buttons in Gmail, competing with the real invitation and replying to a
 *     calendar address rather than to us.
 */

export function seminarIcs(input: {
  eventId: string | null;
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  durationMinutes: number;
  organizerName: string;
  organizerEmail: string;
}): string {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  // Without a Google event there is still a stable identity to give the entry,
  // so the file works even when the calendar integration is unconfigured.
  const uid = input.eventId
    ? `${input.eventId}@google.com`
    : `seminar-${start.toISOString().slice(0, 10)}@deltaaiacademy.ai`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Delta AI Academy//Seminar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(input.title)}`,
    `DESCRIPTION:${esc(input.description)}`,
    input.location ? `LOCATION:${esc(input.location)}` : "",
    input.location ? `URL:${esc(input.location)}` : "",
    `ORGANIZER;CN=${esc(input.organizerName)}:mailto:${input.organizerEmail}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    // Their own calendar reminds them, independently of whether they ever
    // accepted the Google invitation.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.map(fold).join("\r\n") + "\r\n";
}

/** iCalendar UTC stamp: 20260915T140000Z */
function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 text escaping — backslash first, or it would escape its own output. */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Folds to 75 octets per line, as the spec counts them — bytes, not
 * characters, so a line of Malayalam or an em dash cannot be split through the
 * middle of a character and arrive as mojibake.
 */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // 10xxxxxx is a UTF-8 continuation byte: walk back to the character start.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines are prefixed with a space
  }
  return parts.join("\r\n ");
}
