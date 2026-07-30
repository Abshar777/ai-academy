"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { normalizeCountry, planForCountry } from "@/lib/pricing";
import { readCountryCookie } from "@/lib/country-cookie";

/**
 * Floating "Enroll now" bar — bottom-left, sized to end well before the chat
 * widget's trigger button (fixed right-4/6 bottom-4/6, size-14, z-[51] — see
 * ai-chat-widget.tsx), so the two never overlap. Only rendered below `xl`:
 * the header's own "Join now" button (site-header.tsx) is `xl:flex`-only, so
 * this exists purely to cover the gap left on mobile/tablet, not to
 * duplicate it on desktop.
 *
 * Hidden on /order itself (already the enrolment page) and while near the
 * top or bottom of any page — appearing only once the visitor has scrolled
 * past the hero reads as "you're interested, here's the fast path" rather
 * than a wall-to-wall banner from first paint, and hiding again near the
 * footer avoids stacking on top of the pricing section's own CTA.
 */

const SHOW_AFTER_PX = 480;
const HIDE_NEAR_BOTTOM_PX = 480;

export function EnrollBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
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

  useEffect(() => {
    function update() {
      const scrollY = window.scrollY;
      const nearBottom =
        scrollY + window.innerHeight > document.documentElement.scrollHeight - HIDE_NEAR_BOTTOM_PX;
      setVisible(scrollY > SHOW_AFTER_PX && !nearBottom);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (pathname?.startsWith("/order")) return null;

  const plan = planForCountry(country);

  return (
    <div className="pointer-events-none md:flex md:justify-center  fixed inset-x-0 bottom-0 z-40">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="pointer-events-auto ml-4 mb-4 flex w-[min(60vw,340px)] items-center gap-3 rounded-full bg-neutral-90 py-2 pr-2 pl-4 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/10 sm:ml-6 sm:mb-6"
          >
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="font-noi-grotesk text-[11px] font-medium tracking-[-0.01em] text-white/55">
                Full programme
              </span>
              <span className="font-sans-plomb  md:text-3xl text-3xl leading-none font-semibold tracking-[-0.015em] text-white">
                {plan.label}
              </span>
            </span>
            <Link
              href="/order"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-lime-30 px-5 font-noi-grotesk text-[14px] leading-none font-medium text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40"
            >
              Enroll now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
