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
        className="mx-auto flex h-(--announcement-height) w-full max-w-[1200px] items-center justify-center gap-2 px-4 font-noi-grotesk text-[12px] leading-none tracking-[-0.01em] transition-opacity duration-150 hover:opacity-80 sm:gap-3 sm:text-[13px]"
      >
        {off !== null && <span className="font-semibold">{off}% off</span>}

        <span aria-hidden className="h-3 w-px bg-neutral-90/25" />

        {/* Short on phones, where the full sentence and a countdown won't
            both fit on one line. */}
        <span className="font-medium sm:hidden">Offer ends this weekend</span>
        <span className="hidden font-medium sm:inline">
          Launch price ends {deadline ? formatOfferDeadline(deadline) : "this weekend"}
        </span>

        {remaining && (
          <span className="hidden font-semibold tabular-nums sm:inline">
            {remaining.days}d {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
          </span>
        )}
      </Link>
    </div>
  );
}
