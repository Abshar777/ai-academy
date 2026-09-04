"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AiChatWidget } from "./ai-chat-widget";
import { EnrollBar } from "./enroll-bar";
import { SitePopups } from "./site-popups";

/**
 * Marketing-site chrome (nav, footer, chat widget, enroll bar) — hidden on
 * /admin, which is a separate internal tool, not a page of the marketing
 * site. Showing "Join now" or the AI chat bubble there would be confusing
 * at best and undermines the admin panel reading as its own thing.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <AiChatWidget />
      <EnrollBar />
      <SitePopups />
    </>
  );
}
