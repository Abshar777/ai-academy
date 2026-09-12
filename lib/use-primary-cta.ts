"use client";

import { usePathname } from "next/navigation";
import { useSessionHint } from "./use-session-hint";

/**
 * The one button the header offers, desktop and mobile.
 *
 * "Join now" is written at somebody deciding whether to buy. Shown to a
 * customer it reads as not knowing who they are — and worse, it points at
 * checkout, so the way back into the thing they already paid for is the one
 * route the header does not offer them.
 *
 * Two ways of being past that point:
 *   - signed in, from the readable cookie the course API sets;
 *   - standing on thank-you or payment-return, where the payment has just
 *     gone through but the session cookie may not exist yet. The buyer is
 *     signed in by the ticket in the URL when they reach /learn, not before,
 *     so the cookie alone would still be offering them checkout here.
 *
 * Lives in one place because the desktop header and the mobile drawer both
 * render this button — three call sites that must not drift apart.
 */
export function usePrimaryCta(): { href: string; label: string } {
  const signedIn = useSessionHint();
  const pathname = usePathname();
  const justPaid =
    (pathname?.startsWith("/order/thank-you") ||
      pathname?.startsWith("/order/payment-return")) ??
    false;

  return signedIn || justPaid
    ? { href: "/learn", label: "Start course" }
    : { href: "/order", label: "Join now" };
}
