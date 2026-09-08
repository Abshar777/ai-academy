"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { discountPercent, normalizeCountry, planForCountry } from "@/lib/pricing";
import { readCountryCookie } from "@/lib/country-cookie";
import { useEnrollBarVisible } from "@/lib/use-enroll-bar-visible";
import { PROGRAMME_NAME } from "@/lib/site";

/**
 * Floating pill-shaped "Enroll now" bar, inset from the screen edges, across
 * the bottom of the screen. Show state comes from
 * lib/use-enroll-bar-visible.ts, shared with the chat widget's floating
 * trigger (ai-chat-widget.tsx) so that one can lift itself clear of the bar
 * rather than the two stacking on top of each other. Sits at z-40 — below
 * the chat widget's z-[51] — and its own content keeps clear of that corner
 * with right padding regardless.
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
  const off = discountPercent(plan);

  // On checkout itself the bar is a price reminder, not a way in — "Enroll
  // now" linking to the page you are already on would do nothing visible.
  const pathname = usePathname();
  const onOrderPage = pathname === "/order";

  function scrollToForm() {
    const field = document.getElementById("order-name");
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus after the scroll settles, so the browser doesn't jump twice.
    window.setTimeout(() => (field as HTMLInputElement | null)?.focus(), 400);
  }

  return (
    // pointer-events-none/auto split: this wrapper spans the full inset
    // width just to center the pill with flexbox (not a CSS transform,
    // which would fight the motion.div's own animated y-transform below),
    // so clicks anywhere outside the actual pill must pass through to
    // whatever's behind it.
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center sm:inset-x-6 sm:bottom-6">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: "150%" }}
            animate={{ y: 0 }}
            exit={{ y: "150%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="pointer-events-auto w-full max-w-xl rounded-full border border-white/10 bg-neutral-90/95 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-2xl"
          >
            <div className="flex w-full items-center gap-3 py-2 pr-4 pl-4 sm:gap-4 sm:py-2.5 sm:pr-8 sm:pl-5">
              {/* Stacks on phones. One row can't hold the name, the price and
                  the button at a size worth reading, and the name is what says
                  which thing is being sold — dropping it left the bar showing
                  a number with nothing attached to it. */}
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-0 truncate font-noi-grotesk text-[11px] leading-none font-medium tracking-[-0.015em] text-white/75 sm:text-[19px] sm:font-semibold sm:text-white">
                  {PROGRAMME_NAME}
                </span>

                <span aria-hidden className="hidden h-5 w-px shrink-0 bg-white/15 sm:block" />

                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="font-noi-grotesk text-[16px] leading-none font-semibold tracking-[-0.015em] text-white sm:text-[20px]">
                    {plan.label}
                  </span>
                  {plan.originalLabel && (
                    <span className="font-noi-grotesk text-[11px] leading-none font-medium tracking-[-0.01em] text-white/40 line-through sm:text-[12px]">
                      {plan.originalLabel}
                    </span>
                  )}
                  {off !== null && (
                    <span className="font-noi-grotesk text-[11px] leading-none font-semibold tracking-[-0.01em] text-lime-30 sm:text-[12px]">
                      {off}% off
                    </span>
                  )}
                </span>
              </div>

              {onOrderPage ? (
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-lime-30 px-5 font-noi-grotesk text-[12px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 sm:h-10 sm:px-6 sm:text-[13px]"
                >
                  Complete order
                </button>
              ) : (
                <Link
                  href="/order"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-lime-30 px-5 font-noi-grotesk text-[12px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 sm:h-10 sm:px-6 sm:text-[13px]"
                >
                  Enroll now
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
