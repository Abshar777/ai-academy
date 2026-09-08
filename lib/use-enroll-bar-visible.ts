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
 * The pages after payment are the exception. Offering to enrol someone who
 * has just paid reads as not knowing they did.
 */

const SHOW_AFTER_PX = 480;
const HIDE_NEAR_BOTTOM_PX = 480;

export function useEnrollBarVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const afterPayment =
    (pathname?.startsWith("/order/thank-you") || pathname?.startsWith("/order/payment-return")) ?? false;

  useEffect(() => {
    if (afterPayment) {
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
  }, [afterPayment]);

  return visible;
}
