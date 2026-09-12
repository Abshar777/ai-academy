import { formatWebinarDate, formatWebinarTime, type WebinarSession } from "./next-webinar";

/**
 * What a registrant actually reads — in the invitation email Google sends, and
 * again in their calendar days later with none of our pages in front of them.
 *
 * The name leads the title because of how this arrives. Gmail shows a
 * calendar invitation from an address you have never written to as "Invitation
 * from an unknown sender", and the only thing the reader has to go on before
 * deciding is the subject line. "Delta AI Academy — …" answers that; the bare
 * session name did not.
 *
 * Google Calendar renders a small HTML subset in descriptions — links, bold,
 * line breaks and lists. Anything else is stripped, so this stays within it.
 */

const SITE_URL = "https://deltaaiacademy.ai";

export type InviteContent = {
  title: string;
  description: string;
  location: string | null;
};

export function seminarInvite(
  session: WebinarSession,
  options: { meetLink?: string | null; communityUrl?: string | null } = {},
): InviteContent {
  const start = new Date(session.startsAt);
  const when = `${formatWebinarDate(start)}, ${formatWebinarTime(start)}`;

  // No brand line here — the title already carries it, and PROGRAMME_NAME is
  // the course's name rather than the academy's.
  const lines = [
    `<b>${escape(session.title)}</b>`,
    "",
    "In one hour you will build a real website and put it online. No coding experience needed:",
    "you describe what you want, AI builds it, and you direct it until it is live.",
    "",
    `<b>When</b><br>${escape(when)} — the session runs for ${session.durationMinutes} minutes.`,
    "",
    `<b>Who is running it</b><br>${escape(session.speaker)}, AI Mentor at Delta AI Academy.`,
    "",
    "<b>How to join</b><br>Use the Google Meet link on this invitation. Nothing to install.",
  ];

  if (options.communityUrl) {
    lines.push(
      "",
      `<b>Questions before we start?</b><br>Join the WhatsApp community: <a href="${escape(options.communityUrl)}">${escape(options.communityUrl)}</a>`,
    );
  }

  lines.push("", `<a href="${SITE_URL}">deltaaiacademy.ai</a>`);

  return {
    title: `Delta AI Academy — ${session.title}`,
    description: lines.join("<br>"),
    location: options.meetLink ?? null,
  };
}

/** The description is built from our own content, but the community URL comes
 *  from an env var someone can mistype — so it is escaped like everything else
 *  rather than trusted into an href. */
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The same wording as a calendar file's DESCRIPTION, which is plain text —
 * ICS has no HTML, and an escaped <b> tag shows up verbatim in the entry.
 *
 * Built from the same parts as seminarInvite rather than by stripping its
 * markup, so the two cannot drift into saying different things.
 */
export function plainInvite(
  session: WebinarSession,
  options: { meetLink?: string | null; communityUrl?: string | null } = {},
): string {
  const start = new Date(session.startsAt);
  const lines = [
    session.title,
    "",
    "In one hour you will build a real website and put it online. No coding experience needed:",
    "you describe what you want, AI builds it, and you direct it until it is live.",
    "",
    `When: ${formatWebinarDate(start)}, ${formatWebinarTime(start)} (${session.durationMinutes} minutes)`,
    `Who is running it: ${session.speaker}, AI Mentor at Delta AI Academy`,
  ];
  if (options.meetLink) lines.push(`Join here: ${options.meetLink}`);
  if (options.communityUrl) lines.push(`WhatsApp community: ${options.communityUrl}`);
  lines.push("", SITE_URL);
  return lines.join("\n");
}
