"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Whether components/enroll-bar.tsx is currently showing — shared so the
 * floating chat widget (ai-chat-widget.tsx) can lift itself clear of the bar
 * instead of the two competing for the same bottom-right corner. Single
 * source of truth for the show/hide rule: hidden on /order itself (already
 * the enrolment page), and elsewhere only once the visitor has scrolled past
 * the hero and before they reach the footer.
 */

const SHOW_AFTER_PX = 480;
const HIDE_NEAR_BOTTOM_PX = 480;

export function useEnrollBarVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const onOrderPage = pathname?.startsWith("/order") ?? false;

  useEffect(() => {
    if (onOrderPage) {
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
  }, [onOrderPage]);

  return visible;
}
