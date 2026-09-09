"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Whether components/enroll-bar.tsx is currently showing — shared so the
 * floating chat widget (ai-chat-widget.tsx) can lift itself clear of the bar
 * instead of the two competing for the same bottom-right corner. Single
 * source of truth for the show/hide rule: everywhere once the visitor has
 * scrolled past the hero and before they reach the footer, /order included —
 * the price and the saving are worth keeping in view while someone fills the
 * form, and on that page the bar scrolls to the form rather than navigating.
 *
 * Two exceptions: the pages after payment, and the course itself. Offering to
 * enrol someone who has just paid — or who is sitting in the thing they
 * bought — reads as not knowing who they are.
 */

const SHOW_AFTER_PX = 480;
const HIDE_NEAR_BOTTOM_PX = 480;

export function useEnrollBarVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const alreadyIn =
    (pathname?.startsWith("/order/thank-you") ||
      pathname?.startsWith("/order/payment-return") ||
      pathname?.startsWith("/learn")) ??
    false;

  useEffect(() => {
    if (alreadyIn) {
      const id = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(id);
    }
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
  }, [alreadyIn]);

  return visible;
}
