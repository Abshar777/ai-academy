"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { discountPercent, normalizeCountry, planForCountry } from "@/lib/pricing";
import { readCountryCookie } from "@/lib/country-cookie";
import {
  countdownTo,
  formatOfferDeadline,
  offerDeadline,
  type OfferCountdown,
} from "@/lib/offer-deadline";

/**
 * The launch-price notice, pinned above the nav on every page of the
 * marketing site.
 *
 * Its height is published as --announcement-height (app/globals.css), which
 * the floating nav and the body's top padding both add to their own offsets —
 * so the bar can change size in one place without anything sliding underneath
 * it.
 */
export function OfferBanner() {
  const [country, setCountry] = useState("AE");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<OfferCountdown | null>(null);

  // Deferred, and only after mount: the country lives in a cookie, and the
  // deadline is computed from the visitor's own clock. Reading either during
  // render would disagree with the server-rendered markup it hydrates into.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setCountry(normalizeCountry(readCountryCookie()));
      const end = offerDeadline();
      setDeadline(end);
      setRemaining(countdownTo(end));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setRemaining(countdownTo(deadline)), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  const off = discountPercent(planForCountry(country));

  return (
    <div className="site-announcement fixed inset-x-0 top-0 z-[60] bg-lime-30 text-neutral-90">
      <Link
        href="/order"
        className="mx-auto flex h-(--announcement-height) w-full max-w-[1200px] items-center justify-center gap-2 px-3 font-noi-grotesk text-[12px] leading-none tracking-[-0.01em] transition-opacity duration-150 hover:opacity-80 sm:gap-3 sm:px-4 sm:text-[13px]"
      >
        {/* Inverted out of the lime rather than just bolded. On a bar that is
            already one bright colour, weight alone does not separate anything
            — reversing the contrast does. */}
        {off !== null && (
          <span className="shrink-0 rounded-full bg-neutral-90 px-2.5 py-1 font-noi-grotesk text-[11px] font-bold tracking-[0.03em] text-lime-30 sm:text-[12px]">
            {off}% OFF
          </span>
        )}

        {/* Quiet on purpose: it is the connective tissue between the two things
            that are meant to be read. */}
        <span className="hidden font-medium text-neutral-90/70 sm:inline">
          Launch price ends {deadline ? formatOfferDeadline(deadline) : "this weekend"}
        </span>
        <span className="font-medium text-neutral-90/70 sm:hidden">Ends in</span>

        {remaining && (
          <span className="flex shrink-0 items-center gap-1">
            {/* Phones show the two coarsest units that still move visibly;
                anything finer would not fit beside the rest at 375px. */}
            {remaining.days > 0 ? (
              <>
                <Unit value={remaining.days} label="d" />
                <Unit value={remaining.hours} label="h" />
              </>
            ) : (
              <>
                <Unit value={remaining.hours} label="h" />
                <Unit value={remaining.minutes} label="m" />
              </>
            )}
            <span className="hidden items-center gap-1 sm:flex">
              {remaining.days > 0 && <Unit value={remaining.minutes} label="m" />}
              {/* The one that ticks. A clock you can watch move is what makes
                  a deadline feel like one. */}
              <Unit value={remaining.seconds} label="s" ticking />
            </span>
          </span>
        )}
      </Link>
    </div>
  );
}

/** One unit of the countdown, boxed and inverted so the numbers read as a
 *  clock rather than as part of the sentence beside them. */
function Unit({ value, label, ticking = false }: { value: number; label: string; ticking?: boolean }) {
  return (
    <span
      className={`flex items-baseline gap-0.5 rounded-md bg-neutral-90 px-1.5 py-1 text-lime-30 ${
        ticking ? "offer-tick" : ""
      }`}
    >
      <span className="font-noi-grotesk text-[12px] font-bold tabular-nums sm:text-[13px]">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-noi-grotesk text-[9px] font-semibold uppercase opacity-70">{label}</span>
    </span>
  );
}
