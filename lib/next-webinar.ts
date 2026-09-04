/**
 * The free live webinar runs weekly, Saturdays at 8:00 PM. Shared by the
 * hero's booking CTA (components/webinar-cta.tsx) and the smaller badge on
 * the "Start building today" card (components/next-webinar-badge.tsx) so
 * both quote the same session.
 *
 * Always call this from the client. A `new Date()` read during a server
 * render can get baked into a statically-optimized page and then never
 * update, which would leave the site advertising a webinar that has been
 * and gone.
 */

const WEBINAR_WEEKDAY = 6; // Saturday
const WEBINAR_HOUR = 20; // 8:00 PM

/** Where "Book my free seat" goes — the live registration form. */
export const WEBINAR_BOOKING_URL = "https://qoywuk5j2jd.typeform.com/to/VswZiCFL";

export function nextWebinarDate(from: Date = new Date()): Date {
  const date = new Date(from);
  date.setDate(from.getDate() + ((WEBINAR_WEEKDAY - from.getDay() + 7) % 7));
  date.setHours(WEBINAR_HOUR, 0, 0, 0);
  // It is already Saturday and 20:00 has passed — this week's session has
  // started, so the *next* one is a week out.
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

/** e.g. "Sat, 5 Sept 2026" */
export function formatWebinarDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "11:00 AM" */
export function formatWebinarTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
