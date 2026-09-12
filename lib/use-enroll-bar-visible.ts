"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Whether components/enroll-bar.tsx is currently showing — shared so the
 * floating chat widget (ai-chat-widget.tsx) can lift itself clear of the bar
 * instead of the two competing for the same bottom-right corner.
 *
 * The rule: once the visitor has scrolled past the hero, and from then on it
 * stays. It used to hide again near the footer; it no longer does, because
 * the end of the page is where someone has finished reading and is deciding,
 * which is the last moment to take the way in away from them.
 *
 * /order and /seminar show it from the top. The scroll threshold exists to
 * clear the home page hero and its own call to action, and neither of those
 * pages has a hero — waiting there would just mean the bar is missing at the
 * moment someone arrives.
 *
 * It stays off for people who have already bought: /learn and the pages after
 * payment. Offering to enrol someone sitting in the thing they bought reads
 * as not knowing who they are.
 */

const SHOW_AFTER_PX = 480;

export function useEnrollBarVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  // Checked before the /order prefix below, or thank-you and payment-return
  // would match it and show the bar to somebody who has just paid.
  const alreadyBought =
    (pathname?.startsWith("/order/thank-you") ||
      pathname?.startsWith("/order/payment-return") ||
      pathname?.startsWith("/learn")) ??
    false;
  const noHeroToClear =
    (pathname?.startsWith("/order") || pathname?.startsWith("/seminar")) ?? false;

  useEffect(() => {
    if (alreadyBought) {
      const id = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(id);
    }
    if (noHeroToClear) {
      const id = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(id);
    }
    function update() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [alreadyBought, noHeroToClear]);

  return visible;
}
