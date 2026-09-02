"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { normalizeCountry, planForCountry } from "@/lib/pricing";
import { readCountryCookie } from "@/lib/country-cookie";
import { useEnrollBarVisible } from "@/lib/use-enroll-bar-visible";

/**
 * Full-width sticky "Enroll now" bar across the bottom of the screen. Show
 * state comes from lib/use-enroll-bar-visible.ts, shared with the chat
 * widget's floating trigger (ai-chat-widget.tsx) so that one can lift itself
 * clear of the bar rather than the two stacking on top of each other. Sits
 * at z-40 — below the chat widget's z-[51] — and its own content keeps
 * clear of that corner with right padding regardless.
 */

export function EnrollBar() {
  const visible = useEnrollBarVisible();
  const [country, setCountry] = useState("AE");

  // Deferred out of the effect body (same pattern as order-form.tsx's
  // saved-contact prefill): the cookie only exists client-side, and the
  // initial client render must still match the server-rendered "AE"
  // default for hydration to succeed.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setCountry(normalizeCountry(readCountryCookie()));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const plan = planForCountry(country);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-neutral-90/95 shadow-[0_-16px_48px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 py-3 pr-24 pl-5 sm:gap-6 sm:py-4 sm:pr-28 sm:pl-6 lg:pr-32">
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-noi-grotesk text-[11px] font-medium tracking-[-0.01em] text-white/55 sm:text-[12px]">
                Full programme
              </span>
              <span className="flex items-baseline gap-1.5 sm:gap-2.5">
                {plan.originalLabel && (
                  <span className="font-noi-grotesk text-[11px] font-medium tracking-[-0.01em] text-white/40 line-through sm:text-[16px]">
                    {plan.originalLabel}
                  </span>
                )}
                <span className="font-sans-plomb text-2xl leading-none font-semibold tracking-[-0.015em] text-white sm:text-3xl">
                  {plan.label}
                </span>
              </span>
            </span>
            <Link
              href="/order"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-lime-30 px-6 font-noi-grotesk text-[14px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 sm:h-12 sm:px-8 sm:text-[15px]"
            >
              Enroll now
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
