/**
 * The launch price runs to the end of the week — midnight at the close of
 * Sunday, in the visitor's own time zone.
 *
 * Always call this from the client, for the same reason as
 * lib/next-webinar.ts: a `new Date()` read during a server render can be baked
 * into a statically-optimized page and then never move, which would leave the
 * site counting down to a deadline that passed weeks ago.
 */

/** Sunday. The week rolls over the moment it ends, so the offer always has a
 *  weekend to run to rather than showing a dead countdown on Monday. */
const OFFER_END_WEEKDAY = 0;

export function offerDeadline(from: Date = new Date()): Date {
  const date = new Date(from);
  date.setDate(from.getDate() + ((OFFER_END_WEEKDAY - from.getDay() + 7) % 7));
  date.setHours(23, 59, 59, 999);
  // Already past Sunday midnight — roll to the following week.
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

export type OfferCountdown = { days: number; hours: number; minutes: number; seconds: number };

export function countdownTo(deadline: Date, from: Date = new Date()): OfferCountdown {
  const remaining = Math.max(0, deadline.getTime() - from.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** e.g. "Sun, 13 Sept" — the deadline, without the year, which reads as
 *  further away than it is. */
export function formatOfferDeadline(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
