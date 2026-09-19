"use client";

import { useEffect, useState } from "react";
import {
  countdownTo,
  offerDeadline,
  offerIsLive,
  type OfferCountdown as Remaining,
} from "@/lib/offer-deadline";

/**
 * The clock against the launch price, for the moment someone is deciding.
 *
 * The strike-through price says the offer is worth taking; without a deadline
 * it never says *now*, and a discount with no end reads as the normal price
 * with a bigger number written next to it.
 *
 * It counts to the same instant as the banner (lib/offer-deadline.ts) rather
 * than holding a timer of its own. Two countdowns on one page disagreeing
 * about when the same offer ends is worse than having none, and a per-visitor
 * timer that restarts when the tab does is the rolling deadline that module
 * was written to get rid of.
 *
 * Nothing renders once the offer is over: a countdown frozen at zero, or one
 * counting up, advertises that nobody is minding it.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function OfferCountdown({ className = "" }: { className?: string }) {
  // Null until the first tick after mount. The deadline is measured against
  // the visitor's clock, so computing it during render would disagree with the
  // server-rendered markup it hydrates into — the same reason the banner waits.
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(offerIsLive() ? countdownTo(offerDeadline()) : null);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!remaining) return null;

  const { days, hours, minutes, seconds } = remaining;
  // Days only while there are some: "02d 14:20:51" carries the urgency of a
  // deadline, "14:20:51" the urgency of an afternoon, and showing "62:20:51"
  // instead would be neither.
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const text = days > 0 ? `${days}d ${clock}` : clock;

  return (
    <p
      className={`inline-flex items-center gap-2 self-start rounded-full bg-[#fdeceb] px-3 py-1.5 font-noi-grotesk text-[13px] leading-none font-medium text-[#b3261e] ${className}`}
      // The digits change every second; without this the whole line is
      // re-announced over and over by a screen reader.
      aria-live="off"
    >
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#b3261e] opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-[#b3261e]" />
      </span>
      Offer ends in
      <time className="tabular-nums" dateTime={offerDeadline().toISOString()}>
        {text}
      </time>
    </p>
  );
}
