/**
 * The launch price ends on a fixed date: Friday 18 September 2026, at the
 * close of the day in India.
 *
 * It used to roll forward to the next Sunday every week, which meant the
 * countdown never reached zero — every Monday it quietly started again from a
 * new deadline. A countdown that resets is not a deadline, and a visitor who
 * came back a week later saw the same "ends this Sunday" urgency over the same
 * price.
 *
 * Pinned to +05:30 rather than read from the visitor's clock, for the same
 * reason lib/next-webinar.ts is: one instant, the same for everyone, so the
 * offer does not close at a different moment in Dubai than in Kochi.
 *
 * Always call this from the client. A `new Date()` read during a server render
 * can be baked into a statically-optimized page and then never move, leaving
 * the site counting down to a deadline that has already passed.
 */

const OFFER_ENDS_AT = "2026-09-18T23:59:59+05:30";

export function offerDeadline(): Date {
  return new Date(OFFER_ENDS_AT);
}

/** Whether the launch price is still running. The banner comes off once it is
 *  not — a countdown frozen at zero advertises that nobody is minding it. */
export function offerIsLive(from: Date = new Date()): boolean {
  return offerDeadline().getTime() > from.getTime();
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

/** e.g. "Fri, 18 Sept" — the deadline, without the year, which reads as
 *  further away than it is. */
export function formatOfferDeadline(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
