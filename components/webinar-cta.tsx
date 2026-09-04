"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  WEBINAR_BOOKING_URL,
  formatWebinarDate,
  formatWebinarTime,
  nextWebinarDate,
} from "@/lib/next-webinar";

/**
 * The hero's booking hook: the next free live webinar, with a real countdown
 * to it. The countdown runs against an actual recurring session (Saturdays
 * 8:00 PM — see lib/next-webinar.ts), not an invented deadline that resets
 * on every visit.
 *
 * Shares the "Launch offer" banner's card treatment (.ffb-card — the slowly
 * drifting dark gradient, see globals.css and free-fifty-banner.tsx) rather
 * than defining its own, so the site's two promo blocks stay identical.
 *
 * The card's shell renders on the server too, and only the date and digits
 * fill in after mount — that keeps hydration matching (a server-rendered
 * `new Date()` would be baked into a static page) without the layout
 * jumping once the numbers arrive.
 */

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function remainingUntil(target: Date, now: Date): Remaining {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

function LiveDot() {
  return (
    <span className="relative flex size-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-30 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-lime-30" />
    </span>
  );
}

function CountdownUnit({
  value,
  label,
  animated,
}: {
  value: number | null;
  label: string;
  animated: boolean;
}) {
  const text = value === null ? "--" : pad(value);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-10 w-11 overflow-hidden rounded-xl bg-white/8 ring-1 ring-white/10 sm:h-11 sm:w-12">
        {animated ? (
          // Keyed on the value so React swaps the node on every tick and the
          // new digit rolls up into place. Deliberately enter-only rather
          // than an AnimatePresence in/out pair: with a new key every second
          // the exiting nodes were never being cleaned up, so each unit grew
          // an ever-longer stack of dead digits behind the visible one.
          <motion.span
            key={text}
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center font-sans-plomb text-[19px] leading-none font-semibold tracking-[-0.015em] text-white tabular-nums sm:text-[21px]"
          >
            {text}
          </motion.span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-sans-plomb text-[19px] leading-none font-semibold tracking-[-0.015em] text-white tabular-nums sm:text-[21px]">
            {text}
          </span>
        )}
      </div>
      <span className="font-noi-grotesk text-[9px] leading-none font-medium tracking-[0.12em] text-white/45 uppercase sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

export function WebinarCta({ className = "" }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const [session, setSession] = useState<{ date: Date; remaining: Remaining } | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const date = nextWebinarDate(now);
      setSession({ date, remaining: remainingUntil(date, now) });
    }
    // Deferred rather than called straight from the effect body: the server
    // renders no date at all, so the first client render has to match that.
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  const remaining = session?.remaining ?? null;
  const animated = !reducedMotion;

  return (
    <div
      className={`ffb-card relative w-full max-w-md overflow-hidden rounded-2xl p-4 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:max-w-xl sm:p-5 ${className}`}
    >
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-between sm:text-left">
          <h2 className="flex items-center gap-2 font-noi-grotesk text-[15px] leading-[1.25] font-semibold tracking-[-0.015em] text-white sm:text-[17px]">
            {/* <LiveDot /> */}
            Join the next free live webinar
          </h2>

          {/* Fixed line height so the row doesn't jump when the date lands. */}
          <span className="min-h-[18px] font-noi-grotesk text-[13px] leading-[1.3] font-medium tracking-[-0.01em] text-white/70 sm:text-[14px]">
            {session
              ? `${formatWebinarDate(session.date)} · ${formatWebinarTime(session.date)}`
              : ""}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-5">
          <div className="flex items-start gap-2">
            <CountdownUnit value={remaining?.days ?? null} label="Days" animated={animated} />
            <CountdownUnit value={remaining?.hours ?? null} label="Hrs" animated={animated} />
            <CountdownUnit value={remaining?.minutes ?? null} label="Min" animated={animated} />
            <CountdownUnit value={remaining?.seconds ?? null} label="Sec" animated={animated} />
          </div>

          {/* Straight to the registration form rather than the general
              enquiry modal — booking a seat is its own flow. */}
          <a
            href={WEBINAR_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-lime-30 px-6 font-noi-grotesk text-[14px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 active:scale-[0.98] sm:w-auto sm:text-[15px]"
          >
            Book my free seat
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
              <path
                d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
