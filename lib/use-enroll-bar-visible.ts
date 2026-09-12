"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Whether components/enroll-bar.tsx is currently showing — shared so the
 * floating chat widget (ai-chat-widget.tsx) can lift itself clear of the bar
 * instead of the two competing for the same bottom-right corner. Single
 * source of truth for the show/hide rule: once the visitor has scrolled past
 * the hero and before they reach the footer.
 *
 * It comes off entirely on the pages where someone is already partway into
 * something. A floating advert for the course is noise next to a form that
 * sells the course, and worse next to one that does not: /seminar books a
 * free seat, and a bar quoting AED 99 next to it argues with the word free.
 * It also physically covers the footer's own buttons on a phone.
 *
 * /learn and the pages after payment are the same rule seen from the other
 * end — offering to enrol someone who has just paid, or who is sitting in the
 * thing they bought, reads as not knowing who they are.
 */

const SHOW_AFTER_PX = 480;
const HIDE_NEAR_BOTTOM_PX = 480;

export function useEnrollBarVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const busyElsewhere =
    (pathname?.startsWith("/order") ||
      pathname?.startsWith("/seminar") ||
      pathname?.startsWith("/learn")) ??
    false;

  useEffect(() => {
    if (busyElsewhere) {
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
  }, [busyElsewhere]);

  return visible;
}
