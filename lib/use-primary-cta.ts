"use client";

import { usePathname } from "next/navigation";
import { useSessionHint } from "./use-session-hint";
import { useAcademyAuth } from "@/components/academy-auth";

/**
 * The one button the header offers, desktop and mobile.
 *
 * "Join now" is written at somebody deciding whether to buy. Shown to a
 * customer it reads as not knowing who they are — and worse, it points at
 * checkout, so the way back into the thing they already paid for is the one
 * route the header does not offer them.
 *
 * Three ways of being past that point:
 *   - the live session, which the provider updates the moment one is
 *     established;
 *   - the readable cookie the course API sets, which answers instantly on a
 *     cold load without waiting for the provider;
 *   - standing on thank-you or payment-return, where the payment has just
 *     gone through but the session cookie may not exist yet. The buyer is
 *     signed in by the ticket in the URL when they reach /learn, not before,
 *     so the cookie alone would still be offering them checkout here.
 *
 * The session is asked for as well as the cookie because the cookie is read
 * once, on mount. This header sits in the root layout and is never remounted,
 * so a visitor who arrives signed out and then signs in kept being offered
 * checkout for the rest of the visit — the way back into what they had just
 * paid for was the one route the header would not give them, until a full
 * reload. The provider is above this in the tree (app/layout.tsx), so the
 * status is always there to ask.
 *
 * Lives in one place because the desktop header and the mobile drawer both
 * render this button — three call sites that must not drift apart.
 */
export function usePrimaryCta(): { href: string; label: string } {
  const hasHintCookie = useSessionHint();
  const { status } = useAcademyAuth();
  const signedIn = hasHintCookie || status === "authed";
  const pathname = usePathname();
  const justPaid =
    (pathname?.startsWith("/order/thank-you") ||
      pathname?.startsWith("/order/payment-return")) ??
    false;

  return signedIn || justPaid
    ? { href: "/learn", label: "Start course" }
    : { href: "/order", label: "Join now" };
}
