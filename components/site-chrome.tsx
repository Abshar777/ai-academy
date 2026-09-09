"use client";

import { usePathname } from "next/navigation";
import { useSessionHint } from "@/lib/use-session-hint";
import type { ReactNode } from "react";
import { OfferBanner } from "./offer-banner";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AiChatWidget } from "./ai-chat-widget";
import { EnrollBar } from "./enroll-bar";
import { SitePopups } from "./site-popups";
import { EnrollmentToasts } from "./enrollment-toasts";

/**
 * Marketing-site chrome (nav, footer, chat widget, enroll bar) — hidden on
 * /admin, which is a separate internal tool, not a page of the marketing
 * site. Showing "Join now" or the AI chat bubble there would be confusing
 * at best and undermines the admin panel reading as its own thing.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Before the /admin bail: hooks have to run in the same order every render,
  // and an early return above this one would skip it.
  const signedIn = useSessionHint();

  if (pathname?.startsWith("/admin")) return <>{children}</>;

  // Everything that sells the programme comes off for two audiences: people
  // inside the course, and anyone already signed in. Both have bought it.
  //
  // The layout closes up on its own when the banner goes — see
  // --announcement-height in app/globals.css, which collapses in its absence.
  const inCourse = pathname?.startsWith("/learn") ?? false;
  const selling = !inCourse && !signedIn;

  return (
    <>
      {selling && <OfferBanner />}
      <SiteHeader />
      {children}
      <SiteFooter />
      <AiChatWidget />
      {selling && <EnrollBar />}
      <SitePopups />
      {selling && <EnrollmentToasts />}
    </>
  );
}
