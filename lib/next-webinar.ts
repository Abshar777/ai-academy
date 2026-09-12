/**
 * The free live webinar sessions, in one place. Read by the hero's booking CTA
 * (components/webinar-cta.tsx), the badge on the "Start building today" card
 * (components/next-webinar-badge.tsx) and the entry popup, so none of them can
 * quote a different date from the others.
 *
 * Real dated sessions rather than a weekly rule. The rule this replaced said
 * "every Saturday at 20:00" and computed it with setHours() in whatever
 * timezone the visitor's browser happened to be in — so the site advertised
 * 8:00 PM to everyone, meaning a different moment in each country, and none of
 * them the moment the webinar actually runs.
 *
 * Each start is an absolute instant with its offset written in, and every
 * format below pins the output to IST. A visitor in Dubai is told the Indian
 * time, which is what the posters say and what the host will be keeping to.
 *
 * Add the next session to the list when it is scheduled. Once every session is
 * in the past, nothing is advertised at all — an empty hero card is a smaller
 * problem than an invitation to a webinar that has already happened.
 */

export type WebinarSession = {
  /** ISO instant. The +05:30 is part of the value, so it resolves to the same
   *  moment wherever it is read — server, browser, or calendar invite. */
  startsAt: string;
  durationMinutes: number;
  title: string;
  speaker: string;
  /** Path under /public. Named per session rather than a fixed
   *  "webinar-poster.jpg": Next's image optimiser caches on the URL, so
   *  overwriting one file in place leaves every page serving the previous
   *  poster until the cache expires. A new session gets a new filename and
   *  the problem cannot happen. */
  poster: string;
};

export const WEBINAR_TIME_ZONE = "Asia/Kolkata";
const TIME_ZONE_LABEL = "IST";

const SESSIONS: WebinarSession[] = [
  {
    startsAt: "2026-09-15T19:30:00+05:30",
    durationMinutes: 60,
    title: "Build a website in minutes, free",
    speaker: "Muhammed Shan",
    poster: "/seminar/2026-09-15-free-website.jpg",
  },
];

/** Where "Book my free seat" goes. Our own page rather than the Typeform it
 *  used to be: booking here is what lets us send the calendar invite, hand
 *  over the WhatsApp community, and know who actually registered. */
export const WEBINAR_BOOKING_URL = "/seminar";

/** The next session still ahead of `from`, or null once the list runs out. */
export function nextWebinarSession(from: Date = new Date()): WebinarSession | null {
  return (
    [...SESSIONS]
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .find((session) => Date.parse(session.startsAt) > from.getTime()) ?? null
  );
}

/** When the next session starts, or null if there isn't one. */
export function nextWebinarDate(from: Date = new Date()): Date | null {
  const session = nextWebinarSession(from);
  return session ? new Date(session.startsAt) : null;
}

/** e.g. "Tue, 15 Sept 2026" — always the Indian date. */
export function formatWebinarDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: WEBINAR_TIME_ZONE,
  });
}

/** e.g. "7:30 PM IST". The zone is named because the audience spans India and
 *  the Gulf, and a bare "7:30 PM" means two different evenings to them. */
export function formatWebinarTime(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: WEBINAR_TIME_ZONE,
  });
  return `${time} ${TIME_ZONE_LABEL}`;
}
